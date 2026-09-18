import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import crypto from 'crypto';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import FinancialLedger from '../models/FinancialLedger.js';
import SupplierPayout from '../models/SupplierPayout.js';
import { invalidateProductCache } from '../middleware/cacheMiddleware.js';
import { logger } from '../utils/logger.js';
import { STUDENT_VISIBLE_CATEGORIES } from '../config/constants.js';
import {
  getMarketplaceSettings,
  resolveCommissionRate,
  isSettlementOverdue,
  getNextPayoutDate,
  calculateSettlementDueDate,
} from '../utils/commissionEngine.js';
import { uploadBufferToCloudinary, deleteFromCloudinary, getPublicIdFromUrl } from '../config/cloudinary.js';

// @desc    Get Supplier Dashboard Analytics
// @route   GET /api/supplier/dashboard
// @access  Private/Supplier
const getSupplierDashboard = asyncHandler(async (req, res) => {
  const supplierId = req.user._id;

  // Aggregate product counts for this supplier
  const [
    totalProducts,
    approvedProducts,
    pendingProducts,
    rejectedProducts,
    lowStockProducts,
    outOfStockProducts,
    myProducts,
    supplierUser,
    marketplaceSettings,
  ] = await Promise.all([
    Product.countDocuments({ supplier: supplierId }),
    Product.countDocuments({ supplier: supplierId, approvalStatus: 'approved' }),
    Product.countDocuments({ supplier: supplierId, approvalStatus: 'pending' }),
    Product.countDocuments({ supplier: supplierId, approvalStatus: 'rejected' }),
    Product.countDocuments({ supplier: supplierId, stock: { $gt: 0, $lt: 10 } }),
    Product.countDocuments({ supplier: supplierId, stock: 0 }),
    Product.find({ supplier: supplierId }).select('_id price stock name category approvalStatus isAvailable').lean(),
    User.findById(supplierId).lean(),
    getMarketplaceSettings(),
  ]);

  // Calculate total inventory valuation & total units in stock
  let totalStockUnits = 0;
  let totalStockValuation = 0;
  myProducts.forEach((p) => {
    const stock = Number(p.stock) || 0;
    const price = Number(p.price) || 0;
    totalStockUnits += stock;
    totalStockValuation += stock * price;
  });

  // Calculate order analytics for products belonging to this supplier
  const myProductIds = myProducts.map((p) => p._id);
  const relevantOrders = await Order.find({
    $or: [
      { 'items.supplier': supplierId },
      { 'items.product': { $in: myProductIds } },
    ],
  }).select('items orderStatus paymentStatus createdAt totalAmount').lean();

  let totalOrdersCount = relevantOrders.length;
  let deliveredOrdersCount = 0;
  let totalRevenue = 0;
  let totalItemsSold = 0;
  let totalCommissionDeducted = 0;
  let netEarningsDelivered = 0;
  let pendingPayableBalance = 0;

  relevantOrders.forEach((order) => {
    const isDelivered = order.orderStatus === 'Delivered';
    if (isDelivered) deliveredOrdersCount += 1;

    (order.items || []).forEach((item) => {
      const isMyProduct = (item.supplier && item.supplier.toString() === supplierId.toString()) ||
        (item.product && myProductIds.some((id) => id.toString() === item.product?.toString()));

      if (isMyProduct) {
        const qty = item.quantity || 1;
        const gross = Number(item.grossAmount) || ((Number(item.price) || 0) * qty);
        const comm = Number(item.commissionAmount) || 0;
        const payable = Number(item.supplierPayableAmount) || (gross - comm);

        totalItemsSold += qty;
        if (order.orderStatus !== 'Cancelled') {
          totalRevenue += gross;
        }

        if (isDelivered) {
          totalCommissionDeducted += comm;
          netEarningsDelivered += payable;
          if (!item.settlementStatus || item.settlementStatus === 'Eligible' || item.settlementStatus === 'Pending') {
            pendingPayableBalance += payable;
          }
        }
      }
    });
  });

  // Check last paid payout
  const lastPaidPayout = await SupplierPayout.findOne({ supplier: supplierId, status: 'Paid' })
    .sort({ paidAt: -1 })
    .lean();

  const effectiveCommissionRate = resolveCommissionRate(null, supplierUser, marketplaceSettings);

  res.json({
    metrics: {
      totalProducts,
      approvedProducts,
      pendingProducts,
      rejectedProducts,
      lowStockProducts,
      outOfStockProducts,
      totalStockUnits,
      totalStockValuation: Math.round(totalStockValuation),
      totalOrdersCount,
      deliveredOrdersCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalItemsSold,
      totalCommissionDeducted: Math.round(totalCommissionDeducted * 100) / 100,
      netEarningsDelivered: Math.round(netEarningsDelivered * 100) / 100,
      pendingPayableBalance: Math.round(pendingPayableBalance * 100) / 100,
      lastPayoutAmount: lastPaidPayout ? Number(lastPaidPayout.netPayable) : 0,
      lastPayoutDate: lastPaidPayout ? lastPaidPayout.paidAt : null,
      effectiveCommissionRate,
    },
    recentProducts: myProducts.slice(0, 5),
  });
});

