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
      include: { tracks: true },
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
