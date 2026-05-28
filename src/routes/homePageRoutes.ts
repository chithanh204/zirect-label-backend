import { Router, type Router as ExpressRouter } from 'express';
import * as homePageController from '@controllers/homePageController';
import { authMiddleware, adminMiddleware } from '@middleware/auth';

const router: ExpressRouter = Router();

// Public routes
router.get('/config', homePageController.getHomePageConfig);
router.get('/featured', homePageController.getFeaturedReleases);

// Admin routes
router.put('/admin/config', authMiddleware, adminMiddleware, homePageController.updateHomePageConfig);
router.post('/admin/featured', authMiddleware, adminMiddleware, homePageController.createFeaturedRelease);
router.put('/admin/featured/reorder', authMiddleware, adminMiddleware, homePageController.reorderFeaturedReleases);
router.put('/admin/featured/:id', authMiddleware, adminMiddleware, homePageController.updateFeaturedRelease);
router.delete('/admin/featured/:id', authMiddleware, adminMiddleware, homePageController.deleteFeaturedRelease);

export default router;