// @desc    Get all products for current supplier
// @route   GET /api/supplier/products
// @access  Private/Supplier
const getSupplierProducts = asyncHandler(async (req, res) => {
  const supplierId = req.user._id;
  const { keyword, category, status, stockFilter } = req.query;

  const query = { supplier: supplierId };

  if (keyword) {
    query.name = { $regex: keyword, $options: 'i' };
  }

  if (category && category !== 'all') {
    query.category = category;
  }

  if (status && status !== 'all') {
    query.approvalStatus = status;
  }

  if (stockFilter === 'low') {
    query.stock = { $gt: 0, $lt: 10 };
  } else if (stockFilter === 'out') {
    query.stock = 0;
  } else if (stockFilter === 'in') {
    query.stock = { $gte: 10 };
  }

  const products = await Product.find(query).sort({ createdAt: -1 }).lean();
  res.json(products);
});

// @desc    Get single product for current supplier (Strict IDOR check)
// @route   GET /api/supplier/products/:id
// @access  Private/Supplier
const getSupplierProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).lean();

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // IDOR Protection: Must belong to requesting supplier
  if (!product.supplier || product.supplier.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to access this product');
  }

  res.json(product);
});

// @desc    Create new product by supplier (Defaults to pending approval)
// @route   POST /api/supplier/products
// @access  Private/Supplier
const createSupplierProduct = asyncHandler(async (req, res) => {
  const {
    name,
    price,
    description,
    image,
    category,
    stock,
    brand,
    mrp,
    discount,
    deliveryTime,
  } = req.body;

  if (!name || price === undefined || !description || !image || !category || stock === undefined) {
    res.status(400);
    throw new Error('Please provide name, price, description, image, category, and stock');
  }

  if (!STUDENT_VISIBLE_CATEGORIES.includes(category.trim())) {
    res.status(400);
    throw new Error(`Invalid category. Allowed categories: ${STUDENT_VISIBLE_CATEGORIES.join(', ')}`);
  }

  const numPrice = Number(price);
  const numStock = Number(stock);
  const numMrp = mrp !== undefined ? Number(mrp) : numPrice;
  const numDiscount = discount !== undefined ? Number(discount) : 0;

  if (isNaN(numPrice) || numPrice < 0) {
    res.status(400);
    throw new Error('Price must be a valid positive number');
  }

  if (isNaN(numStock) || numStock < 0) {
    res.status(400);
    throw new Error('Stock must be a valid non-negative number');
  }

  const product = await Product.create({
    name: name.trim(),
    price: numPrice,
    mrp: numMrp,
    discount: numDiscount,
    description: description.trim(),
    image: image.trim(),
    category: category.trim(),
    stock: numStock,
    brand: (brand || '').trim(),
    deliveryTime: deliveryTime || 'Scheduled Delivery',
    supplier: req.user._id,
    approvalStatus: 'pending', // Always defaults to pending
    isAvailable: false,        // Inactive until admin approves
  });

  logger.info('SUPPLIER_PRODUCT_CREATED', `Supplier ${req.user.email} created product "${product.name}"`, {
    productId: product._id,
    supplierId: req.user._id,
  });

  await invalidateProductCache();

  res.status(201).json({
    message: 'Product submitted successfully and is pending admin approval',
    product,
  });
});

