export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
} as const;

export const PERMISSIONS = {
  // User permissions
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_LIST: 'user:list',

  // File permissions
  FILE_UPLOAD: 'file:upload',
  FILE_READ: 'file:read',
  FILE_DELETE: 'file:delete',

  // Admin permissions
  ADMIN_ACCESS: 'admin:access',
  ROLE_MANAGE: 'role:manage',
  PERMISSION_MANAGE: 'permission:manage',
} as const;

export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: Object.values(PERMISSIONS),
  [USER_ROLES.USER]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.FILE_UPLOAD,
    PERMISSIONS.FILE_READ,
  ],
  [USER_ROLES.GUEST]: [PERMISSIONS.USER_READ],
} as const;

export const CACHE_KEYS = {
  USER: (id: string) => `user:${id}`,
  USERS_LIST: 'users:list',
  SESSION: (id: string) => `session:${id}`,
} as const;

export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  DAY: 86400, // 24 hours
} as const;

export const KAFKA_TOPICS = {
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  FILE_UPLOADED: 'file.uploaded',
} as const;

export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
} as const;
