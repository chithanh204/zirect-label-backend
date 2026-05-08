import { Response } from 'express';
import type { AuthRequest } from '@middleware/auth';
import { sendSuccess, sendError, handleError } from '@utils/response';
import { uploadToCloudinary } from '@config/cloudinary';

export const uploadImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.type !== 'admin') {
      sendError(res, 'Only admins can upload images', 403);
      return;
    }

    if (!req.file) {
      sendError(res, 'No image file provided', 400);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      sendError(res, 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF', 400);
      return;
    }

    // Get folder from query param or default to avatars
    const folder = (req.query.folder as string) || 'zirect/avatars';

    const result = await uploadToCloudinary(req.file.buffer, folder);

    sendSuccess(
      res,
      {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      },
      'Image uploaded successfully',
      200
    );
  } catch (error) {
    handleError(res, error, 'Failed to upload image');
  }
};
