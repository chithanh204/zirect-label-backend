import { Router, type Router as ExpressRouter } from 'express';
import multer from 'multer';
import * as revenueController from '@controllers/revenueController';
import { authMiddleware, adminMiddleware } from '@middleware/auth';

const router: ExpressRouter = Router();

// Configure multer for memory storage (file stored in buffer) for Excel import
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.endsWith('.xlsx') ||
      file.originalname.endsWith('.xls')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed.'));
    }
  },
});

// Admin Routes
router.post(
  '/import',
  authMiddleware,
  adminMiddleware,
  upload.single('file'),
  revenueController.importRevenue
);

router.get(
  '/artists',
  authMiddleware,
  adminMiddleware,
  revenueController.getArtistPaymentSummary
);

router.get(
  '/artists/:id/unpaid-albums',
  authMiddleware,
  adminMiddleware,
  revenueController.getArtistUnpaidAlbums
);

router.post(
  '/payout',
  authMiddleware,
  adminMiddleware,
  revenueController.processPayout
);

router.post(
  '/artists/:id/verify-paypal',
  authMiddleware,
  adminMiddleware,
  revenueController.verifyPayPal
);

// Artist Routes
router.put(
  '/my-paypal',
  authMiddleware,
  revenueController.updateMyPayPal
);

router.get(
  '/my-payments',
  authMiddleware,
  revenueController.getMyPayments
);

export default router;
