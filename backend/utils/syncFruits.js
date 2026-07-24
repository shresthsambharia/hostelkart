import Product from '../models/Product.js';
import { logger } from './logger.js';

const requestedFruits = [
  { name: 'Mandarin Orange', qty: '500 g', price: 150, matchName: 'Fresh Nagpur Oranges (Pack of 6)' },
  { name: 'Orange', qty: '600 g (4 Pieces)', price: 140, matchName: 'Fresh Sweet Oranges (Pack of 6)' },
  { name: 'Pear', qty: '500 g (4 Pieces)', price: 200, matchName: 'Sweet Pear (Pack of 4)' },
  { name: 'Nariyal Pani (Coconut Water)', qty: '1 Piece', price: 70, matchName: 'Fresh Tender Coconut (1 Unit)' },
  { name: 'Royal Gala Apple', qty: '520 g', price: 180, matchName: 'Fresh Apples (Pack of 4)' },
  { name: 'Red Apple', qty: '520 g', price: 190, matchName: null },
  { name: 'Dragon Fruit', qty: '300–400 g', price: 130, matchName: 'Dragon Fruit (1 Unit)' },
  { name: 'Kiwi', qty: '220 g', price: 140, matchName: 'Fresh Kiwi (Pack of 3)' },
  { name: 'Avocado', qty: '150–200 g', price: 70, matchName: 'Butter Avocado (2 Units)' },
  { name: 'Mosambi (Sweet Lime)', qty: '1 kg', price: 100, matchName: 'Sweet Lime / Mosambi (1 kg)' },
  { name: 'Pineapple', qty: '800 g', price: 200, matchName: 'Fresh Pineapple (1 Unit)' },
  { name: 'Papaya', qty: '500 g', price: 60, matchName: 'Fresh Papaya (1 Unit)' },
  { name: 'Banana', qty: '500 g', price: 30, matchName: 'Organic Bananas (1 Dozen)' },
  { name: 'Red Cherry', qty: '250 g', price: 200, matchName: 'Red Cherry Box (250g)' },
  { name: 'Mango', qty: '1 kg', price: 100, matchName: 'Sweet Mango (1 kg)' },
  { name: 'Pomegranate', qty: '1 kg', price: 220, matchName: 'Fresh Pomegranate (Pack of 2)' },
  { name: 'Indian Plum', qty: '1 kg', price: 300, matchName: null },
  { name: 'Jamun', qty: '500 g', price: 120, matchName: null }
];

export const syncFruitsDatabase = async () => {
  try {
    const allFruits = await Product.find({ category: 'Fruits' });
    
    // Check if the Fruits category is already correctly populated
    let isUpToDate = allFruits.length === requestedFruits.length;
    if (isUpToDate) {
      for (const item of requestedFruits) {
        const displayName = `${item.name} (${item.qty})`;
        const found = allFruits.find(f => f.name === displayName && f.price === item.price);
        if (!found) {
          isUpToDate = false;
          break;
        }
      }
    }

    if (isUpToDate) {
      logger.info('DB_FRUITS_SYNC', 'Fruits category is already up-to-date. Skipping database update.');
      return;
    }

    logger.info('DB_FRUITS_SYNC', 'Starting Fruits category database synchronization...');
    const processedIds = new Set();

    for (const item of requestedFruits) {
      const displayName = `${item.name} (${item.qty})`;
      let existingProd = null;

      // Try matching by specific previous seed name
      if (item.matchName) {
        existingProd = allFruits.find(f => f.name === item.matchName);
      }

      // If not matched by name, try finding by base name
      if (!existingProd) {
        existingProd = allFruits.find(f => f.name === displayName);
      }

      if (existingProd) {
        existingProd.name = displayName;
        existingProd.price = item.price;
        existingProd.mrp = item.price;
        existingProd.discount = 0;
        existingProd.stock = Math.max(existingProd.stock || 0, 20);
        existingProd.isAvailable = true;
        await existingProd.save();
        processedIds.add(existingProd._id.toString());
      } else {
        // Create new
        const defaultImg = 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000001/fruits.jpg';
        const newProd = new Product({
          name: displayName,
          image: defaultImg,
          description: `Fresh premium quality ${item.name}.`,
          price: item.price,
          mrp: item.price,
          discount: 0,
          category: 'Fruits',
          stock: 20,
          isAvailable: true,
          deliveryTime: 'Scheduled Delivery',
          brand: item.name
        });
        await newProd.save();
        processedIds.add(newProd._id.toString());
      }
    }

    // Delete other fruits not in requested list
    let deletedCount = 0;
    for (const fruit of allFruits) {
      if (!processedIds.has(fruit._id.toString())) {
        await Product.findByIdAndDelete(fruit._id);
        deletedCount++;
      }
    }

    logger.info('DB_FRUITS_SYNC', `Fruits category database synchronization complete. Deleted ${deletedCount} unrelated fruits.`);
  } catch (error) {
    logger.error('DB_FRUITS_SYNC_ERROR', `Failed to sync Fruits database: ${error.message}`, { error });
  }
};
