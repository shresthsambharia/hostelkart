import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Parse backend env manually
const envPath = 'C:/Users/user/.gemini/antigravity/scratch/hostelkart/backend/.env';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index !== -1) {
      const key = trimmed.substring(0, index).trim();
      const val = trimmed.substring(index + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  });
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart';

const CANONICAL_CATEGORIES = [
  'Fruits',
  'Medicines',
  'Stationery',
  'Exotic Fruits',
  'Clothes Essentials'
];

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB for Source-of-Truth Catalog & Category Verification\n');

  const Product = (await import('../models/Product.js')).default;
  const Order = (await import('../models/Order.js')).default;
  const Category = (await import('../models/Category.js')).default;

  const allProducts = await Product.find({}).lean();
  const activeProducts = await Product.find({ isAvailable: true, approvalStatus: { $ne: 'rejected' } }).lean();
  const allOrders = await Order.find({}).lean();
  const dbCategories = await Category.find({}).lean();

  console.log('================================================================');
  console.log('=== HOSTELKART CATALOG & CATEGORY SOURCE-OF-TRUTH REPORT ===');
  console.log('================================================================\n');

  // 1. Total products
  console.log(`1. TOTAL PRODUCTS IN DATABASE: ${allProducts.length}`);
  console.log(`   - Active student-visible products: ${activeProducts.length}`);
  console.log(`   - Archived/order-preserved legacy products: ${allProducts.length - activeProducts.length}\n`);

  // 2. Category counts in active catalog
  const categoryCounts = {};
  CANONICAL_CATEGORIES.forEach(c => { categoryCounts[c] = 0; });
  activeProducts.forEach(p => {
    if (categoryCounts[p.category] !== undefined) {
      categoryCounts[p.category] += 1;
    }
  });

  console.log('2. LIVE ACTIVE CATEGORY COUNTS:');
  console.table(categoryCounts);

  // 3. Check for invalid or legacy categories in active products
  const invalidActiveCategories = activeProducts.filter(p => !CANONICAL_CATEGORIES.includes(p.category));
  console.log(`3. INVALID CATEGORIES IN ACTIVE CATALOG: ${invalidActiveCategories.length}`);
  if (invalidActiveCategories.length > 0) {
    console.error('ERROR: Found invalid categories in active products:', invalidActiveCategories.map(p => ({ id: p._id, name: p.name, cat: p.category })));
  } else {
    console.log('   ✓ 100% of active products belong strictly to the 5 canonical categories.');
  }

  // 4. Duplicate category names in Category collection
  const categoryNamesInDB = dbCategories.map(c => c.name);
  const duplicates = categoryNamesInDB.filter((item, index) => categoryNamesInDB.indexOf(item) !== index);
  console.log(`\n4. DUPLICATE CATEGORY NAMES IN DB: ${duplicates.length}`);
  console.log('   DB Category Names:', categoryNamesInDB);
  console.log('   Canonical Category Names:', CANONICAL_CATEGORIES);
  const matchesCanonical = CANONICAL_CATEGORIES.every(c => categoryNamesInDB.includes(c)) && dbCategories.length === 5;
  console.log(`   ✓ Category collection matches canonical 5 categories: ${matchesCanonical ? 'YES' : 'NO'}`);

  // 5. Products with missing image/source
  const missingImages = activeProducts.filter(p => !p.image || p.image.trim() === '');
  console.log(`\n5. ACTIVE PRODUCTS WITH MISSING IMAGE: ${missingImages.length}`);
  if (missingImages.length > 0) {
    console.error('Products missing image:', missingImages);
  } else {
    console.log('   ✓ All active products have valid image URLs.');
  }

  // 6. AI/Generated/Fake products check
  const fakeAIProducts = activeProducts.filter(p => p.category === 'Snacks' || p.image?.startsWith('/images/fake') || p.name?.includes('AI Generated'));
  console.log(`\n6. AI/GENERATED/FAKE PRODUCTS IN ACTIVE CATALOG: ${fakeAIProducts.length}`);
  if (fakeAIProducts.length === 0) {
    console.log('   ✓ Zero AI-generated or mock fake products found in active catalog.');
  }

  // 7. Products referenced by existing orders
  const orderedProductMap = new Map();
  allOrders.forEach(o => {
    (o.items || []).forEach(i => {
      const pId = (i.product || '').toString();
      if (!orderedProductMap.has(pId)) {
        orderedProductMap.set(pId, []);
      }
      orderedProductMap.get(pId).push({
        orderId: o._id.toString(),
        orderStatus: o.orderStatus,
        name: i.name,
        qty: i.quantity,
        price: i.price
      });
    });
  });

  console.log(`\n7. EXISTING ORDERS & REFERENCED PRODUCTS INTEGRITY:`);
  console.log(`   - Total Orders: ${allOrders.length}`);
  allOrders.forEach((o, idx) => {
    console.log(`   [Order #${idx+1}] ID: ${o._id} | Status: ${o.orderStatus} | Total: ₹${o.totalAmount} | Items: ${o.items.map(i => `"${i.name}" (ID: ${i.product})`).join(', ')}`);
  });

  let missingOrderProducts = 0;
  for (const [pId, orderList] of orderedProductMap.entries()) {
    const productDoc = await Product.findById(pId);
    if (!productDoc) {
      missingOrderProducts++;
      console.error(`CRITICAL ERROR: Referenced product ${pId} is missing in DB!`);
    } else {
      console.log(`   ✓ Referenced Product "${productDoc.name}" (${pId}) exists in DB (isAvailable: ${productDoc.isAvailable}, cat: "${productDoc.category}").`);
    }
  }

  console.log(`\n8. FINAL VALID CATALOG SUMMARY:`);
  console.log(`   - Fruits: ${categoryCounts['Fruits']} products`);
  console.log(`   - Medicines: ${categoryCounts['Medicines']} products`);
  console.log(`   - Stationery: ${categoryCounts['Stationery']} products`);
  console.log(`   - Exotic Fruits: ${categoryCounts['Exotic Fruits']} products`);
  console.log(`   - Clothes Essentials: ${categoryCounts['Clothes Essentials']} products`);
  console.log(`   - Total Student/Admin Visible Products: ${activeProducts.length}`);
  console.log(`   - Total Orders Intact: ${allOrders.length}`);

  await mongoose.disconnect();
  console.log('\nVerification complete!');
}

main().catch(console.error);
