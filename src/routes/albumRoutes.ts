import { Router, type Router as ExpressRouter } from 'express';
import * as albumController from '@controllers/albumController';
import { authMiddleware, artistMiddleware, adminMiddleware } from '@middleware/auth';

const router: ExpressRouter = Router();

router.get('/', albumController.getAllAlbums);
router.get('/stats', albumController.getAlbumStats);
router.get('/my/list', authMiddleware, artistMiddleware, albumController.getMyAlbums);
router.post('/', authMiddleware, artistMiddleware, albumController.createAlbum);
router.post('/admin', authMiddleware, adminMiddleware, albumController.createAlbumAdmin);
router.get('/:id', albumController.getAlbumById);
router.put('/:id/status', authMiddleware, adminMiddleware, albumController.updateAlbumStatus);

export default router;
