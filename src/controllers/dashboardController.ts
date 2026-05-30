import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { db, prisma } from '@models/prisma';
import { spotifyService } from '@services/spotifyService';

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
    const totalStreams = albums.reduce((sum, a) => sum + a.totalStreams, 0);
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
      .filter((a) => ['submitted', 'approved'].includes(a.status))
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

export const getContractReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const contracts = await prisma.contractSubmission.findMany({
      orderBy: { createdAt: 'desc' }
    });
    sendSuccess(res, contracts, 'Contract reports retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get contract reports');
  }
};

export const getDiscrepancyReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const [copyrightFlags, missingIds] = await Promise.all([
      prisma.trackPlatform.findMany({
        where: { copyrightFlag: true },
        include: {
          track: {
            include: {
              album: true
            }
          }
        }
      }),
      prisma.album.findMany({
        where: {
          status: 'distributed',
          OR: [
            { albumId: null },
            { youtubeId: null }
          ]
        }
      })
    ]);

    const distributedAlbums = await prisma.album.findMany({
      where: {
        status: 'distributed',
        albumId: { not: null }
      }
    });

    const spotifyDiscrepancies = [];

    for (const album of distributedAlbums) {
      if (!album.albumId) continue;
      try {
        const spotifyAlbum = await spotifyService.getAlbum(album.albumId);
        if (spotifyAlbum) {
          const localTracksCount = await prisma.track.count({
            where: { albumId: album.id }
          });

          const spotifyArtists = spotifyAlbum.artists.map((a: any) => a.name).join(", ");
          const localArtists = album.displayArtist || album.artistName;

          const titleMismatch = spotifyAlbum.name !== album.title;
          const tracksMismatch = spotifyAlbum.total_tracks !== localTracksCount;
          const artistMismatch = spotifyArtists.toLowerCase() !== localArtists.toLowerCase();

          if (titleMismatch || tracksMismatch || artistMismatch) {
            const mismatches = [];
            if (titleMismatch) mismatches.push('title');
            if (tracksMismatch) mismatches.push('totalTracks');
            if (artistMismatch) mismatches.push('displayArtist');

            spotifyDiscrepancies.push({
              albumId: album.id,
              spotifyAlbumId: album.albumId,
              title: album.title,
              artistName: album.artistName,
              displayArtist: album.displayArtist,
              coverArt: album.coverArt,
              upc: album.upc,
              localValue: {
                title: album.title,
                totalTracks: localTracksCount,
                displayArtist: localArtists
              },
              spotifyValue: {
                title: spotifyAlbum.name,
                totalTracks: spotifyAlbum.total_tracks,
                displayArtist: spotifyArtists
              },
              mismatches
            });
          }
        }
      } catch (err) {
        console.error(`Failed to compare spotify metadata for album ${album.id}:`, err);
      }
    }

    sendSuccess(res, { copyrightFlags, missingIds, spotifyDiscrepancies }, 'Discrepancy reports retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get discrepancy reports');
  }
};

export const getReleaseScheduleReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const albums = await prisma.album.findMany({
      where: {
        status: { in: ['approved', 'submitted'] },
        releaseDate: { not: null }
      },
      orderBy: { releaseDate: 'asc' }
    });
    sendSuccess(res, albums, 'Release schedule reports retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get release schedule reports');
  }
};

