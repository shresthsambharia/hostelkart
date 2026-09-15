import asyncHandler from 'express-async-handler';
import { aiService } from './aiService.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Wishlist from '../models/Wishlist.js';
import DietPlan from '../models/DietPlan.js';
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
const getProductsByCategoryImpl = async (category) => {
  if (!category) return [];
  const products = await Product.find({
    category: { $regex: new RegExp(`^${category}$`, 'i') },
    isAvailable: true
  });
  return products.map(p => ({
    id: p._id.toString(),
    name: p.name,
    price: p.price,
    stock: p.stock,
    discount: p.discount,
    category: p.category,
    brand: p.brand,
    description: p.description || '',
    image: p.image
  }));
};

export const searchProductsImpl = async (query) => {
  if (!query || query.trim() === '') return [];
  let normalizedQuery = query.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").replace(/\s+/g, " ");
  
  if (['fruits', 'fruit', 'medicines', 'medicine'].includes(normalizedQuery)) {
    const catName = ['fruits', 'fruit'].includes(normalizedQuery) ? 'Fruits' : 'Medicines';
    return await getProductsByCategoryImpl(catName);
  }
  
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
    const rawName = product.name.toLowerCase();
    const brand = (product.brand || '').toLowerCase();
    const category = (product.category || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();

    const nameWords = rawName.split(/[\s\-_]+/).map(w => stripPlural(w.replace(/[^a-z0-9]/g, '')));
    const brandWords = brand.split(/[\s\-_]+/).map(w => stripPlural(w.replace(/[^a-z0-9]/g, '')));
    const descWords = desc.split(/[\s\-_]+/).map(w => stripPlural(w.replace(/[^a-z0-9]/g, '')));

    let score = 0;

    // Exact full name match
    if (rawName === normalizedQuery || rawName === baseQueryWord) {
      score += 150;
    }

    // Whole word match in product name (e.g. "Royal Gala Apple" matching "apple", but NOT "Pineapple")
    if (nameWords.includes(normalizedQuery) || nameWords.includes(baseQueryWord)) {
      score += 100;
    }

    queryWords.forEach(word => {
      if (word.length < 2) return;
      if (nameWords.includes(word)) {
        score += 50;
      } else if (brandWords.includes(word) || category === word) {
        score += 20;
      } else if (descWords.includes(word)) {
        score += 10;
      } else if (word.length >= 4 && rawName.includes(word) && !rawName.includes('pineapple') && word !== 'apple') {
        score += 5;
      }
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
  
  if (['all', 'list', 'medicines', 'medicine'].includes(normalizedQuery)) {
    return allMedicines.map(med => ({
      id: med._id.toString(),
      name: med.name,
      price: med.price,
      stock: med.stock,
      category: med.category,
      brand: med.brand,
      description: med.description
    }));
  }
  
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
      case 'getProductsByCategory':
        return await getProductsByCategoryImpl(args.category);
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
          name: 'getProductsByCategory',
          description: 'Retrieve all products belonging to a specific category (e.g. \'Fruits\' or \'Medicines\') from the live database. Use this to count or list all products in that category.',
          parameters: {
            type: 'OBJECT',
            properties: {
              category: { type: 'STRING', description: 'The category to retrieve, which should be \'Fruits\' or \'Medicines\'' }
            },
            required: ['category']
          }
        },
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

/**
 * Calculate BMI and general category with limitation notes
 */
export const calculateBMI = (heightCm, weightKg) => {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return { bmi: 0, category: 'Unknown', notes: 'Valid height and weight required.' };
  }
  const heightM = heightCm / 100;
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  let category = 'Normal weight';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi >= 25 && bmi < 30) category = 'Overweight';
  else if (bmi >= 30) category = 'Obese';

  return {
    bmi,
    category,
    limitations: 'BMI is a general screening indicator and does not directly measure body fat percentage, muscle mass, or overall individual metabolic health.'
  };
};

/**
 * Server-side lookup of available, in-stock products on HostelKart
 * suitable for the student's dietary preferences, allergies, and goals.
 */
export const searchDietProducts = async (dietaryPreference = 'Vegetarian', allergies = [], goal = 'General healthy eating') => {
  const allergyList = (Array.isArray(allergies) ? allergies : [allergies]).map(a => (typeof a === 'string' ? a.toLowerCase().trim() : ''));
  
  const query = {
    category: { $in: ['Fruits', 'Medicines'] },
    isAvailable: true,
    stock: { $gt: 0 }
  };

  const allAvailable = await Product.find(query).limit(50).lean();
  
  const filtered = allAvailable.filter(prod => {
    const name = (prod.name || '').toLowerCase();
    const desc = (prod.description || '').toLowerCase();
    
    // Allergen filtering
    for (const allergy of allergyList) {
      if (!allergy || allergy === 'none' || allergy === 'no allergies') continue;
      if (allergy.includes('peanut') && (name.includes('peanut') || desc.includes('peanut'))) return false;
      if (allergy.includes('nut') && (name.includes('nut') || name.includes('almond') || name.includes('cashew'))) return false;
      if (allergy.includes('dairy') || allergy.includes('milk')) {
        if (name.includes('milk') || name.includes('curd') || name.includes('cheese') || name.includes('paneer') || name.includes('butter')) return false;
      }
      if (allergy.includes('gluten') && (name.includes('wheat') || name.includes('bread') || name.includes('biscuit') || name.includes('atta'))) return false;
      if (allergy.includes('soy') && (name.includes('soy') || name.includes('soya'))) return false;
      if (allergy.includes('egg') && name.includes('egg')) return false;
    }

    // Dietary preference filtering
    const pref = (dietaryPreference || '').toLowerCase();
    if (pref === 'vegan' && (name.includes('milk') || name.includes('curd') || name.includes('paneer') || name.includes('cheese') || name.includes('honey') || name.includes('egg') || name.includes('meat') || name.includes('chicken'))) return false;
    if (pref === 'vegetarian' && (name.includes('meat') || name.includes('chicken') || name.includes('fish') || name.includes('egg'))) return false;
    if (pref === 'eggetarian' && (name.includes('meat') || name.includes('chicken') || name.includes('fish'))) return false;

    return true;
  });

  return filtered.slice(0, 10).map(p => {
    let reason = 'Convenient hostel-friendly nutrition source.';
    const lower = p.name.toLowerCase();
    if (lower.includes('banana')) {
      reason = 'Convenient hostel-friendly fruit and useful as a pre-workout or study energy carbohydrate source.';
    } else if (lower.includes('apple')) {
      reason = 'High fiber, easy to store in hostel rooms without refrigeration for several days.';
    } else if (lower.includes('orange') || lower.includes('mosambi') || lower.includes('kiwi')) {
      reason = 'Rich in Vitamin C and hydrating, supports daily micronutrient intake.';
    } else if (lower.includes('nariyal') || lower.includes('coconut')) {
      reason = 'Natural electrolytes for hydration during study or gym sessions.';
    } else if (lower.includes('papaya') || lower.includes('pomegranate')) {
      reason = 'Antioxidant and digestion-friendly fruit, ideal with morning hostel meals.';
    }

    return {
      _id: p._id.toString(),
      name: p.name,
      price: p.price,
      discount: p.discount || 0,
      stock: p.stock,
      category: p.category,
      image: p.image,
      reason
    };
  });
};

/**
 * Generate safe, structured Fallback Diet Plan
 */
const generateFallbackPlan = (profile, products) => {
  const isGain = (profile.goal || '').toLowerCase().includes('muscle') || (profile.goal || '').toLowerCase().includes('gain');
  const isLoss = (profile.goal || '').toLowerCase().includes('loss') || (profile.goal || '').toLowerCase().includes('fat');
  
  let calorieRange = '2000 - 2200 kcal/day (Estimated starting target)';
  let macros = { protein: '80 - 100g', carbs: '240 - 280g', fats: '50 - 65g' };
  
  if (isGain) {
    calorieRange = '2300 - 2500 kcal/day (Estimated starting target)';
    macros = { protein: '110 - 130g', carbs: '280 - 320g', fats: '60 - 75g' };
  } else if (isLoss) {
    calorieRange = '1700 - 1900 kcal/day (Estimated starting target)';
    macros = { protein: '85 - 105g', carbs: '180 - 220g', fats: '45 - 55g' };
  }

  const messOpt = profile.dietaryPreference === 'Non-vegetarian' || profile.dietaryPreference === 'Eggetarian' 
    ? 'Mess breakfast + 2 boiled eggs / omelette' 
    : 'Mess poha/upma/idli + curd/milk';

  return {
    summary: `Personalized student nutrition outline tailored for hostel life with a focus on ${profile.goal || 'healthy living'}. Built with convenient room and mess meal adaptations.`,
    estimatedCalories: calorieRange,
    estimatedMacros: macros,
    dailyPlan: {
      earlyMorning: [
        { time: '7:00 AM', items: ['1-2 glasses of warm water', 'Handful of soaked almonds/walnuts or fresh fruit'], hostelAlternative: 'Fresh apple/banana stored in room', reason: 'Gentle hydration and natural morning energy.' }
      ],
      breakfast: [
        { time: '8:30 AM', items: [messOpt, '1 fresh banana or seasonal fruit'], hostelAlternative: 'Quick rolled oats with warm milk/curd and sliced banana', reason: 'Sustained complex carbohydrates and morning protein for lectures.' }
      ],
      midMorning: [
        { time: '11:30 AM', items: ['Seasonal fruit (Apple / Orange / Mosambi) or coconut water'], hostelAlternative: 'Fruit ordered from HostelKart corridor delivery', reason: 'Hydration and micronutrient support between classes.' }
      ],
      lunch: [
        { time: '1:30 PM', items: ['Hostel Mess Lunch: 2-3 Rotis, Dal (double portion), Sabzi, Curd, Salad'], hostelAlternative: 'Ensure extra dal/curd for balanced protein intake', reason: 'Core balanced meal utilizing the hostel mess facility.' }
      ],
      eveningSnack: [
        { time: '5:30 PM', items: ['Roasted chana, sprouts, or peanut butter with toast/fruit', 'Green tea or lemon water'], hostelAlternative: 'Fresh fruit or roasted makhana stored in room', reason: 'Healthy pre-workout or late afternoon study snack.' }
      ],
      dinner: [
        { time: '8:30 PM', items: ['Hostel Mess Dinner: Light roti/rice, paneer/egg/chicken/dal curry, salad'], hostelAlternative: 'Avoid overly oily gravies where possible; pick clear lentils and veggies', reason: 'Light, nutrient-dense evening meal for restful sleep.' }
      ],
      beforeBed: [
        { time: '10:30 PM', items: ['1 glass warm milk or chamomile/herbal tea (optional)'], hostelAlternative: 'Warm water with pinch of turmeric', reason: 'Promotes relaxation and restful sleep recovery.' }
      ]
    },
    hydration: {
      generalGuidance: '2.5 to 3.5 Liters of water daily',
      tips: [
        'Keep a reusable 1-Liter water bottle on your study desk and corridor backpack.',
        'Drink 1 glass of water immediately upon waking up.',
        'Include hydrating fruits like watermelon, oranges, and nariyal pani.'
      ]
    },
    foodsToPrefer: [
      { food: 'Fresh seasonal fruits (Apples, Bananas, Oranges)', why: 'Convenient room storage, rich in micronutrients and fiber.' },
      { food: 'Lentils (Dal), Curd, and Sprouts', why: 'Essential affordable protein sources for hostel students.' },
      { food: 'Oats, Roasted Chana, and Nuts', why: 'Non-perishable room snacks that prevent junk food cravings.' }
    ],
    foodsToLimit: [
      { food: 'Excessively fried canteen snacks (Samosas, Pakodas)', why: 'High trans-fats causing afternoon lethargy and digestion distress.' },
      { food: 'Late-night instant noodles with high sodium', why: 'Can cause bloating and disrupt sleep quality.' },
      { food: 'Sugary energy drinks and soda', why: 'Temporary glucose spikes followed by sharp study fatigue.' }
    ],
    hostelTips: [
      'Store whole fruits (Apples, Oranges) in open bowls in your room; they stay fresh for days without a fridge.',
      'Ask the mess staff for double dal or extra curd to meet daily protein goals easily.',
      'Keep roasted seeds or chana in airtight containers near your study table for evening hunger.',
      'Coordinate with corridor mates to order fresh fruit batches from HostelKart.'
    ],
    weeklyPlan: [
      { day: 'Monday', breakfast: 'Mess Poha + Curd + 1 Banana', lunch: 'Mess Thali: 2 Roti, Double Dal, Sabzi, Salad', snack: 'Roasted Chana + Apple', dinner: 'Mess Roti + Paneer/Egg Bhurji + Dal' },
      { day: 'Tuesday', breakfast: 'Oats + Milk + Apple slices', lunch: 'Mess Rice + Rajma/Chole + Curd + Cucumber', snack: 'Fruit bowl + Green tea', dinner: 'Mess Roti + Mixed Veg + Dal' },
      { day: 'Wednesday', breakfast: 'Mess Idli/Dosa + Sambar + 1 Orange', lunch: 'Mess 2 Roti + Dal Tadka + Bhindi Sabzi + Salad', snack: 'Handful of Nuts + Banana', dinner: 'Mess Khichdi / Roti + Dal + Curd' },
      { day: 'Thursday', breakfast: 'Mess Upma + Boiled Egg/Sprouts', lunch: 'Mess 2-3 Roti + Soya/Paneer curry + Dal + Salad', snack: 'Coconut Water + Roasted Makhana', dinner: 'Mess 2 Roti + Dal Makhani/Lentils + Salad' },
      { day: 'Friday', breakfast: 'Mess Paratha (light oil) + Curd + 1 Fruit', lunch: 'Mess 2 Roti + Double Dal + Green Veg + Salad', snack: 'Apple + Peanut Butter (if no allergy)', dinner: 'Mess Light Dinner: Roti + Mix Dal + Salad' },
      { day: 'Saturday', breakfast: 'Oats with Warm Milk + Banana', lunch: 'Mess Special Lunch (balanced portions) + Extra Salad', snack: 'Fresh Orange/Mosambi + Chana', dinner: 'Mess Roti + Egg Curry / Paneer / Chana Dal' },
      { day: 'Sunday', breakfast: 'Mess Sunday Breakfast + Fresh Fruit', lunch: 'Mess Lunch + Curd + Lemon Salad', snack: 'Mixed Fruit Bowl', dinner: 'Light Dinner: Roti + Simple Dal + Curd' }
    ],
    safetyNotes: [
      'This guidance adapts to your self-reported dietary preferences and activity level.',
      'If you have any diagnosed medical condition, discuss specific carbohydrate, sodium, and mineral limits with your physician.',
      'Never skip meals during heavy exam study cycles; prioritize consistent hydration and wholesome snacks.'
    ],
    disclaimer: 'This is an educational student nutrition guide designed for hostel living and is NOT medical advice, diagnosis, or prescription. For clinical conditions, allergies, or therapeutic diets, consult a registered dietitian or doctor.',
    recommendedProducts: products
  };
};

/**
 * @desc    Generate personalized, safe AI diet plan for authenticated student
 * @route   POST /api/ai/diet-plan
 * @access  Private (Student)
 */
export const generateDietPlan = asyncHandler(async (req, res) => {
  const user = req.user;
  if (!user) {
    res.status(401);
    throw new Error('Unauthorized: Please log in to generate a personalized diet plan.');
  }

  const {
    age,
    gender = 'unspecified',
    height,
    weight,
    activityLevel = 'Moderately Active',
    goal = 'General healthy eating',
    dietaryPreference = 'Vegetarian',
    foodPreferences = {},
    allergies = [],
    otherAllergies = '',
    healthConditions = [],
    otherHealthConditions = '',
    hostelLifestyle = {}
  } = req.body;

  const numAge = Number(age);
  const numHeight = Number(height);
  const numWeight = Number(weight);

  if (!numHeight || !numWeight || numHeight <= 0 || numWeight <= 0) {
    res.status(400);
    throw new Error('Valid height (cm) and weight (kg) are required.');
  }

  const bmiInfo = calculateBMI(numHeight, numWeight);
  
  // Combine all allergies for strict exclusion checking
  const allAllergiesList = Array.isArray(allergies) ? [...allergies] : [allergies];
  if (otherAllergies && typeof otherAllergies === 'string' && otherAllergies.trim()) {
    allAllergiesList.push(otherAllergies.trim());
  }

  // Combine health conditions
  const allConditionsList = Array.isArray(healthConditions) ? [...healthConditions] : [healthConditions];
  if (otherHealthConditions && typeof otherHealthConditions === 'string' && otherHealthConditions.trim()) {
    allConditionsList.push(otherHealthConditions.trim());
  }

  // Real product search from MongoDB
  const availableProducts = await searchDietProducts(dietaryPreference, allAllergiesList, goal);

  const profileSnapshot = {
    age: numAge || 20,
    gender,
    height: numHeight,
    weight: numWeight,
    bmi: bmiInfo.bmi,
    bmiCategory: bmiInfo.category,
    activityLevel,
    goal,
    dietaryPreference,
    foodPreferences: {
      favouriteFoods: foodPreferences.favouriteFoods || '',
      dislikedFoods: foodPreferences.dislikedFoods || '',
      inaccessibleFoods: foodPreferences.inaccessibleFoods || ''
    },
    allergies: allAllergiesList,
    otherAllergies,
    healthConditions: allConditionsList,
    otherHealthConditions,
    hostelLifestyle: {
      sleepDuration: hostelLifestyle.sleepDuration || '7-8 hours',
      workoutFrequency: hostelLifestyle.workoutFrequency || '3-4 days/week',
      dailyWaterIntake: hostelLifestyle.dailyWaterIntake || '2-3 liters',
      mealTimings: hostelLifestyle.mealTimings || 'Standard hostel schedule',
      messAvailability: hostelLifestyle.messAvailability || 'full',
      monthlyBudget: hostelLifestyle.monthlyBudget || 'Moderate'
    }
  };

  let generatedPlan = null;
  const isConfigured = aiService.isConfigured();

  if (isConfigured) {
    try {
      const productCatalogSummary = availableProducts.map(p => `- ${p.name} (₹${p.price}, Category: ${p.category})`).join('\n');

      const systemPrompt = `You are the official HostelKart AI Nutrition Assistant, an expert student dietitian who crafts realistic, healthy, and affordable nutrition plans for university students living in hostel corridors and dorms.

=== STRICT MEDICAL SAFETY & LEGAL GUARDRAILS ===
1. You are a nutrition-support assistant, NOT a medical doctor.
2. NEVER diagnose, claim to cure, or prescribe treatments for any disease.
3. Treat any reported condition as a "self-reported condition" (e.g. "Based on your self-reported condition of...").
4. If diabetes is reported: emphasize discussing carbohydrate portions with their healthcare professional; avoid extreme restriction or claiming blood glucose cure.
5. If high blood pressure is reported: emphasize limiting excessive sodium/salty packaged snacks; advise consulting their doctor.
6. If anemia/iron deficiency is reported: discuss general iron-rich food sources combined with Vitamin C; recommend clinical evaluation.
7. If kidney/liver disease or pregnancy is reported: flag that protein, potassium, sodium, and fluid requirements require individualized medical guidance; recommend consulting their physician/dietitian.
8. NEVER recommend stopping or changing any medication.
9. Avoid crash diets, extreme calorie deficits, or unrealistic protein targets.

=== HOSTEL SPECIFIC RESTRICTIONS ===
- Students rely heavily on the hostel mess for lunch/dinner and have limited cooking equipment in rooms (usually electric kettle or no stove).
- Suggest practical mess choices (e.g., asking for extra dal/curd, choosing less oily gravies) and easy room preparations (oats, fruits, curd, nuts, boiled eggs).
- Respect the monthly budget: prioritize affordable, locally accessible foods.
- Respect food dislikes and strict allergen exclusions. NEVER suggest items containing the user's reported allergens.

=== REAL HOSTELKART AVAILABLE PRODUCTS ===
Only recommend products from this live catalog list when proposing grocery/fruit items:
${productCatalogSummary}

=== REQUIRED JSON OUTPUT FORMAT ===
You MUST return ONLY a valid, parseable JSON object matching this schema without any wrapping markdown outside JSON:
{
  "summary": "2-3 sentences overview of the nutrition plan tailored to the student's profile and hostel life",
  "estimatedCalories": "e.g. 2100-2300 kcal/day (Estimated starting target)",
  "estimatedMacros": {
    "protein": "e.g. 90-110g",
    "carbs": "e.g. 260-290g",
    "fats": "e.g. 50-60g"
  },
  "dailyPlan": {
    "earlyMorning": [{"time": "7:00 AM", "items": ["..."], "hostelAlternative": "...", "reason": "..."}],
    "breakfast": [{"time": "8:30 AM", "items": ["..."], "hostelAlternative": "...", "reason": "..."}],
    "midMorning": [{"time": "11:30 AM", "items": ["..."], "hostelAlternative": "...", "reason": "..."}],
    "lunch": [{"time": "1:30 PM", "items": ["..."], "hostelAlternative": "...", "reason": "..."}],
    "eveningSnack": [{"time": "5:30 PM", "items": ["..."], "hostelAlternative": "...", "reason": "..."}],
    "dinner": [{"time": "8:30 PM", "items": ["..."], "hostelAlternative": "...", "reason": "..."}],
    "beforeBed": [{"time": "10:30 PM", "items": ["..."], "hostelAlternative": "...", "reason": "..."}]
  },
  "hydration": {
    "generalGuidance": "e.g. 3.0 Liters/day",
    "tips": ["Tip 1", "Tip 2", "Tip 3"]
  },
  "foodsToPrefer": [{"food": "...", "why": "..."}],
  "foodsToLimit": [{"food": "...", "why": "..."}],
  "hostelTips": ["Tip 1", "Tip 2", "Tip 3", "Tip 4"],
  "weeklyPlan": [
    {"day": "Monday", "breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..."},
    {"day": "Tuesday", "breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..."},
    {"day": "Wednesday", "breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..."},
    {"day": "Thursday", "breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..."},
    {"day": "Friday", "breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..."},
    {"day": "Saturday", "breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..."},
    {"day": "Sunday", "breakfast": "...", "lunch": "...", "snack": "...", "dinner": "..."}
  ],
  "safetyNotes": ["Note 1", "Note 2"],
  "disclaimer": "This is a general student nutrition guide and not medical advice. For clinical, metabolic, or therapeutic dietary management, please consult a qualified healthcare professional or registered dietitian."
}`;

      const userPrompt = `Student Profile:
- Age: ${profileSnapshot.age}, Gender: ${profileSnapshot.gender}
- Height: ${profileSnapshot.height} cm, Weight: ${profileSnapshot.weight} kg (BMI: ${bmiInfo.bmi} - ${bmiInfo.category})
- Primary Goal: ${profileSnapshot.goal}
- Activity Level: ${profileSnapshot.activityLevel}
- Dietary Preference: ${profileSnapshot.dietaryPreference}
- Favourite Foods: ${profileSnapshot.foodPreferences.favouriteFoods || 'None specified'}
- Disliked Foods: ${profileSnapshot.foodPreferences.dislikedFoods || 'None'}
- Inaccessible Foods: ${profileSnapshot.foodPreferences.inaccessibleFoods || 'None'}
- Allergies / Intolerances: ${allAllergiesList.length > 0 ? allAllergiesList.join(', ') : 'None'}
- Self-Reported Health Conditions: ${allConditionsList.length > 0 ? allConditionsList.join(', ') : 'No known medical condition'}
- Hostel Mess Availability: ${profileSnapshot.hostelLifestyle.messAvailability}
- Monthly Food Budget: ${profileSnapshot.hostelLifestyle.monthlyBudget}
- Sleep & Workout: ${profileSnapshot.hostelLifestyle.sleepDuration} sleep, ${profileSnapshot.hostelLifestyle.workoutFrequency} workout

Generate a practical, motivating, safe, and realistic 7-day nutrition and diet plan tailored specifically for this student living in a hostel. Output ONLY valid JSON.`;

      const aiRaw = await aiService.generateResponse(userPrompt, systemPrompt);
      const cleanJson = aiRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
      generatedPlan = JSON.parse(cleanJson);
      generatedPlan.recommendedProducts = availableProducts;
    } catch (err) {
      logger.error('DIET_PLAN_GEN_ERROR', `Gemini diet generation failed, falling back safely: ${err.message}`);
      generatedPlan = generateFallbackPlan(profileSnapshot, availableProducts);
    }
  } else {
    generatedPlan = generateFallbackPlan(profileSnapshot, availableProducts);
  }

  // Ensure mandatory disclaimer & recommended products are present
  if (!generatedPlan.disclaimer) {
    generatedPlan.disclaimer = 'This is a general student nutrition guide and not medical advice. For clinical, metabolic, or therapeutic dietary management, please consult a qualified healthcare professional or registered dietitian.';
  }
  if (!generatedPlan.recommendedProducts || generatedPlan.recommendedProducts.length === 0) {
    generatedPlan.recommendedProducts = availableProducts;
  }

  // Save plan in MongoDB
  const dietDoc = new DietPlan({
    user: user._id,
    profileSnapshot,
    plan: generatedPlan
  });
  await dietDoc.save();

  res.status(201).json({
    success: true,
    dietPlanId: dietDoc._id.toString(),
    profile: profileSnapshot,
    plan: generatedPlan
  });
});

/**
 * @desc    Get saved diet plans for authenticated student
 * @route   GET /api/ai/diet-plan
 * @access  Private (Student)
 */
export const getDietPlans = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Unauthorized');
  }

  const plans = await DietPlan.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .select('-__v')
    .lean();

  res.json({
    success: true,
    count: plans.length,
    plans: plans.map(p => ({
      _id: p._id.toString(),
      goal: p.profileSnapshot?.goal,
      bmi: p.profileSnapshot?.bmi,
      bmiCategory: p.profileSnapshot?.bmiCategory,
      dietaryPreference: p.profileSnapshot?.dietaryPreference,
      createdAt: p.createdAt,
      summary: p.plan?.summary
    }))
  });
});

