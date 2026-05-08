import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { db } from '@models/db';

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const artist = db.getArtistByUserId(req.user.id);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const { albumId } = req.query;

    let analytics = db.getAnalyticsByArtistId(artist.id);

    if (albumId) {
      analytics = analytics.filter((a) => a.albumId === albumId);
    }

    const totalStreams = analytics.reduce((sum, a) => sum + a.streams, 0);
    const totalRevenue = analytics.reduce((sum, a) => sum + a.revenue, 0);

    const byPlatform = analytics.reduce((acc: any, a) => {
      if (!acc[a.platform]) {
        acc[a.platform] = { streams: 0, revenue: 0 };
      }
      acc[a.platform].streams += a.streams;
      acc[a.platform].revenue += a.revenue;
      return acc;
    }, {});

    const byRegion = analytics.reduce((acc: any, a) => {
      if (!acc[a.region]) {
        acc[a.region] = { streams: 0, revenue: 0 };
      }
      acc[a.region].streams += a.streams;
      acc[a.region].revenue += a.revenue;
      return acc;
    }, {});

    sendSuccess(
      res,
      {
        totalStreams,
        totalRevenue,
        averageStreamValue: totalStreams > 0 ? totalRevenue / totalStreams : 0,
        byPlatform: Object.entries(byPlatform).map(([platform, data]: any) => ({
          platform,
          ...data,
        })),
        byRegion: Object.entries(byRegion).map(([region, data]: any) => ({
          region,
          ...data,
        })),
        records: analytics,
      },
      'Analytics retrieved successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to get analytics');
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const artist = db.getArtistByUserId(req.user.id);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const artistAnalytics = db.getAnalyticsByArtistId(artist.id);
    const artistAlbums = db.getAlbumsByArtistId(artist.id);

    const totalStreams = artistAnalytics.reduce((sum, a) => sum + a.streams, 0);
    const totalRevenue = artistAnalytics.reduce((sum, a) => sum + a.revenue, 0);
    const totalAlbums = artistAlbums.length;
    const distributedAlbums = artistAlbums.filter((a) => a.status === 'distributed').length;

    const growthRate = totalStreams > 0 ? ((totalStreams / (totalStreams || 1)) * 100) : 0;

    sendSuccess(
      res,
      {
        totalStreams,
        totalRevenue,
        totalAlbums,
        distributedAlbums,
        growthRate: Math.round(growthRate),
        monthlyRevenue: totalRevenue,
        averageStreamValue:
          totalStreams > 0 ? (totalRevenue / totalStreams).toFixed(4) : '0',
      },
      'Dashboard stats retrieved successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to get dashboard stats');
  }
};

export const getTopTracks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const artist = db.getArtistByUserId(req.user.id);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const artistAlbums = db.getAlbumsByArtistId(artist.id);

    const allTracks = artistAlbums.flatMap((album) =>
      album.tracks.map((track) => ({
        ...track,
        albumId: album.id,
        albumTitle: album.title,
      }))
    );

    const topTracks = allTracks.sort((a, b) => b.streams - a.streams).slice(0, 10);

    sendSuccess(res, topTracks, 'Top tracks retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get top tracks');
  }
};
