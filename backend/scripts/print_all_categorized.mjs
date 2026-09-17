import mongoose from 'mongoose';
import fs from 'fs';

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

  const products = await Product.find({}).lean().sort({ category: 1, name: 1 });
  const orders = await Order.find({}).lean();

  const orderedProductMap = new Map();
  orders.forEach(o => {
    (o.items || []).forEach(i => {
      const pId = (i.product || '').toString();
      if (!orderedProductMap.has(pId)) {
        orderedProductMap.set(pId, []);
      }
      orderedProductMap.get(pId).push(o._id.toString());
    });
  });

  const categories = {};
  products.forEach(p => {
    if (!categories[p.category]) categories[p.category] = [];
    categories[p.category].push({
      id: p._id.toString(),
      name: p.name,
      price: p.price,
      stock: p.stock,
      image: p.image,
      createdAt: p.createdAt,
      orderCount: (orderedProductMap.get(p._id.toString()) || []).length,
      orders: orderedProductMap.get(p._id.toString()) || []
    });
  });

  for (const [cat, list] of Object.entries(categories)) {
    console.log(`\n================================ CATEGORY: "${cat}" (${list.length} products) ================================`);
    list.forEach((p, idx) => {
      console.log(`[${idx+1}] ID: ${p.id} | "${p.name}" | ₹${p.price} | Stock: ${p.stock} | Orders: ${p.orderCount} (${p.orders.join(', ') || 'none'}) | Img: ${p.image} | Created: ${p.createdAt?.toISOString?.() || p.createdAt}`);
    });
  }

  await mongoose.disconnect();
}

main().catch(console.error);
