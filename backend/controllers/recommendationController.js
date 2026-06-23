import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

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

// @desc    Get recommendation sections
// @route   GET /api/recommendations
// @access  Public (Optional auth)
const getRecommendations = asyncHandler(async (req, res) => {
  const user = await getOptionalUser(req);
  const limit = 8; // Number of items per section

  // 1. BUY AGAIN
  let buyAgain = [];
  if (user) {
    // Find all products user has ordered before
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

    // Count occurrences of each product bought
    const counts = {};
    productIds.forEach(id => { counts[id] = (counts[id] || 0) + 1; });

    // Unique sorted by purchase frequency
    const uniqueIds = [...new Set(productIds)].sort((a, b) => counts[b] - counts[a]).slice(0, limit);

    if (uniqueIds.length > 0) {
      buyAgain = await Product.find({ _id: { $in: uniqueIds } }).lean();
      // Keep sorted by frequency
      buyAgain.sort((a, b) => uniqueIds.indexOf(a._id.toString()) - uniqueIds.indexOf(b._id.toString()));
    }
  }

  // 2. TRENDING PRODUCTS (based on overall sales count)
  let trending = [];
  const allDeliveredOrders = await Order.find({ orderStatus: 'Delivered' })
    .select('items')
    .lean();

  const overallCounts = {};
  allDeliveredOrders.forEach(order => {
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

  if (sortedOverallIds.length > 0) {
    trending = await Product.find({ _id: { $in: sortedOverallIds } }).lean();
    trending.sort((a, b) => sortedOverallIds.indexOf(a._id.toString()) - sortedOverallIds.indexOf(b._id.toString()));
  }

  // Fallback for trending if database is empty/new
  if (trending.length < limit) {
    const fallbackTrending = await Product.find({ _id: { $nin: trending.map(p => p._id) } })
      .sort({ rating: -1, numReviews: -1 })
      .limit(limit - trending.length)
      .lean();
    trending = [...trending, ...fallbackTrending];
  }

  // 3. RECOMMENDED FOR YOU (Category affinity or high ratings)
  let recommendedForYou = [];
  if (user) {
    // Find category affinity: check user's orders
    const userOrders = await Order.find({ user: user._id, orderStatus: 'Delivered' })
      .select('items')
      .lean();
    
    // We also need the products to know their categories
    const userProductIds = [];
    userOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.product) userProductIds.push(item.product);
      });
    });

    const userProducts = await Product.find({ _id: { $in: userProductIds } }).select('category').lean();
    const categoryCounts = {};
    userProducts.forEach(p => {
      categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
    });

    const favoriteCategories = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]);

    if (favoriteCategories.length > 0) {
      // Recommend products from favorite categories that user hasn't bought, or fallback to any high rated in those categories
      recommendedForYou = await Product.find({
        category: { $in: favoriteCategories },
        _id: { $nin: userProductIds }
      })
      .sort({ rating: -1, numReviews: -1 })
      .limit(limit)
      .lean();

      // If not enough, allow already bought products in those categories
      if (recommendedForYou.length < limit) {
        const extra = await Product.find({
          category: { $in: favoriteCategories },
          _id: { $in: userProductIds }
        })
        .sort({ rating: -1 })
        .limit(limit - recommendedForYou.length)
        .lean();
        recommendedForYou = [...recommendedForYou, ...extra];
      }
    }
  }

  // Fallback or guest user: recommend top rating overall
  if (recommendedForYou.length < limit) {
    const excludeIds = recommendedForYou.map(p => p._id);
    const fallbackRec = await Product.find({ _id: { $nin: excludeIds } })
      .sort({ rating: -1, numReviews: -1 })
      .limit(limit - recommendedForYou.length)
      .lean();
    recommendedForYou = [...recommendedForYou, ...fallbackRec];
  }

  // 4. STUDENTS ALSO BOUGHT (Highly rated and popular products in the system)
  let studentsAlsoBought = await Product.find({
    rating: { $gte: 4 }
  })
  .sort({ numReviews: -1, rating: -1 })
  .limit(limit)
  .lean();

  if (studentsAlsoBought.length < limit) {
    const fallbackAlsoBought = await Product.find({ _id: { $nin: studentsAlsoBought.map(p => p._id) } })
      .sort({ rating: -1 })
      .limit(limit - studentsAlsoBought.length)
      .lean();
    studentsAlsoBought = [...studentsAlsoBought, ...fallbackAlsoBought];
  }

  // 5. FREQUENTLY BOUGHT TOGETHER
  let frequentlyBoughtTogether = [];
  const coOccurrences = {}; // { prodA: { prodB: count } }

  allDeliveredOrders.forEach(order => {
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

  let candidates = [];
  if (targetProductId && coOccurrences[targetProductId]) {
    candidates = Object.keys(coOccurrences[targetProductId]).sort((a, b) => coOccurrences[targetProductId][b] - coOccurrences[targetProductId][a]);
  } else {
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
    if (bestPair.length > 0) {
      const union = new Set();
      bestPair.forEach(p => {
        Object.keys(coOccurrences[p] || {}).forEach(other => {
          if (!bestPair.includes(other)) union.add(other);
        });
      });
      candidates = [...bestPair, ...union];
    }
  }

  if (candidates.length > 0) {
    frequentlyBoughtTogether = await Product.find({ _id: { $in: candidates.slice(0, limit) } }).lean();
  }

  if (frequentlyBoughtTogether.length < limit) {
    const excludeIds = frequentlyBoughtTogether.map(p => p._id.toString());
    const fallbackFBT = await Product.find({ 
      _id: { $nin: excludeIds },
      discount: { $gt: 0 } 
    })
    .sort({ discount: -1, rating: -1 })
    .limit(limit - frequentlyBoughtTogether.length)
    .lean();
    frequentlyBoughtTogether = [...frequentlyBoughtTogether, ...fallbackFBT];
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
