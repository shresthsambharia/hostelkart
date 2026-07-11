import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    logger.error('DATABASE_CONNECT_FAILED', 'MONGO_URI is missing in environment variables');
    process.exit(1);
  }

  const options = {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    heartbeatFrequencyMS: 10000,
  };

  let attempt = 0;
  const maxAttempts = 5;

  while (attempt < maxAttempts) {
    try {
      logger.info('DATABASE_CONNECT_ATTEMPT', `Connecting to MongoDB (Attempt ${attempt + 1}/${maxAttempts})...`);
      const conn = await mongoose.connect(mongoUri, options);
      logger.info('DATABASE_CONNECTED', `MongoDB Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      attempt++;
      logger.error('DATABASE_CONNECT_ERROR', `MongoDB connection attempt ${attempt} failed: ${error.message}`, { error });
      
      if (attempt >= maxAttempts) {
        logger.error('DATABASE_CONNECT_ABORTED', 'Max MongoDB connection attempts reached. Exiting...');
        process.exit(1);
      }

      const delay = Math.pow(2, attempt) * 1000;
      logger.warn('DATABASE_CONNECT_RETRY', `Retrying connection in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

export default connectDB;