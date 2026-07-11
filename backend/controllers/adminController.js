import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import CustomRequest from '../models/CustomRequest.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import Settings from '../models/Settings.js';
import { createAlert } from './notificationController.js';
import { deleteFromCloudinary, getPublicIdFromUrl } from '../config/cloudinary.js';
import AdminLog from '../models/AdminLog.js';
import { invalidateProductCache, invalidateAnalyticsCache } from '../middleware/cacheMiddleware.js';

// @desc    Get Admin Dashboard Analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getDashboardAnalytics = asyncHandler(async (req, res) => {
  // Boundaries
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const monthStart = new Date(todayStart);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const yearStart = new Date(todayStart);
  yearStart.setMonth(0);
  yearStart.setDate(1);
  yearStart.setHours(0, 0, 0, 0);

  const [
    totalProducts,
    activeProducts,
    inactiveProducts,
    outOfStockProducts,
    lowStockProductsCount,
    totalCustomers,
    newCustomersToday,
    weeklyCustomers,
    recentRegistrations,
    completedOrdersCount,
    cancelledOrdersCount,
    refundRequestsCount,
    pendingPaymentsCount,
    pendingDeliveriesCount,
  ] = await Promise.all([
    Product.countDocuments({}),
    Product.countDocuments({ isAvailable: true }),
    Product.countDocuments({ isAvailable: false }),
    Product.countDocuments({ stock: 0 }),
    Product.countDocuments({ stock: { $lt: 10 } }),
    User.countDocuments({ role: 'student' }),
    User.countDocuments({ role: 'student', createdAt: { $gte: todayStart } }),
    User.countDocuments({ role: 'student', createdAt: { $gte: weekStart } }),
    User.find({ role: 'student' }).sort({ createdAt: -1 }).limit(5).select('name email createdAt').lean(),
    Order.countDocuments({ orderStatus: 'Delivered' }),
    Order.countDocuments({ orderStatus: 'Cancelled' }),
    Order.countDocuments({ paymentStatus: 'Refund Pending' }),
    Order.countDocuments({ paymentStatus: { $in: ['Payment Submitted', 'Pending Verification', 'Payment Pending Verification'] } }),
    Order.countDocuments({ orderStatus: { $ne: 'Delivered', $ne: 'Cancelled' }, paymentStatus: 'Paid' }),
  ]);

  const allOrders = await Order.find({}).lean();

  let todaySales = 0;
  let yesterdaySales = 0;
  let weeklySales = 0;
  let monthlySales = 0;
  let yearlySales = 0;
  let grossRevenue = 0;
  let netRevenue = 0;
  let totalPendingAmount = 0;
  
  let morningOrders = 0;
  let eveningOrders = 0;

  let verificationTimes = [];

  allOrders.forEach((o) => {
    const oDate = new Date(o.createdAt);
    const amount = o.totalAmount;

    if (o.orderStatus !== 'Cancelled') {
      grossRevenue += amount;
    }

    if (o.orderStatus === 'Delivered' || o.paymentStatus === 'Paid') {
      netRevenue += (amount - (o.refundAmount || 0));
    }

    if (oDate >= todayStart) {
      todaySales += amount;
    }
    else if (oDate >= yesterdayStart && oDate < yesterdayEnd) {
      yesterdaySales += amount;
    }

    if (oDate >= weekStart) {
      weeklySales += amount;
    }

    if (oDate >= monthStart) {
      monthlySales += amount;
    }

    if (oDate >= yearStart) {
      yearlySales += amount;
    }

    if (['Payment Submitted', 'Pending Verification', 'Payment Pending Verification'].includes(o.paymentStatus)) {
      totalPendingAmount += amount;
    }

    const slot = (o.deliverySlot || '').toLowerCase();
    if (slot.includes('morning') || slot.includes('10am') || slot.includes('12pm')) {
      morningOrders++;
    } else {
      eveningOrders++;
    }

    if (o.paymentSubmittedAt && o.paymentVerifiedAt) {
      const diff = new Date(o.paymentVerifiedAt) - new Date(o.paymentSubmittedAt);
      if (diff > 0) {
        verificationTimes.push(diff);
      }
    }
  });

  const averageOrderValue = completedOrdersCount > 0 ? netRevenue / completedOrdersCount : 0;
  const profitEstimate = netRevenue * 0.15;

  const averageVerificationTimeMs = verificationTimes.length > 0
    ? verificationTimes.reduce((acc, t) => acc + t, 0) / verificationTimes.length
    : 12 * 60 * 1000;

  const averageVerificationTimeMinutes = Number((averageVerificationTimeMs / 1000 / 60).toFixed(1));

  const categoryDistribution = await Product.aggregate([
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const topSelling = await Order.aggregate([
    { $match: { $or: [{ orderStatus: 'Delivered' }, { paymentStatus: 'Paid' }] } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        totalQty: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { totalQty: -1 } },
    { $limit: 5 },
  ]);

  const worstSelling = await Order.aggregate([
    { $match: { $or: [{ orderStatus: 'Delivered' }, { paymentStatus: 'Paid' }] } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        totalQty: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
      },
    },
    { $sort: { totalQty: 1 } },
    { $limit: 5 },
  ]);

  const topCustomers = await Order.aggregate([
    { $match: { $or: [{ orderStatus: 'Delivered' }, { paymentStatus: 'Paid' }] } },
    {
      $group: {
        _id: '$user',
        totalSpent: { $sum: '$totalAmount' },
        ordersCount: { $sum: 1 }
      }
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 5 }
  ]);
  
  const populatedTopCustomers = [];
  for (const tc of topCustomers) {
    const cust = await User.findById(tc._id).select('name email').lean();
    if (cust) {
      populatedTopCustomers.push({
        _id: cust._id,
        name: cust.name,
        email: cust.email,
        totalSpent: tc.totalSpent,
        orderCount: tc.ordersCount
      });
    }
  }

  const customerOrderCounts = await Order.aggregate([
    { $group: { _id: '$user', count: { $sum: 1 } } }
  ]);
  const returningCustomersCount = customerOrderCounts.filter(c => c.count > 1).length;

  const recentOrders = await Order.find({})
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  const salesChartData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const start = new Date(d);
    const end = new Date(d);
    end.setDate(end.getDate() + 1);

    const dayOrders = allOrders.filter(o => {
      const oDate = new Date(o.createdAt);
      return oDate >= start && oDate < end && (o.orderStatus === 'Delivered' || o.paymentStatus === 'Paid');
    });
    const revenue = dayOrders.reduce((acc, o) => acc + o.totalAmount, 0);
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    salesChartData.push({ label, revenue });
  }

  const statuses = ['Pending', 'Confirmed', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled', 'Delivery Failed'];
  const orderStatusChartData = [];
  for (const s of statuses) {
    const count = await Order.countDocuments({ orderStatus: s });
    orderStatusChartData.push({ status: s, count });
  }

  const lowStockProductsList = await Product.find({ stock: { $lt: 10 } }).sort({ stock: 1 }).limit(10).lean();

  res.json({
    // Legacy support
    totalRevenue: netRevenue,
    todayRevenue: todaySales,
    todayVerifiedRevenue: netRevenue,
    todayPendingAmount: totalPendingAmount,
    todayPendingCount: pendingPaymentsCount,
    todayRefundsAmount: allOrders.filter(o => new Date(o.createdAt) >= todayStart).reduce((acc, o) => acc + (o.refundAmount || 0), 0),
    monthlyRevenue: monthlySales,
    averageOrderValue,
    pendingVerificationCount: pendingPaymentsCount,
    totalOrders: allOrders.length,
    todayOrders: allOrders.filter(o => new Date(o.createdAt) >= todayStart).length,
    pendingOrders: allOrders.filter(o => o.orderStatus === 'Pending').length,
    deliveredOrders: completedOrdersCount,
    cancelledOrders: cancelledOrdersCount,
    totalProducts,
    lowStockProductsCount,
    lowStockProductsList,
    totalUsers,
    totalDeliveryPartners,
    recentOrders,
    topSellingProducts: topSelling,
    salesChartData,
    orderStatusChartData,
    totalDeliveries: completedOrdersCount,
    deliveriesToday: allOrders.filter(o => new Date(o.createdAt) >= todayStart && o.orderStatus === 'Delivered').length,
    averageDeliveryTime: 15,
    successfulDeliveries: completedOrdersCount,
    cancelledDeliveries: cancelledOrdersCount,
    otpVerificationSuccessRate: 98,
    successfulPayments: completedOrdersCount,
    failedPayments: cancelledOrdersCount,
    pendingPayments: pendingPaymentsCount,
    refundedPayments: refundRequestsCount,
    paymentRevenue: netRevenue,
    totalRefunds: allOrders.reduce((acc, o) => acc + (o.refundAmount || 0), 0),
    activeDeliveries: pendingDeliveriesCount,
    couponUsagePct: 15,
    walletUsagePct: 10,
    topCustomers: populatedTopCustomers,

    // New Advanced structured metrics
    businessOverview: {
      todaySales,
      yesterdaySales,
      weeklySales,
      monthlySales,
      yearlySales,
      todayOrders: allOrders.filter(o => new Date(o.createdAt) >= todayStart).length,
      pendingOrders: allOrders.filter(o => o.orderStatus === 'Pending').length,
      completedOrders: completedOrdersCount,
      cancelledOrders: cancelledOrdersCount,
      refundRequests: refundRequestsCount,
      pendingPaymentVerification: pendingPaymentsCount,
      averageOrderValue,
      grossRevenue,
      netRevenue,
      profitEstimate
    },
    inventoryAnalytics: {
      totalProducts,
      activeProducts,
      inactiveProducts,
      outOfStock: outOfStockProducts,
      lowStock: lowStockProductsCount,
      bestSelling: topSelling,
      worstSelling,
      categoryDistribution
    },
    customerAnalytics: {
      totalCustomers,
      newCustomersToday,
      weeklyCustomers,
      returningCustomers: returningCustomersCount,
      topCustomers: populatedTopCustomers,
      recentRegistrations
    },
    paymentMetrics: {
      totalPendingAmount,
      averageVerificationTimeMinutes
    },
    deliveryMetrics: {
      morningSlotOrders: morningOrders,
      eveningSlotOrders: eveningOrders,
      pendingDelivery: pendingDeliveriesCount,
      deliveredToday: allOrders.filter(o => new Date(o.createdAt) >= todayStart && o.orderStatus === 'Delivered').length
    },
    charts: {
      salesChartData
    }
  });
});

