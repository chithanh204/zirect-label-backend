import { Router, type Router as ExpressRouter } from 'express';
import * as albumController from '@controllers/albumController';
import { authMiddleware, artistMiddleware, adminMiddleware } from '@middleware/auth';

const router: ExpressRouter = Router();

router.get('/', albumController.getAllAlbums);
router.get('/stats', albumController.getAlbumStats);
router.get('/my/list', authMiddleware, artistMiddleware, albumController.getMyAlbums);
router.post('/', authMiddleware, artistMiddleware, albumController.createAlbum);
router.post('/admin', authMiddleware, adminMiddleware, albumController.createAlbumAdmin);

// Album detail
router.get('/:id/detail', albumController.getAlbumDetail);

// Spotify tracks & LastFM streams
router.get('/:id/spotify-tracks', albumController.getAlbumSpotifyTracks);

// Collaborators
router.post('/:id/collaborators', authMiddleware, adminMiddleware, albumController.addCollaborator);
router.delete('/:id/collaborators/:artistId', authMiddleware, adminMiddleware, albumController.removeCollaborator);

// Track platforms (stream/copyright per platform)
router.put('/tracks/:trackId/platforms', authMiddleware, adminMiddleware, albumController.updateTrackPlatform);

// Track metadata & addition
router.post('/:id/tracks', authMiddleware, adminMiddleware, albumController.addTrack);
router.put('/tracks/:trackId/metadata', authMiddleware, adminMiddleware, albumController.updateTrackMetadata);

// Revenue splits
router.get('/:id/revenue-split', albumController.getRevenueSplits);
router.put('/:id/revenue-split', authMiddleware, adminMiddleware, albumController.updateRevenueSplits);

// Platform Revenue & Payments
router.put('/:id/revenue/accumulate', authMiddleware, adminMiddleware, albumController.accumulateAlbumRevenue);
router.put('/:id/revenue/:platform', authMiddleware, adminMiddleware, albumController.updatePlatformRevenue);
router.post('/:id/payments/:platform', authMiddleware, adminMiddleware, albumController.addPlatformPayment);

// Album revenue payment logs and summary
router.get('/:id/payment-summary', authMiddleware, adminMiddleware, albumController.getAlbumPaymentSummary);
router.post('/:id/payments', authMiddleware, adminMiddleware, albumController.addAlbumPaymentLog);
router.get('/:id/payment-logs', authMiddleware, adminMiddleware, albumController.getAlbumPaymentLogs);

// Album status
router.get('/:id', albumController.getAlbumById);
router.put('/:id/status', authMiddleware, adminMiddleware, albumController.updateAlbumStatus);
router.delete('/:id', authMiddleware, adminMiddleware, albumController.deleteAlbum);

export default router;
