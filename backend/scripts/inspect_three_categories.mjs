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

  const fruits = await Product.find({ category: 'Fruits' }).lean().sort({ createdAt: 1 });
  console.log(`\n================ FRUITS (${fruits.length}) ================`);
  fruits.forEach((f, i) => {
    const inOrder = orderedProductMap.get(f._id.toString()) || [];
    console.log(`${i+1}. ID: ${f._id} | "${f.name}" | ₹${f.price} | Stock: ${f.stock} | Orders: ${inOrder.length} (${inOrder.join(', ')}) | Img: ${f.image} | Created: ${f.createdAt?.toISOString?.() || f.createdAt}`);
  });

  const meds = await Product.find({ category: 'Medicines' }).lean().sort({ createdAt: 1 });
  console.log(`\n================ MEDICINES (${meds.length}) ================`);
  meds.forEach((m, i) => {
    const inOrder = orderedProductMap.get(m._id.toString()) || [];
    console.log(`${i+1}. ID: ${m._id} | "${m.name}" | ₹${m.price} | Stock: ${m.stock} | Orders: ${inOrder.length} (${inOrder.join(', ')}) | Img: ${m.image} | Created: ${m.createdAt?.toISOString?.() || m.createdAt}`);
  });

  const stat = await Product.find({ category: 'Stationery' }).lean().sort({ createdAt: 1 });
  console.log(`\n================ STATIONERY (${stat.length}) ================`);
  stat.forEach((s, i) => {
    const inOrder = orderedProductMap.get(s._id.toString()) || [];
    console.log(`${i+1}. ID: ${s._id} | "${s.name}" | ₹${s.price} | Stock: ${s.stock} | Orders: ${inOrder.length} (${inOrder.join(', ')}) | Img: ${s.image} | Created: ${s.createdAt?.toISOString?.() || s.createdAt}`);
  });

  await mongoose.disconnect();
}

main().catch(console.error);