// @desc    Add a product
// @route   POST /api/admin/products
// @access  Private/Admin
const addProduct = asyncHandler(async (req, res) => {
  const { name, price, discount, description, category, stock, deliveryTime, isAvailable, image, imageOriginal, imageMedium, imageThumb } = req.body;

  if (!name || !name.trim() || !category || !category.trim()) {
    res.status(400);
    throw new Error('Product name and category are required');
  }

  const priceNum = Number(price);
  if (isNaN(priceNum) || priceNum < 0) {
    res.status(400);
    throw new Error('Product price must be a valid non-negative number');
  }

  const discountNum = Number(discount || 0);
  if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
    res.status(400);
    throw new Error('Product discount must be a valid number between 0 and 100');
  }

  const stockNum = Number(stock || 0);
  if (isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
    res.status(400);
    throw new Error('Product stock must be a valid non-negative integer');
  }

  const product = new Product({
    name,
    price: priceNum,
    discount: discountNum,
    description,
    category,
    stock: stockNum,
    deliveryTime: deliveryTime || '30 mins',
    isAvailable: isAvailable !== undefined ? isAvailable : true,
    image: image || '/uploads/default-product.png',
    imageOriginal,
    imageMedium,
    imageThumb,
  });

  const createdProduct = await product.save();
  req.newValue = createdProduct;
  await invalidateProductCache();
  await invalidateAnalyticsCache();
  res.status(201).json(createdProduct);
});