// @desc    Update product by supplier (Strict IDOR check)
// @route   PUT /api/supplier/products/:id
// @access  Private/Supplier
const updateSupplierProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // IDOR Protection: Product must belong to requesting supplier
  if (!product.supplier || product.supplier.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to modify this product');
  }

  const {
    name,
    price,
    description,
    image,
    category,
    stock,
    brand,
    mrp,
    discount,
    deliveryTime,
  } = req.body;

  let detailsChanged = false;

  if (name !== undefined && name.trim() !== product.name) {
    product.name = name.trim();
    detailsChanged = true;
  }
  if (price !== undefined && Number(price) !== product.price) {
    product.price = Number(price);
    detailsChanged = true;
  }
  if (mrp !== undefined) product.mrp = Number(mrp);
  if (discount !== undefined) product.discount = Number(discount);
  if (description !== undefined) product.description = description.trim();
  if (image !== undefined && image.trim() !== product.image) {
    product.image = image.trim();
    detailsChanged = true;
  }
  if (category !== undefined) {
    if (!STUDENT_VISIBLE_CATEGORIES.includes(category.trim())) {
      res.status(400);
      throw new Error(`Invalid category. Allowed categories: ${STUDENT_VISIBLE_CATEGORIES.join(', ')}`);
    }
    if (category.trim() !== product.category) {
      product.category = category.trim();
      detailsChanged = true;
    }
  }
  if (stock !== undefined) {
    const numStock = Number(stock);
    if (!isNaN(numStock) && numStock >= 0) {
      product.stock = numStock;
    }
  }
  if (brand !== undefined) product.brand = brand.trim();
  if (deliveryTime !== undefined) product.deliveryTime = deliveryTime;

  // If critical details changed on an approved product, flag for re-approval
  if (detailsChanged && product.approvalStatus === 'approved') {
    product.approvalStatus = 'pending';
    product.isAvailable = false;
  }

  const updatedProduct = await product.save();
  await invalidateProductCache(product._id);

  logger.info('SUPPLIER_PRODUCT_UPDATED', `Supplier ${req.user.email} updated product "${product.name}"`, {
    productId: product._id,
    supplierId: req.user._id,
  });

  res.json({
    message: detailsChanged ? 'Product updated and submitted for re-approval' : 'Product updated successfully',
    product: updatedProduct,
  });
});

// @desc    Update stock & availability for supplier product (Strict IDOR check)
// @route   PATCH /api/supplier/products/:id/stock
// @access  Private/Supplier
const updateSupplierProductStock = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // IDOR Protection: Must belong to requesting supplier
  if (!product.supplier || product.supplier.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to modify this product');
  }

  const { stock, isAvailable } = req.body;

  if (stock !== undefined) {
    const numStock = Number(stock);
    if (isNaN(numStock) || numStock < 0) {
      res.status(400);
      throw new Error('Stock must be a non-negative number');
    }
    product.stock = numStock;
  }

  // Supplier can only toggle availability if already approved
  if (isAvailable !== undefined) {
    if (product.approvalStatus !== 'approved') {
      res.status(400);
      throw new Error('Cannot toggle availability on a pending or rejected product');
    }
    product.isAvailable = Boolean(isAvailable);
  }

  const updatedProduct = await product.save();
  await invalidateProductCache(product._id);

  res.json({
    message: 'Stock and availability updated successfully',
    product: updatedProduct,
  });
});

// @desc    Delete supplier product (Strict IDOR check)
// @route   DELETE /api/supplier/products/:id
// @access  Private/Supplier
const deleteSupplierProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // IDOR Protection: Must belong to requesting supplier
  if (!product.supplier || product.supplier.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('Not authorized to delete this product');
  }

  await Product.deleteOne({ _id: product._id });
  await invalidateProductCache(product._id);

  logger.info('SUPPLIER_PRODUCT_DELETED', `Supplier ${req.user.email} deleted product "${product.name}"`, {
    productId: product._id,
    supplierId: req.user._id,
  });

  res.json({ message: 'Product removed successfully' });
});

