import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { STUDENT_VISIBLE_CATEGORIES } from '../config/constants.js';

// Helper to optionally get user from Bearer token
const getOptionalUser = async (req) => {
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Ignore token failure for public recommendation
      return null;
    }
  }
  return null;
};

// Helper to restrict product queries to student-visible categories
const productQuery = (criteria, isAdmin) => {
  if (!isAdmin) {
    if (criteria.category) {
      if (typeof criteria.category === 'object' && criteria.category.$in) {
        const visibleFavs = criteria.category.$in.filter(cat => STUDENT_VISIBLE_CATEGORIES.includes(cat));
        criteria.category = { $in: visibleFavs };
      } else if (typeof criteria.category === 'string') {
        if (!STUDENT_VISIBLE_CATEGORIES.includes(criteria.category)) {
          criteria.category = { $in: [] };
        }
      }
    } else {
      criteria.category = { $in: STUDENT_VISIBLE_CATEGORIES };
    }
  }
  return criteria;
};

// Simple in-memory cache for heavy global recommendation calculations
let cachedGlobalDataStudent = null;
let cacheTimestampStudent = 0;
let cachedGlobalDataAdmin = null;
let cacheTimestampAdmin = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

const updateGlobalRecommendationCache = async (limit, isAdmin) => {
  const now = Date.now();
  if (isAdmin) {
    if (cachedGlobalDataAdmin && (now - cacheTimestampAdmin < CACHE_TTL)) {
      return cachedGlobalDataAdmin;
    }
  } else {
    if (cachedGlobalDataStudent && (now - cacheTimestampStudent < CACHE_TTL)) {
      return cachedGlobalDataStudent;
    }
  }

  // Limit to last 30 days of delivered orders to make it faster and keep it fresh!
  const dateLimit = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const deliveredOrders = await Order.find({ 
    orderStatus: 'Delivered',
    createdAt: { $gte: dateLimit }
  })
    .select('items')
    .lean();

  let ordersToProcess = deliveredOrders;
  if (deliveredOrders.length < 50) {
    ordersToProcess = await Order.find({ orderStatus: 'Delivered' })
      .select('items')
      .lean();
  }

  // Calculate trending
  const overallCounts = {};
  ordersToProcess.forEach(order => {
    order.items.forEach(item => {
      if (item.product) {
        const id = item.product.toString();
        overallCounts[id] = (overallCounts[id] || 0) + item.quantity;
      }
    });
  });

  const sortedOverallIds = Object.keys(overallCounts)
    .sort((a, b) => overallCounts[b] - overallCounts[a])
    .slice(0, limit);

  let trending = [];
  if (sortedOverallIds.length > 0) {
    trending = await Product.find(productQuery({ _id: { $in: sortedOverallIds } }, isAdmin))
      .select('name price discount category stock deliveryTime rating numReviews image isAvailable')
      .lean();
    trending.sort((a, b) => sortedOverallIds.indexOf(a._id.toString()) - sortedOverallIds.indexOf(b._id.toString()));
  }

  if (trending.length < limit) {
    const fallbackTrending = await Product.find(productQuery({ _id: { $nin: trending.map(p => p._id) } }, isAdmin))
      .select('name price discount category stock deliveryTime rating numReviews image isAvailable')
      .sort({ rating: -1, numReviews: -1 })
      .limit(limit - trending.length)
      .lean();
    trending = [...trending, ...fallbackTrending];
  }

  // Calculate studentsAlsoBought
  let studentsAlsoBought = await Product.find(productQuery({
    rating: { $gte: 4 }
  }, isAdmin))
  .select('name price discount category stock deliveryTime rating numReviews image isAvailable')
  .sort({ numReviews: -1, rating: -1 })
  .limit(limit)
  .lean();

  if (studentsAlsoBought.length < limit) {
    const fallbackAlsoBought = await Product.find(productQuery({ _id: { $nin: studentsAlsoBought.map(p => p._id) } }, isAdmin))
      .select('name price discount category stock deliveryTime rating numReviews image isAvailable')
      .sort({ rating: -1 })
      .limit(limit - studentsAlsoBought.length)
      .lean();
    studentsAlsoBought = [...studentsAlsoBought, ...fallbackAlsoBought];
  }

  // Calculate coOccurrences
  const coOccurrences = {};
  ordersToProcess.forEach(order => {
    const items = order.items.filter(item => item.product).map(item => item.product.toString());
    const uniqueItems = [...new Set(items)];
    for (let i = 0; i < uniqueItems.length; i++) {
      for (let j = i + 1; j < uniqueItems.length; j++) {
        const pA = uniqueItems[i];
        const pB = uniqueItems[j];
        
        if (!coOccurrences[pA]) coOccurrences[pA] = {};
        coOccurrences[pA][pB] = (coOccurrences[pA][pB] || 0) + 1;

        if (!coOccurrences[pB]) coOccurrences[pB] = {};
        coOccurrences[pB][pA] = (coOccurrences[pB][pA] || 0) + 1;
      }
    }
  });

  // Calculate default frequentlyBoughtTogether for guests
  let defaultFBT = [];
  let maxCount = 0;
  let bestPair = [];
  Object.keys(coOccurrences).forEach(pA => {
    Object.keys(coOccurrences[pA]).forEach(pB => {
      if (coOccurrences[pA][pB] > maxCount) {
        maxCount = coOccurrences[pA][pB];
        bestPair = [pA, pB];
      }
    });
  });
  let candidates = [];
  if (bestPair.length > 0) {
    const union = new Set();
    bestPair.forEach(p => {
      Object.keys(coOccurrences[p] || {}).forEach(other => {
        if (!bestPair.includes(other)) union.add(other);
      });
    });
    candidates = [...bestPair, ...union];
  }
  if (candidates.length > 0) {
    defaultFBT = await Product.find(productQuery({ _id: { $in: candidates.slice(0, limit) } }, isAdmin))
      .select('name price discount category stock deliveryTime rating numReviews image isAvailable')
      .lean();
  }
  if (defaultFBT.length < limit) {
    const excludeIds = defaultFBT.map(p => p._id.toString());
    const fallbackFBT = await Product.find(productQuery({ 
      _id: { $nin: excludeIds },
      discount: { $gt: 0 } 
    }, isAdmin))
    .select('name price discount category stock deliveryTime rating numReviews image isAvailable')
    .sort({ discount: -1, rating: -1 })
    .limit(limit - defaultFBT.length)
    .lean();
    defaultFBT = [...defaultFBT, ...fallbackFBT];
  }

  const globalData = {
    trending,
    studentsAlsoBought,
    coOccurrences,
    defaultFBT
  };

  if (isAdmin) {
    cachedGlobalDataAdmin = globalData;
    cacheTimestampAdmin = now;
  } else {
    cachedGlobalDataStudent = globalData;
    cacheTimestampStudent = now;
  }

  return globalData;
};

