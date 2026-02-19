import type { Request, Response } from 'express';
import { Router } from 'express';
import { ZodError } from 'zod';

import { activityLogger } from '@/middleware/activity-logger';
import type { AuthRequest } from '@/middleware/authorization';
import { authenticateToken } from '@/middleware/authorization';
import { authService } from '@/services/auth';
import { logger } from '@/services/logger';
import { userService } from '@/services/user';
import { loginSchema, createUserSchema } from '@/utils/schemas';

const router = Router();

/**
 * POST /auth/register
 * Register a new user
 */
router.post('/register', activityLogger, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = createUserSchema.parse(req.body);

    // Register user
    const result = await authService.register(
      validatedData.email,
      validatedData.username,
      validatedData.password,
      validatedData.role
    );

    if (!result) {
      res.status(400).json({
        success: false,
        error: 'Registration failed. User may already exist.',
      });
      return;
    }

    // Log registration activity
    logger.info('User registered', {
      userId: result.user.id,
      email: result.user.email,
      username: result.user.username,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration',
    });
  }
});

/**
 * POST /auth/login
 * Login with email and password
 */
router.post('/login', activityLogger, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    // Login user
    const result = await authService.login(validatedData.email, validatedData.password);

    if (!result) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    // Log login activity
    logger.info('User logged in', {
      userId: result.user.id,
      email: result.user.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login',
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', activityLogger, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token is required',
      });
      return;
    }

    // Refresh tokens
    const tokens = await authService.refreshAccessToken(refreshToken);

    if (!tokens) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during token refresh',
    });
  }
});

/**
 * POST /auth/logout
 * Logout user (revoke refresh token)
 */
router.post(
  '/logout',
  activityLogger,
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
        });
        return;
      }

      // Logout user
      await authService.logout(req.user.userId, refreshToken);

      // Log logout activity
      logger.info('User logged out', {
        userId: req.user.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during logout',
      });
    }
  }
);

/**
 * POST /auth/logout-all
 * Logout from all devices (revoke all refresh tokens)
 */
router.post(
  '/logout-all',
  activityLogger,
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // Logout from all devices
      await authService.logoutAll(req.user.userId);

      // Log logout all activity
      logger.info('User logged out from all devices', {
        userId: req.user.userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices successfully',
      });
    } catch (error) {
      logger.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during logout all',
      });
    }
  }
);

/**
 * GET /auth/me
 * Get current user information
 */
router.get('/me', activityLogger, authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    // Get user from database
    const user = await userService.getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