// @desc    Get supply orders for current supplier
// @route   GET /api/supplier/orders
// @access  Private/Supplier
const getSupplierOrders = asyncHandler(async (req, res) => {
  const supplierId = req.user._id;

  // Find all products owned by this supplier
  const myProducts = await Product.find({ supplier: supplierId }).select('_id name price image category').lean();
  const myProductIds = myProducts.map((p) => p._id.toString());

  // Find orders containing any of these products OR where item.supplier == supplierId
  const orders = await Order.find({
    $or: [
      { 'items.supplier': supplierId },
      { 'items.product': { $in: myProductIds } },
    ],
  })
    .sort({ createdAt: -1 })
    .select('_id createdAt orderStatus paymentStatus deliveryDetails items totalAmount')
    .lean();

  // Filter items in each order to only include items supplied by this supplier
  const supplierOrders = orders.map((order) => {
    const suppliedItems = order.items.filter((item) =>
      (item.supplier && item.supplier.toString() === supplierId.toString()) ||
      (item.product && myProductIds.includes(item.product.toString()))
    );

    const supplierSubtotal = suppliedItems.reduce(
      (sum, item) => sum + (Number(item.grossAmount) || (Number(item.price) || 0) * (Number(item.quantity) || 1)),
      0
    );

    const supplierCommission = suppliedItems.reduce(
      (sum, item) => sum + (Number(item.commissionAmount) || 0),
      0
    );

    const supplierPayable = suppliedItems.reduce(
      (sum, item) => sum + (Number(item.supplierPayableAmount) || ((Number(item.price) || 0) * (Number(item.quantity) || 1) - (Number(item.commissionAmount) || 0))),
      0
    );

    return {
      _id: order._id,
      createdAt: order.createdAt,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      deliveryDetails: {
        hostelName: order.deliveryDetails?.hostelName,
        block: order.deliveryDetails?.block,
        floor: order.deliveryDetails?.floor,
        roomNumber: order.deliveryDetails?.roomNumber,
      },
      items: suppliedItems,
      supplierSubtotal: Math.round(supplierSubtotal * 100) / 100,
      supplierCommission: Math.round(supplierCommission * 100) / 100,
      supplierPayable: Math.round(supplierPayable * 100) / 100,
    };
  });

  res.json(supplierOrders);
});

// @desc    Update item status for a supplier's item in an order
// @route   PATCH /api/supplier/orders/:id/items/:itemId/status
// @access  Private/Supplier
const updateSupplierOrderItemStatus = asyncHandler(async (req, res) => {
  const supplierId = req.user._id;
  const { id: orderId, itemId } = req.params;
  const { itemStatus } = req.body;

  if (!itemStatus || !['Pending', 'Accepted', 'Packed', 'Dispatched', 'Delivered', 'Cancelled'].includes(itemStatus)) {
    res.status(400);
    throw new Error('Invalid item status');
  }

  const order = await Order.findById(orderId);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const item = order.items.id(itemId);
  if (!item) {
    res.status(404);
    throw new Error('Order item not found');
  }

  let isOwner = item.supplier && item.supplier.toString() === supplierId.toString();
  if (!isOwner && item.product) {
    const prod = await Product.findById(item.product).select('supplier').lean();
    if (prod && prod.supplier && prod.supplier.toString() === supplierId.toString()) {
      isOwner = true;
    }
  }

  if (!isOwner) {
    res.status(403);
    throw new Error('Not authorized to update this item');
  }

  item.itemStatus = itemStatus;
  await order.save();

  res.json({
    message: `Item status updated to ${itemStatus}`,
    item,
  });
});

