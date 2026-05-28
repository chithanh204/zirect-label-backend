import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { prisma } from '@models/prisma';

// ============ PUBLIC ENDPOINTS ============

export const getHomePageConfig = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const config = await prisma.homePage.findUnique({
      where: { id: 'singleton' },
    });
    sendSuccess(res, config || {}, 'Home page config retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get home page config');
  }
};

export const getFeaturedReleases = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const releases = await prisma.featuredRelease.findMany({
      orderBy: { order: 'asc' },
      take: 15,
    });
    sendSuccess(res, releases, 'Featured releases retrieved successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to get featured releases');
  }
};

// ============ ADMIN ENDPOINTS ============

export const updateHomePageConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { logoUrl, title, description } = req.body;

    const config = await prisma.homePage.upsert({
      where: { id: 'singleton' },
      update: { logoUrl, title, description },
      create: { id: 'singleton', logoUrl, title, description },
    });

    sendSuccess(res, config, 'Home page config updated successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update home page config');
  }
};

export const createFeaturedRelease = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { trackName, artistNames, spotifyLink, youtubeLink, coverArt, order } = req.body;

    if (!trackName || !artistNames) {
      sendError(res, 'Track name and artist names are required', 400);
      return;
    }

    const release = await prisma.featuredRelease.create({
      data: {
        trackName,
        artistNames,
        spotifyLink,
        youtubeLink,
        coverArt,
        order: order || 0,
      },
    });

    sendSuccess(res, release, 'Featured release created successfully', 201);
  } catch (error) {
    handleError(res, error, 'Failed to create featured release');
  }
};

export const updateFeaturedRelease = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { id } = req.params;
    const { trackName, artistNames, spotifyLink, youtubeLink, coverArt, order } = req.body;

    const release = await prisma.featuredRelease.update({
      where: { id },
      data: {
        trackName,
        artistNames,
        spotifyLink,
        youtubeLink,
        coverArt,
        order: order !== undefined ? order : undefined,
      },
    });

    sendSuccess(res, release, 'Featured release updated successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to update featured release');
  }
};

export const deleteFeaturedRelease = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { id } = req.params;

    await prisma.featuredRelease.delete({
      where: { id },
    });

    sendSuccess(res, null, 'Featured release deleted successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to delete featured release');
  }
};

export const reorderFeaturedReleases = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Admin access required', 403);
      return;
    }

    const { releases } = req.body; // Array of { id: string, order: number }

    if (!releases || !Array.isArray(releases)) {
      sendError(res, 'Releases array is required', 400);
      return;
    }

    const updates = releases.map((r) =>
      prisma.featuredRelease.update({
        where: { id: r.id },
        data: { order: r.order },
      })
    );

    await prisma.$transaction(updates);

    sendSuccess(res, null, 'Featured releases reordered successfully', 200);
  } catch (error) {
    handleError(res, error, 'Failed to reorder featured releases');
  }
};
