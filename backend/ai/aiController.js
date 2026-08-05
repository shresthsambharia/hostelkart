import asyncHandler from 'express-async-handler';
import { aiService } from './aiService.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import { logger } from '../utils/logger.js';
import { prompts } from './prompts.js';
import { SYSTEM_PROMPT } from './systemPrompt.js';

/**
 * @desc    Check Gemini AI integration configuration health
 * @route   GET /api/ai/health
 * @access  Public
 */
export const getHealth = asyncHandler(async (req, res) => {
  const configured = aiService.isConfigured();
  res.json({
    success: true,
    provider: 'Gemini',
    configured
  });
});

/**
 * @desc    Conversational chatbot SSE stream
 * @route   POST /api/ai/chat
 * @access  Public/Private (Optional authentication)
 */
export const chatWithAI = asyncHandler(async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) {
    res.status(400);
    throw new Error('Message is required');
  }

  const isConfigured = aiService.isConfigured();
  if (!isConfigured) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ chunk: "The AI Assistant is currently in configuration standby mode. Please set the GEMINI_API_KEY environment variable to activate standard AI features." })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // Gather system state context
  const products = await Product.find({ isAvailable: true }).limit(50);
  const categories = await Category.find();
  const coupons = await Coupon.find({ active: true });

  // Gather user-specific details if authenticated
  let cart = null;
  let wishlist = null;
  let recentOrders = [];
  let userInfo = null;

  if (req.user) {
    userInfo = req.user;
    cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products');
    recentOrders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(3);
  }

  // Build context prompt
  const contextString = prompts.buildChatContext({
    products,
    categories,
    coupons,
    userInfo,
    cart,
    wishlist,
    recentOrders
  });

  // Prepare full prompt combining context, history, and current message
  const fullPrompt = `${contextString}\nUser Message: ${message}`;

  // Start Server Sent Events stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const startTime = Date.now();
  let fullResponse = '';

  try {
    // Write an event indicating active response stream start
    await aiService.generateStreamResponse(
      fullPrompt,
      (chunk) => {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      },
      SYSTEM_PROMPT
    );

    const latencyMs = Date.now() - startTime;
    logger.performance('AI_CHAT_LATENCY', 'AI Chat stream finished successfully', {
      latencyMs,
      promptSize: fullPrompt.length,
      responseSize: fullResponse.length,
      userId: req.user?._id?.toString() || 'guest'
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    logger.error('AI_CHAT_STREAM_ERROR', `Failed during generative chat stream: ${error.message}`, { error: error.message });
    res.write(`data: ${JSON.stringify({ error: 'AI Assistant was disconnected. Please retry your request.' })}\n\n`);
    res.end();
  }
});

/**
 * @desc    Compute product recommendations
 * @route   POST /api/ai/recommend
 * @access  Public/Private (Optional authentication)
 */
export const getRecommendations = asyncHandler(async (req, res) => {
  const isConfigured = aiService.isConfigured();
  const userId = req.user?._id;

  const products = await Product.find({ isAvailable: true }).limit(15);
  const cart = userId ? await Cart.findOne({ user: userId }).populate('items.product') : null;
  const wishlist = userId ? await Wishlist.findOne({ user: userId }).populate('products') : null;
  const orders = userId ? await Order.find({ user: userId }).sort({ createdAt: -1 }).limit(3) : [];

  if (!isConfigured) {
    // Safe fallback matching
    const recommendations = products.slice(0, 3).map(p => ({
      product: p,
      reason: 'Recommended based on daily hostel essentials favorites.',
      confidence: 0.85
    }));
    if (!res.headersSent) {
      return res.json({ success: true, recommendations });
    }
    return;
  }

  const startTime = Date.now();
  try {
    const cartSummary = cart ? cart.items.map(i => i.product?.name) : [];
    const wishlistSummary = wishlist ? wishlist.products.map(p => p.name) : [];
    const ordersSummary = orders.map(o => o.orderItems?.map(i => i.name)).flat();

    const prompt = prompts.recommendationsPrompt(products, cartSummary, wishlistSummary, ordersSummary);
    const jsonOutput = await aiService.generateJsonResponse(prompt, 'You are a recommendation matching assistant.');
    const recs = jsonOutput.recommendations || [];

    const validatedRecommendations = [];
    for (const rec of recs) {
      const dbProd = products.find(p => p._id.toString() === rec.productId);
      if (dbProd) {
        validatedRecommendations.push({
          product: dbProd,
          reason: rec.reason,
          confidence: rec.confidence || 0.9
        });
      }
    }

    // Default fallbacks if no items matches database
    if (validatedRecommendations.length === 0) {
      products.slice(0, 3).forEach(p => {
        validatedRecommendations.push({
          product: p,
          reason: 'Hostel favorite product recommended for you.',
          confidence: 0.75
        });
      });
    }

    const latencyMs = Date.now() - startTime;
    logger.performance('AI_RECOMMENDATION_LATENCY', 'Computed product recommendations', {
      latencyMs,
      userId: userId?.toString() || 'guest'
    });

    if (!res.headersSent) {
      res.json({ success: true, recommendations: validatedRecommendations });
    }
  } catch (error) {
    logger.error('AI_RECOMMENDATION_ERROR', `Recommendations logic failed: ${error.message}`, { error: error.message });
    // Safe fallback matching on crash
    const recommendations = products.slice(0, 3).map(p => ({
      product: p,
      reason: 'Campus trending item.',
      confidence: 0.8
    }));
    if (!res.headersSent) {
      res.json({ success: true, recommendations });
    }
  }
});

