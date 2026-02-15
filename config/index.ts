import dotenv from 'dotenv';

import type { DbConfig, RedisConfig, KafkaConfig, MinioConfig, VaultConfig } from '@/types';

// Load environment variables
dotenv.config();

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value || defaultValue || '';
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  return value ? value === 'true' : defaultValue;
}

export const config = {
  // Application
  env: getEnv('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 3000),
  apiVersion: getEnv('API_VERSION', 'v1'),

  // Database
  database: {
    host: getEnv('DB_HOST', 'localhost'),
    port: getEnvNumber('DB_PORT', 5432),
    database: getEnv('DB_NAME', 'nodeapp'),
    user: getEnv('DB_USER', 'postgres'),
    password: getEnv('DB_PASSWORD', 'postgres'),
    min: getEnvNumber('DB_POOL_MIN', 2),
    max: getEnvNumber('DB_POOL_MAX', 10),
  } as DbConfig,

  // Redis
  redis: {
    host: getEnv('REDIS_HOST', 'localhost'),
    port: getEnvNumber('REDIS_PORT', 6379),
    password: getEnv('REDIS_PASSWORD', ''),
    db: getEnvNumber('REDIS_DB', 0),
    ttl: getEnvNumber('REDIS_TTL', 3600),
  } as RedisConfig,

  // Kafka
  kafka: {
    brokers: getEnv('KAFKA_BROKERS', 'localhost:9092').split(','),
    clientId: getEnv('KAFKA_CLIENT_ID', 'node-app'),
    groupId: getEnv('KAFKA_GROUP_ID', 'node-app-group'),
  } as KafkaConfig,

  // MinIO
  minio: {
    endPoint: getEnv('MINIO_ENDPOINT', 'localhost'),
    port: getEnvNumber('MINIO_PORT', 9000),
    useSSL: getEnvBoolean('MINIO_USE_SSL', false),
    accessKey: getEnv('MINIO_ACCESS_KEY', 'minioadmin'),
    secretKey: getEnv('MINIO_SECRET_KEY', 'minioadmin'),
    bucket: getEnv('MINIO_BUCKET', 'uploads'),
  } as MinioConfig,

  // JWT
  jwt: {
    secret: getEnv('JWT_SECRET'),
    expiresIn: getEnv('JWT_EXPIRES_IN', '1d'),
    refreshSecret: getEnv('JWT_REFRESH_SECRET'),
    refreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    maxRequests: getEnvNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },

  // DDoS Detection
  ddos: {
    windowSeconds: getEnvNumber('DDOS_WINDOW_SECONDS', 60),
    requestThreshold: getEnvNumber('DDOS_REQUEST_THRESHOLD', 100),
    blockThreshold: getEnvNumber('DDOS_BLOCK_THRESHOLD', 200),
    blockDuration: getEnvNumber('DDOS_BLOCK_DURATION', 300), // 5 minutes
  },

  // Logging
  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
    file: getEnv('LOG_FILE', 'logs/app.log'),
  },

  // CORS
  cors: {
    origin: getEnv('CORS_ORIGIN', 'http://localhost:3000'),
  },

  // Vault
  vault: {
    encryptionKey: getEnv(
      'VAULT_ENCRYPTION_KEY',
      'default-test-key-32-chars-long-for-testing-only'
    ),
    algorithm: getEnv('VAULT_ALGORITHM', 'aes-256-gcm'),
  } as VaultConfig,

  // Helpers
  isDevelopment: () => config.env === 'development',
  isProduction: () => config.env === 'production',
  isTest: () => config.env === 'test',
};
