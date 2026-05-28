import { Router, type Router as ExpressRouter } from 'express';
import * as contractController from '@controllers/contractController';
import { authMiddleware, adminMiddleware } from '@middleware/auth';

const router: ExpressRouter = Router();

// Public route
router.post('/submit', contractController.submitContract);

// Admin routes
router.get('/admin', authMiddleware, adminMiddleware, contractController.getContracts);
router.put('/admin/:id/status', authMiddleware, adminMiddleware, contractController.updateContractStatus);

export default router;
