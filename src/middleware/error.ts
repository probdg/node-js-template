import type { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '@/utils/response';
import { HTTP_STATUS } from '@/constants';
import { logger } from '@/services/logger';

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
  });

  // Default error response
  const statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const response = createErrorResponse(
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred',
    {
      ...(process.env.NODE_ENV === 'development' && {
        message: error.message,
        stack: error.stack,
      }),
    }
  );

  res.status(statusCode).json(response);
}

/**
 * Handle 404 Not Found
 */
export function notFoundHandler(req: Request, res: Response): void {
  res
    .status(HTTP_STATUS.NOT_FOUND)
    .json(
      createErrorResponse('NOT_FOUND', `Route ${req.method} ${req.url} not found`)
    );
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
