import path from 'path';
import express from 'express';
import multer from 'multer';
import { protect, admin } from '../middleware/authMiddleware.js';
import { uploadBufferToCloudinary, getMediumUrl, getThumbUrl, getOriginalUrl } from '../config/cloudinary.js';

const router = express.Router();

const storage = multer.memoryStorage();

function checkFileType(file, cb) {
  // Prevent double extension upload bypass attacks (e.g. image.png.php)
  const parts = file.originalname.split('.');
  if (parts.length > 2) {
    return cb(new Error('Images only - multiple file extensions not allowed!'));
  }

  const filetypes = /jpg|jpeg|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Images only (jpg, jpeg, png, webp)!'));
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Enforce 5MB upload file size limit
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// Admin-only upload endpoint (Uploads directly to Cloudinary)
router.post('/', protect, admin, upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image file uploaded');
  }

  try {
    console.log('[Upload] Uploading image buffer to Cloudinary...');
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, 'hostelkart/products');
    
    console.log('[Upload] Cloudinary upload successful.');

    // Construct optimized and responsive formats using Cloudinary transformations
    const imageOriginal = getOriginalUrl(uploadResult.secure_url);
    const imageMedium = getMediumUrl(uploadResult.secure_url);
    const imageThumb = getThumbUrl(uploadResult.secure_url);

    res.send({
      message: 'Image uploaded and optimized on Cloudinary successfully',
      image: imageMedium,
      imageOriginal: imageOriginal,
      imageMedium: imageMedium,
      imageThumb: imageThumb,
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ message: `Cloudinary upload failed: ${error.message}` });
  }
});

export default router;
