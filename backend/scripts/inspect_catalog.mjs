import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { STUDENT_VISIBLE_CATEGORIES } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Categories in DB
  const dbCategories = await Category.find({}).lean();
  console.log('\n--- Categories in Category Collection ---');
  console.log(dbCategories.map(c => c.name));

  // All Products in DB
  const allProducts = await Product.find({}).lean();
  console.log(`\nTotal Products in DB: ${allProducts.length}`);

  // Group by category
  const categoryCounts = {};
  allProducts.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });
  console.log('\n--- All Product counts by category in DB ---');
  console.log(categoryCounts);

  // Student Visible Products
  const studentProducts = await Product.find({
    category: { $in: STUDENT_VISIBLE_CATEGORIES },
    approvalStatus: { $in: ['approved', undefined, null] },
    isAvailable: true,
  }).lean();
  console.log(`\nTotal Student-Visible Products: ${studentProducts.length}`);

  console.log('\n--- Student-Visible Products by category ---');
  for (const cat of STUDENT_VISIBLE_CATEGORIES) {
    const prods = studentProducts.filter(p => p.category === cat);
    console.log(`${cat}: ${prods.length} products`);
    prods.forEach(p => console.log(`  - [${p._id}] ${p.name} (Price: ${p.price}, Stock: ${p.stock})`));
  }

  // Admin visible in 5 categories
  console.log('\n--- Admin Products in 5 Categories ---');
  for (const cat of STUDENT_VISIBLE_CATEGORIES) {
    const prods = allProducts.filter(p => p.category === cat);
    console.log(`${cat}: ${prods.length} products (All statuses)`);
    prods.forEach(p => console.log(`  - [${p._id}] ${p.name} (Price: ${p.price}, Stock: ${p.stock}, isAvailable: ${p.isAvailable}, approvalStatus: ${p.approvalStatus})`));
  }

  await mongoose.disconnect();
};

run().catch(console.error);