// @desc    Edit a product
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
const editProduct = asyncHandler(async (req, res) => {
  const { name, price, discount, description, category, stock, deliveryTime, isAvailable, image, imageOriginal, imageMedium, imageThumb } = req.body;

  if (price !== undefined) {
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      res.status(400);
      throw new Error('Product price must be a valid non-negative number');
    }
  }

  if (discount !== undefined) {
    const discountNum = Number(discount);
    if (isNaN(discountNum) || discountNum < 0 || discountNum > 100) {
      res.status(400);
      throw new Error('Product discount must be a valid number between 0 and 100');
    }
  }

  if (stock !== undefined) {
    const stockNum = Number(stock);
    if (isNaN(stockNum) || stockNum < 0 || !Number.isInteger(stockNum)) {
      res.status(400);
      throw new Error('Product stock must be a valid non-negative integer');
    }
  }

  const product = await Product.findById(req.params.id);

  if (product) {
    req.oldValue = {
      name: product.name,
      price: product.price,
      discount: product.discount,
      description: product.description,
      category: product.category,
      stock: product.stock,
      deliveryTime: product.deliveryTime,
      isAvailable: product.isAvailable,
      image: product.image
    };

    product.name = name || product.name;
    product.price = price !== undefined ? Number(price) : product.price;
    product.discount = discount !== undefined ? Number(discount) : product.discount;
    product.description = description || product.description;
    product.category = category || product.category;
    product.stock = stock !== undefined ? Number(stock) : product.stock;
    product.deliveryTime = deliveryTime || product.deliveryTime;
    product.isAvailable = isAvailable !== undefined ? isAvailable : product.isAvailable;
    // Delete old image from Cloudinary if it's being replaced with a new one
    if (image && image !== product.image) {
      const oldPublicId = getPublicIdFromUrl(product.image);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }
    }

    product.image = image || product.image;
    product.imageOriginal = imageOriginal || product.imageOriginal;
    product.imageMedium = imageMedium || product.imageMedium;
    product.imageThumb = imageThumb || product.imageThumb;

    const updatedProduct = await product.save();
    req.newValue = {
      name: updatedProduct.name,
      price: updatedProduct.price,
      discount: updatedProduct.discount,
      description: updatedProduct.description,
      category: updatedProduct.category,
      stock: updatedProduct.stock,
      deliveryTime: updatedProduct.deliveryTime,
      isAvailable: updatedProduct.isAvailable,
      image: updatedProduct.image
    };
    await invalidateProductCache(updatedProduct._id);
    await invalidateAnalyticsCache();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Delete a product
// @route   DELETE /api/admin/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    req.oldValue = product;
    // Delete from Cloudinary if it's hosted there
    const publicId = getPublicIdFromUrl(product.image);
    if (publicId) {
      await deleteFromCloudinary(publicId);
    }
    await Product.deleteOne({ _id: req.params.id });
    await invalidateProductCache(req.params.id);
    await invalidateAnalyticsCache();
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Get all orders list
// @route   GET /api/admin/orders
// @access  Private/Admin
// @desc    Get all orders list with advanced search & filters
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const { search, status, hostel, date } = req.query;
  let query = {};

  if (status) {
    query.orderStatus = status;
  }
  if (hostel) {
    query['deliveryDetails.hostelName'] = { $regex: hostel, $options: 'i' };
  }
  if (date) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    query.createdAt = { $gte: startDate, $lte: endDate };
  }

  if (search) {
    const users = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    });
    const userIds = users.map(u => u._id);

    const conditions = [
      { user: { $in: userIds } },
      { utrNumber: { $regex: search, $options: 'i' } },
      { 'deliveryDetails.phone': { $regex: search, $options: 'i' } },
      { 'deliveryDetails.hostelName': { $regex: search, $options: 'i' } }
    ];

    if (mongoose.Types.ObjectId.isValid(search)) {
      conditions.push({ _id: search });
    }

    query.$or = conditions;
  }

  const orders = await Order.find(query)
    .populate('user', 'name email')
    .populate('deliveryPartner', 'name email phone')
    .sort({ createdAt: -1 });

  res.json(orders);
});

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);

  if (order) {
    req.oldValue = { orderStatus: order.orderStatus, timeline: order.timeline.map(t => t.status) };
    const oldStatus = order.orderStatus;
    order.orderStatus = status;
    
    if (status === 'Cancelled' && oldStatus !== 'Cancelled') {
      order.cancelledAt = Date.now();
      order.cancellationReason = note || 'Cancelled by Admin';
      
      // Restock products on cancellation
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }

      // If prepaid online order, record refund
      if (['ONLINE', 'CASHFREE', 'UPI'].includes(order.paymentMethod) && ['Paid', 'PAID'].includes(order.paymentStatus)) {
        order.refundStatus = 'REFUNDED';
        order.refundAmount = order.totalAmount;
        order.refundedAt = Date.now();
        order.refundReason = note || 'Cancelled by Admin';
      }
    }

    order.timeline.push({
      status,
      note: note || `Order status updated to ${status}`,
    });

    if (status === 'Delivered') {
      order.paymentStatus = 'Paid';
      order.deliveredAt = Date.now();
    }

    const updatedOrder = await order.save();
    req.newValue = { orderStatus: updatedOrder.orderStatus, timeline: updatedOrder.timeline.map(t => t.status) };

    // Broadcast status update in real-time via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id.toString()}`).emit('status_updated', {
        orderId: order._id.toString(),
        status,
        note: note || `Order status updated to ${status}`
      });
    }

    // Trigger notification alerts for student & rider
    let title = 'Order Status Update';
    let message = `Your order #${order._id.toString().substring(12).toUpperCase()} status is now: ${status}.`;
    if (status === 'Confirmed') {
      title = 'Order Confirmed';
      message = `Your order #${order._id.toString().substring(12).toUpperCase()} has been confirmed and is being processed.`;
    } else if (status === 'Packed') {
      title = 'Order Prepared';
      message = `Your order #${order._id.toString().substring(12).toUpperCase()} has been packed and is ready for pickup.`;
    } else if (status === 'Out for Delivery') {
      title = 'Order Out for Delivery';
      message = `Your order #${order._id.toString().substring(12).toUpperCase()} is out for delivery! A rider is heading to your room.`;
    } else if (status === 'Delivered') {
      title = 'Order Delivered';
      message = `Your order #${order._id.toString().substring(12).toUpperCase()} was successfully delivered to your room.`;
    } else if (status === 'Cancelled') {
      title = 'Order Cancelled';
      message = `Your order #${order._id.toString().substring(12).toUpperCase()} has been cancelled by the shop admin. Reason: "${order.cancellationReason}"`;
    }
    
    await createAlert(order.user, title, message, 'StatusUpdate');

    if (order.deliveryPartner) {
      await createAlert(
        order.deliveryPartner,
        'Order Status Update',
        `Assigned order #${order._id.toString().substring(12).toUpperCase()} status changed to: ${status}.`,
        'AssignedOrder'
      );
    }

    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Assign a delivery partner to an order
