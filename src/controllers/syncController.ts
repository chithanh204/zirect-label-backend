import { Request, Response } from 'express';
import { analyticsSyncService, platformSearchService, albumImportService } from '../services';
import { sendSuccess, sendError } from '../utils/response';
import { db } from '../models/prisma';

/**
 * Sync artist data from all platforms
 */
export const syncArtistData = async (req: Request, res: Response) => {
  try {
    const { artistId } = req.params;

    // Verify artist exists
    const artist = await db.getArtistById(artistId);
    if (!artist) {
      return sendError(res, 'Artist not found', 404);
    }

    // Sync data from all platforms
    const results = await analyticsSyncService.syncArtistAnalytics(artistId);

    return sendSuccess(res, results, 'Artist data synced successfully', 200);
  } catch (error) {
    console.error('Sync artist error:', error);
    return sendError(res, (error as any).message || 'Failed to sync artist data', 500);
  }
};

/**
 * Sync album data from all platforms
 */
export const syncAlbumData = async (req: Request, res: Response) => {
  try {
    const { albumId } = req.params;

    // Verify album exists
    const album = await db.getAlbumById(albumId);
    if (!album) {
      return sendError(res, 'Album not found', 404);
    }

    // Sync data from all platforms
    const results = await analyticsSyncService.syncAlbumAnalytics(albumId);

    return sendSuccess(res, results, 'Album data synced successfully', 200);
  } catch (error) {
    console.error('Sync album error:', error);
    return sendError(res, (error as any).message || 'Failed to sync album data', 500);
  }
};

/**
 * Search for tracks across multiple platforms
 */
export const searchTracks = async (req: Request, res: Response) => {
  try {
    const { query, limit = 5 } = req.query;

    if (!query || typeof query !== 'string') {
      return sendError(res, 'Search query is required', 400);
    }

    const results = await platformSearchService.searchTracksMultiPlatform(
      query,
      parseInt(limit as string) || 5
    );

    return sendSuccess(res, results, 'Track search completed', 200);
  } catch (error) {
    console.error('Search tracks error:', error);
    return sendError(res, (error as any).message || 'Failed to search tracks', 500);
  }
};

/**
 * Search for artists across multiple platforms
 */
export const searchArtists = async (req: Request, res: Response) => {
  try {
    const { query, limit = 5 } = req.query;

    if (!query || typeof query !== 'string') {
      return sendError(res, 'Search query is required', 400);
    }

    const results = await platformSearchService.searchArtistsMultiPlatform(
      query,
      parseInt(limit as string) || 5
    );

    return sendSuccess(res, results, 'Artist search completed', 200);
  } catch (error) {
    console.error('Search artists error:', error);
    return sendError(res, (error as any).message || 'Failed to search artists', 500);
  }
};

/**
 * Get detailed track info from all platforms
 */
export const getTrackDetails = async (req: Request, res: Response) => {
  try {
    const { artist, track } = req.query;

    if (!artist || !track) {
      return sendError(res, 'Artist and track name are required', 400);
    }

    const details = await platformSearchService.getTrackDetails(
      artist as string,
      track as string
    );

    return sendSuccess(res, details, 'Track details retrieved', 200);
  } catch (error) {
    console.error('Get track details error:', error);
    return sendError(res, (error as any).message || 'Failed to get track details', 500);
  }
};

/**
 * Get detailed artist info from all platforms
 */
export const getArtistDetails = async (req: Request, res: Response) => {
  try {
    const { artistName } = req.params;

    const details = await platformSearchService.getArtistDetails(artistName);

    return sendSuccess(res, details, 'Artist details retrieved', 200);
  } catch (error) {
    console.error('Get artist details error:', error);
    return sendError(res, (error as any).message || 'Failed to get artist details', 500);
  }
};

/**
 * Get aggregated analytics for an artist
 */
export const getArtistAnalytics = async (req: Request, res: Response) => {
  try {
    const { artistId } = req.params;
    const { days = 30 } = req.query;

    const analytics = await analyticsSyncService.getAggregatedArtistAnalytics(
      artistId,
      parseInt(days as string) || 30
    );

    return sendSuccess(res, analytics, 'Artist analytics retrieved', 200);
  } catch (error) {
    console.error('Get artist analytics error:', error);
    return sendError(res, (error as any).message || 'Failed to get artist analytics', 500);
  }
};

/**
 * Get aggregated analytics for an album
 */
export const getAlbumAnalytics = async (req: Request, res: Response) => {
  try {
    const { albumId } = req.params;
    const { days = 30 } = req.query;

    const analytics = await analyticsSyncService.getAggregatedAlbumAnalytics(
      albumId,
      parseInt(days as string) || 30
    );

    return sendSuccess(res, analytics, 'Album analytics retrieved', 200);
  } catch (error) {
    console.error('Get album analytics error:', error);
    return sendError(res, (error as any).message || 'Failed to get album analytics', 500);
  }
};

/**
 * Search for album metadata across platforms
 */
export const searchAlbumMetadata = async (req: Request, res: Response) => {
  try {
    const { albumTitle, artistName } = req.query;

    if (!albumTitle || !artistName) {
      return sendError(res, 'Album title and artist name are required', 400);
    }

    const metadata = await albumImportService.searchAlbumMetadata(
      albumTitle as string,
      artistName as string
    );

    return sendSuccess(res, metadata, 'Album metadata search completed', 200);
  } catch (error) {
    console.error('Search album metadata error:', error);
    return sendError(res, (error as any).message || 'Failed to search album metadata', 500);
  }
};

/**
 * Import full album data from platforms
 */
export const importAlbumData = async (req: Request, res: Response) => {
  try {
    const { albumTitle, artistName } = req.query;

    if (!albumTitle || !artistName) {
      return sendError(res, 'Album title and artist name are required', 400);
    }

    const albumData = await albumImportService.importAlbumData(
      albumTitle as string,
      artistName as string
    );

    return sendSuccess(res, albumData, 'Album data imported successfully', 200);
  } catch (error) {
    console.error('Import album data error:', error);
    return sendError(res, (error as any).message || 'Failed to import album data', 500);
  }
};
