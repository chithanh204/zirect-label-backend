import { Router, type Router as ExpressRouter } from 'express';
import * as artistController from '@controllers/artistController';
import { authMiddleware, artistMiddleware, adminMiddleware } from '@middleware/auth';

const router: ExpressRouter = Router();

router.get('/', artistController.getAllArtists);
router.get('/stats', artistController.getArtistStats);
router.post('/', authMiddleware, adminMiddleware, artistController.createArtist);
router.post('/:id/reset-password', authMiddleware, adminMiddleware, artistController.resetArtistPassword);
router.get('/profile/me', authMiddleware, artistMiddleware, artistController.getMyArtistProfile);
router.put('/profile/me', authMiddleware, artistMiddleware, artistController.updateArtistProfile);
router.get('/:id', artistController.getArtistById);
router.put('/:id/payment/verify', authMiddleware, adminMiddleware, artistController.verifyPaymentInfo);

export default router;
