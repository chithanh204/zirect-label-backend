import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { db } from '@models/db';

export const getAllArtists = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', search = '' } = req.query;

    let artists = db.getArtists();

    if (search) {
      artists = artists.filter((artist) =>
        artist.name.toLowerCase().includes((search as string).toLowerCase())
      );
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIdx = (pageNum - 1) * limitNum;
    const endIdx = startIdx + limitNum;
    const paginatedArtists = artists.slice(startIdx, endIdx);

    sendSuccess(
      res,
      {
        artists: paginatedArtists,
        total: artists.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(artists.length / limitNum),
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
    const artist = db.getArtistById(id);

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
    const artists = db.getArtists();
    const albums = db.getAlbums();

    const stats = {
      totalArtists: artists.length,
      activeArtists: artists.filter((a) => a.status === 'active').length,
      pendingArtists: artists.filter((a) => a.status === 'pending').length,
      totalStreams: artists.reduce((sum, a) => sum + a.totalStreams, 0),
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

    const artist = db.getArtistByUserId(req.user.id);

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

    const { bio, avatar } = req.body;
    const artist = db.getArtistByUserId(req.user.id);

    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const updatedArtist = db.updateArtist(artist.id, { bio, avatar });

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

    const { userId, name, email, bio, avatar } = req.body;

    if (!userId || !name || !email) {
      sendError(res, 'userId, name, and email are required', 400);
      return;
    }

    // Check if artist already exists for this user
    const existingArtist = db.getArtistByUserId(userId);
    if (existingArtist) {
      sendError(res, 'Artist profile already exists for this user', 409);
      return;
    }

    const newArtist = {
      id: `artist-${Date.now()}`,
      userId,
      name,
      email,
      bio: bio || '',
      avatar: avatar || undefined,
      followers: 0,
      totalStreams: 0,
      totalRevenue: 0,
      status: 'pending' as const,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = db.createArtist(newArtist);

    sendSuccess(
      res,
      created,
      'Artist created successfully',
      201
    );
  } catch (error) {
    handleError(res, error, 'Failed to create artist');
  }
};