// @route   PUT /api/admin/orders/:id/assign
// @access  Private/Admin
const assignDeliveryPartner = asyncHandler(async (req, res) => {
  const { deliveryPartnerId } = req.body;
  const order = await Order.findById(req.params.id);

  if (order) {
    // Validate delivery partner exists
    const partner = await User.findById(deliveryPartnerId);
    if (!partner || partner.role !== 'delivery') {
      res.status(400);
      throw new Error('Invalid delivery partner ID');
    }

    order.deliveryPartner = deliveryPartnerId;
    order.orderStatus = 'Confirmed';
    order.timeline.push({
      status: 'Confirmed',
      note: `Delivery partner ${partner.name} assigned`,
    });

    await order.save();

    // Trigger notification alert for delivery partner
    await createAlert(
      deliveryPartnerId,
      'New Order Assigned',
      `You have been assigned to deliver Order #${order._id.toString().substring(12).toUpperCase()} to ${order.deliveryDetails.hostelName} (Room ${order.deliveryDetails.roomNumber}).`,
      'AssignedOrder'
    );

    // Trigger notification alert for student
    await createAlert(
      order.user,
      'Rider Assigned',
      `Rider ${partner.name} has been assigned to deliver your order.`,
      'StatusUpdate'
    );

    // Link/Sync inside DeliveryPartner details
    let partnerDetails = await DeliveryPartner.findOne({ user: deliveryPartnerId });
    if (!partnerDetails) {
      partnerDetails = await DeliveryPartner.create({
        user: deliveryPartnerId,
        status: 'On Delivery',
        currentOrders: [],
      });
    }

    if (!partnerDetails.currentOrders.includes(order._id)) {
      partnerDetails.currentOrders.push(order._id);
      partnerDetails.status = 'On Delivery';
      await partnerDetails.save();
    }

    res.json({ message: 'Delivery partner assigned successfully', order });
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Get all users list
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password').sort({ createdAt: -1 });
  res.json(users);
});

// @desc    Get all delivery partners (users with role 'delivery')
// @route   GET /api/admin/delivery-partners
// @access  Private/Admin
const getDeliveryPartnersList = asyncHandler(async (req, res) => {
  const deliveryUsers = await User.find({ role: 'delivery' }).select('_id name email phone');
  const partnersList = [];
  
  for (const user of deliveryUsers) {
    let dp = await DeliveryPartner.findOne({ user: user._id });
    if (!dp) {
      dp = await DeliveryPartner.create({
        user: user._id,
        vehicleNumber: '',
        status: 'Active',
        currentOrders: []
      });
    }
    partnersList.push({
      _id: user._id, // Set user ID as main _id so dropdown selection maps correctly to User collection
      partnerProfileId: dp._id,
      userId: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      vehicleNumber: dp.vehicleNumber,
      status: dp.status,
      currentOrders: dp.currentOrders
    });
  }
  
  res.json(partnersList);
});

// @desc    Add a new delivery partner
// @route   POST /api/admin/delivery-partners
// @access  Private/Admin
const addDeliveryPartner = asyncHandler(async (req, res) => {
  const { name, email, password, phone, vehicleNumber } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please fill in name, email, and password');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists with this email');
  }

  // Create User
  const user = await User.create({
    name,
    email,
    password,
    phone: phone || '',
    role: 'delivery'
  });

  // Create associated DeliveryPartner profile
  const partner = await DeliveryPartner.create({
    user: user._id,
    vehicleNumber: vehicleNumber || '',
    status: 'Active',
    currentOrders: []
  });

  res.status(201).json({
    _id: user._id,
    partnerProfileId: partner._id,
    userId: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    vehicleNumber: partner.vehicleNumber,
    status: partner.status
  });
});

