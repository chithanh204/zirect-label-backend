import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { db } from '@models/prisma';

export const getDashboardOverview = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [artists, albums, analytics] = await Promise.all([
      db.getArtists(),
      db.getAlbums(),
      db.getAnalytics()
    ]);

    const totalArtists = artists.length;
    const activeArtists = artists.filter((a) => a.status === 'active').length;
    const totalAlbums = albums.length;
    const distributedAlbums = albums.filter((a) => a.status === 'distributed').length;
    const totalStreams = analytics.reduce((sum, a) => sum + a.streams, 0);
    const totalRevenue = analytics.reduce((sum, a) => sum + a.revenue, 0);

    const recentAlbums = [...albums]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    sendSuccess(
      res,
      {
        stats: {
          totalArtists,
          activeArtists,
          totalAlbums,
          distributedAlbums,
          totalStreams,
          totalRevenue,
          averageRevenuePerArtist:
            totalArtists > 0 ? Math.round(totalRevenue / totalArtists) : 0,
        },
        recentActivities: recentAlbums.map((album) => ({
          id: album.id,
          type: 'album_update',
          title: `${album.artistName} - ${album.title}`,
          status: album.status,
          timestamp: album.updatedAt,
        })),
      },
      'Dashboard overview retrieved successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to get dashboard overview');
  }
};

export const getReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reportType = 'revenue', period = '30' } = req.query;

    const [artists, analytics] = await Promise.all([
      db.getArtists(),
      db.getAnalytics()
    ]);

    let reportData: any = {};

    if (reportType === 'revenue') {
      reportData = {
        period,
        totalRevenue: analytics.reduce((sum, a) => sum + a.revenue, 0),
        byArtist: artists.map((artist) => ({
          artistId: artist.id,
          artistName: artist.name,
          revenue: analytics
            .filter((a) => a.artistId === artist.id)
            .reduce((sum, a) => sum + a.revenue, 0),
        })),
        byPlatform: ['Spotify', 'Apple Music', 'YouTube Music', 'Other'].map((platform) => ({
          platform,
          revenue: analytics
            .filter((a) => a.platform === platform)
            .reduce((sum, a) => sum + a.revenue, 0),
        })),
      };
    } else if (reportType === 'streams') {
      reportData = {
        period,
        totalStreams: analytics.reduce((sum, a) => sum + a.streams, 0),
        byArtist: artists.map((artist) => ({
          artistId: artist.id,
          artistName: artist.name,
          streams: analytics
            .filter((a) => a.artistId === artist.id)
            .reduce((sum, a) => sum + a.streams, 0),
        })),
        topArtists: [...artists].sort((a, b) => b.totalStreams - a.totalStreams).slice(0, 10),
      };
    }

    sendSuccess(res, reportData, 'Report retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get report');
  }
};

export const getAlbumProcessingQueue = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const albums = await db.getAlbums();

    const queue = albums
      .filter((a) => ['submitted', 'approved', 'delivering'].includes(a.status))
      .map((album) => ({
        id: album.id,
        title: album.title,
        artist: album.artistName,
        status: album.status,
        createdAt: album.createdAt,
        progress: getAlbumProgress(album.status),
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sendSuccess(
      res,
      {
        totalInQueue: queue.length,
        queue,
      },
      'Album processing queue retrieved successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to get album processing queue');
  }
};

const getAlbumProgress = (status: string): number => {
  const progressMap: Record<string, number> = {
    draft: 10,
    submitted: 25,
    approved: 50,
    delivering: 75,
    distributed: 100,
  };
  return progressMap[status] || 0;
};

export const approveAlbum = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const album = await db.getAlbumById(id);
    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    const updatedAlbum = await db.updateAlbum(id, { status: 'approved' });

    sendSuccess(res, updatedAlbum, 'Album approved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to approve album');
  }
};

export const rejectAlbum = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const album = await db.getAlbumById(id);
    if (!album) {
      sendError(res, 'Album not found', 404);
      return;
    }

    const updatedAlbum = await db.updateAlbum(id, {
      status: 'rejected',
      rejectionReason: reason,
    });

    sendSuccess(res, updatedAlbum, 'Album rejected successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to reject album');
  }
};
