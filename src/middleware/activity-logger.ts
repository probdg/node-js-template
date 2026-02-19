import type { Request, Response, NextFunction } from 'express';

import { config } from '../../config/index.js';
import { logger } from '@/services/logger';

/**
 * Activity logging middleware
 * Logs detailed information about requests and responses
 * In development mode, only logs errors and slow requests
 */
export function activityLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const isDevelopment = config.env === 'development';

  // Only log incoming requests in production
  if (!isDevelopment) {
    logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type'],
      timestamp: new Date().toISOString(),
    });
  }

  // Capture the original end method
  const originalEnd = res.end;

  // Override res.end to log response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.end = function (chunk?: any, encodingOrCallback?: any, callback?: any): Response {
    const duration = Date.now() - startTime;
    const isSlow = duration > 1000; // Log slow requests (>1s)

    // Log response details based on environment and status
    if (res.statusCode >= 400 || isSlow) {
      const logLevel = res.statusCode >= 500 ? 'error' : 'warn';

      logger[logLevel]('Request completed', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        contentLength: res.get('content-length'),
        timestamp: new Date().toISOString(),
      });
    } else if (!isDevelopment) {
      logger.info('Outgoing response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        contentLength: res.get('content-length'),
        timestamp: new Date().toISOString(),
      });
    }

    // Call the original end method
    return originalEnd.call(this, chunk, encodingOrCallback, callback);
  };

  next();
}