export const getAdminAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    // 1. Fetch distributed albums
    const albums = await prisma.album.findMany({
      where: { status: 'distributed' },
      include: {
        tracks: {
          include: {
            platforms: true
          }
        },
        platformRevenues: true
      }
    });

    // 2. Flatten tracks & resolve Spotify Platform info
    interface TrackItem {
      id: string;
      title: string;
      isrc: string | null;
      revenue: number;
      albumId: string;
      albumTitle: string;
      artistName: string;
      spotifyUrl?: string | null;
      spotifyId?: string | null;
    }

    const allTracks: TrackItem[] = [];

    for (const album of albums) {
      for (const track of album.tracks) {
        const spotifyPlatform = track.platforms.find(p => p.platform === 'spotify');
        let spotifyId: string | null = null;
        
        if (spotifyPlatform && spotifyPlatform.url) {
          const match = spotifyPlatform.url.match(/\/track\/([a-zA-Z0-9]+)/);
          if (match) {
            spotifyId = match[1];
          }
        }

        allTracks.push({
          id: track.id,
          title: track.title,
          isrc: track.isrc,
          revenue: track.revenue,
          albumId: album.id,
          albumTitle: album.title,
          artistName: album.artistName,
          spotifyUrl: spotifyPlatform?.url || null,
          spotifyId
        });
      }
    }

    // 3. Resolve Spotify popularity for top 30 tracks by revenue
    const topTracksByRevenue = [...allTracks].sort((a, b) => b.revenue - a.revenue).slice(0, 30);
    const resolvedSpotifyIds: string[] = [];
    const spotifyIdToDbTrackId = new Map<string, string>();

    for (const t of topTracksByRevenue) {
      if (t.spotifyId) {
        resolvedSpotifyIds.push(t.spotifyId);
        spotifyIdToDbTrackId.set(t.spotifyId, t.id);
      } else {
        // Auto search Spotify to find match
        try {
          const query = t.isrc ? `isrc:${t.isrc}` : `${t.artistName} ${t.title}`;
          const searchResults = await spotifyService.searchTracks(query, 1);
          if (searchResults && searchResults.length > 0) {
            const sId = searchResults[0].id;
            t.spotifyId = sId;
            resolvedSpotifyIds.push(sId);
            spotifyIdToDbTrackId.set(sId, t.id);

            // Save external url to TrackPlatform to cache it!
            await prisma.trackPlatform.upsert({
              where: { trackId_platform: { trackId: t.id, platform: 'spotify' } },
              update: { url: searchResults[0].externalUrl },
              create: { trackId: t.id, platform: 'spotify', url: searchResults[0].externalUrl }
            });
          }
        } catch (err) {
          console.error(`Failed to auto-resolve Spotify ID for track ${t.title}:`, err);
        }
      }
    }

    // 4. Batch request Spotify popularity details
    let spotifyTrackData: any[] = [];
    if (resolvedSpotifyIds.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < resolvedSpotifyIds.length; i += batchSize) {
        const batch = resolvedSpotifyIds.slice(i, i + batchSize);
        const tracksBatch = await spotifyService.getTracksMultiple(batch);
        spotifyTrackData.push(...tracksBatch);
      }
    }

    const popularityMap = new Map<string, number>();
    const artworkMap = new Map<string, string>();

    for (const sTrack of spotifyTrackData) {
      const dbTrackId = spotifyIdToDbTrackId.get(sTrack.id);
      if (dbTrackId) {
        popularityMap.set(dbTrackId, sTrack.popularity || 0);
        if (sTrack.imageUrl) {
          artworkMap.set(dbTrackId, sTrack.imageUrl);
        }
      }
    }

    const tracksWithPopularity = topTracksByRevenue.map(t => ({
      ...t,
      popularity: popularityMap.get(t.id) || 0,
      imageUrl: artworkMap.get(t.id) || null
    }));

    // 5. Aggregate overall metrics
    const totalRevenue = albums.reduce((sum, a) => sum + a.revenue, 0);
    const totalStreams = albums.reduce((sum, a) => sum + a.totalStreams, 0);

    // 6. Platform Revenue Breakdowns
    const platformRevMap: Record<string, number> = {
      spotify: 0,
      youtube_music: 0,
      other: 0
    };

    for (const album of albums) {
      for (const pr of album.platformRevenues) {
        const plat = pr.platform.toLowerCase();
        if (plat.includes('spotify')) {
          platformRevMap.spotify += pr.totalRevenue;
        } else if (plat.includes('youtube')) {
          platformRevMap.youtube_music += pr.totalRevenue;
        } else {
          platformRevMap.other += pr.totalRevenue;
        }
      }
    }

    const totalPlatformRevenue = platformRevMap.spotify + platformRevMap.youtube_music + platformRevMap.other;
    const platformBreakdown = [
      {
        platform: 'Spotify',
        revenue: platformRevMap.spotify,
        percentage: totalPlatformRevenue > 0 ? (platformRevMap.spotify / totalPlatformRevenue) * 100 : 0
      },
      {
        platform: 'YouTube Music',
        revenue: platformRevMap.youtube_music,
        percentage: totalPlatformRevenue > 0 ? (platformRevMap.youtube_music / totalPlatformRevenue) * 100 : 0
      },
      {
        platform: 'Other Platforms',
        revenue: platformRevMap.other,
        percentage: totalPlatformRevenue > 0 ? (platformRevMap.other / totalPlatformRevenue) * 100 : 0
      }
    ];

    // 7. Top Trending Releases (popularity > 0)
    const trendingReleases = tracksWithPopularity
      .filter(t => t.popularity > 0)
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 10);

    // 8. Top 5 Albums by Revenue
    const topAlbums = [...albums]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map(a => ({
        id: a.id,
        title: a.title,
        artistName: a.artistName,
        coverArt: a.coverArt,
        revenue: a.revenue,
        totalStreams: a.totalStreams,
        averageStreamValue: a.totalStreams > 0 ? a.revenue / a.totalStreams : 0
      }));

    // 9. Monthly Revenue Flow (Line chart)
    const monthlyAnalytics = await prisma.analytics.findMany({
      select: {
        date: true,
        revenue: true
      }
    });

    const monthlyRevenueMap = new Map<string, number>();
    for (const record of monthlyAnalytics) {
      if (record.date) {
        const dateStr = record.date.toISOString().substring(0, 7);
        monthlyRevenueMap.set(dateStr, (monthlyRevenueMap.get(dateStr) || 0) + record.revenue);
      }
    }

    const monthlyRevenue = Array.from(monthlyRevenueMap.entries())
      .map(([month, revenue]) => ({ month, revenue: parseFloat(revenue.toFixed(2)) }))
      .sort((a, b) => a.month.localeCompare(b.month));

    sendSuccess(
      res,
      {
        totalRevenue: parseFloat(totalRevenue.toFixed(4)),
        totalStreams,
        platformBreakdown,
        trendingReleases,
        topAlbums,
        allResolvedTracks: tracksWithPopularity.slice(0, 15),
        monthlyRevenue,
      },
      'Admin analytics generated successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to generate admin analytics');
  }
};
