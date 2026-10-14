import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const GENERIC_FALLBACK_IMAGE = 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000000/hostelkart_fallback.jpg';

export const stationeryProductsToAdd = [
  // 1. Notebook 1 of 8
  {
    name: 'Classmate Pulse 6 Subject Notebook, Multicolor, 1 Piece',
    price: 180,
    mrp: 180,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: 'Classmate',
    description: 'Classmate Pulse 6 Subject Notebook with vibrant multicolor divider sheets. High-quality smooth paper for college lecture notes and assignments.',
    image: GENERIC_FALLBACK_IMAGE,
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
    brand: 'HostelKart Stationery',
    description: 'To-Do List daily task planner diary with checkboxes for organizing studies and hostel routines.',
    image: GENERIC_FALLBACK_IMAGE,
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
    brand: 'HostelKart Stationery',
    description: 'Daily agenda and time-blocking planner diary with premium hardbound cover for students.',
    image: GENERIC_FALLBACK_IMAGE,
    isAvailable: true,
    approvalStatus: 'approved',
  },
  // 2. Notebook 2 of 8
  {
    name: 'Navneet Spiral Notebook, Design may vary',
    price: 140,
    mrp: 140,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: 'Navneet',
    description: 'Navneet spiral-bound notebook with durable protective cover. Premium ruled pages suitable for university coursework (cover design may vary).',
    image: GENERIC_FALLBACK_IMAGE,
    isAvailable: true,
    approvalStatus: 'approved',
  },
  // 3. Notebook 3 of 8
  {
    name: 'Navneet Yuva Spiral Notebook, Multicolor',
    price: 190,
    mrp: 190,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: 'Navneet',
    description: 'Navneet Yuva series spiral notebook featuring vibrant multicolor cover styling and high-grade bright writing sheets.',
    image: GENERIC_FALLBACK_IMAGE,
    isAvailable: true,
    approvalStatus: 'approved',
  },
  // 4. Notebook 4 of 8
  {
    name: 'Yuva Spiral Notebook',
    price: 160,
    mrp: 160,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: 'Yuva',
    description: 'Yuva series spiral notebook with smooth ruled pages for everyday hostel study, lectures and exam preparation.',
    image: GENERIC_FALLBACK_IMAGE,
    isAvailable: true,
    approvalStatus: 'approved',
  },
  // 5. Notebook 5 of 8
  {
    name: 'Classmate Pulse 6 Subject Notebook, Design may vary',
    price: 140,
    mrp: 140,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: 'Classmate',
    description: 'Classmate Pulse 6 Subject notebook with multi-section dividers and sturdy binding for organizing multiple course subjects (design may vary).',
    image: GENERIC_FALLBACK_IMAGE,
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
    brand: 'Creative Space',
    description: 'Outline political map of India pack (10 sheets) with clear boundary demarcation for academic projects.',
    image: GENERIC_FALLBACK_IMAGE,
    isAvailable: true,
    approvalStatus: 'approved',
  },
  // 6. Notebook 6 of 8 (₹60 variant)
  {
    name: 'Classmate Notebook, 1 Piece',
    price: 60,
    mrp: 60,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: 'Classmate',
    description: 'Classmate long-size single subject notebook (1 Piece) with ozone-treated elemental chlorine-free paper for smooth writing.',
    image: GENERIC_FALLBACK_IMAGE,
    isAvailable: true,
    approvalStatus: 'approved',
  },
  // 7. Notebook 7 of 8 (₹48 variant)
  {
    name: 'Classmate Notebook, 1 Piece',
    price: 48,
    mrp: 48,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: 'Classmate',
    description: 'Classmate standard-size notebook (1 Piece) with premium ruled pages, ideal for practicals, problem sheets, and daily notes.',
    image: GENERIC_FALLBACK_IMAGE,
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
    brand: 'Classmate',
    description: 'Classmate millimeter grid graph book for engineering graphics, physics and mathematics practicals.',
    image: GENERIC_FALLBACK_IMAGE,
    isAvailable: true,
    approvalStatus: 'approved',
  },
  // 8. Notebook 8 of 8
  {
    name: 'Classmate Exercise Notebook',
    price: 50,
    mrp: 50,
    category: 'Stationery',
    stock: 50,
    discount: 0,
    deliveryTime: 'Scheduled Delivery',
    brand: 'Classmate',
    description: 'Classmate exercise notebook with durable softbound cover and neatly ruled pages for campus exercises and tutorials.',
    image: GENERIC_FALLBACK_IMAGE,
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
  let updatedCount = 0;
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
      const updates = {};
      // Update image to fallback if currently empty
      if ((!exists.image || exists.image.trim() === '') && item.image) {
        updates.image = item.image;
      }
      // Update description if currently empty
      if ((!exists.description || exists.description.trim() === '') && item.description) {
        updates.description = item.description;
      }
      // Update brand if currently empty
      if ((!exists.brand || exists.brand.trim() === '') && item.brand) {
        updates.brand = item.brand;
      }

      if (Object.keys(updates).length > 0) {
        await Product.updateOne({ _id: exists._id }, { $set: updates });
        console.log(`✓ Updated missing fields on existing: "${item.name}" (₹${item.price}) [ID: ${exists._id}]`);
        updatedCount++;
      } else {
        console.log(`- Already exists & up-to-date: "${item.name}" (₹${item.price}) [ID: ${exists._id}]`);
      }
    }
  }

  console.log(`\nTotal newly inserted Stationery products: ${insertedCount}`);
  console.log(`Total updated Stationery products: ${updatedCount}`);

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
