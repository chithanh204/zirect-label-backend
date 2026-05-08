import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { db } from '@models/db';
import type { Album } from '@schemas/index';

export const getAllAlbums = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', status, artistId } = req.query;

    let albums = db.getAlbums();

    if (status) {
      albums = albums.filter((album) => album.status === status);
    }

    if (artistId) {
      albums = albums.filter((album) => album.artistId === artistId as string);
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIdx = (pageNum - 1) * limitNum;
    const endIdx = startIdx + limitNum;
    const paginatedAlbums = albums.slice(startIdx, endIdx);

    sendSuccess(
      res,
      {
        albums: paginatedAlbums,
        total: albums.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(albums.length / limitNum),
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
    const album = db.getAlbumById(id);

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

    const artist = db.getArtistByUserId(req.user.id);
    if (!artist) {
      sendError(res, 'Artist profile not found', 404);
      return;
    }

    const albums = db.getAlbumsByArtistId(artist.id);
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

    const artist = db.getArtistByUserId(req.user.id);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const newAlbum: Album = {
      id: `album-${Date.now()}`,
      title,
      artistId: artist.id,
      artistName: artist.name,
      releaseDate: new Date(releaseDate || Date.now()),
      status: 'draft',
      tracks: tracks.map((track: any, idx: number) => ({
        id: `track-${Date.now()}-${idx}`,
        title: track.title,
        duration: track.duration,
        streams: 0,
        revenue: 0,
        position: idx + 1,
      })),
      totalStreams: 0,
      revenue: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    db.createAlbum(newAlbum);

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

    const album = db.getAlbumById(id);
    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    const updatedAlbum = db.updateAlbum(id, { status: status as any });

    sendSuccess(res, updatedAlbum, 'Album status updated successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update album status');
  }
};

export const getAlbumStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const albums = db.getAlbums();

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
