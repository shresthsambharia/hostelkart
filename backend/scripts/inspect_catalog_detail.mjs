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

  const Product = (await import('../models/Product.js')).default;
  const Order = (await import('../models/Order.js')).default;

  const products = await Product.find({}).lean().sort({ createdAt: 1 });
  const orders = await Order.find({}).lean();

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
        name: i.name
      });
    });
  });

  console.log(`\nTOTAL PRODUCTS IN DATABASE: ${products.length}\n`);

  const categoryMap = {};
  const imageSourceMap = {};
  
  products.forEach((p, idx) => {
    categoryMap[p.category] = (categoryMap[p.category] || 0) + 1;
    
    let imgType = 'other';
    if (!p.image) imgType = 'no-image';
    else if (p.image.includes('cloudinary.com')) imgType = 'cloudinary';
    else if (p.image.startsWith('/images/')) imgType = 'local-path';
    else if (p.image.startsWith('http')) imgType = 'external-url';

    imageSourceMap[imgType] = (imageSourceMap[imgType] || 0) + 1;

    const inOrders = orderedProductMap.has(p._id.toString());
    console.log(`[#${idx+1}] ID: ${p._id} | Cat: "${p.category}" | Name: "${p.name}" | Price: ₹${p.price} | Stock: ${p.stock} | Img: "${p.image}" | Created: ${p.createdAt?.toISOString?.() || p.createdAt} | InOrders: ${inOrders ? 'YES (' + orderedProductMap.get(p._id.toString()).length + ' orders)' : 'NO'}`);
  });

  console.log('\n--- CATEGORY BREAKDOWN ---');
  console.log(categoryMap);

  console.log('\n--- IMAGE SOURCE BREAKDOWN ---');
  console.log(imageSourceMap);

  console.log('\n--- ORDER DETAILS ---');
  orders.forEach(o => {
    console.log(`Order #${o._id} | Status: ${o.orderStatus} | Payment: ${o.paymentStatus} | Total: ₹${o.totalAmount} | Items:`);
    (o.items || []).forEach(i => {
      console.log(`  - Item Product ID: ${i.product} | Name: "${i.name}" | Qty: ${i.quantity} | Price: ₹${i.price}`);
    });
  });

  await mongoose.disconnect();
}

main().catch(console.error);
