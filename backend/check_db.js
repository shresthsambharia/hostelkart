import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart');
  const products = await Product.find({}).limit(2);
  console.log(JSON.stringify(products.map(p => ({
    name: p.name,
    image: p.image,
    imageOriginal: p.imageOriginal,
    imageMedium: p.imageMedium,
    imageThumb: p.imageThumb
  })), null, 2));
  process.exit(0);
};

run();
