import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { SchemeModel } from '../models/Scheme.js';
import { UserModel } from '../models/User.js';
import { CitizenProfileModel } from '../models/CitizenProfile.js';
import { logger } from '../utils/logger.js';
import { realSchemes } from './schemes.data.js';


export const seedDatabase = async () => {
  try {
    await connectDB();
    logger.info('Clearing existing database collections for seed...');
    await SchemeModel.deleteMany({});
    await UserModel.deleteMany({});
    await CitizenProfileModel.deleteMany({});

    logger.info('Inserting real government schemes...');
    const createdSchemes = await SchemeModel.insertMany(realSchemes);
    logger.info(`Inserted ${createdSchemes.length} schemes.`);

    logger.info('Creating test user & profile...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const testUser = await UserModel.create({
      phone: '9876543210',
      email: 'citizen@example.com',
      passwordHash,
      preferredLanguage: 'en',
      refreshTokenVersion: 0
    });

    const testProfile = await CitizenProfileModel.create({
      userId: testUser._id,
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      age: 20,
      gender: 'male',
      occupationCategory: 'student',
      incomeBand: '<2.5L',
      educationLevel: 'undergraduate',
      category: 'General',
      disabilityStatus: false
    });

    logger.info(`Seeded Test User ID: ${testUser._id} with Profile ID: ${testProfile._id}`);
    logger.info('Database seeding completed successfully!');
  } catch (error) {
    logger.error({ error }, 'Database seeding failed');
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

seedDatabase();
