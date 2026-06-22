import path from 'path';
import express from 'express';
import multer from 'multer';
import { protect, admin } from '../middleware/authMiddleware.js';
import sharp from 'sharp';
import fs from 'fs';

const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename(req, file, cb) {
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    );
  },
});

function checkFileType(file, cb) {
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
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// Admin-only upload endpoint
router.post('/', protect, admin, upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No image file uploaded');
  }

  try {
    const ext = path.extname(req.file.originalname).toLowerCase();
    const baseFilename = req.file.filename.replace(ext, '');
    
    const originalFilename = `${baseFilename}-original.webp`;
    const mediumFilename = `${baseFilename}-medium.webp`;
    const thumbFilename = `${baseFilename}-thumb.webp`;

    const originalPath = path.join('uploads', originalFilename);
    const mediumPath = path.join('uploads', mediumFilename);
    const thumbPath = path.join('uploads', thumbFilename);

    // 1. Generate original optimized WebP
    await sharp(req.file.path)
      .webp({ quality: 80 })
      .toFile(originalPath);

    // 2. Generate 300px width WebP
    await sharp(req.file.path)
      .resize(300)
      .webp({ quality: 75 })
      .toFile(mediumPath);

    // 3. Generate 100px width WebP
    await sharp(req.file.path)
      .resize(100)
      .webp({ quality: 70 })
      .toFile(thumbPath);

    // 4. Delete the temporary raw uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (unlinkErr) {
      console.error('Error deleting temp uploaded file:', unlinkErr);
    }

    res.send({
      message: 'Image uploaded and optimized successfully',
      image: `/uploads/${mediumFilename}`,
      imageOriginal: `/uploads/${originalFilename}`,
      imageMedium: `/uploads/${mediumFilename}`,
      imageThumb: `/uploads/${thumbFilename}`,
    });
  } catch (error) {
    console.error('Image processing error:', error);
    res.status(500).json({ message: `Image processing failed: ${error.message}` });
  }
});

export default router;
