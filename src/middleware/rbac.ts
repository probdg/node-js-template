import type { Request, Response, NextFunction } from 'express';

import type { AuthRequest } from './auth';

import { USER_ROLES, ROLE_PERMISSIONS, HTTP_STATUS } from '@/constants';
import type { UserRole, Permission } from '@/types';
import { createErrorResponse } from '@/utils/response';

/**
 * Check if user has required role
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;

    if (!user) {
      res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(createErrorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    if (!roles.includes(user.role)) {
      res
        .status(HTTP_STATUS.FORBIDDEN)
        .json(
          createErrorResponse('FORBIDDEN', 'You do not have permission to access this resource')
        );
      return;
    }

    next();
  };
}

/**
 * Check if user has required permission
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthRequest).user;

    if (!user) {
      res
        .status(HTTP_STATUS.UNAUTHORIZED)
        .json(createErrorResponse('UNAUTHORIZED', 'Authentication required'));
      return;
    }

    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    const hasPermission = permissions.every((permission) =>
      (userPermissions as readonly string[]).includes(permission)
    );

    if (!hasPermission) {
      res
        .status(HTTP_STATUS.FORBIDDEN)
        .json(createErrorResponse('FORBIDDEN', 'You do not have the required permissions'));
      return;
    }

    next();
  };
}

/**
 * Check if user is admin
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  return requireRole(USER_ROLES.ADMIN)(req, res, next);
}

/**
 * Get user permissions based on role
 */
export function getUserPermissions(role: UserRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if role has permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return (permissions as readonly string[]).includes(permission);
}
