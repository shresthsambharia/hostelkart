import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart';

async function test() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected');

  const filter = { category: 'Fruits', isAvailable: true };
  const query = 'apples';

  const normalizedQuery = query.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ");

  const stripPlural = (str) => {
    if (str.endsWith('ies')) return str.slice(0, -3) + 'y';
    if (str.endsWith('es') && !str.endsWith('ees') && !str.endsWith('oes')) return str.slice(0, -2);
    if (str.endsWith('s') && !str.endsWith('ss') && !str.endsWith('is') && !str.endsWith('us')) return str.slice(0, -1);
    return str;
  };

  const queryWords = normalizedQuery.split(' ').map(w => stripPlural(w));
  const baseQueryWord = stripPlural(normalizedQuery);

  console.log('normalizedQuery:', normalizedQuery);
  console.log('baseQueryWord:', baseQueryWord);
  console.log('queryWords:', queryWords);

  const candidates = await Product.find(filter).lean();
  console.log('Total candidates found in DB:', candidates.length);

  candidates.forEach(product => {
    const name = product.name.toLowerCase();
    const brand = (product.brand || '').toLowerCase();
    const productCat = (product.category || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();

    let score = 0;

    console.log(`\nProduct: ${product.name}`);

    if (name === normalizedQuery || name === baseQueryWord) {
      console.log('  - Exact match (+500)');
      score += 500;
    }

    const exactPhraseRegex = new RegExp('\\b' + normalizedQuery + '\\b', 'i');
    const basePhraseRegex = new RegExp('\\b' + baseQueryWord + '\\b', 'i');
    
    console.log('  - Testing exactPhraseRegex:', exactPhraseRegex.source, 'result:', exactPhraseRegex.test(name));
    console.log('  - Testing basePhraseRegex:', basePhraseRegex.source, 'result:', basePhraseRegex.test(name));

    if (exactPhraseRegex.test(name)) {
      console.log('  - Phrase match (+300)');
      score += 300;
    } else if (basePhraseRegex.test(name)) {
      console.log('  - Base phrase match (+250)');
      score += 250;
    }

    queryWords.forEach(word => {
      if (word.length < 2) return;
      const wordRegex = new RegExp('\\b' + word + '\\b', 'i');
      console.log('    - Testing wordRegex:', wordRegex.source, 'result:', wordRegex.test(name));
      if (wordRegex.test(name)) {
        console.log('    - Word match in name (+50)');
        score += 50;
      }
    });

    console.log(`  - Final score: ${score}`);
  });

  await mongoose.disconnect();
}

test();
