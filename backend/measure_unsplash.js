import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart');
    const products = await Product.find({}).limit(12);
    
    console.log("Analyzing 10 products' images...");
    for (let i = 0; i < 10; i++) {
      const p = products[i];
      if (!p) continue;
      
      const imageUrl = p.image;
      // Get sizes for both raw Unsplash URL (without w=400) and seeded URL
      const rawUrl = imageUrl.split('?')[0];
      
      let seededSize = 'Unknown';
      let rawSize = 'Unknown';
      let seededFormat = 'Unknown';
      let rawFormat = 'Unknown';
      
      try {
        const resSeeded = await fetch(imageUrl, { method: 'HEAD' });
        seededSize = resSeeded.headers.get('content-length') || 'Unknown';
        seededFormat = resSeeded.headers.get('content-type') || 'Unknown';
      } catch (err) {
        // Fallback
      }
      
      try {
        const resRaw = await fetch(rawUrl, { method: 'HEAD' });
        rawSize = resRaw.headers.get('content-length') || 'Unknown';
        rawFormat = resRaw.headers.get('content-type') || 'Unknown';
      } catch (err) {
        // Fallback
      }
      
      console.log(`Product: ${p.name}`);
      console.log(`  Seeded URL: ${imageUrl}`);
      console.log(`    Size: ${seededSize !== 'Unknown' ? (seededSize / 1024).toFixed(2) + ' KB' : 'Unknown'}`);
      console.log(`    Format: ${seededFormat}`);
      console.log(`  Raw Unsplash URL: ${rawUrl}`);
      console.log(`    Size: ${rawSize !== 'Unknown' ? (rawSize / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}`);
      console.log(`    Format: ${rawFormat}`);
      console.log('------------------------------------------------');
    }
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

run();