// @desc    Get Supplier Financial Overview & Metrics
// @route   GET /api/supplier/finance/overview
// @access  Private/Supplier
const getSupplierFinance = asyncHandler(async (req, res) => {
  const supplierId = req.user._id;

  const deliveredOrders = await Order.find({
    orderStatus: 'Delivered',
    'items.supplier': supplierId,
  }).lean();

  let totalDeliveredGross = 0;
  let totalDeliveredCommission = 0;
  let totalDeliveredPayable = 0;
  let eligibleUnsettled = 0;
  let processingSettlement = 0;
  let settledAmount = 0;
  let overdueItemsCount = 0;
  let overduePayable = 0;

  const marketplaceSettings = await getMarketplaceSettings();
  const maxDays = marketplaceSettings.maxSettlementDays || 10;

  deliveredOrders.forEach((order) => {
    const deliveryDate = order.deliveryDate || order.updatedAt;
    const isOverdue = isSettlementOverdue(deliveryDate, maxDays);

    (order.items || []).forEach((item) => {
      if (item.supplier && item.supplier.toString() === supplierId.toString()) {
        const gross = Number(item.grossAmount) || ((Number(item.price) || 0) * (Number(item.quantity) || 1));
        const comm = Number(item.commissionAmount) || 0;
        const payable = Number(item.supplierPayableAmount) || (gross - comm);

        totalDeliveredGross += gross;
        totalDeliveredCommission += comm;
        totalDeliveredPayable += payable;

        const status = item.settlementStatus || 'Eligible';
        if (status === 'Eligible' || status === 'Pending') {
          eligibleUnsettled += payable;
          if (isOverdue) {
            overdueItemsCount += 1;
            overduePayable += payable;
          }
        } else if (status === 'Processing') {
          processingSettlement += payable;
        } else if (status === 'Settled') {
          settledAmount += payable;
        }
      }
    });
  });

  const payouts = await SupplierPayout.find({ supplier: supplierId }).sort({ createdAt: -1 }).lean();
  let totalPaidOut = 0;
  let pendingPayoutsTotal = 0;

  payouts.forEach((p) => {
    if (p.status === 'Paid') {
      totalPaidOut += Number(p.netPayable) || 0;
    } else if (p.status === 'Pending' || p.status === 'Processing') {
      pendingPayoutsTotal += Number(p.netPayable) || 0;
    }
  });

  const supplierUser = await User.findById(supplierId).lean();
  const effectiveCommissionRate = resolveCommissionRate(null, supplierUser, marketplaceSettings);

  const recentLedger = await FinancialLedger.find({ supplier: supplierId })
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  const nextPayoutDate = getNextPayoutDate(marketplaceSettings.payoutDay || 'Saturday');

  res.json({
    metrics: {
      totalDeliveredGross: Math.round(totalDeliveredGross * 100) / 100,
      totalDeliveredCommission: Math.round(totalDeliveredCommission * 100) / 100,
      totalDeliveredPayable: Math.round(totalDeliveredPayable * 100) / 100,
      eligibleUnsettled: Math.round(eligibleUnsettled * 100) / 100,
      currentPayable: Math.round(eligibleUnsettled * 100) / 100,
      processingSettlement: Math.round(processingSettlement * 100) / 100,
      settledAmount: Math.round(settledAmount * 100) / 100,
      totalPaidOut: Math.round(totalPaidOut * 100) / 100,
      pendingPayoutsTotal: Math.round(pendingPayoutsTotal * 100) / 100,
      overdueItemsCount,
      overduePayable: Math.round(overduePayable * 100) / 100,
      effectiveCommissionRate,
      payoutDay: marketplaceSettings.payoutDay || 'Saturday',
      nextPayoutDay: marketplaceSettings.payoutDay || 'Saturday',
      nextPayoutDate,
      maxSettlementDays: maxDays,
      minPayoutThreshold: marketplaceSettings.minPayoutThreshold || 500,
      isBelowThreshold: eligibleUnsettled < (marketplaceSettings.minPayoutThreshold || 500),
    },
    myPayoutQr: {
      qrUrl: supplierUser?.supplierDetails?.upiQrCode || '',
      upiId: supplierUser?.supplierDetails?.upiId || '',
      isConfigured: Boolean(supplierUser?.supplierDetails?.upiQrCode),
    },
    payouts: payouts.slice(0, 10),
    recentLedger,
    bankDetails: {
      accountHolderName: supplierUser?.supplierDetails?.accountHolderName || supplierUser?.name || '',
      bankName: supplierUser?.supplierDetails?.bankName || '',
      accountNumber: supplierUser?.supplierDetails?.accountNumber || '',
      ifsc: supplierUser?.supplierDetails?.ifsc || '',
      upiId: supplierUser?.supplierDetails?.upiId || '',
      upiQrCode: supplierUser?.supplierDetails?.upiQrCode || '',
    },
  });
});

