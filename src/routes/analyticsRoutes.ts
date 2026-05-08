import { Router, type Router as ExpressRouter } from 'express';
import * as analyticsController from '@controllers/analyticsController';
import { authMiddleware, artistMiddleware } from '@middleware/auth';

const router: ExpressRouter = Router();

router.get('/', authMiddleware, artistMiddleware, analyticsController.getAnalytics);
router.get('/dashboard', authMiddleware, artistMiddleware, analyticsController.getDashboardStats);
router.get('/top-tracks', authMiddleware, artistMiddleware, analyticsController.getTopTracks);

export default router;
