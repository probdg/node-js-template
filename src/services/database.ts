import { PrismaClient } from '@prisma/client';

import { config } from '../../config/index.js';

import { logger } from './logger.js';

class DatabaseService {
  private prisma: PrismaClient | null = null;

  async connect(): Promise<void> {
    try {
      // Create Prisma Client with database URL from config
      const databaseUrl = config.database.type === 'mysql'
        ? `mysql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.database}`
        : `postgresql://${config.database.user}:${config.database.password}@${config.database.host}:${config.database.port}/${config.database.database}`;

      // Override the datasource URL with environment variable or direct URL
      process.env.DATABASE_URL = databaseUrl;

      this.prisma = new PrismaClient();

      // Test connection
      await this.prisma.$connect();

      logger.info('Database connected successfully via Prisma');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      logger.info('Database disconnected');
    }
  }

  getClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database not connected');
    }
    return this.prisma;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (this.prisma) {
        await this.prisma.$queryRaw`SELECT 1`;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const databaseService = new DatabaseService();
