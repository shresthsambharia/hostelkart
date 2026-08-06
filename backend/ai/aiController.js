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
// ==================== TOOL IMPLEMENTATIONS ====================

const searchProductsImpl = async (query) => {
  if (!query || query.trim() === '') return [];
  let normalizedQuery = query.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ");
  
  const stripPlural = (str) => {
    if (str.endsWith('ies')) return str.slice(0, -3) + 'y';
    if (str.endsWith('es') && !str.endsWith('ees') && !str.endsWith('oes')) return str.slice(0, -2);
    if (str.endsWith('s') && !str.endsWith('ss') && !str.endsWith('is') && !str.endsWith('us')) return str.slice(0, -1);
    return str;
  };

  const queryWords = normalizedQuery.split(' ').map(w => stripPlural(w));
  const baseQueryWord = stripPlural(normalizedQuery);

  const allProducts = await Product.find({ isAvailable: true });

  const scoredProducts = allProducts.map(product => {
    const name = product.name.toLowerCase();
    const brand = (product.brand || '').toLowerCase();
    const category = (product.category || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();

    let score = 0;

    if (name.includes(normalizedQuery)) score += 100;
    else if (name.includes(baseQueryWord)) score += 80;

    queryWords.forEach(word => {
      if (word.length < 2) return;
      const nameWords = name.split(' ').map(w => stripPlural(w));
      if (nameWords.includes(word)) score += 30;
      else if (name.includes(word)) score += 15;
      if (brand.includes(word) || category.includes(word)) score += 10;
      if (desc.includes(word)) score += 5;
    });

    return { product, score };
  });

  return scoredProducts
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(p => ({
      id: p.product._id.toString(),
      name: p.product.name,
      price: p.product.price,
      stock: p.product.stock,
      discount: p.product.discount,
      category: p.product.category,
      brand: p.product.brand,
      image: p.product.image
    }));
};

const getProductImpl = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) return { success: false, error: 'Product not found.' };
  return {
    id: product._id.toString(),
    name: product.name,
    price: product.price,
    stock: product.stock,
    discount: product.discount,
    category: product.category,
    brand: product.brand,
    description: product.description,
    image: product.image
  };
};

const addToCartImpl = async (productId, quantity = 1, user) => {
  if (!user) return { success: false, error: 'Unauthorized: Please log in to add items to your cart.' };
  if (user.role !== 'student') return { success: false, error: 'Only student users can add items to the cart.' };

  const product = await Product.findById(productId);
  if (!product) return { success: false, error: 'Product not found.' };
  if (product.stock === 0) return { success: false, error: 'Product is currently out of stock.' };

  let cart = await Cart.findOne({ user: user._id });
  if (!cart) {
    cart = new Cart({ user: user._id, items: [] });
  }

  const itemIdx = cart.items.findIndex(item => item.product.toString() === productId);
  if (itemIdx > -1) {
    const newQty = cart.items[itemIdx].quantity + quantity;
    if (newQty > product.stock) {
      cart.items[itemIdx].quantity = product.stock;
    } else {
      cart.items[itemIdx].quantity = newQty;
    }
  } else {
    cart.items.push({ product: productId, quantity: Math.min(quantity, product.stock) });
  }

  await cart.save();
  const populatedCart = await Cart.findOne({ user: user._id }).populate('items.product');

  const subtotal = populatedCart.items.reduce((acc, item) => acc + (item.product?.price || 0) * item.quantity, 0);
  const discountAmount = populatedCart.items.reduce((acc, item) => {
    if (!item.product) return acc;
    return acc + (item.product.price * ((item.product.discount || 0) / 100)) * item.quantity;
  }, 0);
  const total = Math.round(subtotal - discountAmount);

  const cartItem = populatedCart.items.find(item => item.product._id.toString() === productId);

  return {
    success: true,
    message: `Successfully added ${product.name} to cart.`,
    addedProduct: {
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: cartItem ? cartItem.quantity : quantity,
      subtotal: (product.price * (cartItem ? cartItem.quantity : quantity)),
      remainingStock: product.stock - (cartItem ? cartItem.quantity : quantity)
    },
    cartDetails: {
      subtotal,
      discountAmount,
      totalPrice: total,
      itemsCount: populatedCart.items.reduce((acc, item) => acc + item.quantity, 0)
    }
  };
};

