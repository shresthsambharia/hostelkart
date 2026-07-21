import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Product from './models/Product.js';
import Order from './models/Order.js';
import WalletTransaction from './models/WalletTransaction.js';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart');
    console.log(`Connected to MongoDB: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const run = async () => {
  await connectDB();

  // 1. Find Student User
  const student = await User.findOne({ email: 'student@hostelkart.com' });
  if (!student) {
    console.error('Student user not found! Run npm run seed first.');
    process.exit(1);
  }

  // 2. Find or create some products
  // Product 1: Long name to test wrapping
  let longProduct = await Product.findOne({ name: "Lipton Yellow Label Tea Premium Blend Long Leaf Black Tea Jar 500g" });
  if (!longProduct) {
    longProduct = new Product({
      name: "Lipton Yellow Label Tea Premium Blend Long Leaf Black Tea Jar 500g",
      description: "Premium black tea from Lipton yellow label series",
      price: 280,
      stock: 50,
      category: "Dairy Products",
      image: "https://res.cloudinary.com/dquhh8aee/image/upload/v1718000003/dairy.jpg",
      rating: 4.5,
      numReviews: 12
    });
    await longProduct.save();
  }

  // Product 2: Standard product
  let product2 = await Product.findOne({ name: "Amul Gold Milk 1L" });
  if (!product2) {
    product2 = new Product({
      name: "Amul Gold Milk 1L",
      description: "Full cream milk 1L",
      price: 66,
      stock: 100,
      category: "Dairy Products",
      image: "https://res.cloudinary.com/dquhh8aee/image/upload/v1718000003/dairy.jpg",
      rating: 4.8,
      numReviews: 24
    });
    await product2.save();
  }

  // Product 3: Another product
  let product3 = await Product.findOne({ name: "Cadbury Dairy Milk Silk Chocolate Bar 150g" });
  if (!product3) {
    product3 = new Product({
      name: "Cadbury Dairy Milk Silk Chocolate Bar 150g",
      description: "Premium smooth milk chocolate",
      price: 180,
      stock: 80,
      category: "Dairy Products",
      image: "https://res.cloudinary.com/dquhh8aee/image/upload/v1718000007/instant_food.jpg",
      rating: 4.7,
      numReviews: 18
    });
    await product3.save();
  }

  console.log('Seeded products for test order.');

  // 3. Set student's wallet balance and create transaction
  student.walletBalance = 500;
  await student.save();

  const wTx = new WalletTransaction({
    user: student._id,
    type: 'cashback',
    amount: 500,
    description: 'Manual credit for testing PDF invoice upgrades'
  });
  await wTx.save();
  console.log('Student wallet credited with ₹500.');

  // 4. Delete existing orders for student to keep dashboard clean (optional, let's keep it clean)
  await Order.deleteMany({ user: student._id });
  console.log('Cleared old student orders.');

  // 5. Build items array
  const items = [
    {
      product: longProduct._id,
      name: longProduct.name,
      quantity: 2,
      price: longProduct.price,
      discount: 10 // 10% discount on Lipton tea -> 252 INR discounted price
    },
    {
      product: product2._id,
      name: product2.name,
      quantity: 5,
      price: product2.price,
      discount: 0 // 66 INR unit price
    },
    {
      product: product3._id,
      name: product3.name,
      quantity: 3,
      price: product3.price,
      discount: 5 // 5% discount on chocolate bar -> 171 INR discounted price
    }
  ];

  // Calculations:
  // Item 1: (280 * 0.9) * 2 = 252 * 2 = 504 INR
  // Item 2: 66 * 5 = 330 INR
  // Item 3: (180 * 0.95) * 3 = 171 * 3 = 513 INR
  // Subtotal = 504 + 330 + 513 = 1347 INR
  // Platform Fee = 15 INR
  // Delivery Charge = 10 INR
  // Total Before discounts = 1347 + 15 + 10 = 1372 INR
  // Coupon Discount (FESTIVE100) = 100 INR
  // Wallet Deduction = 200 INR
  // Final Payable Grand Total = 1372 - 100 - 200 = 1072 INR

  const testOrder = new Order({
    user: student._id,
    items: items,
    deliveryDetails: {
      hostelName: 'Tagore Hostel',
      block: 'C-Block',
      floor: '2nd Floor',
      roomNumber: '214',
      phone: '9876543212',
      alternatePhone: '9876599999',
      landmark: 'Near Water Purifier Booth',
      deliveryInstructions: 'Deliver directly outside door'
    },
    deliverySlot: '08:00 PM - 09:00 PM',
    paymentMethod: 'ONLINE',
    paymentStatus: 'Paid',
    orderStatus: 'Delivered',
    platformFee: 15,
    deliveryCharge: 10,
    totalAmount: 1072,
    couponCode: 'FESTIVE100',
    discountAmount: 100,
    walletPaidAmount: 200,
    deliveryOtp: '7482',
    utrNumber: 'TXN987654321',
    paymentProvider: 'Cashfree',
    cf_order_id: 'test_order_cf123',
    transaction_id: 'pay_test_cf987',
    deliveredAt: new Date(Date.now() - 600000), // 10 minutes ago
    timeline: [
      { status: 'Pending', note: 'Order placed successfully', timestamp: new Date(Date.now() - 3600000) },
      { status: 'Confirmed', note: 'Rider assigned to order', timestamp: new Date(Date.now() - 3000000) },
      { status: 'Packed', note: 'Prepared at store counter', timestamp: new Date(Date.now() - 2400000) },
      { status: 'Out for Delivery', note: 'Rider en-route to your room', timestamp: new Date(Date.now() - 1200000) },
      { status: 'Delivered', note: 'Order arrived safely', timestamp: new Date(Date.now() - 600000) }
    ]
  });

  const savedOrder = await testOrder.save();
  console.log('Seeded test order with ID:', savedOrder._id);
  console.log('Test order placement complete!');
  process.exit(0);
};

run();
