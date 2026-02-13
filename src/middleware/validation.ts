import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

import { HTTP_STATUS } from '@/constants';
import { createErrorResponse } from '@/utils/response';

/**
 * Validate request body using Zod schema
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      const zodError = error as { errors?: Array<{ path: string[]; message: string }> };
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse('VALIDATION_ERROR', 'Request validation failed', {
          errors: zodError.errors,
        })
      );
    }
  };
}

/**
 * Validate request query parameters using Zod schema
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      const zodError = error as { errors?: Array<{ path: string[]; message: string }> };
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse('VALIDATION_ERROR', 'Query validation failed', {
          errors: zodError.errors,
        })
      );
    }
  };
}

/**
 * Validate request params using Zod schema
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error) {
      const zodError = error as { errors?: Array<{ path: string[]; message: string }> };
      res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse('VALIDATION_ERROR', 'Params validation failed', {
          errors: zodError.errors,
        })
      );
    }
  };
}
