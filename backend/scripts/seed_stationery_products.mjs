import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const stationeryProductsToAdd = [
  {
    name: 'Classmate Pulse 6 Subject Notebook, Multicolor, 1 Piece',
    price: 180,
    mrp: 180,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'To-Do List Diary',
    price: 200,
    mrp: 200,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Daily Planner Diary',
    price: 350,
    mrp: 350,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Navneet Spiral Notebook, Design may vary',
    price: 140,
    mrp: 140,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Navneet Yuva Spiral Notebook, Multicolor',
    price: 190,
    mrp: 190,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Yuva Spiral Notebook',
    price: 160,
    mrp: 160,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Classmate Pulse 6 Subject Notebook, Design may vary',
    price: 140,
    mrp: 140,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Creative Space Indian Political Map, White, Blue, 10 Sheets',
    price: 60,
    mrp: 60,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Classmate Notebook, 1 Piece',
    price: 60,
    mrp: 60,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Classmate Notebook, 1 Piece',
    price: 48,
    mrp: 48,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Classmate Graph Book',
    price: 30,
    mrp: 30,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Classmate Exercise Notebook',
    price: 50,
    mrp: 50,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Lab File',
    price: 60,
    mrp: 60,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Pilot V7 Pen',
    price: 80,
    mrp: 80,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Uni-Ball Eye Roller, Roller Ball Pen Blue',
    price: 80,
    mrp: 80,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Pilot Hi-Tech Point 0.5 Ink Pen Blue',
    price: 50,
    mrp: 50,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Pilot V5 Ink Pen Black',
    price: 80,
    mrp: 80,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Reynolds Jiffy Gel Pen Set',
    price: 35,
    mrp: 35,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Uni-Ball Click Gel Pen — 5 Pieces',
    price: 250,
    mrp: 250,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Chameleon Whiteboard Markers Multicolor — 2 Pieces',
    price: 55,
    mrp: 55,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Whiteboard Marker Black Color',
    price: 20,
    mrp: 20,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Pentonic Ball Pen 0.7 mm Tip Size Black — 10 Pieces',
    price: 120,
    mrp: 120,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Apsara Platinum Extra Dark Pencil — 10 Pieces',
    price: 60,
    mrp: 60,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Fun Blast Gel Pen — Different Designs, 5 Pieces',
    price: 270,
    mrp: 270,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Normal Transparent File',
    price: 20,
    mrp: 20,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'Scissor Set — 2 Pieces',
    price: 200,
    mrp: 200,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
  {
    name: 'JK Copier Premium A4 Sheet White — 500 Sheets',
    price: 310,
    mrp: 310,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: '',
    description: '',
    image: '',
    isAvailable: true,
    approvalStatus: 'approved',
  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // Drop normalizedName_1 index if it's unique
  try {
    const indexes = await db.collection('products').indexes();
    const normIndex = indexes.find(i => i.name === 'normalizedName_1');
    if (normIndex && normIndex.unique) {
      console.log('Dropping old unique index normalizedName_1...');
      await db.collection('products').dropIndex('normalizedName_1');
      console.log('✓ Dropped unique normalizedName_1 index');
    }
  } catch (err) {
    console.log('Index drop note:', err.message);
  }

  // Ensure non-unique sparse index
  try {
    await db.collection('products').createIndex({ normalizedName: 1 }, { sparse: true, background: true });
    console.log('✓ Created sparse non-unique normalizedName index');
  } catch (err) {
    console.log('Index create note:', err.message);
  }

  // Check existing Stationery products
  const existingStationery = await Product.find({ category: 'Stationery' }).lean();
  console.log(`Found ${existingStationery.length} existing Stationery products in DB.`);

  let insertedCount = 0;
  for (const item of stationeryProductsToAdd) {
    // Check if exact product with same name and price already exists
    const exists = await Product.findOne({
      name: item.name,
      price: item.price,
      category: 'Stationery'
    });

    if (!exists) {
      const doc = new Product({
        ...item,
        normalizedName: item.name.trim().toLowerCase(),
      });
      await doc.save();
      console.log(`✓ Inserted: "${item.name}" (₹${item.price}) [ID: ${doc._id}]`);
      insertedCount++;
    } else {
      console.log(`- Already exists: "${item.name}" (₹${item.price}) [ID: ${exists._id}]`);
    }
  }

  console.log(`\nTotal newly inserted Stationery products: ${insertedCount}`);

  // Update Category productCount
  const finalStationeryCount = await Product.countDocuments({ category: 'Stationery' });
  await Category.findOneAndUpdate(
    { name: 'Stationery' },
    { $set: { productCount: finalStationeryCount } },
    { upsert: true }
  );
  console.log(`Updated Stationery Category record with productCount: ${finalStationeryCount}`);

  await mongoose.disconnect();
  console.log('Seeding completed successfully!');
}

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
