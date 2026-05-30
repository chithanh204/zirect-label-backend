import { Router, type Router as ExpressRouter } from 'express';
import {
  syncArtistData,
  syncAlbumData,
  searchTracks,
  searchArtists,
  getTrackDetails,
  getArtistDetails,
  getArtistAnalytics,
  getAlbumAnalytics,
  searchAlbumMetadata,
  importAlbumData,
} from '../controllers/syncController';
import { authMiddleware } from '../middleware/auth';

const router: ExpressRouter = Router();

// All sync routes require authentication
router.use(authMiddleware);

/**
 * POST /api/sync/artist/:artistId
 * Sync artist data from all platforms
 */
router.post('/artist/:artistId', syncArtistData);

/**
 * POST /api/sync/album/:albumId
 * Sync album data from all platforms
 */
router.post('/album/:albumId', syncAlbumData);

/**
 * GET /api/sync/search/tracks
 * Search for tracks across all platforms
 * Query params: query, limit
 */
router.get('/search/tracks', searchTracks);

/**
 * GET /api/sync/search/artists
 * Search for artists across all platforms
 * Query params: query, limit
 */
router.get('/search/artists', searchArtists);

/**
 * GET /api/sync/track-details
 * Get detailed track info from all platforms
 * Query params: artist, track
 */
router.get('/track-details', getTrackDetails);

/**
 * GET /api/sync/artist/:artistName/details
 * Get detailed artist info from all platforms
 */
router.get('/artist/:artistName/details', getArtistDetails);

/**
 * GET /api/sync/analytics/artist/:artistId
 * Get aggregated analytics for an artist
 * Query params: days
 */
router.get('/analytics/artist/:artistId', getArtistAnalytics);

/**
 * GET /api/sync/analytics/album/:albumId
 * Get aggregated analytics for an album
 * Query params: days
 */
router.get('/analytics/album/:albumId', getAlbumAnalytics);

/**
 * GET /api/sync/album/search-metadata
 * Search for album metadata across platforms
 * Query params: albumTitle, artistName
 */
router.get('/album/search-metadata', searchAlbumMetadata);

/**
 * GET /api/sync/album/import-data
 * Import full album data from platforms
 * Query params: albumTitle, artistName
 */
router.get('/album/import-data', importAlbumData);

export default router;
