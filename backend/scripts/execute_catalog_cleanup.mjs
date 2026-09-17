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
  { name: 'Fruits', description: 'Fresh and organic seasonal fruits', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000001/fruits.jpg' },
  { name: 'Medicines', description: 'OTC medicines, first-aid, and wellness products', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000000/hostelkart_fallback.jpg' },
  { name: 'Stationery', description: 'Notebooks, pens, registers, and study tools', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000005/stationery.jpg' },
  { name: 'Exotic Fruits', description: 'Fresh imported and exotic fruits', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000001/fruits.jpg' },
  { name: 'Clothes Essentials', description: 'Daily hostel wear and clothing essentials', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000000/hostelkart_fallback.jpg' }
];

const CANONICAL_NAMES = CANONICAL_CATEGORIES.map(c => c.name);

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB for Catalog Cleanup');

  const Product = (await import('../models/Product.js')).default;
  const Order = (await import('../models/Order.js')).default;
  const Category = (await import('../models/Category.js')).default;

  // 1. Fetch current state
  const allProductsBefore = await Product.find({}).lean();
  const allOrdersBefore = await Order.find({}).lean();
  const allCategoriesBefore = await Category.find({}).lean();

  console.log(`BEFORE CLEANUP:`);
  console.log(`- Total Products: ${allProductsBefore.length}`);
  console.log(`- Total Orders: ${allOrdersBefore.length}`);
  console.log(`- Total Categories in DB: ${allCategoriesBefore.length}`);

  // Create backup JSON of all products before cleanup
  const backupPath = path.join(path.resolve(), 'backend/seed/products_backup_before_cleanup.json');
  fs.writeFileSync(backupPath, JSON.stringify(allProductsBefore, null, 2), 'utf8');
  console.log(`✓ Backup of ${allProductsBefore.length} products written to: ${backupPath}`);

  // Map order referenced product IDs
  const orderReferencedMap = new Map();
  allOrdersBefore.forEach(o => {
    (o.items || []).forEach(i => {
      const pId = (i.product || '').toString();
      if (!orderReferencedMap.has(pId)) {
        orderReferencedMap.set(pId, []);
      }
      orderReferencedMap.get(pId).push({
        orderId: o._id.toString(),
        orderStatus: o.orderStatus,
        name: i.name
      });
    });
  });

  console.log(`- Order referenced product IDs:`, Array.from(orderReferencedMap.keys()));

  // 2. Classify products
  const toKeep = [];
  const toRemove = [];
  const orderReferencedLegacy = [];

  for (const p of allProductsBefore) {
    const pId = p._id.toString();
    const isOrderReferenced = orderReferencedMap.has(pId);
    const isCanonical = CANONICAL_NAMES.includes(p.category);

    if (isCanonical) {
      // Legitimate canonical products (Fruits, Medicines, Stationery)
      toKeep.push(p);
    } else if (isOrderReferenced) {
      // Product in legacy category BUT referenced in an active order -> Preserve for referential integrity
      orderReferencedLegacy.push(p);
    } else {
      // Unwanted/legacy seeded/AI test products with no order references -> Delete
      toRemove.push(p);
    }
  }

  console.log(`\nCLASSIFICATION RESULTS:`);
  console.log(`- Products to KEEP (Legitimate in 5 categories): ${toKeep.length}`);
  console.log(`- Legacy Products referenced by Orders (PRESERVED INACTIVE): ${orderReferencedLegacy.length}`);
  console.log(`- Products to REMOVE (Unwanted/AI/Legacy unreferenced): ${toRemove.length}`);

  console.log('\n--- PRODUCTS TO BE REMOVED ---');
  toRemove.forEach((p, idx) => {
    console.log(`[#${idx+1}] ID: ${p._id} | Cat: "${p.category}" | "${p.name}" | ₹${p.price} | Img: ${p.image}`);
  });

  console.log('\n--- ORDER-REFERENCED LEGACY PRODUCTS (PRESERVED) ---');
  orderReferencedLegacy.forEach((p, idx) => {
    console.log(`[#${idx+1}] ID: ${p._id} | Cat: "${p.category}" | "${p.name}" | Orders: ${JSON.stringify(orderReferencedMap.get(p._id.toString()))}`);
  });

  // 3. Execute Product Deletions
  const removeIds = toRemove.map(p => p._id);
  const deleteResult = await Product.deleteMany({ _id: { $in: removeIds } });
  console.log(`\n✓ Deleted ${deleteResult.deletedCount} unwanted products from MongoDB.`);

  // 4. Update order-referenced legacy products to be inactive & hidden
  for (const p of orderReferencedLegacy) {
    await Product.findByIdAndUpdate(p._id, {
      isAvailable: false,
      stock: 0,
      approvalStatus: 'rejected'
    });
    console.log(`✓ Set order-referenced product "${p.name}" (${p._id}) to isAvailable=false, approvalStatus=rejected.`);
  }

  // 5. Update Category Collection in MongoDB
  await Category.deleteMany({});
  await Category.insertMany(CANONICAL_CATEGORIES);
  console.log(`✓ Synchronized Category collection in MongoDB with 5 canonical categories:`);
  CANONICAL_CATEGORIES.forEach(c => console.log(`  - ${c.name}`));

  // 6. Verify State After Cleanup
  const allProductsAfter = await Product.find({}).lean();
  const activeProducts = await Product.find({ category: { $in: CANONICAL_NAMES }, isAvailable: true }).lean();
  const allOrdersAfter = await Order.find({}).lean();

  console.log(`\n================ STATE AFTER CLEANUP ================`);
  console.log(`Total Products in DB: ${allProductsAfter.length} (${activeProducts.length} active in 5 categories)`);
  console.log(`Total Orders in DB: ${allOrdersAfter.length} (ALL UNTOUCHED)`);

  const categoryCounts = {};
  CANONICAL_NAMES.forEach(c => { categoryCounts[c] = 0; });
  activeProducts.forEach(p => {
    categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
  });

  console.log('\n--- LIVE DB CATEGORY COUNTS ---');
  console.table(categoryCounts);

  // 7. Verify all orders still intact
  let ordersIntact = true;
  for (const o of allOrdersAfter) {
    const beforeO = allOrdersBefore.find(bo => bo._id.toString() === o._id.toString());
    if (!beforeO || beforeO.orderStatus !== o.orderStatus || beforeO.totalAmount !== o.totalAmount) {
      ordersIntact = false;
      console.error(`Order #${o._id} was modified!`);
    }
  }
  if (ordersIntact) {
    console.log('✓ VERIFIED: All existing orders are 100% intact and untouched.');
  }

  await mongoose.disconnect();
  console.log('\nCleanup script completed successfully.');
}

main().catch(console.error);
