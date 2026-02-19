import type { Request, Response, NextFunction } from 'express';

import { logger } from '../services/logger';
import type { UserRole } from '../types';

/**
 * Role-based permissions configuration
 * Maps each role to their allowed permissions
 */
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'user:create',
    'user:read',
    'user:update',
    'user:delete',
    'user:list',
    'file:upload',
    'file:read',
    'file:delete',
    'post:create',
    'post:read',
    'post:update',
    'post:delete',
    'post:list',
    'admin:access',
    'role:manage',
    'permission:manage',
  ],
  user: [
    'user:read',
    'user:update',
    'file:upload',
    'file:read',
    'post:create',
    'post:read',
    'post:update',
    'post:delete',
    'post:list',
  ],
  guest: ['user:read', 'post:read', 'post:list'],
};

/**
 * Extended Request interface with user information
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

/**
 * Get all permissions for a given role
 */
export const getPermissionsForRole = (role: UserRole): string[] => {
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if a role has a specific permission
 */
export const hasPermission = (role: UserRole, permission: string): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
};

/**
 * Middleware to require specific roles
 * User must have at least one of the specified roles
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized - No user information found',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
      });

      res.status(403).json({
        success: false,
        error: `Forbidden - Required role(s): ${allowedRoles.join(', ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to require specific permissions
 * User must have ALL of the specified permissions
 */
export const requirePermission = (...permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized - No user information found',
      });
      return;
    }

    const userPermissions = getPermissionsForRole(req.user.role);
    const hasAllPermissions = permissions.every((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      logger.warn('Access denied - insufficient permissions', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredPermissions: permissions,
        userPermissions,
      });

      res.status(403).json({
        success: false,
        error: `Forbidden - Required permission(s): ${permissions.join(', ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to require ANY of the specified permissions
 * User must have at least one of the specified permissions
 */
export const requireAnyPermission = (...permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized - No user information found',
      });
      return;
    }

    const userPermissions = getPermissionsForRole(req.user.role);
    const hasAnyPermission = permissions.some((permission) => userPermissions.includes(permission));

    if (!hasAnyPermission) {
      logger.warn('Access denied - insufficient permissions', {
        userId: req.user.userId,
        userRole: req.user.role,
        requiredAnyOfPermissions: permissions,
        userPermissions,
      });

      res.status(403).json({
        success: false,
        error: `Forbidden - Requires at least one of: ${permissions.join(', ')}`,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to require admin role
 * Shortcut for requireRole('admin')
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to check if user owns the resource or is an admin
 * Useful for routes where users can only modify their own resources
 */
export const requireOwnershipOrAdmin = (
  getResourceOwnerId: (req: Request) => string | undefined
) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized - No user information found',
      });
      return;
    }

    // Admins can access any resource
    if (req.user.role === 'admin') {
      next();
      return;
    }

    const resourceOwnerId = getResourceOwnerId(req);

    if (!resourceOwnerId) {
      res.status(400).json({
        success: false,
        error: 'Bad Request - Resource owner ID not found',
      });
      return;
    }

    if (req.user.userId !== resourceOwnerId) {
      logger.warn('Access denied - resource ownership required', {
        userId: req.user.userId,
        resourceOwnerId,
      });

      res.status(403).json({
        success: false,
        error: 'Forbidden - You can only access your own resources',
      });
      return;
    }

    next();
  };
};

/**
 * Get current user's permissions
 */
export const getCurrentUserPermissions = (req: AuthRequest): string[] => {
  if (!req.user) {
    return [];
  }
  return getPermissionsForRole(req.user.role);
};

/**
 * Check if current user has a specific permission
 */
export const currentUserHasPermission = (req: AuthRequest, permission: string): boolean => {
  if (!req.user) {
    return false;
  }
  return hasPermission(req.user.role, permission);
};

// Export UserRole type for convenience
export type { UserRole };

// Re-export authenticateToken for convenience
export { authenticateToken, optionalAuth } from './authentication.js';