/**
 * @desc    Generate product catalog titles and metadata descriptions
 * @route   POST /api/ai/product-description
 * @access  Private/Admin
 */
export const generateProductDescription = asyncHandler(async (req, res) => {
  const { name, category, price, imageUrl } = req.body;
  if (!name || !category || !price) {
    res.status(400);
    throw new Error('Please specify product name, category, and price details');
  }

  const isConfigured = aiService.isConfigured();
  if (!isConfigured) {
    return res.json({
      success: true,
      title: `${name} - ${category}`,
      description: `Get your high quality ${name} from HostelKart. Delivered directly to your campus hostel room corridor.`,
      highlights: ['Premium quality', 'Hostel essential', 'Fast corridor delivery'],
      bulletPoints: ['High durability', 'Specially curated for college students', 'Best value price in campus'],
      seoKeywords: [name.toLowerCase(), category.toLowerCase(), 'hostel essentials'],
      searchTags: [name.toLowerCase(), category.toLowerCase()]
    });
  }

  const startTime = Date.now();
  try {
    const prompt = prompts.productDescriptionPrompt(name, category, price, imageUrl);
    const result = await aiService.generateJsonResponse(prompt, 'You are a copywriter assistant for HostelKart.');

    const latencyMs = Date.now() - startTime;
    logger.performance('AI_COPYWRITE_LATENCY', 'Generated product copywriting metadata', { latencyMs });

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('AI_COPYWRITE_ERROR', `Copywriter assistant failed: ${error.message}`, { error: error.message });
    res.json({
      success: true,
      title: `${name} - ${category}`,
      description: `Get your high quality ${name} from HostelKart. Delivered directly to your campus hostel room corridor.`,
      highlights: ['Premium quality', 'Hostel essential', 'Fast corridor delivery'],
      bulletPoints: ['High durability', 'Specially curated for college students', 'Best value price in campus'],
      seoKeywords: [name.toLowerCase(), category.toLowerCase(), 'hostel essentials'],
      searchTags: [name.toLowerCase(), category.toLowerCase()]
    });
  }
});

/**
 * @desc    Convert natural query syntax to database lookup filters
 * @route   POST /api/ai/search
 * @access  Public
 */
export const searchProductsAI = asyncHandler(async (req, res) => {
  const { query } = req.body;
  if (!query) {
    res.status(400);
    throw new Error('Please supply query search text');
  }

  const allCategories = await Category.find().select('name');
  const categoryNames = allCategories.map(c => c.name);

  const isConfigured = aiService.isConfigured();
  let searchParams = { category: null, searchTerms: query, minPrice: null, maxPrice: null };

  if (isConfigured) {
    const startTime = Date.now();
    try {
      const prompt = prompts.searchPrompt(query, categoryNames);
      const result = await aiService.generateJsonResponse(prompt, 'You are a search query parser.');
      searchParams = { ...searchParams, ...result };

      const latencyMs = Date.now() - startTime;
      logger.performance('AI_SEARCH_PARSE_LATENCY', 'Converted query to search parameters', { latencyMs, query });
    } catch (error) {
      logger.error('AI_SEARCH_PARSE_ERROR', `AI query parser failed: ${error.message}`);
    }
  }

  // Construct MongoDB dynamic parameters
  const filter = { isAvailable: true };
  if (searchParams.category) {
    filter.category = { $regex: new RegExp(`^${searchParams.category}$`, 'i') };
  }

  if (searchParams.minPrice || searchParams.maxPrice) {
    filter.price = {};
    if (searchParams.minPrice) filter.price.$gte = searchParams.minPrice;
    if (searchParams.maxPrice) filter.price.$lte = searchParams.maxPrice;
  }

  if (searchParams.searchTerms) {
    filter.$or = [
      { name: { $regex: searchParams.searchTerms, $options: 'i' } },
      { description: { $regex: searchParams.searchTerms, $options: 'i' } }
    ];
  }

  const products = await Product.find(filter).limit(20);
  res.json({ success: true, searchParams, products });
});

/**
 * @desc    Troubleshoot a student support ticket before submission
 * @route   POST /api/ai/support
 * @access  Public/Private (Optional authentication)
 */
export const getSupportSuggestion = asyncHandler(async (req, res) => {
  const { subject, description, category } = req.body;
  if (!subject || !description) {
    res.status(400);
    throw new Error('Subject and description are required details');
  }

  const isConfigured = aiService.isConfigured();
  if (!isConfigured) {
    return res.json({
      success: true,
      suggestion: `We have received your query for **${category}**. A support operator will inspect this soon. You can verify your orders log in the My Orders menu.`
    });
  }

  const startTime = Date.now();
  try {
    let recentOrders = [];
    if (req.user) {
      recentOrders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(2);
    }

    const prompt = prompts.supportPrompt(subject, description, category, recentOrders);
    const suggestion = await aiService.generateResponse(prompt, 'You are a customer support helpdesk troubleshooting assistant.');

    const latencyMs = Date.now() - startTime;
    logger.performance('AI_SUPPORT_LATENCY', 'Generated support ticketing suggestion', { latencyMs });

    res.json({ success: true, suggestion });
  } catch (error) {
    logger.error('AI_SUPPORT_ERROR', `Troubleshooting generator failed: ${error.message}`);
    res.json({
      success: true,
      suggestion: 'Please submit your support ticket. An operator will respond details soon.'
    });
  }
});