// @desc    Get all payouts for current supplier
// @route   GET /api/supplier/finance/payouts
// @access  Private/Supplier
const getSupplierPayouts = asyncHandler(async (req, res) => {
  const supplierId = req.user._id;
  const { status, page = 1, limit = 20 } = req.query;

  const query = { supplier: supplierId };
  if (status && status !== 'all') {
    query.status = status;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [payouts, total] = await Promise.all([
    SupplierPayout.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    SupplierPayout.countDocuments(query),
  ]);

  res.json({
    payouts,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)) || 1,
    total,
  });
});

// @desc    Get immutable financial ledger for current supplier
// @route   GET /api/supplier/finance/ledger
// @access  Private/Supplier
const getSupplierLedger = asyncHandler(async (req, res) => {
  const supplierId = req.user._id;
  const { type, page = 1, limit = 25 } = req.query;

  const query = { supplier: supplierId };
  if (type && type !== 'all') {
    query.type = type;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [entries, total] = await Promise.all([
    FinancialLedger.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    FinancialLedger.countDocuments(query),
  ]);

  res.json({
    entries,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)) || 1,
    total,
  });
});

// @desc    Get structured settlement statement
// @route   GET /api/supplier/finance/statements/:payoutId
// @access  Private/Supplier
const getSettlementStatement = asyncHandler(async (req, res) => {
  const supplierId = req.user._id;
  const { payoutId } = req.params;

  const payout = await SupplierPayout.findOne({ _id: payoutId, supplier: supplierId })
    .populate('supplier', 'name email phone supplierDetails')
    .lean();

  if (!payout) {
    res.status(404);
    throw new Error('Settlement payout record not found');
  }

  const orders = await Order.find({ _id: { $in: payout.orderIds || [] } }).lean();
  const statementItems = [];

  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const match = (item.payout && item.payout.toString() === payout._id.toString()) ||
        (payout.orderItemIds && payout.orderItemIds.some((id) => id.toString() === item._id.toString())) ||
        (item.supplier && item.supplier.toString() === supplierId.toString());

      if (match) {
        statementItems.push({
          orderId: order._id,
          orderCreatedAt: order.createdAt,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          price: item.price,
          grossAmount: item.grossAmount || (item.price * item.quantity),
          commissionRate: item.commissionRate,
          commissionAmount: item.commissionAmount || 0,
          supplierPayableAmount: item.supplierPayableAmount || ((item.price * item.quantity) - (item.commissionAmount || 0)),
          settlementStatus: item.settlementStatus,
        });
      }
    });
  });

  res.json({
    statement: {
      payoutNumber: payout.payoutNumber,
      status: payout.status,
      settlementPeriod: payout.settlementPeriod,
      paymentMethod: payout.paymentMethod,
      utrNumber: payout.utrNumber,
      paidAt: payout.paidAt,
      grossAmount: payout.grossAmount,
      commissionAmount: payout.commissionAmount,
      adjustments: payout.adjustments,
      netPayable: payout.netPayable,
      bankDetailsSnapshot: payout.bankDetailsSnapshot,
      supplier: {
        name: payout.supplier?.name,
        email: payout.supplier?.email,
        phone: payout.supplier?.phone,
        gstin: payout.supplier?.supplierDetails?.gstin,
        panNumber: payout.supplier?.supplierDetails?.panNumber,
      },
      items: statementItems,
    },
  });
});

// @desc    Get current supplier profile
// @route   GET /api/supplier/profile
// @access  Private/Supplier
const getSupplierProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password').lean();

  if (!user) {
    res.status(404);
    throw new Error('Supplier profile not found');
  }

  res.json(user);
});

