import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { db } from '@models/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const getAllArtists = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [artists, total] = await Promise.all([
      db.getArtists({ skip, take: limitNum }),
      db.getArtistsCount()
    ]);

    sendSuccess(
      res,
      {
        artists,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      'Artists retrieved successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to get artists');
  }
};

export const getArtistById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const artist = await db.getArtistById(id);

    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    sendSuccess(res, artist, 'Artist retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get artist');
  }
};

export const getArtistStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [artists, albums] = await Promise.all([
      db.getArtists(),
      db.getAlbums()
    ]);

    const stats = {
      totalArtists: artists.length,
      activeArtists: artists.filter((a) => a.status === 'active').length,
      pendingArtists: artists.filter((a) => a.status === 'pending').length,
      totalStreams: albums.reduce((sum, a) => sum + a.totalStreams, 0),
      totalRevenue: artists.reduce((sum, a) => sum + a.totalRevenue, 0),
      totalAlbums: albums.length,
      distributedAlbums: albums.filter((a) => a.status === 'distributed').length,
      averageFollowers:
        artists.length > 0
          ? artists.reduce((sum, a) => sum + a.followers, 0) / artists.length
          : 0,
    };

    sendSuccess(res, stats, 'Artist stats retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get artist stats');
  }
};

export const getMyArtistProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const artist = await db.getArtistByUserId(req.user.id);

    if (!artist) {
      sendError(res, 'Artist profile not found', 404);
      return;
    }

    sendSuccess(res, artist, 'Artist profile retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get artist profile');
  }
};

export const updateArtistProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { bio, avatar, website, paymentMethod, currency, bankAccount } = req.body;
    const artist = await db.getArtistByUserId(req.user.id);

    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const updateData: any = { bio, avatar, website, paymentMethod, currency, bankAccount };
    
    // If payment info is updated, set status to pending
    if (paymentMethod || currency || bankAccount) {
      updateData.paymentVerificationStatus = 'pending';
    }

    const updatedArtist = await db.updateArtist(artist.id, updateData);

    sendSuccess(
      res,
      updatedArtist,
      'Artist profile updated successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to update artist profile');
  }
};

export const createArtist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Only admins can create artist accounts', 403);
      return;
    }

    const { name, email, bio, avatar } = req.body;

    if (!name || !email) {
      sendError(res, 'Name and email are required', 400);
      return;
    }

    // Check if a user with this email already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      sendError(res, 'A user with this email already exists', 409);
      return;
    }

    // Auto-generate a random password for the artist's user account
    const generatedPassword = crypto.randomBytes(8).toString('hex'); // 16 char hex string
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Create user account automatically
    const newUser = await db.createUser({
      email,
      name,
      password: hashedPassword,
      type: 'artist' as const,
    });

    // Create artist profile linked to the new user
    const created = await db.createArtist({
      userId: newUser.id,
      name,
      email,
      bio: bio || '',
      avatar: avatar || undefined,
      followers: 0,
      totalStreams: 0,
      totalRevenue: 0,
      status: 'pending' as any,
      joinedAt: new Date(),
    });

    sendSuccess(
      res,
      {
        artist: created,
        generatedPassword, // Return the plain password so admin can share it with the artist
      },
      'Artist created successfully',
      201
    );
  } catch (error) {
    handleError(res, error, 'Failed to create artist');
  }
};

export const resetArtistPassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Only admins can reset artist passwords', 403);
      return;
    }

    const { id } = req.params;

    // Find the artist
    const artist = await db.getArtistById(id);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    // Generate a new random password
    const newPassword = crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    await db.updateUser(artist.userId, { password: hashedPassword });

    sendSuccess(
      res,
      {
        artistId: artist.id,
        artistName: artist.name,
        newPassword,
      },
      'Password reset successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to reset password');
  }
};

export const verifyPaymentInfo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Only admins can verify payment info', 403);
      return;
    }

    const artist = await db.getArtistById(id);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const updatedArtist = await db.updateArtist(id, { paymentVerificationStatus: 'verified' });
    sendSuccess(res, updatedArtist, 'Payment info verified successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to verify payment info');
  }
};
