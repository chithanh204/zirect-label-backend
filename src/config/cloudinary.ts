import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Upload a buffer to Cloudinary
 * @param buffer - The file buffer to upload
 * @param folder - The Cloudinary folder (e.g., 'zirect/avatars', 'zirect/covers')
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string = 'zirect/avatars'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    // Use different transformations based on folder (covers need higher quality)
    const isCover = folder.includes('covers');
    const transformation = isCover
      ? [
          { width: 3000, height: 3000, crop: 'limit' as const },
          { quality: 90, fetch_format: 'auto' as const },
        ]
      : [
          { width: 500, height: 500, crop: 'limit' as const },
          { quality: 'auto' as const, fetch_format: 'auto' as const },
        ];

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        } else {
          reject(new Error('Upload failed: no result returned'));
        }
      }
    );
    uploadStream.end(buffer);
  });
};

export default cloudinary;
