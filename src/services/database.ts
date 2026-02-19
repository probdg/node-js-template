import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { config } from '../../config/index.js';
import { PrismaClient } from '../../generated/prisma/client.js';

import { logger } from './logger.js';

class DatabaseService {
  private prisma: PrismaClient | null = null;
  private adapter: PrismaMariaDb | null = null;

  async connect(): Promise<void> {
    try {
      if (this.prisma) return;

      const db = config.database;

      logger.info(`Connecting to MySQL database at ${db.host}:${db.port}/${db.database}`);

      // Create Prisma MariaDB adapter
      this.adapter = new PrismaMariaDb({
        host: db.host,
        port: db.port,
        user: db.user,
        password: db.password,
        database: db.database,
        connectionLimit: db.max,
      });

      // Initialize Prisma Client with adapter
      this.prisma = new PrismaClient({ adapter: this.adapter });

      await this.prisma.$connect();

      logger.info('Database connected successfully via Prisma with MariaDB adapter');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.prisma) return;

    await this.prisma.$disconnect();
    this.prisma = null;
    this.adapter = null;

    logger.info('Database disconnected');
  }

  getClient(): PrismaClient {
    if (!this.prisma) {
      throw new Error('Database not connected');
    }
    return this.prisma;
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.prisma) return false;

      // Universal query (MySQL + PostgreSQL)
      await this.prisma.$queryRawUnsafe('SELECT 1');

      return true;
    } catch (error) {
      logger.error('Health check failed:', error);
      return false;
    }
  }
}

export const databaseService = new DatabaseService();
