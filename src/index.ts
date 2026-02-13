import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { config } from '../config/index.js';

import { healthRouter } from './api/health.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { databaseService } from './services/database.js';
import { kafkaService } from './services/kafka.js';
import { logger } from './services/logger.js';
import { minioService } from './services/minio.js';
import { redisService } from './services/redis.js';

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

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// API Routes
app.use(`/api/${config.apiVersion}/health`, healthRouter);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Initialize services
async function initializeServices(): Promise<void> {
  try {
    await databaseService.connect();
    await redisService.connect();
    await kafkaService.connect();
    await minioService.connect();
    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    throw error;
  }
}

// Cleanup services
async function cleanupServices(): Promise<void> {
  try {
    await databaseService.disconnect();
    await redisService.disconnect();
    await kafkaService.disconnect();
    await minioService.disconnect();
    logger.info('All services cleaned up successfully');
  } catch (error) {
    logger.error('Failed to cleanup services:', error);
  }
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

    server = app.listen(config.port, () => {
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
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { app, startServer };
