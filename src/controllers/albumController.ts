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

// ============ ALBUM DETAIL ============
export const getAlbumDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const album = await db.getAlbumDetail(id);

    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    sendSuccess(res, album, 'Album detail retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get album detail');
  }
};

// ============ COLLABORATORS ============
export const addCollaborator = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { id } = req.params;
    const { artistId, role } = req.body;

    if (!artistId) {
      sendError(res, 'artistId is required', 400);
      return;
    }

    const album = await db.getAlbumById(id);
    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    // Can't add the main artist as collaborator
    if (album.artistId === artistId) {
      sendError(res, 'Cannot add the main artist as a collaborator', 400);
      return;
    }

    const collaborator = await db.addCollaborator(id, artistId, role || 'featured');
    sendSuccess(res, collaborator, 'Collaborator added successfully', 201);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      sendError(res, 'This artist is already a collaborator', 409);
      return;
    }
    handleError(res, error, 'Failed to add collaborator');
  }
};

export const removeCollaborator = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { id, artistId } = req.params;
    await db.removeCollaborator(id, artistId);
    sendSuccess(res, null, 'Collaborator removed successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to remove collaborator');
  }
};

// ============ TRACK PLATFORMS ============
export const updateTrackPlatform = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { trackId } = req.params;
    const { platform, streams, copyrightFlag, url } = req.body;

    if (!platform) {
      sendError(res, 'platform is required', 400);
      return;
    }

    const validPlatforms = ['spotify', 'youtube_music', 'apple_music', 'tiktok'];
    if (!validPlatforms.includes(platform)) {
      sendError(res, 'Invalid platform', 400);
      return;
    }

    const result = await db.upsertTrackPlatform(trackId, platform, {
      streams: streams !== undefined ? parseInt(streams) : undefined,
      copyrightFlag: copyrightFlag !== undefined ? Boolean(copyrightFlag) : undefined,
      url: url !== undefined ? url : undefined,
    });

    sendSuccess(res, result, 'Track platform updated', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update track platform');
  }
};

// ============ REVENUE SPLITS ============
export const getRevenueSplits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const splits = await db.getRevenueSplits(id);
    sendSuccess(res, splits, 'Revenue splits retrieved', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get revenue splits');
  }
};

export const updateRevenueSplits = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { id } = req.params;
    const { splits } = req.body;

    if (!splits || !Array.isArray(splits)) {
      sendError(res, 'splits array is required', 400);
      return;
    }

    // Validate total = 100
    const total = splits.reduce((sum: number, s: any) => sum + (s.percentage || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      sendError(res, `Total percentage must equal 100% (currently ${total}%)`, 400);
      return;
    }

    const result = await db.setRevenueSplits(id, splits);
    sendSuccess(res, result, 'Revenue splits updated', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update revenue splits');
  }
};
// ============ PLATFORM REVENUE & PAYMENTS ============
export const updatePlatformRevenue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, platform } = req.params;
    const { totalRevenue } = req.body;

    if (totalRevenue === undefined || typeof totalRevenue !== 'number') {
      sendError(res, 'Valid totalRevenue number is required', 400);
      return;
    }

    const result = await db.upsertPlatformRevenue(id, platform, totalRevenue);
    sendSuccess(res, result, 'Platform revenue updated', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update platform revenue');
  }
};

export const addPlatformPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id, platform } = req.params;
    const { amount, note } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      sendError(res, 'Valid payment amount > 0 is required', 400);
      return;
    }

    const result = await db.addPlatformPayment(id, platform, amount, note);
    sendSuccess(res, result, 'Platform payment logged successfully', 201);
  } catch (error) {
    handleError(res, error, 'Failed to log platform payment');
  }
};
