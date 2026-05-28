import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export { prisma };

// Database service wrapper for compatibility
export const db = {
  // ============ USERS ============
  async getUsers() {
    return await prisma.user.findMany();
  },

  async getUserById(id: string) {
    return await prisma.user.findUnique({ where: { id } });
  },

  async getUserByEmail(email: string) {
    return await prisma.user.findUnique({ where: { email } });
  },

  async createUser(data: any) {
    return await prisma.user.create({ data });
  },

  async updateUser(id: string, data: any) {
    return await prisma.user.update({ where: { id }, data });
  },

  // ============ ARTISTS ============
  async getArtists(options?: { skip?: number; take?: number; where?: any }) {
    return await prisma.artist.findMany({
      where: options?.where,
      skip: options?.skip,
      take: options?.take,
      include: {
        _count: {
          select: { albums: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getArtistsCount(where?: any) {
    return await prisma.artist.count({ where });
  },

  async getArtistById(id: string) {
    return await prisma.artist.findUnique({ where: { id } });
  },

  async getArtistByUserId(userId: string) {
    return await prisma.artist.findUnique({ where: { userId } });
  },

  async createArtist(data: any) {
    return await prisma.artist.create({ data });
  },

  async updateArtist(id: string, data: any) {
    return await prisma.artist.update({ where: { id }, data });
  },

  // ============ ALBUMS ============
  async getAlbums(options?: { skip?: number; take?: number; status?: string }) {
    return await prisma.album.findMany({
      where: options?.status ? { status: options.status as any } : undefined,
      skip: options?.skip,
      take: options?.take,
      include: { tracks: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getAlbumsCount() {
    return await prisma.album.count();
  },

  async getAlbumById(id: string) {
    return await prisma.album.findUnique({
      where: { id },
      include: { tracks: true },
    });
  },

  async getAlbumsByArtistId(artistId: string) {
    return await prisma.album.findMany({
      where: { artistId },
      include: {
        tracks: true,
        platformRevenues: true,
        revenueSplits: true,
        platformPayments: true
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createAlbum(data: any) {
    return await prisma.album.create({
      data: {
        ...data,
        tracks: data.tracks ? { create: data.tracks } : undefined,
      },
      include: { tracks: true },
    });
  },

  async updateAlbum(id: string, data: any) {
    return await prisma.album.update({
      where: { id },
      data: {
        ...data,
        tracks: undefined, // Handle separately if needed
      },
      include: { tracks: true },
    });
  },

  async deleteAlbum(id: string) {
    return await prisma.album.delete({
      where: { id },
    });
  },

  // ============ ALBUM DETAIL ============
  async getAlbumDetail(id: string) {
    return await prisma.album.findUnique({
      where: { id },
      include: {
        tracks: {
          include: { platforms: true },
        orderBy: { createdAt: 'asc' },
        },
        artist: { select: { id: true, name: true, avatar: true, email: true, paypalAccount: true, composerName: true } },
        collaborators: {
          include: { artist: { select: { id: true, name: true, avatar: true } } },
        },
        revenueSplits: {
          include: { artist: { select: { id: true, name: true, avatar: true, paypalAccount: true, composerName: true } } },
        },
        platformRevenues: true,
        platformPayments: {
          orderBy: { paidAt: 'desc' },
        },
        paymentLogDetails: {
          include: {
            paymentLog: {
              include: { artist: { select: { id: true, name: true } } }
            }
          },
          orderBy: { id: 'desc' },
        },
      },
    });
  },

  // ============ TRACK PLATFORMS ============
  async upsertTrackPlatform(trackId: string, platform: string, data: { streams?: number; copyrightFlag?: boolean; url?: string }) {
    const result = await prisma.trackPlatform.upsert({
      where: { trackId_platform: { trackId, platform } },
      update: data,
      create: { trackId, platform, ...data },
    });

    // Recalculate track and album totals if streams changed
    if (data.streams !== undefined) {
      // 1. Recalculate track total streams
      const trackPlatforms = await prisma.trackPlatform.findMany({ where: { trackId } });
      const trackStreams = trackPlatforms.reduce((sum, p) => sum + p.streams, 0);

      const updatedTrack = await prisma.track.update({
        where: { id: trackId },
        data: { streams: trackStreams },
        select: { albumId: true }
      });

      // 2. Recalculate album total streams
      const albumTracks = await prisma.track.findMany({ where: { albumId: updatedTrack.albumId } });
      const albumStreams = albumTracks.reduce((sum, t) => sum + t.streams, 0);

      const album = await prisma.album.update({
        where: { id: updatedTrack.albumId },
        data: { totalStreams: albumStreams },
        include: { collaborators: true }
      });

      // 3. Recalculate total streams for all involved artists
      const involvedArtistIds = new Set([album.artistId, ...album.collaborators.map(c => c.artistId)]);
      for (const artistId of involvedArtistIds) {
        await db.updateArtistTotalStreams(artistId);
      }
    }

    return result;
  },

  async updateArtistTotalStreams(artistId: string) {
    // Get albums where artist is main artist
    const mainAlbums = await prisma.album.findMany({
      where: { artistId },
      select: { totalStreams: true }
    });

    // Get albums where artist is collaborator
    const collabAlbums = await prisma.albumCollaborator.findMany({
      where: { artistId },
      include: { album: { select: { totalStreams: true } } }
    });

    const totalFromMain = mainAlbums.reduce((sum, a) => sum + a.totalStreams, 0);
    const totalFromCollab = collabAlbums.reduce((sum, c) => sum + c.album.totalStreams, 0);

    await prisma.artist.update({
      where: { id: artistId },
      data: { totalStreams: totalFromMain + totalFromCollab }
    });
  },

  async getTrackPlatforms(trackId: string) {
    return await prisma.trackPlatform.findMany({ where: { trackId } });
  },

  // ============ ALBUM COLLABORATORS ============
  async addCollaborator(albumId: string, artistId: string, role: string = 'featured') {
    return await prisma.albumCollaborator.create({
      data: { albumId, artistId, role },
      include: { artist: { select: { id: true, name: true, avatar: true } } },
    });
  },

  async removeCollaborator(albumId: string, artistId: string) {
    return await prisma.albumCollaborator.delete({
      where: { albumId_artistId: { albumId, artistId } },
    });
  },

  async getCollaborators(albumId: string) {
    return await prisma.albumCollaborator.findMany({
      where: { albumId },
      include: { artist: { select: { id: true, name: true, avatar: true } } },
    });
  },

  // ============ REVENUE SPLITS ============
  async getRevenueSplits(albumId: string) {
    return await prisma.revenueSplit.findMany({
      where: { albumId },
      include: { artist: { select: { id: true, name: true, avatar: true } } },
    });
  },

  async setRevenueSplits(albumId: string, splits: { artistId: string; percentage: number }[]) {
    // Delete existing and recreate
    await prisma.revenueSplit.deleteMany({ where: { albumId } });
    if (splits.length > 0) {
      await prisma.revenueSplit.createMany({
        data: splits.map(s => ({ albumId, artistId: s.artistId, percentage: s.percentage })),
      });
    }
    return await prisma.revenueSplit.findMany({
      where: { albumId },
      include: { artist: { select: { id: true, name: true, avatar: true } } },
    });
  },

  // ============ PLATFORM REVENUE & PAYMENTS ============
  async upsertPlatformRevenue(albumId: string, platform: string, totalRevenue: number) {
    return await prisma.platformRevenue.upsert({
      where: { albumId_platform: { albumId, platform } },
      update: { totalRevenue },
      create: { albumId, platform, totalRevenue },
    });
  },

  async addPlatformPayment(albumId: string, platform: string, amount: number, note?: string) {
    return await prisma.platformPayment.create({
      data: {
        albumId,
        platform,
        amount,
        note,
      },
    });
  },

  // ============ TRACKS ============
  async getTracksByAlbumId(albumId: string) {
    return await prisma.track.findMany({
      where: { albumId },
      include: { platforms: true },
      orderBy: { createdAt: 'asc' },
    });
  },

  async getTrackById(id: string) {
    return await prisma.track.findUnique({
      where: { id },
      include: { platforms: true },
    });
  },

  async updateTrack(id: string, data: any) {
    return await prisma.track.update({
      where: { id },
      data,
      include: { platforms: true },
    });
  },
  // ============ ANALYTICS ============
  async getAnalytics() {
    return await prisma.analytics.findMany({
      orderBy: { date: 'desc' },
    });
  },

  async getAnalyticsByArtistId(artistId: string) {
    return await prisma.analytics.findMany({
      where: { artistId },
      orderBy: { date: 'desc' },
    });
  },

  async getAnalyticsByAlbumId(albumId: string) {
    return await prisma.analytics.findMany({
      where: { albumId },
      orderBy: { date: 'desc' },
    });
  },

  async createAnalytics(data: any) {
    return await prisma.analytics.create({ data });
  },

  // ============ AGGREGATE FUNCTIONS ============
  async getTotalStats() {
    const [artistCount, albumCount, analyticsData] = await Promise.all([
      prisma.artist.count(),
      prisma.album.count(),
      prisma.analytics.aggregate({
        _sum: { streams: true, revenue: true },
      }),
    ]);

    return {
      totalArtists: artistCount,
      totalAlbums: albumCount,
      totalStreams: analyticsData._sum.streams || 0,
      totalRevenue: analyticsData._sum.revenue || 0,
    };
  },

  async getArtistStats(artistId: string) {
    const artist = await prisma.artist.findUnique({
      where: { id: artistId },
    });

    const analytics = await prisma.analytics.aggregate({
      where: { artistId },
      _sum: { streams: true, revenue: true },
    });

    return {
      artist,
      totalStreams: analytics._sum.streams || 0,
      totalRevenue: analytics._sum.revenue || 0,
    };
  },

  // ============ CLEANUP ============
  async disconnect() {
    await prisma.$disconnect();
  },
};