// @desc    Update delivery partner details
// @route   PUT /api/admin/delivery-partners/:id
// @access  Private/Admin
const updateDeliveryPartner = asyncHandler(async (req, res) => {
  const { name, email, phone, vehicleNumber, status, password } = req.body;

  // Find by user field first, then fallback to direct ID
  let partner = await DeliveryPartner.findOne({ user: req.params.id });
  if (!partner) {
    partner = await DeliveryPartner.findById(req.params.id);
  }
  
  if (!partner) {
    res.status(404);
    throw new Error('Delivery partner profile not found');
  }

  const user = await User.findById(partner.user);
  if (!user) {
    res.status(404);
    throw new Error('Associated user not found');
  }

  // Update user details
  user.name = name || user.name;
  user.email = email || user.email;
  user.phone = phone !== undefined ? phone : user.phone;
  if (password) {
    user.password = password;
  }
  await user.save();

  // Update partner details
  partner.vehicleNumber = vehicleNumber !== undefined ? vehicleNumber : partner.vehicleNumber;
  partner.status = status || partner.status;
  await partner.save();

  res.json({
    _id: user._id,
    partnerProfileId: partner._id,
    userId: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    vehicleNumber: partner.vehicleNumber,
    status: partner.status
  });
});

// @desc    Delete/Remove a delivery partner
// @route   DELETE /api/admin/delivery-partners/:id
// @access  Private/Admin
const deleteDeliveryPartner = asyncHandler(async (req, res) => {
  // Find by user field first, then fallback to direct ID
  let partner = await DeliveryPartner.findOne({ user: req.params.id });
  if (!partner) {
    partner = await DeliveryPartner.findById(req.params.id);
  }

  if (!partner) {
    res.status(404);
    throw new Error('Delivery partner profile not found');
  }

  const userId = partner.user;
  const partnerId = partner._id;

  // Delete associated DeliveryPartner record
  await DeliveryPartner.deleteOne({ _id: partnerId });

  // Delete User record
  await User.deleteOne({ _id: userId });

  // Reset any incomplete assigned orders to Pending & unassigned
  await Order.updateMany(
    { deliveryPartner: userId, orderStatus: { $ne: 'Delivered' } },
    { $set: { deliveryPartner: null, orderStatus: 'Pending' } }
  );

  res.json({ message: 'Delivery partner removed successfully' });
});

// @desc    Get all custom requests
// @route   GET /api/admin/custom-requests
// @access  Private/Admin
const getAllCustomRequests = asyncHandler(async (req, res) => {
  const requests = await CustomRequest.find({})
    .populate('user', 'name email phone hostelDetails')
    .sort({ createdAt: -1 });
  res.json(requests);
});

// @desc    Update Custom Request (Accept/Reject)
// @route   PUT /api/admin/custom-requests/:id
// @access  Private/Admin
const updateCustomRequestStatus = asyncHandler(async (req, res) => {
  const { status, adminFeedback } = req.body;
  const request = await CustomRequest.findById(req.params.id);

  if (request) {
    request.status = status;
    request.adminFeedback = adminFeedback || '';
    await request.save();
    res.json(request);
  } else {
    res.status(404);
    throw new Error('Custom request not found');
  }
});

// @desc    Get Shop Payment Settings
// @route   GET /api/admin/payment-settings
// @access  Private/Admin
const getPaymentSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({ key: 'payment_config' });
  if (!settings) {
    settings = await Settings.create({
      key: 'payment_config',
      value: {
        upiId: 'hostelkart@upi',
        qrCodeUrl: '',
      },
    });
  }
  res.json(settings.value);
});

