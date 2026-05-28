import { Router, type Router as ExpressRouter } from 'express';
import multer from 'multer';
import * as uploadController from '@controllers/uploadController';
import { authMiddleware, adminMiddleware } from '@middleware/auth';

const router: ExpressRouter = Router();

// Configure multer for memory storage (files stored in buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB max - cover art can be large (≥2000×2000px)
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF'));
    }
  },
});

router.post(
  '/image',
  authMiddleware,
  adminMiddleware,
  upload.single('image'),
  uploadController.uploadImage
);

export default router;
