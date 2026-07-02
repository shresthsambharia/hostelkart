import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn('[Cloudinary Warning] Missing Cloudinary environment variables. Image uploads will fail.');
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  return true;
};

// Auto-run configuration on module load
configureCloudinary();

/**
 * Uploads a file buffer to Cloudinary using streams
 * @param {Buffer} buffer - File buffer from multer
 * @param {string} folder - Target folder path on Cloudinary
 * @returns {Promise<object>} Upload response from Cloudinary
 */
export const uploadBufferToCloudinary = (buffer, folder = 'hostelkart') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

/**
 * Uploads a local file path to Cloudinary
 * @param {string} filePath - Absolute path to local file
 * @param {string} folder - Target folder path on Cloudinary
 * @returns {Promise<object>} Upload response from Cloudinary
 */
export const uploadLocalFileToCloudinary = (filePath, folder = 'hostelkart') => {
  return cloudinary.uploader.upload(filePath, { folder });
};

/**
 * Deletes an image from Cloudinary using its public ID
 * @param {string} publicId - Cloudinary public ID of the resource
 * @returns {Promise<object>} Deletion response
 */
export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return null;
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error(`[Cloudinary Error] Failed to delete publicId: ${publicId}`, error);
    return null;
  }
};

/**
 * Parses and extracts the public ID of a resource from its Cloudinary URL
 * @param {string} url - Secure URL of a Cloudinary asset
 * @returns {string|null} The public ID or null
 */
export const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes('res.cloudinary.com')) return null;
  
  // Format: https://res.cloudinary.com/<cloud_name>/image/upload/<version>/<public_id>.<ext>
  const parts = url.split('image/upload/');
  if (parts.length < 2) return null;

  const publicIdWithVersionAndExt = parts[1];
  let publicIdWithExt = publicIdWithVersionAndExt;
  
  // Remove version prefix (e.g., v1782416904/)
  const versionMatch = publicIdWithVersionAndExt.match(/^v\d+\/(.+)$/);
  if (versionMatch) {
    publicIdWithExt = versionMatch[1];
  }

  // Strip extension
  const lastDotIndex = publicIdWithExt.lastIndexOf('.');
  if (lastDotIndex === -1) return publicIdWithExt;
  return publicIdWithExt.substring(0, lastDotIndex);
};

/**
 * Generates transformed Cloudinary URL variants for responsive image scaling
 */
export const getMediumUrl = (url) => {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const parts = url.split('image/upload/');
  return `${parts[0]}image/upload/w_300,f_auto,q_auto/${parts[1]}`;
};

export const getThumbUrl = (url) => {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const parts = url.split('image/upload/');
  return `${parts[0]}image/upload/w_100,f_auto,q_auto/${parts[1]}`;
};

export const getOriginalUrl = (url) => {
  if (!url || !url.includes('res.cloudinary.com')) return url;
  const parts = url.split('image/upload/');
  return `${parts[0]}image/upload/f_auto,q_auto/${parts[1]}`;
};