// @desc    Update Shop Payment Settings
// @route   PUT /api/admin/payment-settings
// @access  Private/Admin
const updatePaymentSettings = asyncHandler(async (req, res) => {
  const { upiId, qrCodeUrl } = req.body;

  let settings = await Settings.findOne({ key: 'payment_config' });
  if (!settings) {
    settings = new Settings({
      key: 'payment_config',
    });
  } else {
    req.oldValue = settings.value;
  }

  settings.value = {
    upiId: upiId || 'hostelkart@upi',
    qrCodeUrl: qrCodeUrl !== undefined ? qrCodeUrl : '',
  };

  await settings.save();
  req.newValue = settings.value;
  res.json(settings.value);
});

// @desc    Update order payment status (verify or reject or request info)
// @route   PUT /api/admin/orders/:id/payment
// @access  Private/Admin
const updateOrderPaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus, note } = req.body;
  const order = await Order.findById(req.params.id);

  if (order) {
    // Strict payment status validation
    const allowedStates = [
      'Pending Payment', 'Payment Submitted', 'Pending Verification', 
      'Paid', 'Rejected', 'Refund Initiated', 'Refund Completed', 
      'Cancelled', 'Delivered', 'Failed', 'Refund Pending', 'Refunded'
    ];

    if (!allowedStates.includes(paymentStatus)) {
      res.status(400);
      throw new Error(`Invalid payment state: ${paymentStatus}`);
    }

    if (order.paymentStatus === 'Paid' && ['Pending Payment', 'Payment Submitted', 'Pending Verification'].includes(paymentStatus)) {
      res.status(400);
      throw new Error('Cannot revert a verified/paid transaction back to pending status.');
    }

    req.oldValue = { paymentStatus: order.paymentStatus, orderStatus: order.orderStatus };
    const oldPaymentStatus = order.paymentStatus;
    
    req.orderNumber = order._id.toString().substring(12).toUpperCase();

    order.paymentStatus = paymentStatus;
    if (['Paid', 'Verified', 'Rejected', 'Failed'].includes(paymentStatus)) {
      order.paymentVerifiedAt = Date.now();
    }
    
    order.timeline.push({
      status: order.orderStatus,
      note: `Payment status updated to ${paymentStatus} by Admin. Note: ${note || 'None'}`,
    });

    if ((paymentStatus === 'Paid' || paymentStatus === 'Verified') && oldPaymentStatus !== 'Paid') {
      order.paymentStatus = 'Paid';
      order.orderStatus = 'Confirmed';
      order.paidAt = Date.now();
      
      order.timeline.push({
        status: 'Confirmed',
        note: 'Payment verified and approved by Admin. Order confirmed.',
      });

      // Winston Security Monitoring Log
      logger.info('PAYMENT_APPROVED', `Payment approved by Admin for order: #${order._id.toString().substring(12).toUpperCase()}`, {
        orderId: order._id,
        amount: order.totalAmount,
        adminId: req.user._id,
      });

      // Send Order Confirmation Email to student
      try {
        const UserObj = (await import('../models/User.js')).default;
        const userObj = await UserObj.findById(order.user);
        if (userObj) {
          const sendEmailObj = (await import('../utils/sendEmail.js')).default;
          const studentSubject = `HostelKart Order Confirmed - #${order._id.toString().substring(12).toUpperCase()}`;
          const studentText = `Hello ${userObj.name},\n\nYour payment has been verified. Your order is confirmed and will be delivered shortly!\n\nOrder ID: #${order._id.toString().substring(12).toUpperCase()}\nAmount: ₹${order.totalAmount}\nOTP: ${order.deliveryOtp}`;
          await sendEmailObj({ to: userObj.email, subject: studentSubject, text: studentText });
        }
      } catch (err) {
        console.error('[Verify Email Error]:', err.message);
      }

      // Send push notification
      try {
        const { sendPushNotification } = await import('../utils/fcm.js');
        await sendPushNotification(order.user, 'Order Confirmed', `Your payment was verified! Order #${order._id.toString().substring(12).toUpperCase()} is confirmed.`, 'StatusUpdate');
      } catch (err) {
        console.error('[Verify Push Error]:', err.message);
      }
      
      // Notify customer in DB
      await createAlert(
        order.user,
        'Payment Approved',
        `Your payment for Order #${order._id.toString().substring(12).toUpperCase()} has been approved and verified!`,
        'StatusUpdate'
      );

    } else if (['Failed', 'Rejected'].includes(paymentStatus) && !['Failed', 'Rejected'].includes(oldPaymentStatus)) {
      order.paymentStatus = 'Failed';
      order.orderStatus = 'Cancelled';
      order.cancelledAt = Date.now();
      order.cancellationReason = note || 'Payment verification rejected by admin';
      
      order.timeline.push({
        status: 'Cancelled',
        note: `Order cancelled. Reason: ${note || 'Payment verification rejected by admin'}`,
      });

      // Winston Security Monitoring Log
      logger.warn('PAYMENT_REJECTED', `Payment verification rejected by Admin for order: #${order._id.toString().substring(12).toUpperCase()}`, {
        orderId: order._id,
        amount: order.totalAmount,
        reason: note || 'Payment verification rejected by admin',
        adminId: req.user._id,
      });

      // Restock products on rejection
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }

      // Send rejection notification
      try {
        const { sendPushNotification } = await import('../utils/fcm.js');
        await sendPushNotification(order.user, 'Payment Rejected', `Your payment verification failed for Order #${order._id.toString().substring(12).toUpperCase()}.`, 'StatusUpdate');
      } catch (err) {
        console.error('[Reject Push Error]:', err.message);
      }

      // Notify customer in DB
      await createAlert(
        order.user,
        'Payment Rejected',
        `Your payment verification failed for Order #${order._id.toString().substring(12).toUpperCase()}. Reason: ${note || 'Verification failed'}`,
        'StatusUpdate'
      );
    } else if (['Information Requested', 'Request Info', 'Request More Information'].includes(paymentStatus)) {
      order.paymentStatus = 'Verification Pending'; // Keep it pending
      order.timeline.push({
        status: order.orderStatus,
        note: `Admin requested more payment information. Message: ${note || 'Please check your transaction details.'}`,
      });

      // Notify customer in DB
      await createAlert(
        order.user,
        'Payment Information Requested',
        `Admin requested more payment information for Order #${order._id.toString().substring(12).toUpperCase()}: "${note || 'Please check your UTR number or screenshot.'}"`,
        'StatusUpdate'
      );
    }

    const updatedOrder = await order.save();
    req.newValue = { paymentStatus: updatedOrder.paymentStatus, orderStatus: updatedOrder.orderStatus };

    // Broadcast status update
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('status_updated', {
        orderId: order._id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus
      });
    }

    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
});

