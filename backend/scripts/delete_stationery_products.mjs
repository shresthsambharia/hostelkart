import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hostelkart';

async function run() {
  console.log('Connecting to MongoDB at:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const productsColl = db.collection('products');
  const ordersColl = db.collection('orders');
  const categoriesColl = db.collection('categories');

  // Step 1: Inspect Stationery products
  const stationeryProducts = await productsColl.find({
    category: { $regex: /^stationery$/i }
  }).toArray();

  console.log(`Found ${stationeryProducts.length} Stationery products:`);
  stationeryProducts.forEach(p => {
    console.log(` - [${p._id}] ${p.name} (Stock: ${p.stock}, Price: ${p.price})`);
  });

  // Step 2: Check orders referencing any of these Stationery products
  const stationeryIds = stationeryProducts.map(p => p._id);
  const allOrders = await ordersColl.find({}).toArray();
  console.log(`Total existing orders in DB: ${allOrders.length}`);

  const referencedStationeryIds = new Set();
  allOrders.forEach(order => {
    const items = order.items || order.orderItems || [];
    items.forEach(item => {
      const prodId = item.product || item._id;
      if (stationeryIds.some(sid => sid.toString() === prodId?.toString())) {
        referencedStationeryIds.add(prodId.toString());
        console.log(`WARNING: Order ${order._id} references Stationery product ${prodId} (${item.name})`);
      }
    });
  });

  console.log(`Referenced Stationery products count: ${referencedStationeryIds.size}`);

  // Step 3: Delete unreferenced Stationery products or deactivate if referenced
  let deletedCount = 0;
  let deactivatedCount = 0;

  for (const p of stationeryProducts) {
    if (referencedStationeryIds.has(p._id.toString())) {
      await productsColl.updateOne(
        { _id: p._id },
        {
          $set: {
            isAvailable: false,
            stock: 0,
            approvalStatus: 'rejected',
            auditTag: 'order_history_archived_stationery'
          }
        }
      );
      deactivatedCount++;
      console.log(`Deactivated (referenced in order): ${p.name}`);
    } else {
      await productsColl.deleteOne({ _id: p._id });
      deletedCount++;
      console.log(`Deleted: ${p.name} [${p._id}]`);
    }
  }

  console.log(`Stationery Products Summary: ${deletedCount} deleted, ${deactivatedCount} deactivated.`);

  // Step 4: Ensure Stationery category exists in Categories collection with count = 0
  const stationeryCat = await categoriesColl.findOne({
    $or: [{ name: { $regex: /^stationery$/i } }, { slug: 'stationery' }]
  });

  if (stationeryCat) {
    await categoriesColl.updateOne(
      { _id: stationeryCat._id },
      { $set: { productCount: 0, isActive: true, updatedAt: new Date() } }
    );
    console.log(`Updated existing Stationery category ${stationeryCat._id} with productCount: 0`);
  } else {
    await categoriesColl.insertOne({
      name: 'Stationery',
      slug: 'stationery',
      description: 'Pens, notebooks, highlighters, sticky notes & study materials',
      icon: 'stationery-icon',
      productCount: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`Inserted Stationery category with productCount: 0`);
  }

  // Step 5: Final Catalog Audit
  const activeProducts = await productsColl.find({
    isAvailable: true,
    approvalStatus: 'approved'
  }).toArray();

  const countsByCategory = {};
  activeProducts.forEach(p => {
    countsByCategory[p.category] = (countsByCategory[p.category] || 0) + 1;
  });

  console.log('\n--- FINAL ACTIVE CATALOG BREAKDOWN ---');
  console.log('Total Active Products:', activeProducts.length);
  console.log('Category breakdown:', countsByCategory);

  const finalOrders = await ordersColl.find({}).toArray();
  console.log('Total Orders preserved:', finalOrders.length);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error('Error during execution:', err);
  process.exit(1);
});