const removeFromCartImpl = async (productId, user) => {
  if (!user) return { success: false, error: 'Unauthorized.' };
  let cart = await Cart.findOne({ user: user._id });
  if (!cart) return { success: false, error: 'Cart not found.' };

  cart.items = cart.items.filter(item => item.product.toString() !== productId);
  await cart.save();
  
  const populatedCart = await Cart.findOne({ user: user._id }).populate('items.product');
  return { success: true, message: 'Removed item from cart.', cart: populatedCart };
};

const viewCartImpl = async (user) => {
  if (!user) return { success: false, error: 'Unauthorized.' };
  const cart = await Cart.findOne({ user: user._id }).populate('items.product');
  if (!cart) return { success: true, cart: { items: [], totalPrice: 0 } };

  const subtotal = cart.items.reduce((acc, item) => acc + (item.product?.price || 0) * item.quantity, 0);
  const discountAmount = cart.items.reduce((acc, item) => {
    if (!item.product) return acc;
    return acc + (item.product.price * ((item.product.discount || 0) / 100)) * item.quantity;
  }, 0);
  const total = Math.round(subtotal - discountAmount);

  return {
    success: true,
    cart: {
      items: cart.items.map(i => ({
        productId: i.product?._id?.toString(),
        name: i.product?.name,
        price: i.product?.price,
        quantity: i.quantity
      })),
      subtotal,
      discountAmount,
      totalPrice: total
    }
  };
};

const updateCartImpl = async (productId, quantity, user) => {
  if (!user) return { success: false, error: 'Unauthorized.' };
  let cart = await Cart.findOne({ user: user._id });
  if (!cart) return { success: false, error: 'Cart not found.' };

  const itemIdx = cart.items.findIndex(item => item.product.toString() === productId);
  if (itemIdx > -1) {
    if (quantity <= 0) {
      cart.items = cart.items.filter(item => item.product.toString() !== productId);
    } else {
      cart.items[itemIdx].quantity = quantity;
    }
    await cart.save();
  }
  return await viewCartImpl(user);
};

const trackOrderImpl = async (user) => {
  if (!user) return { success: false, error: 'Unauthorized.' };
  const orders = await Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(3);
  return orders.map(o => ({
    orderId: o._id.toString(),
    status: o.orderStatus,
    total: o.totalAmount,
    deliverySlot: o.deliverySlot,
    paymentStatus: o.paymentStatus,
    items: o.orderItems?.map(i => ({ name: i.name, quantity: i.quantity })),
    createdAt: o.createdAt
  }));
};

const searchMedicinesImpl = async (query) => {
  if (!query || query.trim() === '') return [];
  let normalizedQuery = query.toLowerCase().trim();
  const allMedicines = await Product.find({ category: /Medicines/i, isAvailable: true });
  
  return allMedicines
    .filter(med => med.name.toLowerCase().includes(normalizedQuery) || (med.description && med.description.toLowerCase().includes(normalizedQuery)))
    .map(med => ({
      id: med._id.toString(),
      name: med.name,
      price: med.price,
      stock: med.stock,
      category: med.category,
      brand: med.brand,
      description: med.description
    }));
};

const createMedicineRequestImpl = async (name, description, user) => {
  if (!user) return { success: false, error: 'Unauthorized.' };
  const CustomRequest = (await import('../models/CustomRequest.js')).default;
  const request = new CustomRequest({
    user: user._id,
    itemName: name,
    requestType: 'medicine',
    description: description || 'Custom medicine request via AI Assistant.',
    status: 'pending'
  });
  await request.save();
  return { success: true, message: 'Custom medicine request submitted successfully.', request };
};

