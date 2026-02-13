import rateLimit, { type Options } from 'express-rate-limit';

import { logger } from '@/services/logger';

/**
 * Rate limiter configurations for different service endpoints
 */
export const rateLimiterConfig = {
  // General API endpoints
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
  },
  // Authentication endpoints (more strict)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login attempts per windowMs
    message: 'Too many authentication attempts, please try again later.',
  },
  // Write operations (create, update, delete)
  write: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 write operations per windowMs
    message: 'Too many write operations, please try again later.',
  },
  // Read operations (more lenient)
  read: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each IP to 200 read operations per windowMs
    message: 'Too many read requests, please try again later.',
  },
  // File upload operations (very strict)
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 uploads per hour
    message: 'Too many file uploads, please try again later.',
  },
};

/**
 * Create a rate limiter with logging
 */
function createRateLimiter(options: Partial<Options>) {
  return rateLimit({
    ...options,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.url,
        method: req.method,
        userAgent: req.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });

      res.status(429).json({
        status: 'error',
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message || 'Too many requests, please try again later.',
      });
    },
  });
}

/**
 * Rate limiters for different service types
 */
export const rateLimiters = {
  /**
   * General rate limiter for standard API endpoints
   */
  general: createRateLimiter(rateLimiterConfig.general),

  /**
   * Strict rate limiter for authentication endpoints
   */
  auth: createRateLimiter(rateLimiterConfig.auth),

  /**
   * Rate limiter for write operations (POST, PUT, PATCH, DELETE)
   */
  write: createRateLimiter(rateLimiterConfig.write),

  /**
   * Lenient rate limiter for read operations (GET)
   */
  read: createRateLimiter(rateLimiterConfig.read),

  /**
   * Very strict rate limiter for file upload operations
   */
  upload: createRateLimiter(rateLimiterConfig.upload),

  /**
   * Create a custom rate limiter with specific options
   */
  custom: (options: Partial<Options>) => createRateLimiter(options),
};
