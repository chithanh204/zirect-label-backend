import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { db } from '@models/prisma';

export const getAllAlbums = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, artistId } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause for Prisma
    const where: any = {};
    if (status) {
      where.status = status as string;
    }
    if (artistId) {
      where.artistId = artistId as string;
    }

    const albums = await db.getAlbums({ skip, take: limitNum, status: status as string | undefined });

    // Get total count for pagination
    const allAlbums = await db.getAlbums();
    const total = allAlbums.length;

    sendSuccess(
      res,
      {
        albums,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
      'Albums retrieved successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to get albums');
  }
};

export const getAlbumById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const album = await db.getAlbumById(id);

    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    sendSuccess(res, album, 'Album retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get album');
  }
};

export const getMyAlbums = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const albums = await db.getAlbumsByArtistId(artist.id);
    sendSuccess(res, albums, 'Artist albums retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get artist albums');
  }
};

export const createAlbum = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const { title, tracks, releaseDate } = req.body;

    if (!title || !tracks || tracks.length === 0) {
      sendError(res, 'Title and at least one track are required', 400);
      return;
    }

    const artist = await db.getArtistByUserId(req.user.id);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const newAlbum = await db.createAlbum({
      title,
      artistId: artist.id,
      artistName: artist.name,
      releaseDate: new Date(releaseDate || Date.now()),
      status: 'draft',
      totalStreams: 0,
      revenue: 0,
      tracks: tracks.map((track: any, idx: number) => ({
        title: track.title,
        duration: track.duration || 0,
        streams: 0,
        revenue: 0,
        position: idx + 1,
      })),
    });

    sendSuccess(res, newAlbum, 'Album created successfully', 201);
  } catch (error) {
    handleError(res, error, 'Failed to create album');
  }
};

export const updateAlbumStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      sendError(res, 'Status is required', 400);
      return;
    }

    const validStatuses = ['draft', 'submitted', 'approved', 'delivering', 'distributed', 'rejected'];
    if (!validStatuses.includes(status)) {
      sendError(res, 'Invalid status', 400);
      return;
    }

    const album = await db.getAlbumById(id);
    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    const updatedAlbum = await db.updateAlbum(id, { status: status as any });

    sendSuccess(res, updatedAlbum, 'Album status updated successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update album status');
  }
};

export const getAlbumStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const albums = await db.getAlbums();

    const stats = {
      totalAlbums: albums.length,
      distributedAlbums: albums.filter((a) => a.status === 'distributed').length,
      deliveringAlbums: albums.filter((a) => a.status === 'delivering').length,
      approvedAlbums: albums.filter((a) => a.status === 'approved').length,
      submittedAlbums: albums.filter((a) => a.status === 'submitted').length,
      totalStreams: albums.reduce((sum, a) => sum + a.totalStreams, 0),
      totalRevenue: albums.reduce((sum, a) => sum + a.revenue, 0),
    };

    sendSuccess(res, stats, 'Album stats retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get album stats');
  }
};

export const createAlbumAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Only admins can use this endpoint', 403);
      return;
    }

    const { title, artistId, coverArt, releaseDate, upc, tracks } = req.body;

    if (!title || !artistId) {
      sendError(res, 'Title and artistId are required', 400);
      return;
    }

    const artist = await db.getArtistById(artistId);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const newAlbum = await db.createAlbum({
      title,
      artistId: artist.id,
      artistName: artist.name,
      coverArt: coverArt || undefined,
      releaseDate: releaseDate ? new Date(releaseDate) : undefined,
      upc: upc || undefined,
      status: 'draft',
      totalStreams: 0,
      revenue: 0,
      tracks: (tracks || []).map((track: any, idx: number) => ({
        title: track.title,
        duration: track.duration || 0,
        streams: 0,
        revenue: 0,
        position: idx + 1,
      })),
    });

    sendSuccess(res, newAlbum, 'Album created successfully', 201);
  } catch (error) {
    handleError(res, error, 'Failed to create album');
  }
};

