import path from 'path';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs';
import { protect, admin } from '../middleware/authMiddleware.js';
import { uploadBufferToCloudinary, getMediumUrl, getThumbUrl, getOriginalUrl } from '../config/cloudinary.js';
import Order from '../models/Order.js';

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

// Student/Admin payment screenshot upload endpoint
router.post('/payment-screenshot', protect, upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image file uploaded');
  }

  try {
    // Generate file MD5 hash to prevent duplicates
    const fileHash = crypto.createHash('md5').update(req.file.buffer).digest('hex');
    
    // Check if hash already exists in database
    const duplicate = await Order.findOne({ paymentScreenshotHash: fileHash });
    if (duplicate) {
      res.status(400);
      throw new Error('This payment screenshot has already been submitted for another order!');
    }

    console.log('[Upload] Compressing payment screenshot...');
    let compressedBuffer = req.file.buffer;
    let extension = 'webp';
    try {
      compressedBuffer = await sharp(req.file.buffer)
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
    } catch (sharpError) {
      console.warn('[Upload Warning] Sharp compression failed, using original buffer', sharpError);
      extension = path.extname(req.file.originalname).substring(1) || 'png';
    }

    // Try Cloudinary upload
    try {
      console.log('[Upload] Uploading payment screenshot to Cloudinary...');
      const uploadResult = await uploadBufferToCloudinary(compressedBuffer, 'hostelkart/payments');
      console.log('[Upload] Cloudinary upload successful.');
      
      return res.json({
        message: 'Payment screenshot uploaded successfully to Cloudinary',
        url: uploadResult.secure_url,
        hash: fileHash,
      });
    } catch (cloudinaryError) {
      console.warn('[Upload Warning] Cloudinary upload failed, falling back to local storage', cloudinaryError);
      
      // Local storage fallback
      const filename = `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
      const __dirname = path.resolve();
      const localPath = path.join(__dirname, 'uploads', filename);
      fs.writeFileSync(localPath, compressedBuffer);
      
      return res.json({
        message: 'Payment screenshot uploaded successfully (Local storage fallback)',
        url: `/uploads/${filename}`,
        hash: fileHash,
      });
    }
  } catch (error) {
    console.error('[Upload Error] Payment screenshot upload failed:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
