import path from 'path';
import fs from 'fs';
import express from 'express';
import dotenv from 'dotenv';
// Load environmental variables immediately
dotenv.config();

import Order from './models/Order.js';
import Product from './models/Product.js';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { redisClient } from './config/redis.js';
import { seedIfEmpty } from './seed/seedDataInline.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import helmet from 'helmet';
import { nosqlSanitize, xssSanitize, csrfProtection } from './middleware/securityMiddleware.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import { initSentry } from './utils/sentry.js';
import { requestDuration } from './middleware/performanceMiddleware.js';
import { requestTimeout } from './middleware/timeoutMiddleware.js';
import { requestIdMiddleware } from './middleware/requestIdMiddleware.js';
import { logger } from './utils/logger.js';
import mongoose from 'mongoose';
import { triggerAlert } from './utils/alertService.js';
import metricsRoutes from './routes/metricsRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import customRequestRoutes from './routes/customRequestRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import deliveryRoutes from './routes/deliveryRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import excelRoutes from './routes/excelRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';



// Initialize Sentry Monitoring
initSentry();

// Enforce strict environment validation checks at startup
const requiredEnv = [
  'JWT_SECRET',
  'MONGO_URI',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'UPI_ID'
];

const missingEnv = requiredEnv.filter(env => !process.env[env]);
if (missingEnv.length > 0) {
  logger.error('STARTUP_ERROR', `Missing critical environment variables: ${missingEnv.join(', ')}. Application cannot start safely.`);
  process.exit(1);
} else {
  logger.info('STARTUP', 'All required environment variables validated successfully.');
}

// Connect to MongoDB and Auto-Seed if empty
const initializeDatabase = async () => {
  await connectDB();
  await seedIfEmpty();
};
initializeDatabase();

const app = express();

// Hardened HTTP security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://res.cloudinary.com"],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// Middlewares
app.use(requestIdMiddleware);

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://hostelkart.online', 'https://www.hostelkart.online']
  : [
      'http://localhost:4173',
      'http://localhost:5173',
      'http://localhost:3000',
      'https://hostelkart.online',
      'https://www.hostelkart.online'
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(compression());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));

// Input Sanitization to prevent XSS and NoSQL Injections
app.use(nosqlSanitize);
app.use(xssSanitize);

// Ensure upload directory exists
const __dirname = path.resolve();
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically with long-term caching
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));

// Rate Limiting Security Hardening for APIs
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Global Request Timeout Middleware (15s)
app.use('/api', requestTimeout(15000));

// Timing performance middleware
app.use('/api', requestDuration);

// CSRF Protection for state-changing operations
app.use('/api', csrfProtection);

// Routes mount
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/custom-requests', customRequestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/excel', excelRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/tickets', ticketRoutes);

// Serve Asset Links for Android Trusted Web Activity verification
app.get('/.well-known/assetlinks.json', (req, res) => {
  res.json([
    {
      "relation": [
        "delegate_permission/common.handle_all_urls"
      ],
      "target": {
        "namespace": "android_app",
        "package_name": "com.hostelkart.app",
        "sha256_cert_fingerprints": [
          "D8:D6:94:27:38:C4:5C:52:18:DB:C5:0E:D1:17:5D:3F:6A:43:D0:03:C1:9F:31:F1:95:EB:E4:4C:E1:E7:EC:E6"
        ]
      }
    }
  ]);
});

