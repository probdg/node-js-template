import { z } from 'zod';

import { USER_ROLES } from '@/constants';

// User schemas
export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z
    .enum([USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.GUEST])
    .optional()
    .default(USER_ROLES.USER),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    )
    .optional(),
  role: z.enum([USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.GUEST]).optional(),
  isActive: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// ID parameter schema
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// File upload schema
export const fileUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimetype: z.string().min(1, 'MIME type is required'),
});

// Post schemas
export const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500, 'Excerpt must not exceed 500 characters').nullish(),
  status: z.enum(['publish', 'draft', 'private', 'pending', 'future']).default('draft'),
  type: z.enum(['post', 'page', 'attachment']).default('post'),
  authorId: z.string().uuid('Invalid author ID format'),
  slug: z.string().max(200, 'Slug must not exceed 200 characters').optional(),
  commentStatus: z.enum(['open', 'closed']).default('closed'),
  pingStatus: z.enum(['open', 'closed']).default('closed'),
  featuredMedia: z.string().uuid('Invalid featured media ID format').nullish(),
  parentId: z.string().uuid('Invalid parent ID format').nullish(),
  menuOrder: z.coerce.number().int().default(0),
  publishedAt: z.coerce.date().nullish(),
});

export const updatePostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must not exceed 200 characters').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  excerpt: z.string().max(500, 'Excerpt must not exceed 500 characters').nullish(),
  status: z.enum(['publish', 'draft', 'private', 'pending', 'future']).optional(),
  type: z.enum(['post', 'page', 'attachment']).optional(),
  slug: z.string().max(200, 'Slug must not exceed 200 characters').optional(),
  commentStatus: z.enum(['open', 'closed']).optional(),
  pingStatus: z.enum(['open', 'closed']).optional(),
  featuredMedia: z.string().uuid('Invalid featured media ID format').nullish(),
  parentId: z.string().uuid('Invalid parent ID format').nullish(),
  menuOrder: z.coerce.number().int().optional(),
  publishedAt: z.coerce.date().nullish(),
});

export const postQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.enum(['publish', 'draft', 'private', 'pending', 'future']).optional(),
  type: z.enum(['post', 'page', 'attachment']).optional(),
  authorId: z.string().uuid('Invalid author ID format').optional(),
  search: z.string().optional(),
  orderBy: z.enum(['date', 'title', 'modified', 'views', 'comment_count']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});
