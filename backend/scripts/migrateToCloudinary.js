import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { uploadLocalFileToCloudinary, getMediumUrl, getThumbUrl, getOriginalUrl } from '../config/cloudinary.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart';

async function runMigration() {
  try {
    console.log('[Migration] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[Migration] MongoDB connected.');

    // 1. Migrate Products
    const products = await Product.find({});
    console.log(`[Migration] Auditing ${products.length} products...`);
    let productMigratedCount = 0;

    for (const product of products) {
      if (product.image && product.image.startsWith('/uploads/')) {
        const filename = product.image.replace('/uploads/', '');
        
        let originalFilename = filename;
        if (filename.includes('-medium.webp')) {
          originalFilename = filename.replace('-medium.webp', '-original.webp');
        } else if (filename.includes('-thumb.webp')) {
          originalFilename = filename.replace('-thumb.webp', '-original.webp');
        }

        const localFilePath = path.join(UPLOADS_DIR, originalFilename);
        const fallbackFilePath = path.join(UPLOADS_DIR, filename);

        let finalFilePath = null;
        if (fs.existsSync(localFilePath)) {
          finalFilePath = localFilePath;
        } else if (fs.existsSync(fallbackFilePath)) {
          finalFilePath = fallbackFilePath;
        }

        if (finalFilePath) {
          console.log(`[Migration] Migrating Product: "${product.name}" | File: ${path.basename(finalFilePath)}`);
          
          const uploadResult = await uploadLocalFileToCloudinary(finalFilePath, 'hostelkart/products');
          
          product.image = getMediumUrl(uploadResult.secure_url);
          product.imageOriginal = getOriginalUrl(uploadResult.secure_url);
          product.imageMedium = getMediumUrl(uploadResult.secure_url);
          product.imageThumb = getThumbUrl(uploadResult.secure_url);

          await product.save();
          productMigratedCount++;
          console.log(`[Migration] Success! New Cloudinary URL: ${product.image}`);
        } else {
          console.warn(`[Migration Warning] Could not find local file for product: "${product.name}" (Filename: ${filename})`);
        }
      }
    }

    // 2. Migrate Categories
    const categories = await Category.find({});
    console.log(`[Migration] Auditing ${categories.length} categories...`);
    let categoryMigratedCount = 0;

    for (const category of categories) {
      if (category.image && category.image.startsWith('/uploads/')) {
        const filename = category.image.replace('/uploads/', '');
        const localFilePath = path.join(UPLOADS_DIR, filename);

        if (fs.existsSync(localFilePath)) {
          console.log(`[Migration] Migrating Category: "${category.name}" | File: ${filename}`);
          
          const uploadResult = await uploadLocalFileToCloudinary(localFilePath, 'hostelkart/categories');
          
          category.image = getOriginalUrl(uploadResult.secure_url); // Or getMediumUrl
          await category.save();
          categoryMigratedCount++;
          console.log(`[Migration] Success! New Cloudinary URL: ${category.image}`);
        } else {
          console.warn(`[Migration Warning] Could not find local file for category: "${category.name}" (Filename: ${filename})`);
        }
      }
    }

    console.log(`\n[Migration Complete]`);
    console.log(`- Products migrated: ${productMigratedCount}`);
    console.log(`- Categories migrated: ${categoryMigratedCount}`);
    process.exit(0);
  } catch (error) {
    console.error('[Migration Error] Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
