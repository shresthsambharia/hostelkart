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

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true }
}, { collection: 'categories', timestamps: true });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true }
}, { collection: 'products', timestamps: true });

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. Upsert Medicines Category
  const medCategoryName = 'Medicines';
  const medCategoryData = {
    name: medCategoryName,
    description: 'OTC medicines, first-aid, and wellness products',
    image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000000/hostelkart_fallback.jpg'
  };

  const updatedCategory = await Category.findOneAndUpdate(
    { name: medCategoryName },
    { $set: medCategoryData },
    { upsert: true, new: true }
  );
  console.log(`Upserted category: "${updatedCategory.name}"`);

  // 2. Map target medicine products to the Medicines category
  const targetMedicineNames = [
    'Crocin Pain Relief Tablet (Strip of 15)',
    'Dettol Antiseptic Liquid (100ml)',
    'Band-Aid Tough Strips (Pack of 10)',
    'Volini Pain Relief Spray (40g)',
    'Eno Fruit Salt Lemon (Instant Relief)'
  ];

  const updateResult = await Product.updateMany(
    { name: { $in: targetMedicineNames } },
    { $set: { category: medCategoryName } }
  );

  console.log(`Updated ${updateResult.modifiedCount} products to the "Medicines" category.`);

  await mongoose.disconnect();
  console.log('Done!');
}

main().catch(console.error);
