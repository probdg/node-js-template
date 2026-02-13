import { createClient } from 'redis';
import type { RedisClientType } from 'redis';

import { config } from '../../config/index.js';

import { logger } from './logger.js';

class RedisService {
  private client: RedisClientType | null = null;

  async connect(): Promise<void> {
    try {
      this.client = createClient({
        socket: {
          host: config.redis.host,
          port: config.redis.port,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              return new Error('Redis reconnection failed');
            }
            return Math.min(retries * 100, 3000);
          },
        },
        password: config.redis.password || undefined,
        database: config.redis.db,
      });

      this.client.on('error', (err) => {
        logger.error('Redis error:', err);
      });

      this.client.on('connect', () => {
        logger.info('Redis connecting...');
      });

      this.client.on('ready', () => {
        logger.info('Redis connected successfully');
      });

      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      logger.info('Redis disconnected');
    }
  }

  getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Redis not connected');
    }
    return this.client;
  }

  async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const client = this.getClient();
    const options = ttl ? { EX: ttl } : undefined;
    await client.set(key, value, options);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value ? JSON.parse(value) : null;
  }

  async setJson<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  async del(key: string): Promise<void> {
    const client = this.getClient();
    await client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    const result = await client.exists(key);
    return result === 1;
  }

  async expire(key: string, ttl: number): Promise<void> {
    const client = this.getClient();
    await client.expire(key, ttl);
  }

  async keys(pattern: string): Promise<string[]> {
    const client = this.getClient();
    return await client.keys(pattern);
  }

  async flushAll(): Promise<void> {
    const client = this.getClient();
    await client.flushAll();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

export const redisService = new RedisService();
