import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import CustomRequest from '../models/CustomRequest.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import Settings from '../models/Settings.js';
import { createAlert } from './notificationController.js';
import { refundOrderHelper } from './paymentController.js';

// @desc    Get Admin Dashboard Analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getDashboardAnalytics = asyncHandler(async (req, res) => {
  // 1. Total revenue (Delivered or Paid orders)
  const paidOrDeliveredOrders = await Order.find({
    $or: [{ orderStatus: 'Delivered' }, { paymentStatus: 'Paid' }]
  });
  const totalRevenue = paidOrDeliveredOrders.reduce((acc, order) => acc + order.totalAmount, 0);

  // Today's boundaries (local or standard server day)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Today's revenue
  const todayPaidOrDelivered = await Order.find({
    createdAt: { $gte: todayStart },
    $or: [{ orderStatus: 'Delivered' }, { paymentStatus: 'Paid' }]
  });
  const todayRevenue = todayPaidOrDelivered.reduce((acc, order) => acc + order.totalAmount, 0);

  // 2. Orders summary
  const totalOrders = await Order.countDocuments({});
  const todayOrders = await Order.countDocuments({ createdAt: { $gte: todayStart } });
  const pendingOrders = await Order.countDocuments({ orderStatus: 'Pending' });
  const deliveredOrders = await Order.countDocuments({ orderStatus: 'Delivered' });
  const cancelledOrders = await Order.countDocuments({ orderStatus: { $in: ['Cancelled', 'Delivery Failed'] } });

  // 3. Users and Products summary
  const totalUsers = await User.countDocuments({ role: 'student' });
  const totalDeliveryPartners = await User.countDocuments({ role: 'delivery' });
  const totalProducts = await Product.countDocuments({});
  const lowStockProductsCount = await Product.countDocuments({ stock: { $lt: 10 } });
  const lowStockProductsList = await Product.find({ stock: { $lt: 10 } }).sort({ stock: 1 }).limit(10);

  // 4. Recent orders (latest 5)
  const recentOrders = await Order.find({})
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(5);

  // 5. Top-selling products aggregation (matching Paid or Delivered orders)
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

  // If topSelling is empty, let's fetch any 5 products as fallback placeholders so the charts/widgets are populated
  const topSellingWithFallback = topSelling.length > 0 
    ? topSelling 
    : (await Product.find({}).limit(5)).map(p => ({
        _id: p._id,
        name: p.name,
        totalQty: 0,
        revenue: 0
      }));

  // 6. Sales history data (last 7 days)
  const salesChartData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const start = new Date(d);
    const end = new Date(d);
    end.setDate(end.getDate() + 1);

    const dayOrders = await Order.find({
      createdAt: { $gte: start, $lt: end },
      $or: [{ orderStatus: 'Delivered' }, { paymentStatus: 'Paid' }]
    });
    const revenue = dayOrders.reduce((acc, o) => acc + o.totalAmount, 0);
    const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    salesChartData.push({ label, revenue });
  }

  // Order status chart distribution data
  const statuses = ['Pending', 'Confirmed', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled', 'Delivery Failed'];
  const orderStatusChartData = [];
  for (const s of statuses) {
    const count = await Order.countDocuments({ orderStatus: s });
    orderStatusChartData.push({ status: s, count });
  }

  // 8. Operational Performance stats calculations
  const totalDeliveries = await Order.countDocuments({ orderStatus: 'Delivered' });
  const deliveriesToday = await Order.countDocuments({ orderStatus: 'Delivered', createdAt: { $gte: todayStart } });
  const successfulDeliveries = totalDeliveries;
  const cancelledDeliveries = await Order.countDocuments({ orderStatus: { $in: ['Cancelled', 'Delivery Failed'] } });

  // Average Delivery Time (Confirmed status to Delivered status delta)
  const deliveredOrdersForStats = await Order.find({ orderStatus: 'Delivered' });
  let totalDeliveryTimeMin = 0;
  let deliveryTimeCount = 0;

  for (const o of deliveredOrdersForStats) {
    const confirmedEvent = o.timeline.find(t => t.status === 'Confirmed');
    if (confirmedEvent && o.deliveredAt) {
      const diffMs = new Date(o.deliveredAt) - new Date(confirmedEvent.timestamp);
      const diffMin = Math.round(diffMs / 60000);
      if (diffMin > 0) {
        totalDeliveryTimeMin += diffMin;
        deliveryTimeCount++;
      }
    }
  }
  const averageDeliveryTime = deliveryTimeCount > 0 ? Math.round(totalDeliveryTimeMin / deliveryTimeCount) : 0;

  // OTP Verification Success Rate
  const otpVerifiedCount = await Order.countDocuments({ orderStatus: 'Delivered', otpVerified: true });
  const otpVerificationSuccessRate = totalDeliveries > 0 ? Math.round((otpVerifiedCount / totalDeliveries) * 100) : 100;

  // Payment panel KPIs
  const successfulPayments = await Order.countDocuments({ paymentStatus: { $in: ['Paid', 'PAID'] } });
  const failedPayments = await Order.countDocuments({ paymentStatus: { $in: ['Failed', 'FAILED'] } });
  const pendingPayments = await Order.countDocuments({ paymentStatus: 'Pending' });
  const refundedPayments = await Order.countDocuments({ $or: [{ paymentStatus: 'Refunded' }, { refundStatus: 'REFUNDED' }] });

  const paidOrdersList = await Order.find({ paymentStatus: { $in: ['Paid', 'PAID'] } });
  const paymentRevenue = paidOrdersList.reduce((acc, o) => acc + o.totalAmount, 0);

  const refundedOrdersList = await Order.find({ refundStatus: 'REFUNDED' });
  const totalRefunds = refundedOrdersList.reduce((acc, o) => acc + (o.refundAmount || 0), 0);

  // Active deliveries: Confirmed, Packed, Out for Delivery
  const activeDeliveries = await Order.countDocuments({
    orderStatus: { $in: ['Confirmed', 'Packed', 'Out for Delivery'] }
  });

  // Coupon usage %
  const totalOrdersCount = await Order.countDocuments({});
  const couponUsedCount = await Order.countDocuments({ couponCode: { $ne: '' } });
  const couponUsagePct = totalOrdersCount > 0 ? Math.round((couponUsedCount / totalOrdersCount) * 100) : 0;

  // Wallet usage %
  const walletUsedCount = await Order.countDocuments({ walletPaidAmount: { $gt: 0 } });
  const walletUsagePct = totalOrdersCount > 0 ? Math.round((walletUsedCount / totalOrdersCount) * 100) : 0;

  // Top Customers
  const topCustomers = await Order.aggregate([
    { $match: { $or: [{ orderStatus: 'Delivered' }, { paymentStatus: 'Paid' }, { paymentStatus: 'PAID' }] } },
    {
      $group: {
        _id: '$user',
        totalSpent: { $sum: '$totalAmount' },
        orderCount: { $sum: 1 }
      }
    },
    { $sort: { totalSpent: -1 } },
    { $limit: 10 }
  ]);

  const topCustomersList = [];
  for (const c of topCustomers) {
    const userObj = await User.findById(c._id).select('name email');
    if (userObj) {
      topCustomersList.push({
        _id: c._id,
        name: userObj.name,
        email: userObj.email,
        totalSpent: c.totalSpent,
        orderCount: c.orderCount
      });
    }
  }

  res.json({
    totalRevenue,
    todayRevenue,
    totalOrders,
    todayOrders,
    pendingOrders,
    deliveredOrders,
    cancelledOrders,
    totalProducts,
    lowStockProductsCount,
    lowStockProductsList,
    totalUsers,
    totalDeliveryPartners,
    recentOrders,
    topSellingProducts: topSellingWithFallback,
    salesChartData,
    orderStatusChartData,
    totalDeliveries,
    deliveriesToday,
    averageDeliveryTime,
    successfulDeliveries,
    cancelledDeliveries,
    otpVerificationSuccessRate,
    successfulPayments,
    failedPayments,
    pendingPayments,
    refundedPayments,
    paymentRevenue,
    totalRefunds,
    activeDeliveries,
    couponUsagePct,
    walletUsagePct,
    topCustomers: topCustomersList,
  });
});

