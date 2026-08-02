import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export const connectDB = async (uri?: string): Promise<typeof mongoose> => {
  const mongoUri = uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/bharatassist';
  try {
    const conn = await mongoose.connect(mongoUri);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error({ error }, 'MongoDB connection error');
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
};
