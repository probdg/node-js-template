import type { Request, Response, NextFunction } from 'express';

import { logger } from '@/services/logger';

/**
 * Activity logging middleware
 * Logs detailed information about requests and responses
 */
export function activityLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
    timestamp: new Date().toISOString(),
  });

  // Capture the original end method
  const originalEnd = res.end;

  // Override res.end to log response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  res.end = function (chunk?: any, encodingOrCallback?: any, callback?: any): Response {
    const duration = Date.now() - startTime;

    // Log response details
    logger.info('Outgoing response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      contentLength: res.get('content-length'),
      timestamp: new Date().toISOString(),
    });

    // Log activity based on status code
    if (res.statusCode >= 400) {
      logger.warn('Request completed with error status', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      });
    }

    // Call the original end method
    return originalEnd.call(this, chunk, encodingOrCallback, callback);
  };

  next();
}
