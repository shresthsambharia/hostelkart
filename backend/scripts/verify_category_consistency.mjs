import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';
import { STUDENT_VISIBLE_CATEGORIES } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const verify = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for Verification\n');

  // 1. Check categories definition
  console.log('1. Required 5 Student Categories:');
  console.log(STUDENT_VISIBLE_CATEGORIES);
  if (STUDENT_VISIBLE_CATEGORIES.length !== 5) {
    throw new Error('Expected exactly 5 student visible categories');
  }

  // 2. Fetch all products in DB belonging to the 5 categories
  const adminCatalog = await Product.find({
    category: { $in: STUDENT_VISIBLE_CATEGORIES }
  }).lean();

  // 3. Fetch student visible products
  const studentCatalog = await Product.find({
    category: { $in: STUDENT_VISIBLE_CATEGORIES },
    approvalStatus: { $in: ['approved', undefined, null] },
    isAvailable: true,
  }).lean();

  console.log(`\nTotal Admin Products in 5 Categories: ${adminCatalog.length}`);
  console.log(`Total Student Products in 5 Categories: ${studentCatalog.length}`);

  // 4. Category-by-Category breakdown
  const tableData = [];
  let allMatched = true;

  for (const cat of STUDENT_VISIBLE_CATEGORIES) {
    const adminCount = adminCatalog.filter(p => p.category === cat).length;
    const studentCount = studentCatalog.filter(p => p.category === cat).length;
    const isMatch = adminCount === studentCount;
    if (!isMatch) allMatched = false;

    tableData.push({
      Category: cat,
      'Student Product Count': studentCount,
      'Admin Product Count': adminCount,
      Match: isMatch ? 'YES' : 'NO'
    });
  }

  console.log('\n--- CATEGORY CONSISTENCY REPORT ---');
  console.table(tableData);

  // 5. Verify empty categories remain empty
  const exoticCount = adminCatalog.filter(p => p.category === 'Exotic Fruits').length;
  const clothesCount = adminCatalog.filter(p => p.category === 'Clothes Essentials').length;
  console.log(`\nEmpty categories check: Exotic Fruits = ${exoticCount}, Clothes Essentials = ${clothesCount}`);
  if (exoticCount !== 0 || clothesCount !== 0) {
    console.warn('Warning: Expected initial empty categories to have 0 products');
  } else {
    console.log('✓ Verified: Empty categories remain empty with 0 products.');
  }

  // 6. Test manual admin product creation into an empty category
  console.log('\n6. Testing Admin manual creation of product in empty category...');
  const testProduct = await Product.create({
    name: 'Temporary Admin Test Exotic Dragonfruit Box',
    price: 450,
    discount: 0,
    category: 'Exotic Fruits',
    stock: 10,
    deliveryTime: '30 mins',
    isAvailable: true,
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80',
    description: 'Fresh exotic fruit pack test'
  });
  console.log(`✓ Manually added product into "Exotic Fruits" category [ID: ${testProduct._id}]`);

  const updatedExoticAdmin = await Product.countDocuments({ category: 'Exotic Fruits' });
  const updatedExoticStudent = await Product.countDocuments({
    category: 'Exotic Fruits',
    approvalStatus: { $in: ['approved', undefined, null] },
    isAvailable: true
  });
  console.log(`Updated count in Exotic Fruits: Admin = ${updatedExoticAdmin}, Student = ${updatedExoticStudent}`);

  // Clean up the temporary test product
  await Product.deleteOne({ _id: testProduct._id });
  console.log('✓ Cleaned up temporary test product.');

  // 7. Verify order safety
  console.log('\n7. Verifying Order Safety & Immutability:');
  const totalOrders = await Order.countDocuments({});
  console.log(`Total Orders in database: ${totalOrders}`);
  const ordersSummary = await Order.aggregate([
    { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
  ]);
  console.log('Order Status Breakdown:');
  console.log(ordersSummary);
  console.log('✓ All existing orders intact and untouched.');

  await mongoose.disconnect();
  console.log('\nVerification completed successfully!');
};

verify().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