// Sitemap.xml dynamic generator
app.get('/sitemap.xml', async (req, res) => {
  try {
    const products = await Product.find({}).select('_id updatedAt').lean();
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.hostelkart.online/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://www.hostelkart.online/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://www.hostelkart.online/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://www.hostelkart.online/privacy-policy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://www.hostelkart.online/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://www.hostelkart.online/refund-policy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://www.hostelkart.online/products</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`;

    products.forEach((p) => {
      xml += `
  <url>
    <loc>https://www.hostelkart.online/products/${p._id.toString()}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    });

    xml += `\n</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.status(200).send(xml);
  } catch (error) {
    console.error('Failed to generate sitemap.xml:', error);
    res.status(500).send('Error generating sitemap');
  }
});

// Robots.txt generator
app.get('/robots.txt', (req, res) => {
  const robots = `User-agent: *
Allow: /
Allow: /products
Allow: /about
Allow: /contact
Allow: /privacy-policy
Allow: /terms
Allow: /refund-policy
Disallow: /admin/
Disallow: /api/
Disallow: /checkout/
Disallow: /cart/
Disallow: /profile/
Disallow: /myorders/

Sitemap: https://www.hostelkart.online/sitemap.xml
`;
  res.header('Content-Type', 'text/plain');
  res.status(200).send(robots);
});

// Root route
app.get('/', (req, res) => {
  res.send('HostelKart API is running...');
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

import { createServer } from 'http';
import { Server } from 'socket.io';
import { setIoInstance } from './utils/socket.js';

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

setIoInstance(io);

io.on('connection', (socket) => {
  console.log("Client Connected", socket.id);

  // Private room for user notifications
  socket.on('join_user', ({ userId }) => {
    socket.join(`user_${userId}`);
    console.log(`[Socket] User joined notification room: user_${userId}`);
  });

  // Students join this room to track an order
  socket.on('join_order_track', ({ orderId }) => {
    socket.join(`order_${orderId}`);
    console.log("Join Order", orderId);
  });

  // Support Ticketing Room
  socket.on('join_ticket', ({ ticketId }) => {
    socket.join(ticketId);
    console.log(`[Socket] Client joined ticket room: ${ticketId}`);
  });

  // Support Chat Typing Indicator
  socket.on('ticket_typing', ({ ticketId, username, isTyping }) => {
    socket.to(ticketId).emit('ticket_typing_updated', { username, isTyping });
  });

  // Rider publishes live coordinates & telemetry
  socket.on('update_location', (payload) => {
    console.log("Location Update", payload);
    const { orderId, lat, lng, distanceRemaining, eta } = payload;
    io.to(`order_${orderId}`).emit('location_updated', {
      orderId,
      lat,
      lng,
      distanceRemaining,
      eta,
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// Background Payment Expiration Monitor (runs every 30 seconds)
const startPaymentExpirationMonitor = (ioInstance) => {
  setInterval(async () => {
    try {
      const now = new Date();
      const expiredOrders = await Order.find({
        paymentMethod: 'UPI',
        paymentStatus: 'Pending Payment',
        paymentExpiresAt: { $lt: now }
      });

      for (const order of expiredOrders) {
        order.paymentStatus = 'Failed';
        order.orderStatus = 'Payment Expired';
        order.cancellationReason = 'Payment session expired';
        order.timeline.push({
          status: 'Payment Expired',
          note: 'Payment session expired. Reserved stock released.',
        });

        // Restore stocks
        for (const item of order.items) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.quantity },
          });
        }

        await order.save();
        console.log(`[Expiration Monitor] Expired payment session for order #${order._id.toString().substring(12).toUpperCase()}`);
        
        // Broadcast socket status update
        if (ioInstance) {
          ioInstance.to(`order_${order._id}`).emit('status_updated', {
            orderId: order._id,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentStatus
          });
        }
      }
    } catch (err) {
      console.error('[Expiration Monitor Error]:', err);
    }
  }, 30000);
};

// Set io globally on Express app so controllers can access it
app.set('io', io);
startPaymentExpirationMonitor(io);

const PORT = process.env.PORT || 5000;

const runningServer = server.listen(PORT, () => {
  logger.info('STARTUP', `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// MongoDB connection event alert monitoring
mongoose.connection.on('disconnected', () => {
  triggerAlert('critical', 'MONGO_DISCONNECTED', 'Mongoose default connection has disconnected!');
});
mongoose.connection.on('error', (err) => {
  triggerAlert('critical', 'MONGO_CONNECTION_ERROR', `MongoDB connection error: ${err.message}`, { error: err });
});

// High memory usage checking loop (Runs every 10 seconds)
const memoryCheckInterval = setInterval(() => {
  const memoryUsage = process.memoryUsage();
  const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
  if (heapUsedMB > 250) {
    triggerAlert('warn', 'HIGH_MEMORY_USAGE', `Memory usage threshold exceeded: ${heapUsedMB.toFixed(2)} MB used`, {
      heapUsedMB: Number(heapUsedMB.toFixed(2)),
      heapTotalMB: Number((memoryUsage.heapTotal / 1024 / 1024).toFixed(2)),
    });
  }
}, 10000);

// Graceful Shutdown sequence
const handleShutdown = (signal) => {
  logger.info('SHUTDOWN', `Received ${signal}. Starting graceful shutdown sequence...`);

  // Stop memory check interval
  clearInterval(memoryCheckInterval);

  // Stop accepting new connections
  runningServer.close(async () => {
    logger.info('SHUTDOWN', 'HTTP server closed. Resolving database connections...');

    try {
      if (redisClient && typeof redisClient.quit === 'function') {
        await redisClient.quit();
        logger.info('SHUTDOWN', 'Redis connection closed successfully.');
      }
      await mongoose.connection.close();
      logger.info('SHUTDOWN', 'MongoDB connection closed successfully.');
    } catch (err) {
      logger.error('SHUTDOWN_ERROR', 'Error closing database connections during shutdown', { error: err });
    }

    logger.info('SHUTDOWN', 'Observability services flushing.');
    process.exit(0);
  });

  // Force terminate after 10s if active connections block execution
  setTimeout(() => {
    logger.error('SHUTDOWN_TIMEOUT', 'Graceful shutdown timeout exceeded. Forcing termination.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
