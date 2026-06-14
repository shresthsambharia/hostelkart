import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod = null;

const connectDB = async () => {
  try {
    console.log(`Connecting to local MongoDB: ${process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart'}`);
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hostelkart', {
      serverSelectionTimeoutMS: 2000 // 2 seconds timeout to trigger fallback quickly
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`Local MongoDB connection failed: ${error.message}`);
    console.log('Starting in-memory MongoDB Server fallback...');
    try {
      // Create an instance of MongoMemoryServer
      mongod = await MongoMemoryServer.create({
        instance: {
          dbName: 'hostelkart'
        }
      });
      const uri = mongod.getUri();
      console.log(`In-Memory MongoDB Server started at: ${uri}`);
      
      // Override process.env.MONGO_URI for downstream logic
      process.env.MONGO_URI = uri;

      const conn = await mongoose.connect(uri);
      console.log(`MongoDB Connected (In-Memory Fallback): ${conn.connection.host}`);
    } catch (memError) {
      console.error(`Error starting in-memory database: ${memError.message}`);
      process.exit(1);
    }
  }
};

export default connectDB;