// @desc    Get Admin Audit Activity Logs
// @route   GET /api/admin/logs
// @access  Private/Admin
const getAdminLogs = asyncHandler(async (req, res) => {
  const AdminLog = (await import('../models/AdminLog.js')).default;
  const logs = await AdminLog.find({})
    .populate('admin', 'name email role')
    .sort({ timestamp: -1 })
    .limit(200);
  res.json(logs);
});

// @desc    Issue a refund for an order
// @route   POST /api/admin/orders/:id/refund
// @access  Private/Admin
const createOrderRefund = asyncHandler(async (req, res) => {
  const { amount, reason, internalNotes, status, refundDate } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Set state logging variables
  req.oldValue = { refunds: order.refunds.map(r => r.toObject()) };

  // Set orderNumber on request so the logging middleware logs it
  req.orderNumber = order._id.toString().substring(12).toUpperCase();

  const refundAmt = Number(amount);
  if (isNaN(refundAmt) || refundAmt <= 0) {
    res.status(400);
    throw new Error('Refund amount must be a positive number');
  }

  // Calculate previously refunded amount
  const totalRefunded = order.refunds.reduce((acc, r) => {
    if (r.status === 'Refunded') return acc + r.amount;
    return acc;
  }, 0);

  const maxRefundable = order.totalAmount - totalRefunded;
  if (refundAmt > maxRefundable + 0.01) {
    res.status(400);
    throw new Error(`Refund amount exceeds the maximum refundable amount of ₹${maxRefundable.toFixed(2)}`);
  }

  // Push new refund record
  const refundRecord = {
    amount: refundAmt,
    reason: reason || 'Merchant refund',
    internalNotes: internalNotes || '',
    status: status || 'Pending',
    refundDate: refundDate ? new Date(refundDate) : new Date(),
    refundedBy: req.user._id,
  };

  order.refunds.push(refundRecord);

  // Update order status if refund is completed (Refunded)
  if (status === 'Refunded') {
    const isFullRefund = Math.abs(refundAmt - maxRefundable) < 0.05;
    order.paymentStatus = isFullRefund ? 'Refunded' : 'Paid';
    order.orderStatus = isFullRefund ? 'Refunded' : order.orderStatus;
    order.refundStatus = isFullRefund ? 'REFUNDED' : 'PARTIAL_REFUNDED';
    order.refundAmount = (order.refundAmount || 0) + refundAmt;
    order.refundedAt = new Date();
    order.refundReason = reason || 'Refund processed';

    order.timeline.push({
      status: isFullRefund ? 'Refunded' : order.orderStatus,
      note: `Refund of ₹${refundAmt} processed successfully by Admin. Reason: ${reason || 'None'}`,
    });

    // Credit user's wallet balance
    const studentUser = await User.findById(order.user);
    if (studentUser) {
      studentUser.walletBalance = (studentUser.walletBalance || 0) + refundAmt;
      await studentUser.save();

      // Create a WalletTransaction record
      const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
      const walletTx = new WalletTransaction({
        user: order.user,
        type: 'refund',
        amount: refundAmt,
        description: `Refund for Order #${order._id.toString().substring(12).toUpperCase()}`
      });
      await walletTx.save();
    }

    // Notify customer in DB
    await createAlert(
      order.user,
      'Refund Completed',
      `Your refund of ₹${refundAmt} for Order #${order._id.toString().substring(12).toUpperCase()} has been completed!`,
      'StatusUpdate'
    );
  } else {
    // If pending or processing
    order.paymentStatus = 'Refund Pending';
    order.timeline.push({
      status: order.orderStatus,
      note: `Refund of ₹${refundAmt} is in status: ${status}. Reason: ${reason || 'None'}`,
    });

    // Notify customer in DB
    await createAlert(
      order.user,
      'Refund Approved',
      `Your refund request of ₹${refundAmt} for Order #${order._id.toString().substring(12).toUpperCase()} has been approved and is being processed.`,
      'StatusUpdate'
    );
  }

  const updatedOrder = await order.save();
  req.newValue = { refunds: updatedOrder.refunds.map(r => r.toObject()) };

  // Winston Security Monitoring Log
  logger.info('REFUND_APPROVED', `Refund of ₹${refundAmt} approved by Admin for order: #${order._id.toString().substring(12).toUpperCase()}`, {
    orderId: order._id,
    amount: refundAmt,
    status: status || 'Pending',
    adminId: req.user._id,
  });

  // Broadcast status update
  const io = req.app.get('io');
  if (io) {
    io.to(`order_${order._id}`).emit('status_updated', {
      orderId: order._id,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus
    });
  }

});