// @desc    Add a product
// @route   POST /api/admin/products
// @access  Private/Admin
const addProduct = asyncHandler(async (req, res) => {
  const { name, price, discount, description, category, stock, deliveryTime, isAvailable, image, imageOriginal, imageMedium, imageThumb } = req.body;

  const product = new Product({
    name,
    price: Number(price),
    discount: Number(discount || 0),
    description,
    category,
    stock: Number(stock),
    deliveryTime: deliveryTime || '30 mins',
    isAvailable: isAvailable !== undefined ? isAvailable : true,
    image: image || '/uploads/default-product.png',
    imageOriginal,
    imageMedium,
    imageThumb,
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
});

// @desc    Edit a product
// @route   PUT /api/admin/products/:id
// @access  Private/Admin
const editProduct = asyncHandler(async (req, res) => {
  const { name, price, discount, description, category, stock, deliveryTime, isAvailable, image, imageOriginal, imageMedium, imageThumb } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    product.name = name || product.name;
    product.price = price !== undefined ? Number(price) : product.price;
    product.discount = discount !== undefined ? Number(discount) : product.discount;
    product.description = description || product.description;
    product.category = category || product.category;
    product.stock = stock !== undefined ? Number(stock) : product.stock;
    product.deliveryTime = deliveryTime || product.deliveryTime;
    product.isAvailable = isAvailable !== undefined ? isAvailable : product.isAvailable;
    product.image = image || product.image;
    product.imageOriginal = imageOriginal || product.imageOriginal;
    product.imageMedium = imageMedium || product.imageMedium;
    product.imageThumb = imageThumb || product.imageThumb;

    const updatedProduct = await product.save();
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
    await Product.deleteOne({ _id: req.params.id });
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Get all orders list
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
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

      // If prepaid online order, auto-trigger refund
      if (['ONLINE', 'RAZORPAY'].includes(order.paymentMethod) && ['Paid', 'PAID'].includes(order.paymentStatus)) {
        await refundOrderHelper(order, note || 'Cancelled by Admin');
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
  }

  settings.value = {
    upiId: upiId || 'hostelkart@upi',
    qrCodeUrl: qrCodeUrl !== undefined ? qrCodeUrl : '',
  };

  await settings.save();
  res.json(settings.value);
});

// @desc    Update order payment status (verify or reject)
// @route   PUT /api/admin/orders/:id/payment
// @access  Private/Admin
const updateOrderPaymentStatus = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;
  const order = await Order.findById(req.params.id);

  if (order) {
    order.paymentStatus = paymentStatus;
    order.timeline.push({
      status: order.orderStatus,
      note: `Payment status updated to ${paymentStatus} by Admin`,
    });

    // If payment is rejected, automatically cancel the order
    if (paymentStatus === 'Failed') {
      order.orderStatus = 'Cancelled';
      order.timeline.push({
        status: 'Cancelled',
        note: 'Order cancelled due to payment rejection',
      });
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('Order not found');
  }
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
};