// @desc    Update current supplier profile
// @route   PUT /api/supplier/profile
// @access  Private/Supplier
const updateSupplierProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('Supplier not found');
  }

  if (req.body.name && req.body.name !== 'undefined' && req.body.name !== 'null') {
    user.name = req.body.name.trim();
  }
  if (req.body.phone !== undefined) {
    user.phone = req.body.phone.trim();
  }
  if (req.body.supplierDetails) {
    user.supplierDetails = {
      ...user.supplierDetails,
      ...req.body.supplierDetails,
    };
  }

  if (req.body.password) {
    user.password = req.body.password;
  }

  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    phone: updatedUser.phone,
    supplierDetails: updatedUser.supplierDetails,
  });
});

// @desc    Upload Supplier Payout UPI QR Code Image
// @route   POST /api/supplier/profile/payout-qr
// @access  Private/Supplier
const uploadSupplierPayoutQr = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('Supplier not found');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('No QR code image file uploaded');
  }

  // Magic byte validation for PNG, JPG, WebP
  const buffer = req.file.buffer;
  const isPng = buffer.length > 4 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  const isJpg = buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isWebp = buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  if (!isPng && !isJpg && !isWebp) {
    res.status(400);
    throw new Error('Invalid file format. Only genuine PNG, JPG, or WEBP images are allowed.');
  }

  let qrUrl = '';
  try {
    let compressedBuffer = req.file.buffer;
    try {
      compressedBuffer = await sharp(req.file.buffer)
        .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
        .png({ quality: 90 })
        .toBuffer();
    } catch (sharpErr) {
      console.warn('[QR Upload Warning] Sharp optimization failed, using original buffer', sharpErr.message);
    }

    try {
      const uploadResult = await uploadBufferToCloudinary(compressedBuffer, 'hostelkart/supplier-qrs');
      qrUrl = uploadResult.secure_url;
    } catch (cloudinaryErr) {
      console.warn('[QR Upload Warning] Cloudinary upload failed, falling back to base64 data URI', cloudinaryErr.message);
      const mime = req.file.mimetype || 'image/png';
      qrUrl = `data:${mime};base64,${compressedBuffer.toString('base64')}`;
    }

    // Delete old QR code if it was on Cloudinary
    if (user.supplierDetails?.upiQrCode && user.supplierDetails.upiQrCode.includes('res.cloudinary.com')) {
      const oldPublicId = getPublicIdFromUrl(user.supplierDetails.upiQrCode);
      if (oldPublicId) {
        deleteFromCloudinary(oldPublicId).catch(() => {});
      }
    }

    if (!user.supplierDetails) user.supplierDetails = {};
    user.supplierDetails.upiQrCode = qrUrl;
    if (req.body.upiId) {
      user.supplierDetails.upiId = req.body.upiId.trim();
    }
    user.markModified('supplierDetails');
    await user.save();

    res.json({
      message: 'Supplier UPI QR Code uploaded successfully',
      qrUrl,
      supplierDetails: user.supplierDetails,
    });
  } catch (err) {
    console.error('Error uploading supplier payout QR:', err);
    res.status(500);
    throw new Error(`Failed to upload QR code image: ${err.message}`);
  }
});

// @desc    Get single payout details for current supplier
// @route   GET /api/supplier/payouts/:id
// @access  Private/Supplier
const getSupplierPayoutById = asyncHandler(async (req, res) => {
  const supplierId = req.user._id;
  const { id } = req.params;

  const payout = await SupplierPayout.findOne({ _id: id, supplier: supplierId })
    .populate('supplier', 'name email phone supplierDetails')
    .lean();

  if (!payout) {
    res.status(404);
    throw new Error('Payout record not found');
  }

  res.json({ payout });
});

export {
  getSupplierDashboard,
  getSupplierProducts,
  getSupplierProductById,
  createSupplierProduct,
  updateSupplierProduct,
  updateSupplierProductStock,
  deleteSupplierProduct,
  getSupplierOrders,
  updateSupplierOrderItemStatus,
  getSupplierFinance,
  getSupplierPayouts,
  getSupplierPayoutById,
  getSupplierLedger,
  getSettlementStatement,
  getSupplierProfile,
  updateSupplierProfile,
  uploadSupplierPayoutQr,
};
