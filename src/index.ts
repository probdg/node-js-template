import { fileURLToPath } from 'node:url';

import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { config } from '../config/index.js';

import authRouter from './api/auth.js';
import { healthRouter } from './api/health.js';
import { postsRouter } from './api/posts.js';
import { uploadsRouter } from './api/uploads.js';
import { usersRouter } from './api/users.js';
import { activityLogger } from './middleware/activity-logger.js';
import { ddosDetector } from './middleware/ddos-detector.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { databaseService } from './services/database.js';
import { kafkaService } from './services/kafka.js';
import { logger } from './services/logger.js';
import { minioService } from './services/minio.js';
import { redisService } from './services/redis.js';
import { vaultService } from './services/vault.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// DDoS detection and logging
app.use(ddosDetector);

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Activity logging
app.use(activityLogger);

// API Routes
app.use(`/api/${config.apiVersion}/health`, healthRouter);
app.use(`/api/${config.apiVersion}/auth`, authRouter);
app.use(`/api/${config.apiVersion}/users`, usersRouter);
app.use(`/api/${config.apiVersion}/posts`, postsRouter);
app.use(`/api/${config.apiVersion}/uploads`, uploadsRouter);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Initialize services
async function initializeServices(): Promise<void> {
  const services = [
    {
      name: 'Database',
      enabled: config.database.enabled,
      connect: () => databaseService.connect(),
    },
    { name: 'Redis', enabled: config.redis.enabled, connect: () => redisService.connect() },
    { name: 'Kafka', enabled: config.kafka.enabled, connect: () => kafkaService.connect() },
    { name: 'MinIO', enabled: config.minio.enabled, connect: () => minioService.connect() },
    { name: 'Vault', enabled: config.vault.enabled, connect: () => vaultService.connect() },
  ];

  const results = await Promise.allSettled(
    services
      .filter((service) => service.enabled)
      .map(async (service) => {
        try {
          await service.connect();
          return { service: service.name, success: true };
        } catch (error) {
          logger.warn(`${service.name} not available, continuing without it`, { error });
          return { service: service.name, success: false, error };
        }
      })
  );

  const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
  const total = services.filter((s) => s.enabled).length;

  logger.info(`Services initialized: ${successful}/${total} successful`);
}

// Cleanup services
async function cleanupServices(): Promise<void> {
  const services = [
    {
      name: 'Database',
      enabled: config.database.enabled,
      disconnect: () => databaseService.disconnect(),
    },
    { name: 'Redis', enabled: config.redis.enabled, disconnect: () => redisService.disconnect() },
    { name: 'Kafka', enabled: config.kafka.enabled, disconnect: () => kafkaService.disconnect() },
    { name: 'MinIO', enabled: config.minio.enabled, disconnect: () => minioService.disconnect() },
    { name: 'Vault', enabled: config.vault.enabled, disconnect: () => vaultService.disconnect() },
  ];

  await Promise.allSettled(
    services
      .filter((service) => service.enabled)
      .map(async (service) => {
        try {
          await service.disconnect();
        } catch (error) {
          logger.error(`Failed to cleanup ${service.name}:`, error);
        }
      })
  );

  logger.info('All services cleaned up');
}

// Graceful shutdown
function setupGracefulShutdown(): void {
  const signals = ['SIGTERM', 'SIGINT'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('Server closed');
        await cleanupServices();
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 30000);
    });
  });
}

// Start server
let server: ReturnType<typeof app.listen>;

async function startServer(): Promise<void> {
  try {
    await initializeServices();

    server = app.listen(config.port, config.host, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
      logger.info(`API Version: ${config.apiVersion}`);
    });

    setupGracefulShutdown();
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection:', { reason, promise });
  process.exit(1);
});

// Start the application
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  startServer().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { app, startServer };
