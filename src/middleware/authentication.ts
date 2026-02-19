import type { Response, NextFunction } from 'express';

import type { AuthRequest } from '@/middleware/authorization';
import { authService } from '@/services/auth';
import { logger } from '@/services/logger';
import type { UserRole } from '@/types';

/**
 * Authenticate JWT token middleware
 * Verifies the access token and attaches user information to the request
 */
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized - No token provided',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = authService.verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid or expired token',
      });
      return;
    }

    // Attach user information to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as UserRole,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user information if token is valid, but doesn't require it
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const payload = authService.verifyAccessToken(token);

    if (payload) {
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role as UserRole,
      };
    }

    next();
  } catch (error) {
    // Log but don't fail - this is optional auth
    logger.warn('Optional authentication failed (continuing anyway):', error);
    next();
  }
};