// @desc    Get recommendation sections
// @route   GET /api/recommendations
// @access  Public (Optional auth)
const getRecommendations = asyncHandler(async (req, res) => {
  const user = await getOptionalUser(req);
  const isAdmin = user && user.role === 'admin';
  const limit = 8; // Number of items per section

  // Get cached global data
  const globalData = await updateGlobalRecommendationCache(limit, isAdmin);

  // 1. BUY AGAIN
  let buyAgain = [];
  if (user) {
    const userOrders = await Order.find({ user: user._id, orderStatus: 'Delivered' })
      .select('items')
      .lean();
    
    const productIds = [];
    userOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.product) {
          productIds.push(item.product.toString());
        }
      });
    });

    const counts = {};
    productIds.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

    const uniqueIds = [...new Set(productIds)].sort((a, b) => counts[b] - counts[a]).slice(0, limit);

    if (uniqueIds.length > 0) {
      buyAgain = await Product.find(productQuery({ _id: { $in: uniqueIds } }, isAdmin))
        .select('name price discount category stock deliveryTime rating numReviews image isAvailable')
        .lean();
      buyAgain.sort((a, b) => uniqueIds.indexOf(a._id.toString()) - uniqueIds.indexOf(b._id.toString()));
    }
  }

  // 2. TRENDING PRODUCTS (Cached)
  const trending = globalData.trending;

  // 3. RECOMMENDED FOR YOU (Category affinity or high ratings)
  let recommendedForYou = [];
  if (user) {
    const userOrders = await Order.find({ user: user._id, orderStatus: 'Delivered' })
      .select('items')
      .lean();
    
    const userProductIds = [];
    userOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.product) userProductIds.push(item.product);
      });
    });

    const userProducts = await Product.find(productQuery({ _id: { $in: userProductIds } }, isAdmin)).select('category').lean();
    const categoryCounts = {};
    userProducts.forEach(p => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });

    const favoriteCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);

    if (favoriteCategories.length > 0) {
      recommendedForYou = await Product.find(productQuery({
        category: { $in: favoriteCategories },
        _id: { $nin: userProductIds }
      }, isAdmin))
      .select('name price discount category stock deliveryTime rating numReviews image isAvailable')
      .sort({ rating: -1, numReviews: -1 })
      .limit(limit)
      .lean();

      if (recommendedForYou.length < limit) {
        const extra = await Product.find(productQuery({
          category: { $in: favoriteCategories },
          _id: { $in: userProductIds }
        }, isAdmin))
        .select('name price discount category stock deliveryTime rating numReviews image isAvailable')
        .sort({ rating: -1 })
        .limit(limit - recommendedForYou.length)
        .lean();
        recommendedForYou = [...recommendedForYou, ...extra];
      }
    }
  }

  if (recommendedForYou.length < limit) {
    const excludeIds = recommendedForYou.map(p => p._id);
    const fallbackRec = await Product.find(productQuery({ _id: { $nin: excludeIds } }, isAdmin))
      .select('name price discount category stock deliveryTime rating numReviews image isAvailable')
      .sort({ rating: -1, numReviews: -1 })
      .limit(limit - recommendedForYou.length)
      .lean();
    recommendedForYou = [...recommendedForYou, ...fallbackRec];
  }

  // 4. STUDENTS ALSO BOUGHT (Cached)
  const studentsAlsoBought = globalData.studentsAlsoBought;

  // 5. FREQUENTLY BOUGHT TOGETHER
  let frequentlyBoughtTogether = [];
  let targetProductId = null;
  if (user) {
    const lastOrder = await Order.findOne({ user: user._id, orderStatus: 'Delivered' })
      .sort({ createdAt: -1 })
      .select('items')
      .lean();
    if (lastOrder && lastOrder.items.length > 0) {
      const validItem = lastOrder.items.find(item => item.product);
      if (validItem) targetProductId = validItem.product.toString();
    }
  }

  if (targetProductId && globalData.coOccurrences[targetProductId]) {
    const candidates = Object.keys(globalData.coOccurrences[targetProductId]).sort((a, b) => globalData.coOccurrences[targetProductId][b] - globalData.coOccurrences[targetProductId][a]);
    frequentlyBoughtTogether = await Product.find(productQuery({ _id: { $in: candidates.slice(0, limit) } }, isAdmin))
      .select('name price discount category stock deliveryTime rating numReviews image isAvailable')
      .lean();
    if (frequentlyBoughtTogether.length < limit) {
      const excludeIds = frequentlyBoughtTogether.map(p => p._id.toString());
      const fallbackFBT = await Product.find(productQuery({ 
        _id: { $nin: excludeIds },
        discount: { $gt: 0 } 
      }, isAdmin))
      .select('name price discount category stock deliveryTime rating numReviews image isAvailable')
      .sort({ discount: -1, rating: -1 })
      .limit(limit - frequentlyBoughtTogether.length)
      .lean();
      frequentlyBoughtTogether = [...frequentlyBoughtTogether, ...fallbackFBT];
    }
  } else {
    frequentlyBoughtTogether = globalData.defaultFBT;
  }

  res.json({
    buyAgain,
    trending,
    recommendedForYou,
    studentsAlsoBought,
    frequentlyBoughtTogether
  });
});

export { getRecommendations };
