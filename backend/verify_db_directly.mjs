import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { searchCatalogImpl } from './ai/aiController.js';
import Product from './models/Product.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart';

async function verify() {
  console.log('Connecting to MongoDB at:', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('Connected successfully!\n');

  console.log('=== 1. VERIFYING CATEGORY COUNTS ===');
  const fruitsCount = await Product.countDocuments({ category: 'Fruits', isAvailable: true });
  const medicinesCount = await Product.countDocuments({ category: 'Medicines', isAvailable: true });
  console.log(`Fruits Total: ${fruitsCount} (Expected: 18)`);
  console.log(`Medicines Total: ${medicinesCount} (Expected: 5)`);

  if (fruitsCount === 18 && medicinesCount === 5) {
    console.log('✓ Category counts match expectations perfectly.');
  } else {
    console.error('❌ Category counts mismatch!');
  }

  console.log('\n=== 2. RUNNING SEARCH CATALOG TESTS ===');

  // Test 1: Do you have apples?
  console.log('\n--- Query: "apples" ---');
  const searchApples = await searchCatalogImpl({ query: 'apples', category: 'Fruits' }, null);
  console.log(`Total Apples found: ${searchApples.total}`);
  searchApples.products.forEach(p => {
    console.log(`- ${p.name} (Price: ₹${p.price}, Category: ${p.category})`);
  });
  const hasPineappleInApples = searchApples.products.some(p => p.name.toLowerCase().includes('pineapple'));
  if (hasPineappleInApples) {
    console.error('❌ BUG: Pineapple matched search for "apples"!');
  } else {
    console.log('✓ Pineapple excluded correctly from "apples" search.');
  }

  // Test 2: Do you have pineapple?
  console.log('\n--- Query: "pineapple" ---');
  const searchPineapple = await searchCatalogImpl({ query: 'pineapple', category: 'Fruits' }, null);
  console.log(`Total Pineapple found: ${searchPineapple.total}`);
  searchPineapple.products.forEach(p => {
    console.log(`- ${p.name} (Price: ₹${p.price})`);
  });

  // Test 3: Is banana available?
  console.log('\n--- Query: "banana" ---');
  const searchBanana = await searchCatalogImpl({ query: 'banana', category: 'Fruits' }, null);
  console.log(`Total Banana found: ${searchBanana.total}`);
  searchBanana.products.forEach(p => {
    console.log(`- ${p.name} (Price: ₹${p.price})`);
  });

  // Test 4: Is Crocin available?
  console.log('\n--- Query: "Crocin" ---');
  const searchCrocin = await searchCatalogImpl({ query: 'Crocin', category: 'Medicines' }, null);
  console.log(`Total Crocin found: ${searchCrocin.total}`);
  searchCrocin.products.forEach(p => {
    console.log(`- ${p.name} (Price: ₹${p.price})`);
  });

  await mongoose.disconnect();
  console.log('\nDisconnected.');
}

verify().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
