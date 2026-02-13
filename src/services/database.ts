import pg from 'pg';
import { config } from '../../config/index.js';
import { logger } from './logger.js';

const { Pool } = pg;

class DatabaseService {
  private pool: pg.Pool | null = null;

  async connect(): Promise<void> {
    try {
      this.pool = new Pool({
        host: config.database.host,
        port: config.database.port,
        database: config.database.database,
        user: config.database.user,
        password: config.database.password,
        min: config.database.min,
        max: config.database.max,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      logger.info('Database disconnected');
    }
  }

  getPool(): pg.Pool {
    if (!this.pool) {
      throw new Error('Database not connected');
    }
    return this.pool;
  }

  async query<T = unknown>(
    text: string,
    params?: unknown[]
  ): Promise<pg.QueryResult<T>> {
    const pool = this.getPool();
    try {
      const start = Date.now();
      const result = await pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Executed query', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      logger.error('Query error:', { text, error });
      throw error;
    }
  }

  async transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1');
      return result.rowCount !== null && result.rowCount > 0;
    } catch {
      return false;
    }
  }
}

export const databaseService = new DatabaseService();
