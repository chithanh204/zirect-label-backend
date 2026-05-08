import { Router, type Router as ExpressRouter } from 'express';
import * as dashboardController from '@controllers/dashboardController';
import { authMiddleware, adminMiddleware } from '@middleware/auth';

const router: ExpressRouter = Router();

router.get(
  '/dashboard',
  authMiddleware,
  adminMiddleware,
  dashboardController.getDashboardOverview
);

router.get('/reports', authMiddleware, adminMiddleware, dashboardController.getReports);

router.get(
  '/processing-queue',
  authMiddleware,
  adminMiddleware,
  dashboardController.getAlbumProcessingQueue
);

router.post(
  '/albums/:id/approve',
  authMiddleware,
  adminMiddleware,
  dashboardController.approveAlbum
);

router.post(
  '/albums/:id/reject',
  authMiddleware,
  adminMiddleware,
  dashboardController.rejectAlbum
);

export default router;
