import express from 'express';
import type { Response } from 'express';

import { HTTP_STATUS } from '@/constants';
import type {
  AuthRequest} from '@/middleware/authorization';
import {
  authenticateToken,
  requirePermission,
  requireRole,
  requireOwnershipOrAdmin,
} from '@/middleware/authorization';
import { asyncHandler } from '@/middleware/error';
import { rateLimiters } from '@/middleware/rate-limiter';
import { validateBody, validateParams, validateQuery } from '@/middleware/validation';
import { userService } from '@/services/user';
import {
  createApiResponse,
  createErrorResponse,
  createPaginatedResponse,
  parsePaginationParams,
  calculatePaginationMeta,
} from '@/utils/response';
import {
  createUserSchema,
  updateUserSchema,
  idParamSchema,
  paginationSchema,
} from '@/utils/schemas';

const router = express.Router();

/**
 * POST /users
 * Create a new user (requires admin role)
 */
router.post(
  '/',
  rateLimiters.write,
  authenticateToken,
  requireRole('admin'),
  validateBody(createUserSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { email, username } = req.body;

    // Check if user already exists
    const emailExists = await userService.userExistsByEmail(email);
    if (emailExists) {
      res
        .status(HTTP_STATUS.CONFLICT)
        .json(createErrorResponse('USER_EXISTS', 'User with this email already exists'));
      return;
    }

    const usernameExists = await userService.userExistsByUsername(username);
    if (usernameExists) {
      res
        .status(HTTP_STATUS.CONFLICT)
        .json(createErrorResponse('USER_EXISTS', 'User with this username already exists'));
      return;
    }

    // Create user
    const user = await userService.createUser(req.body);

    res.status(HTTP_STATUS.CREATED).json(createApiResponse(user));
  })
);

/**
 * GET /users
 * Get all users with pagination (requires authentication)
 */
router.get(
  '/',
  rateLimiters.read,
  authenticateToken,
  requirePermission('user:list'),
  validateQuery(paginationSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page, limit } = parsePaginationParams(req.query);

    const { users, total } = await userService.getAllUsers(page, limit);
    const pagination = calculatePaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(createPaginatedResponse(users, pagination));
  })
);

/**
 * GET /users/:id
 * Get user by ID (requires authentication)
 */
router.get(
  '/:id',
  rateLimiters.read,
  authenticateToken,
  requirePermission('user:read'),
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };

    const user = await userService.getUserById(id);

    if (!user) {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(createErrorResponse('USER_NOT_FOUND', 'User not found'));
      return;
    }

    res.status(HTTP_STATUS.OK).json(createApiResponse(user));
  })
);

/**
 * PUT /users/:id
 * Update user by ID (requires authentication and ownership or admin)
 */
router.put(
  '/:id',
  rateLimiters.write,
  authenticateToken,
  requireOwnershipOrAdmin((req) => req.params?.id),
  validateParams(idParamSchema),
  validateBody(updateUserSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };

    // Check if user exists
    const existingUser = await userService.getUserById(id);
    if (!existingUser) {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(createErrorResponse('USER_NOT_FOUND', 'User not found'));
      return;
    }

    // Check if email or username already taken by another user
    if (req.body.email && req.body.email !== existingUser.email) {
      const emailExists = await userService.userExistsByEmail(req.body.email);
      if (emailExists) {
        res
          .status(HTTP_STATUS.CONFLICT)
          .json(createErrorResponse('EMAIL_TAKEN', 'Email is already taken by another user'));
        return;
      }
    }

    if (req.body.username && req.body.username !== existingUser.username) {
      const usernameExists = await userService.userExistsByUsername(req.body.username);
      if (usernameExists) {
        res
          .status(HTTP_STATUS.CONFLICT)
          .json(createErrorResponse('USERNAME_TAKEN', 'Username is already taken by another user'));
        return;
      }
    }

    const user = await userService.updateUser(id, req.body);

    res.status(HTTP_STATUS.OK).json(createApiResponse(user));
  })
);

/**
 * DELETE /users/:id
 * Delete user by ID (requires admin role)
 */
router.delete(
  '/:id',
  rateLimiters.write,
  authenticateToken,
  requireRole('admin'),
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };

    const deleted = await userService.deleteUser(id);

    if (!deleted) {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(createErrorResponse('USER_NOT_FOUND', 'User not found'));
      return;
    }

    res.status(HTTP_STATUS.OK).json(
      createApiResponse({
        message: 'User deleted successfully',
        id,
      })
    );
  })
);

export { router as usersRouter };
