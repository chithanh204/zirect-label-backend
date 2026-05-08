import { Router, type Router as ExpressRouter } from 'express';
import * as authController from '@controllers/authController';

const router: ExpressRouter = Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.get('/me', authController.getCurrentUser);
router.post('/logout', authController.logout);

export default router;
