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
import { seedIfEmpty } from './seed/seedDataInline.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import helmet from 'helmet';
import { nosqlSanitize, xssSanitize } from './middleware/securityMiddleware.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { initSentry } from './utils/sentry.js';
import { requestTimeout } from './middleware/timeoutMiddleware.js';
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

// Validate Cloudinary credentials on startup
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('\x1b[31m%s\x1b[0m', '[Startup Error] Cloudinary configuration is missing! Image uploads will fail.');
} else {
  console.log('\x1b[32m%s\x1b[0m', '[Startup] Cloudinary configuration validated successfully.');
}

// Connect to MongoDB and Auto-Seed if empty
const initializeDatabase = async () => {
  await connectDB();
  await seedIfEmpty();

  // One-time database update for order refund wallet credit
  try {
    const orderId = '6a4a9814016562100620e755';
    const order = await Order.findById(orderId);
    if (order) {
      const User = (await import('./models/User.js')).default;
      const student = await User.findById(order.user);
      if (student) {
        const WalletTransaction = (await import('./models/WalletTransaction.js')).default;
        const orderNum = order._id.toString().substring(12).toUpperCase();
        const existingTx = await WalletTransaction.findOne({
          user: order.user,
          type: 'refund',
          description: new RegExp(orderNum, 'i')
        });

        if (!existingTx) {
          const refundAmt = 45;
          student.walletBalance = (student.walletBalance || 0) + refundAmt;
          await student.save();

          const walletTx = new WalletTransaction({
            user: order.user,
            type: 'refund',
            amount: refundAmt,
            description: `Refund for Order #${orderNum} (Processed for out-of-stock)`
          });
          await walletTx.save();
          console.log(`[Startup Task] Successfully credited ₹${refundAmt} refund to student ${student.email}`);
        } else {
          console.log(`[Startup Task] Refund already credited for Order #${orderNum}`);
        }
      }
    }
  } catch (err) {
    console.error('[Startup Task Error] Failed to process startup refund task:', err);
  }
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
      imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
      connectSrc: ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// Middlewares
const allowedOrigins = [
  'http://localhost:4173',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://hostelkart-backend.onrender.com',
  'https://hostelkart.online',
  'https://www.hostelkart.online'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.includes('vercel.app')) {
      callback(null, true);
    } else {
      callback(null, false);
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

// Routes mount
app.use('/api/health', healthRoutes);
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

// Root route
app.get('/', (req, res) => {
  res.send('HostelKart API is running...');
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

import { createServer } from 'http';
import { Server } from 'socket.io';

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

io.on('connection', (socket) => {
  console.log("Client Connected", socket.id);

  // Students join this room to track an order
  socket.on('join_order_track', ({ orderId }) => {
    socket.join(`order_${orderId}`);
    console.log("Join Order", orderId);
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

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
