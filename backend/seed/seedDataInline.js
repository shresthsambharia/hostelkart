import path from 'path';
import fs from 'fs';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { productsData } from './productsList.js';

const categories = [
  { name: 'Fruits', description: 'Fresh and organic seasonal fruits', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000001/fruits.jpg' },
  { name: 'Vegetables', description: 'Fresh vegetables for hostel cooking', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000002/vegetables.jpg' },
  { name: 'Dairy Products', description: 'Milk, cheese, butter, yogurt, and paneer', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000003/dairy.jpg' },
  { name: 'Personal Care', description: 'Shampoo, soaps, toothpaste, and grooming', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000004/personal_care.jpg' },
  { name: 'Stationery', description: 'Notebooks, pens, registers, and study tools', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000005/stationery.jpg' },
  { name: 'Electronics Accessories', description: 'OTG cables, phone stands, charging wires, and earphones', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000006/electronics.jpg' },
  { name: 'Instant Food', description: 'Cup noodles, ready-to-eat meals, and soup packets', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000007/instant_food.jpg' }
];

const usersData = [
  { name: 'Admin User', email: 'admin@hostelkart.com', password: 'admin123', role: 'admin', phone: '9876543210' },
  { name: 'Delivery Rider', email: 'delivery@hostelkart.com', password: 'delivery123', role: 'delivery', phone: '9876543211' },
  {
    name: 'Student User',
    email: 'student@hostelkart.com',
    password: 'student123',
    role: 'student',
    phone: '9876543212',
    hostelDetails: {
      hostelName: 'Ramanujan Hostel',
      block: 'A-Block',
      floor: '3rd Floor',
      roomNumber: '302',
      deliveryInstructions: 'Deliver near the room gate'
    }
  },
  {
    name: 'Alice Smith',
    email: 'alice@hostelkart.com',
    password: 'student123',
    role: 'student',
    phone: '9876543213',
    hostelDetails: {
      hostelName: 'Kalpana Chawla Hall',
      block: 'B-Block',
      floor: '1st Floor',
      roomNumber: '115',
      deliveryInstructions: 'Call before arriving'
    }
  },
  {
    name: 'Bob Johnson',
    email: 'bob@hostelkart.com',
    password: 'student123',
    role: 'student',
    phone: '9876543214',
    hostelDetails: {
      hostelName: 'CV Raman Hall',
      block: 'C-Block',
      floor: 'Ground Floor',
      roomNumber: '005',
      deliveryInstructions: 'Leave with guard if not present'
    }
  },
  {
    name: 'Charlie Brown',
    email: 'charlie@hostelkart.com',
    password: 'student123',
    role: 'student',
    phone: '9876543215',
    hostelDetails: {
      hostelName: 'Tagore Hostel',
      block: 'D-Block',
      floor: '2nd Floor',
      roomNumber: '210',
      deliveryInstructions: 'Deliver in the evening'
    }
  },
  {
    name: 'Diana Prince',
    email: 'diana@hostelkart.com',
    password: 'student123',
    role: 'student',
    phone: '9876543216',
    hostelDetails: {
      hostelName: 'Sarojini Hall',
      block: 'E-Block',
      floor: '4th Floor',
      roomNumber: '408',
      deliveryInstructions: 'Knock room twice'
    }
  }
];

// productsData is imported from productsList.js at the top of the file

export const seedIfEmpty = async () => {
  try {
    // 1. Seed Categories if empty
    const categoryCount = await Category.countDocuments({});
    if (categoryCount === 0) {
      await Category.insertMany(categories);
      console.log('- Categories auto-seeded');
    }

    // 2. Seed Users if missing
    for (const u of usersData) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) {
        const newUser = new User(u);
        const savedUser = await newUser.save();
        console.log(`- User ${u.email} auto-seeded`);
      }
    }

    // Ensure all students have carts and wishlists initialized
    const studentUsers = await User.find({ role: 'student' });
    for (const student of studentUsers) {
      const cartExists = await Cart.findOne({ user: student._id });
      if (!cartExists) {
        await Cart.create({ user: student._id, items: [] });
      }
      const wishlistExists = await Wishlist.findOne({ user: student._id });
      if (!wishlistExists) {
        await Wishlist.create({ user: student._id, products: [] });
      }
    }

    // Ensure delivery partners have profile details initialized
    const deliveryUsers = await User.find({ role: 'delivery' });
    for (const du of deliveryUsers) {
      const partnerExists = await DeliveryPartner.findOne({ user: du._id });
      if (!partnerExists) {
        await DeliveryPartner.create({
          user: du._id,
          vehicleNumber: 'KA-03-EM-8822',
          status: 'Active',
          currentOrders: []
        });
        console.log(`- Delivery Partner details initialized for ${du.email}`);
      }
    }

    const studentUser = await User.findOne({ email: 'student@hostelkart.com' });

    // 3. Seed Products if empty
    const productCount = await Product.countDocuments({});
    let seededProducts = [];
    if (productCount === 0) {
      const mappedProductsData = productsData.map(p => {
        let mappedCategory = p.category;
        if (mappedCategory === 'Snacks' || mappedCategory === 'Beverages') {
          mappedCategory = 'Instant Food';
        } else if (mappedCategory === 'Medicines' || mappedCategory === 'Hostel Essentials' || mappedCategory === 'Custom Requests') {
          mappedCategory = 'Personal Care';
        }
        return { ...p, category: mappedCategory };
      });
      seededProducts = await Product.insertMany(mappedProductsData);
      console.log(`- ${seededProducts.length} Products auto-seeded`);
    } else {
      seededProducts = await Product.find({});
    }

    // 4. Create one initial sample order if empty and student exists
    const orderCount = await Order.countDocuments({});
    if (orderCount === 0 && studentUser && seededProducts.length > 10) {
      const sampleItems = [
        {
          product: seededProducts[10]._id, // Lays Chips
          name: seededProducts[10].name,
          quantity: 3,
          price: seededProducts[10].price,
          discount: seededProducts[10].discount
        },
        {
          product: seededProducts[Math.min(50, seededProducts.length - 1)]._id, // Maggi
          name: seededProducts[Math.min(50, seededProducts.length - 1)].name,
          quantity: 2,
          price: seededProducts[Math.min(50, seededProducts.length - 1)].price,
          discount: seededProducts[Math.min(50, seededProducts.length - 1)].discount
        }
      ];

      const orderTotal = sampleItems.reduce((acc, x) => acc + (x.price - (x.price * (x.discount / 100))) * x.quantity, 0);

      const sampleOrder = new Order({
        user: studentUser._id,
        items: sampleItems,
        deliveryDetails: {
          hostelName: studentUser.hostelDetails?.hostelName || 'Ramanujan Hostel',
          block: studentUser.hostelDetails?.block || 'A-Block',
          floor: studentUser.hostelDetails?.floor || '3rd Floor',
          roomNumber: studentUser.hostelDetails?.roomNumber || '302',
          phone: studentUser.phone,
          deliveryInstructions: 'Deliver by knocking the door twice.'
        },
        deliverySlot: 'Morning Slot (8:00 AM – 1:00 PM)',
        paymentMethod: 'COD',
        paymentStatus: 'Pending',
        orderStatus: 'Pending',
        totalAmount: Math.round(orderTotal),
        timeline: [
          { status: 'Pending', note: 'Order placed successfully' }
        ]
      });

      await sampleOrder.save();
      console.log('- Sample Order auto-seeded');
    }

    console.log('AUTO-SEEDING VERIFICATION COMPLETED.');
  } catch (error) {
    console.error('Error during auto-seeding:', error.stack);
  }
};
