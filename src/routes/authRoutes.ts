import { Router, type Router as ExpressRouter } from 'express';
import * as authController from '@controllers/authController';
import { authMiddleware } from '@middleware/auth';

const router: ExpressRouter = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', authMiddleware, authController.getCurrentUser);
router.post('/logout', authController.logout);
router.put('/password', authMiddleware, authController.updatePassword);

export default router;
