import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect uploads directory location dynamically
let UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  UPLOADS_DIR = path.join(process.cwd(), 'uploads');
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart';

const runAudit = async () => {
  try {
    console.log('[Audit] Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('[Audit] Connected to MongoDB.');

    console.log(`[Audit] Checking uploads directory path: ${UPLOADS_DIR}`);
    if (!fs.existsSync(UPLOADS_DIR)) {
      console.log('[Audit] Uploads directory does not exist on disk.');
      process.exit(0);
    }
    const diskFiles = fs.readdirSync(UPLOADS_DIR).filter(f => fs.statSync(path.join(UPLOADS_DIR, f)).isFile());
    console.log(`[Audit] Found ${diskFiles.length} upload files on disk.`);

    // 2. Get all referenced uploads in database
    const products = await Product.find({});
    const referencedFiles = new Set();

    products.forEach((p) => {
      ['image', 'imageOriginal', 'imageMedium', 'imageThumb'].forEach((field) => {
        const val = p[field];
        if (val && val.startsWith('/uploads/')) {
          const filename = val.replace('/uploads/', '');
          referencedFiles.add(filename);
        }
      });
    });

    console.log(`[Audit] Found ${referencedFiles.size} unique upload files referenced in MongoDB.`);

    // 3. Find orphaned uploads (on disk, but not in DB)
    const orphanedFiles = diskFiles.filter(f => !referencedFiles.has(f));

    // 4. Find missing uploads (referenced in DB, but not on disk)
    const missingFiles = [];
    referencedFiles.forEach((f) => {
      const fullPath = path.join(UPLOADS_DIR, f);
      if (!fs.existsSync(fullPath)) {
        missingFiles.push(f);
      }
    });

    console.log('\n================ AUDIT RESULTS ================');
    console.log(`Orphaned upload files (on disk, not referenced in DB): ${orphanedFiles.length}`);
    if (orphanedFiles.length > 0) {
      orphanedFiles.slice(0, 10).forEach(f => console.log(`  - ${f}`));
      if (orphanedFiles.length > 10) console.log(`  ... and ${orphanedFiles.length - 10} more`);
    }

    console.log(`\nMissing upload files (referenced in DB, not found on disk): ${missingFiles.length}`);
    if (missingFiles.length > 0) {
      missingFiles.slice(0, 10).forEach(f => console.log(`  - ${f}`));
      if (missingFiles.length > 10) console.log(`  ... and ${missingFiles.length - 10} more`);
    }
    console.log('===============================================\n');

    process.exit(0);
  } catch (error) {
    console.error('[Audit Error] Audit failed:', error);
    process.exit(1);
  }
};

runAudit();