const searchCustomRequestsImpl = async (user) => {
  if (!user) return { success: false, error: 'Unauthorized.' };
  const CustomRequest = (await import('../models/CustomRequest.js')).default;
  const requests = await CustomRequest.find({ user: user._id }).sort({ createdAt: -1 });
  return requests.map(r => ({
    id: r._id.toString(),
    itemName: r.itemName,
    requestType: r.requestType,
    status: r.status,
    createdAt: r.createdAt
  }));
};

const executeTool = async (name, args, user) => {
  try {
    switch (name) {
      case 'searchProducts':
        return await searchProductsImpl(args.query);
      case 'getProduct':
        return await getProductImpl(args.productId);
      case 'addToCart':
        return await addToCartImpl(args.productId, args.quantity || 1, user);
      case 'removeFromCart':
        return await removeFromCartImpl(args.productId, user);
      case 'viewCart':
        return await viewCartImpl(user);
      case 'updateCart':
        return await updateCartImpl(args.productId, args.quantity, user);
      case 'placeOrder':
        return { success: true, message: "To place an order, please review your shopping cart in the Cart screen and click 'Proceed to Checkout'. Ensure your wallet is funded." };
      case 'trackOrder':
        return await trackOrderImpl(user);
      case 'searchMedicines':
        return await searchMedicinesImpl(args.query);
      case 'createMedicineRequest':
        return await createMedicineRequestImpl(args.name, args.description, user);
      case 'searchCustomRequests':
        return await searchCustomRequestsImpl(user);
      default:
        return { error: `Tool ${name} not found.` };
    }
  } catch (err) {
    console.error(`[Tool Execution Error] ${name}:`, err.message);
    return { error: `Failed to execute tool ${name}: ${err.message}` };
  }
};

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
    res.setHeader('X-Accel-Buffering', 'no');
    res.write(`data: ${JSON.stringify({ chunk: "The AI Assistant is currently in configuration standby mode. Please set the GEMINI_API_KEY environment variable to activate standard AI features." })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  // 1. Prepare history for startChat
  const chatHistory = [];
  for (const h of history) {
    const role = h.role === 'assistant' || h.role === 'model' ? 'model' : 'user';
    const text = h.parts?.[0]?.text || h.content || '';
    if (text) {
      chatHistory.push({
        role,
        parts: [{ text }]
      });
    }
  }

  // Define tools schema for Gemini
  const modelTools = [
    {
      functionDeclarations: [
        {
          name: 'searchProducts',
          description: 'Fuzzy search products in the HostelKart catalog by name, brand, category, keywords, synonyms, and description. Returns matching products.',
          parameters: {
            type: 'OBJECT',
            properties: {
              query: { type: 'STRING', description: 'The search query or product name/brand/category' }
            },
            required: ['query']
          }
        },
        {
          name: 'getProduct',
          description: 'Fetch detailed information of a specific product by its 24-character hexadecimal ID.',
          parameters: {
            type: 'OBJECT',
            properties: {
              productId: { type: 'STRING', description: 'The 24-character product hexadecimal ID' }
            },
            required: ['productId']
          }
        },
        {
          name: 'addToCart',
          description: 'Add a product to the user\'s shopping cart. Only students can perform this action.',
          parameters: {
            type: 'OBJECT',
            properties: {
              productId: { type: 'STRING', description: 'The 24-character product hexadecimal ID' },
              quantity: { type: 'INTEGER', description: 'The quantity to add (default: 1)' }
            },
            required: ['productId']
          }
        },
        {
          name: 'removeFromCart',
          description: 'Remove a product from the user\'s shopping cart.',
          parameters: {
            type: 'OBJECT',
            properties: {
              productId: { type: 'STRING', description: 'The 24-character product hexadecimal ID' }
            },
            required: ['productId']
          }
        },
        {
          name: 'viewCart',
          description: 'View the items and total pricing in the user\'s shopping cart.',
          parameters: {
            type: 'OBJECT',
            properties: {}
          }
        },
        {
          name: 'updateCart',
          description: 'Update the item quantity in the user\'s shopping cart.',
          parameters: {
            type: 'OBJECT',
            properties: {
              productId: { type: 'STRING', description: 'The 24-character product hexadecimal ID' },
              quantity: { type: 'INTEGER', description: 'The new quantity' }
            },
            required: ['productId', 'quantity']
          }
        },
        {
          name: 'placeOrder',
          description: 'Place an order for the items currently in the user\'s cart.',
          parameters: {
            type: 'OBJECT',
            properties: {}
          }
        },
        {
          name: 'trackOrder',
          description: 'Track the status of the user\'s active orders.',
          parameters: {
            type: 'OBJECT',
            properties: {}
          }
        },
        {
          name: 'searchMedicines',
          description: 'Fuzzy search the medicine database for OTC, first-aid, or wellness medicines by name, brand, or ingredients.',
          parameters: {
            type: 'OBJECT',
            properties: {
              query: { type: 'STRING', description: 'The name or query for the medicine' }
            },
            required: ['query']
          }
        },
        {
          name: 'createMedicineRequest',
          description: 'Create a custom medicine request if a medicine is not found in the catalog.',
          parameters: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING', description: 'The name of the requested medicine' },
              description: { type: 'STRING', description: 'The description or ingredients of the medicine' }
            },
            required: ['name']
          }
        },
        {
          name: 'searchCustomRequests',
          description: 'Search the user\'s custom request list.',
          parameters: {
            type: 'OBJECT',
            properties: {}
          }
        }
      ]
    }
  ];

  // 2. Initialize Gemini Chat Session with Tools
  const genAI = aiService.getGenAI();
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash-lite',
    tools: modelTools,
    systemInstruction: SYSTEM_PROMPT
  });

  const chat = model.startChat({
    history: chatHistory
  });

  // Start Server Sent Events stream
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const startTime = Date.now();
  let executedTools = [];
  let finalResponseText = '';

  try {
    let result = await chat.sendMessage(message);
    let response = result.response;
    let functionCalls = response.functionCalls();

    // 4. Resolve tool calls recursively if Gemini wants to call functions
    while (functionCalls && functionCalls.length > 0) {
      const toolResponses = [];
      for (const call of functionCalls) {
        executedTools.push(call.name);
        
        // Execute tool backend logic
        const toolOutput = await executeTool(call.name, call.args, req.user);
        
        // Log details (Issue 13)
        logger.info('AI_TOOL_CALL', `Executed AI tool: ${call.name}`, {
          userQuery: message,
          toolName: call.name,
          toolArgs: call.args,
          backendResponse: toolOutput
        });

        toolResponses.push({
          functionResponse: {
            name: call.name,
            response: { result: toolOutput }
          }
        });
      }

      // Send execution output back to chat session
      const nextResult = await chat.sendMessage(toolResponses);
      response = nextResult.response;
      functionCalls = response.functionCalls();
    }

    // 5. Stream final text chunk-by-chunk to the client
    finalResponseText = response.text();

    const isCartUpdated = executedTools.includes('addToCart') || executedTools.includes('removeFromCart') || executedTools.includes('updateCart');

    const chunkSize = 20;
    for (let i = 0; i < finalResponseText.length; i += chunkSize) {
      const chunk = finalResponseText.slice(i, i + chunkSize);
      res.write(`data: ${JSON.stringify({ chunk, cartUpdated: isCartUpdated })}\n\n`);
      if (typeof res.flush === 'function') res.flush();
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    const latencyMs = Date.now() - startTime;
    logger.performance('AI_CHAT_STREAM_LATENCY', 'Streamed chat assistant response', {
      latencyMs,
      promptSize: message.length,
      responseSize: finalResponseText.length,
      userId: req.user?._id?.toString() || 'guest'
    });

    res.write(`data: ${JSON.stringify({ done: true, cartUpdated: isCartUpdated })}\n\n`);
    res.write('data: [DONE]\n\n');
    if (typeof res.flush === 'function') res.flush();
    res.end();

  } catch (error) {
    logger.error('AI_CHAT_STREAM_ERROR', `Failed during generative chat stream: ${error.message}`, { error: error.message });
    res.write(`data: ${JSON.stringify({ error: 'AI Assistant was disconnected. Please check your connectivity or retry.' })}\n\n`);
    if (typeof res.flush === 'function') res.flush();
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