// @desc    Update refund status (Approve/Reject)
// @route   PUT /api/admin/orders/:id/refunds/:refundId
// @access  Private/Admin
const updateOrderRefundStatus = asyncHandler(async (req, res) => {
  const { status, refundUTR, refundMethod, internalNotes, reason } = req.body;
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const refund = order.refunds.id(req.params.refundId);
  if (!refund) {
    res.status(404);
    throw new Error('Refund record not found');
  }

  if (refund.status === 'Refunded') {
    res.status(400);
    throw new Error('Refund has already been completed.');
  }

  req.oldValue = { refunds: order.refunds.map(r => r.toObject()) };
  req.orderNumber = order._id.toString().substring(12).toUpperCase();

  refund.status = status;
  if (refundUTR) refund.refundUTR = refundUTR;
  if (refundMethod) refund.refundMethod = refundMethod;
  if (internalNotes) refund.internalNotes = internalNotes;
  if (reason) refund.reason = reason;
  refund.refundDate = new Date();
  refund.refundedBy = req.user._id;

  if (status === 'Refunded') {
    // Process wallet refund or finalize state
    const totalRefunded = order.refunds.reduce((acc, r) => {
      if (r.status === 'Refunded') return acc + r.amount;
      return acc;
    }, 0);

    const isFullRefund = Math.abs(totalRefunded - order.totalAmount) < 0.05;
    order.paymentStatus = isFullRefund ? 'Refunded' : 'Paid';
    order.orderStatus = isFullRefund ? 'Refunded' : order.orderStatus;
    order.refundStatus = isFullRefund ? 'REFUNDED' : 'PARTIAL_REFUNDED';
    order.refundAmount = totalRefunded;
    order.refundedAt = new Date();

    order.timeline.push({
      status: isFullRefund ? 'Refunded' : order.orderStatus,
      note: `Refund of ₹${refund.amount} completed. UTR: ${refundUTR || 'N/A'}. Method: ${refundMethod || 'Wallet'}.`,
    });

    // Credit user's wallet balance
    const studentUser = await User.findById(order.user);
    if (studentUser) {
      studentUser.walletBalance = (studentUser.walletBalance || 0) + refund.amount;
      await studentUser.save();

      const WalletTransaction = (await import('../models/WalletTransaction.js')).default;
      const walletTx = new WalletTransaction({
        user: order.user,
        type: 'refund',
        amount: refund.amount,
        description: `Refund for Order #${order._id.toString().substring(12).toUpperCase()}`
      });
      await walletTx.save();
    }

    // DB Alert
    await createAlert(
      order.user,
      'Refund Completed',
      `Your refund of ₹${refund.amount} for Order #${order._id.toString().substring(12).toUpperCase()} has been completed!`,
      'StatusUpdate'
    );
  } else if (status === 'Rejected') {
    order.timeline.push({
      status: order.orderStatus,
      note: `Refund request of ₹${refund.amount} was rejected by Admin.`,
    });

    await createAlert(
      order.user,
      'Refund Rejected',
      `Your refund request of ₹${refund.amount} for Order #${order._id.toString().substring(12).toUpperCase()} was rejected.`,
      'StatusUpdate'
    );
  }

  const updatedOrder = await order.save();
  req.newValue = { refunds: updatedOrder.refunds.map(r => r.toObject()) };

  logger.info('REFUND_STATUS_UPDATED', `Refund status updated to ${status} for order #${order._id.toString().substring(12).toUpperCase()}`, {
    orderId: order._id,
    refundId: refund._id,
    amount: refund.amount,
    status,
    adminId: req.user._id,
  });

  // Broadcast status update
  const io = req.app.get('io');
  if (io) {
    io.to(`order_${order._id}`).emit('status_updated', {
      orderId: order._id,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus
    });
  }

  res.json(updatedOrder);
});

export {
  getDashboardAnalytics,
  addProduct,
  editProduct,
  deleteProduct,
  getAllOrders,
  updateOrderStatus,
  assignDeliveryPartner,
  getAllUsers,
  getDeliveryPartnersList,
  addDeliveryPartner,
  updateDeliveryPartner,
  deleteDeliveryPartner,
  getAllCustomRequests,
  updateCustomRequestStatus,
  getPaymentSettings,
  updatePaymentSettings,
  updateOrderPaymentStatus,
  getAdminLogs,
  createOrderRefund,
  updateOrderRefundStatus,
};
