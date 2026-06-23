import path from 'path';
import fs from 'fs';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import { seedIfEmpty } from './seed/seedDataInline.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
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
import paymentRoutes from './routes/paymentRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import recommendationRoutes from './routes/recommendationRoutes.js';

// Load environmental variables
dotenv.config();

// Connect to MongoDB and Auto-Seed if empty
const initializeDatabase = async () => {
  await connectDB();
  await seedIfEmpty();
};
initializeDatabase();

const app = express();

// Middlewares
app.use(cors({
  origin: ['http://localhost:4173', 'http://localhost:5173', 'http://localhost:3000', 'https://hostelkart-backend.onrender.com'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
const __dirname = path.resolve();
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate Limiting Security Hardening for APIs
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Routes mount
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
app.use('/api/payments', paymentRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api', paymentRoutes);

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

// Set io globally on Express app so controllers can access it
app.set('io', io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
