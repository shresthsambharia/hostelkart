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

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const Product = (await import('../models/Product.js')).default;
  const Order = (await import('../models/Order.js')).default;
  const Category = (await import('../models/Category.js')).default;

  const products = await Product.find({}).lean();
  const orders = await Order.find({}).lean();
  const categories = await Category.find({}).lean();

  const orderedProductMap = new Map();
  orders.forEach(o => {
    (o.items || []).forEach(i => {
      const pId = (i.product || '').toString();
      if (!orderedProductMap.has(pId)) {
        orderedProductMap.set(pId, []);
      }
      orderedProductMap.get(pId).push({
        orderId: o._id.toString(),
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        qty: i.quantity,
        name: i.name || (i.product && i.product.name)
      });
    });
  });

  console.log(`\n================ TOTAL PRODUCTS: ${products.length} ================`);
  console.log(`================ TOTAL ORDERS: ${orders.length} ================`);
  console.log(`================ TOTAL DB CATEGORIES: ${categories.length} ================`);
  console.log('DB Categories:', categories.map(c => c.name));

  const auditReport = [];

  for (const p of products) {
    const pId = p._id.toString();
    const orderRefs = orderedProductMap.get(pId) || [];

    auditReport.push({
      id: pId,
      name: p.name,
      category: p.category,
      price: p.price,
      mrp: p.mrp,
      stock: p.stock,
      image: p.image,
      imageOriginal: p.imageOriginal,
      imageMedium: p.imageMedium,
      imageThumbnail: p.imageThumbnail,
      brand: p.brand,
      supplier: p.supplier ? p.supplier.toString() : null,
      createdBy: p.createdBy ? p.createdBy.toString() : null,
      approvalStatus: p.approvalStatus,
      isAvailable: p.isAvailable,
      orderRefCount: orderRefs.length,
      orders: orderRefs,
      createdAt: p.createdAt
    });
  }

  console.log(JSON.stringify(auditReport, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
