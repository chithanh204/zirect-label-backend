import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { db } from '@models/prisma';

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401);
      return;
    }

    const artist = await db.getArtistByUserId(req.user.id);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const { albumId } = req.query;

    const [analytics, artistAlbums] = await Promise.all([
      db.getAnalyticsByArtistId(artist.id),
      db.getAlbumsByArtistId(artist.id)
    ]);

    let filteredAnalytics = analytics;
    if (albumId) {
      filteredAnalytics = analytics.filter((a) => a.albumId === albumId);
    }

    const totalStreams = filteredAnalytics.reduce((sum, a) => sum + a.streams, 0);

    // Calculate Unpaid Revenue for the artist by platform
    const platforms = ['spotify', 'youtube_music'];
    const unpaidByPlatform: Record<string, number> = {};
    platforms.forEach(p => unpaidByPlatform[p] = 0);

    let totalUnpaidRevenue = 0;
    artistAlbums.forEach(album => {
      // Find artist split
      const split = album.revenueSplits.find(s => s.artistId === artist.id);
      const artistPercentage = split ? split.percentage : 100;

      platforms.forEach(p => {
        // Calculate album revenue for this platform
        // Normalize 'youtube' to 'youtube_music' if necessary
        const albumPlatformRevenues = album.platformRevenues.filter(pr =>
          pr.platform.toLowerCase() === p || (p === 'youtube_music' && pr.platform.toLowerCase() === 'youtube')
        );
        const platformRev = albumPlatformRevenues.reduce((sum, pr) => sum + pr.totalRevenue, 0);

        const albumPlatformPayments = album.platformPayments.filter(pp =>
          pp.platform.toLowerCase() === p || (p === 'youtube_music' && pp.platform.toLowerCase() === 'youtube')
        );
        const platformPay = albumPlatformPayments.reduce((sum, pp) => sum + pp.amount, 0);

        const remaining = platformRev - platformPay;
        const artistShare = remaining * (artistPercentage / 100);

        unpaidByPlatform[p] += artistShare;
        totalUnpaidRevenue += artistShare;
      });
    });

    const byPlatformMap = filteredAnalytics.reduce((acc: any, a) => {
      // Normalize platform name for streams
      let platformKey = a.platform.toLowerCase();
      if (platformKey === 'youtube') platformKey = 'youtube_music';

      if (!acc[platformKey]) {
        acc[platformKey] = { streams: 0 };
      }
      acc[platformKey].streams += a.streams;
      return acc;
    }, {});

    const byPlatform = platforms.map(platform => ({
      platform,
      streams: byPlatformMap[platform]?.streams || 0,
      revenue: unpaidByPlatform[platform] || 0, // Using unpaid balance as revenue for distribution
    }));

    const byRegion = filteredAnalytics.reduce((acc: any, a) => {
      const region = a.region || 'Unknown';
      if (!acc[region]) {
        acc[region] = { streams: 0, revenue: 0 };
      }
      acc[region].streams += a.streams;
      acc[region].revenue += a.revenue;
      return acc;
    }, {});

    sendSuccess(
      res,
      {
        totalStreams,
        totalRevenue: totalUnpaidRevenue,
        averageStreamValue: totalStreams > 0 ? totalUnpaidRevenue / totalStreams : 0,
        byPlatform,
        byRegion: Object.entries(byRegion).map(([region, data]: any) => ({
          region,
          ...data,
        })),
        records: filteredAnalytics,
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

    const artist = await db.getArtistByUserId(req.user.id);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const [artistAnalytics, artistAlbums] = await Promise.all([
      db.getAnalyticsByArtistId(artist.id),
      db.getAlbumsByArtistId(artist.id)
    ]);

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

    const artist = await db.getArtistByUserId(req.user.id);
    if (!artist) {
      sendError(res, 'Artist not found', 404);
      return;
    }

    const artistAlbums = await db.getAlbumsByArtistId(artist.id);

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
