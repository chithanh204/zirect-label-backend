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
      sendError(res, 'Only admins can create accounts', 403);
      return;
    }

    const { name, email, bio, avatar, paypalAccount, composerName, isAdmin, password } = req.body;

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

    // Auto-generate password if not provided
    const plainPassword = password || crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Create user account automatically
    const newUser = await db.createUser({
      email,
      name,
      password: hashedPassword,
      type: isAdmin ? ('admin' as const) : ('artist' as const),
    });

    let createdArtist = null;
    if (!isAdmin) {
      // Create artist profile linked to the new user ONLY for non-admins
      createdArtist = await db.createArtist({
        userId: newUser.id,
        name,
        email,
        bio: bio || '',
        avatar: avatar || undefined,
        paypalAccount: paypalAccount || undefined,
        composerName: composerName || undefined,
        isAdmin: false,
        followers: 0,
        totalStreams: 0,
        totalRevenue: 0,
        status: 'pending' as any,
        joinedAt: new Date(),
      });
    }

    sendSuccess(
      res,
      {
        artist: createdArtist,
        user: newUser,
        generatedPassword: plainPassword, // Return the password so the admin can copy/view it
      },
      isAdmin ? 'Admin created successfully' : 'Artist created successfully',
      201
    );
  } catch (error) {
    handleError(res, error, 'Failed to create account');
  }
};

export const updateArtistAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Only admins can update artist details', 403);
      return;
    }

    const { id } = req.params;
    const { name, email, bio, avatar, status, paypalAccount, composerName, isActive, isAdmin } = req.body;

    const artist = await db.getArtistById(id);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (status !== undefined) updateData.status = status;
    if (paypalAccount !== undefined) updateData.paypalAccount = paypalAccount;
    if (composerName !== undefined) updateData.composerName = composerName;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    if (isAdmin !== undefined) updateData.isAdmin = Boolean(isAdmin);

    const updatedArtist = await db.updateArtist(id, updateData);

    // If email, name, or isAdmin was updated, we should also update the corresponding User
    const userUpdate: any = {};
    if (name !== undefined) userUpdate.name = name;
    if (email !== undefined) userUpdate.email = email;
    if (isAdmin !== undefined) {
      userUpdate.type = isAdmin ? 'admin' : 'artist';
    }

    if (Object.keys(userUpdate).length > 0) {
      await db.updateUser(artist.userId, userUpdate);
    }

    sendSuccess(res, updatedArtist, 'Artist updated successfully by admin', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update artist details by admin');
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

// PHASE 3: Artist Dashboard & My Albums

export const getArtistDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
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

    // Get artist's albums
    const artistAlbums = await db.getAlbumsByArtistId(artist.id);

    // Calculate dashboard stats for this artist
    const totalAlbums = artistAlbums.length;
    const distributedAlbums = artistAlbums.filter((a) => a.status === 'distributed').length;
    const totalStreams = artistAlbums.reduce((sum, a) => sum + a.totalStreams, 0);
    const totalRevenue = artistAlbums.reduce((sum, a) => sum + a.revenue, 0);

    // Get recent activities (latest 5 albums)
    const recentActivities = [...artistAlbums]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .map((album) => ({
        id: album.id,
        title: album.title,
        status: album.status,
        releaseDate: album.releaseDate,
        totalStreams: album.totalStreams,
        revenue: album.revenue,
        updatedAt: album.updatedAt,
      }));

    sendSuccess(
      res,
      {
        stats: {
          totalAlbums,
          distributedAlbums,
          totalStreams,
          totalRevenue: artist.totalRevenue,
          balance: artist.balance,
          totalPaid: artist.totalPaid,
          averageStreamsPerAlbum:
            totalAlbums > 0 ? Math.round(totalStreams / totalAlbums) : 0,
          averageRevenuePerAlbum:
            totalAlbums > 0 ? Math.round(totalRevenue / totalAlbums) : 0,
        },
        recentActivities,
      },
      'Artist dashboard retrieved successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to get artist dashboard');
  }
};

export const getArtistAlbums = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { status, page = '1', limit = '10' } = req.query;

    const artist = await db.getArtistByUserId(req.user.id);
    if (!artist) {
      sendError(res, 'Artist profile not found', 404);
      return;
    }

    // Get artist's albums (with optional status filter)
    let artistAlbums = await db.getAlbumsByArtistId(artist.id);

    if (status) {
      artistAlbums = artistAlbums.filter((a) => a.status === status);
    }

    // Sort by date descending
    artistAlbums = artistAlbums.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Paginate
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;
    const paginatedAlbums = artistAlbums.slice(skip, skip + limitNum);

    const albumsWithRevenue = paginatedAlbums.map((album) => ({
      id: album.id,
      title: album.title,
      artistName: album.artistName,
      releaseDate: album.releaseDate,
      coverArt: album.coverArt,
      status: album.status,
      totalStreams: album.totalStreams,
      totalRevenue: album.revenue,
      unpaidRevenue: album.revenue, // Will be calculated more precisely if payment tracking is added
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
    }));

    sendSuccess(
      res,
      {
        albums: albumsWithRevenue,
        total: artistAlbums.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(artistAlbums.length / limitNum),
      },
      'Artist albums retrieved successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to get artist albums');
  }
};

export const getArtistAlbumRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { id } = req.params;

    const artist = await db.getArtistByUserId(req.user.id);
    if (!artist) {
      sendError(res, 'Artist profile not found', 404);
      return;
    }

    const album = await db.getAlbumById(id);
    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    // Verify the album belongs to this artist
    if (album.artistId !== artist.id) {
      sendError(res, 'Unauthorized: This album does not belong to you', 403);
      return;
    }

    // Get revenue summary
    const revenueSummary = {
      albumId: album.id,
      albumTitle: album.title,
      totalRevenue: album.revenue,
      totalStreams: album.totalStreams,
      status: album.status,
      releaseDate: album.releaseDate,
      // In a complete implementation, this would have:
      // - paidRevenue
      // - unpaidRevenue
      // - payment history logs
      // - per-platform breakdown
    };

    sendSuccess(
      res,
      revenueSummary,
      'Album revenue information retrieved successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to get album revenue information');
  }
};
