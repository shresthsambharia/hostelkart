import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Models
import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import CustomRequest from '../models/CustomRequest.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { productsData } from './productsList.js';

dotenv.config();

// Connect to Database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart');
    console.log(`Seed MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const categories = [
  { name: 'Fruits', description: 'Fresh and organic seasonal fruits', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000001/fruits.jpg' },
  { name: 'Vegetables', description: 'Fresh vegetables for hostel cooking', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000002/vegetables.jpg' },
  { name: 'Dairy Products', description: 'Milk, cheese, butter, yogurt, and paneer', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000003/dairy.jpg' },
  { name: 'Personal Care', description: 'Shampoo, soaps, toothpaste, and grooming', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000004/personal_care.jpg' },
  { name: 'Stationery', description: 'Notebooks, pens, registers, and study tools', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000005/stationery.jpg' },
  { name: 'Electronics Accessories', description: 'OTG cables, phone stands, charging wires, and earphones', image: 'https://res.cloudinary.com/dquhh8aee/image/upload/v1718000006/electronics.jpg' }
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

const seedData = async () => {
  try {
    await connectDB();

    // Clean current database data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Order.deleteMany({});
    await Cart.deleteMany({});
    await Wishlist.deleteMany({});
    await CustomRequest.deleteMany({});
    await DeliveryPartner.deleteMany({});

    console.log('Database collections cleared successfully.');

    // 1. Seed Categories
    await Category.insertMany(categories);
    console.log('Categories seeded.');

    // 2. Seed Users (We must save individually so pre-save password encryption hook triggers!)
    const createdUsers = [];
    for (const u of usersData) {
      const newUser = new User(u);
      const savedUser = await newUser.save();
      createdUsers.push(savedUser);
    }
    console.log('Users (Admin, Student, Delivery, and extra Students) seeded.');

    // Find student ID and delivery partner ID to sync
    const studentUser = createdUsers.find(u => u.email === 'student@hostelkart.com');
    const deliveryPartner = createdUsers.find(u => u.email === 'delivery@hostelkart.com');

    // Create delivery details partner reference record
    await DeliveryPartner.create({
      user: deliveryPartner._id,
      vehicleNumber: 'KA-03-EM-8822',
      status: 'Active',
      currentOrders: []
    });
    console.log('Delivery Partner profile record initialized.');

    // Initialize cart & wishlist for seeded students
    for (const user of createdUsers) {
      if (user.role === 'student') {
        await Cart.create({ user: user._id, items: [] });
        await Wishlist.create({ user: user._id, products: [] });
      }
    }
    console.log('Shopping carts and Wishlists initialized.');

    // 3. Seed Products
    const mappedProductsData = productsData.map(p => {
      let mappedCategory = p.category;
      if (mappedCategory === 'Snacks' || mappedCategory === 'Beverages' || mappedCategory === 'Medicines' || mappedCategory === 'Hostel Essentials' || mappedCategory === 'Custom Requests') {
        mappedCategory = 'Personal Care';
      }
      return { ...p, category: mappedCategory };
    });
    const seededProducts = [];
    for (const p of mappedProductsData) {
      const newProduct = new Product(p);
      const savedProduct = await newProduct.save();
      seededProducts.push(savedProduct);
    }
    console.log(`Products seeded (${seededProducts.length} items loaded with optimized WebP URLs).`);

    // 4. Create one initial sample order for the student to make the app feel populated
    const sampleItems = [
      {
        product: seededProducts[10]._id, // Lays Chips
        name: seededProducts[10].name,
        quantity: 3,
        price: seededProducts[10].price,
        discount: seededProducts[10].discount
      },
      {
        product: seededProducts[50]._id, // Maggi
        name: seededProducts[50].name,
        quantity: 2,
        price: seededProducts[50].price,
        discount: seededProducts[50].discount
      }
    ];

    const orderTotal = sampleItems.reduce((acc, x) => acc + (x.price - (x.price * (x.discount / 100))) * x.quantity, 0);

    const sampleOrder = new Order({
      user: studentUser._id,
      items: sampleItems,
      deliveryDetails: {
        hostelName: studentUser.hostelDetails.hostelName,
        block: studentUser.hostelDetails.block,
        floor: studentUser.hostelDetails.floor,
        roomNumber: studentUser.hostelDetails.roomNumber,
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
    console.log('Sample order seeded for testing.');

    console.log('DATABASE SEEDING COMPLETED SUCCESSFULLY.');
    process.exit(0);
  } catch (error) {
    console.error(`Seeding Failure: ${error.stack}`);
    process.exit(1);
  }
};

seedData();