/**
 * @desc    Get single diet plan by ID for authenticated student
 * @route   GET /api/ai/diet-plan/:id
 * @access  Private (Student)
 */
export const getDietPlanById = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Unauthorized');
  }

  const plan = await DietPlan.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!plan) {
    res.status(404);
    throw new Error('Diet plan not found or access denied.');
  }

  res.json({
    success: true,
    dietPlanId: plan._id.toString(),
    profile: plan.profileSnapshot,
    plan: plan.plan,
    createdAt: plan.createdAt
  });
});

/**
 * @desc    Delete saved diet plan by ID
 * @route   DELETE /api/ai/diet-plan/:id
 * @access  Private (Student)
 */
export const deleteDietPlan = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Unauthorized');
  }

  const deleted = await DietPlan.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) {
    res.status(404);
    throw new Error('Diet plan not found or access denied.');
  }

  res.json({
    success: true,
    message: 'Diet plan deleted successfully.'
  });
});

/**
 * @desc    Follow-up conversational Q&A and smart substitutions on active diet plan
 * @route   POST /api/ai/diet-plan/chat
 * @access  Private (Student)
 */
export const chatDietPlanFollowUp = asyncHandler(async (req, res) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Unauthorized');
  }

  const { message, planContext, history = [] } = req.body;
  if (!message) {
    res.status(400);
    throw new Error('Message is required.');
  }

  const isConfigured = aiService.isConfigured();
  if (!isConfigured) {
    return res.json({
      success: true,
      reply: 'AI Assistant is in offline mode. You can swap fresh fruits like bananas with apples, oranges, or seasonal hostel mess fruit options.'
    });
  }

  try {
    const systemPrompt = `You are the HostelKart AI Nutrition Assistant answering follow-up questions from a student regarding their personalized diet plan.
Context of Student's Active Plan:
Goal: ${planContext?.goal || 'General health'}
Dietary Preference: ${planContext?.dietaryPreference || 'Vegetarian'}
Allergies: ${(planContext?.allergies || []).join(', ') || 'None'}
Self-Reported Health Conditions: ${(planContext?.healthConditions || []).join(', ') || 'None'}

=== RULES ===
1. Suggest practical, hostel-friendly, affordable substitutions and advice.
2. Respect all listed allergies and dietary preferences strictly.
3. Treat conditions as self-reported and never provide clinical medical advice or claim cures.
4. Keep replies structured, concise, and helpful.`;

    const reply = await aiService.generateResponse(message, systemPrompt);
    res.json({
      success: true,
      reply
    });
  } catch (error) {
    logger.error('DIET_CHAT_ERROR', `Diet follow-up chat failed: ${error.message}`);
    res.json({
      success: true,
      reply: 'You can easily substitute items in your plan with other fresh fruits or lentils from your hostel mess.'
    });
  }
});

