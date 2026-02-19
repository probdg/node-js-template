import express from 'express';
import type { Request, Response } from 'express';

import { HTTP_STATUS } from '@/constants';
import type {
  AuthRequest} from '@/middleware/authorization';
import {
  authenticateToken,
  requirePermission,
  optionalAuth
} from '@/middleware/authorization';
import { asyncHandler } from '@/middleware/error';
import { rateLimiters } from '@/middleware/rate-limiter';
import { validateBody, validateParams, validateQuery } from '@/middleware/validation';
import { postService } from '@/services/post';
import type { PostQueryParams, PostStatus, PostType } from '@/types';
import {
  createApiResponse,
  createErrorResponse,
  createPaginatedResponse,
  parsePaginationParams,
  calculatePaginationMeta,
} from '@/utils/response';
import {
  createPostSchema,
  updatePostSchema,
  idParamSchema,
  postQuerySchema,
} from '@/utils/schemas';

const router = express.Router();

/**
 * POST /posts
 * Create a new post (requires authentication)
 */
router.post(
  '/',
  rateLimiters.write,
  authenticateToken,
  requirePermission('post:create'),
  validateBody(createPostSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { authorId } = req.body;

    // Check if author exists
    const authorExists = await postService.authorExists(authorId);
    if (!authorExists) {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(createErrorResponse('AUTHOR_NOT_FOUND', 'Author not found'));
      return;
    }

    // Create post
    const post = await postService.createPost(req.body);

    res.status(HTTP_STATUS.CREATED).json(createApiResponse(post));
  })
);

/**
 * GET /posts
 * Get all posts with filtering and pagination (public or authenticated)
 */
router.get(
  '/',
  rateLimiters.read,
  optionalAuth,
  validateQuery(postQuerySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, type, authorId, search, orderBy, order } = req.query as {
      status?: PostStatus;
      type?: PostType;
      authorId?: string;
      search?: string;
      orderBy?: PostQueryParams['orderBy'];
      order?: PostQueryParams['order'];
    };

    const pagination = parsePaginationParams(req.query);
    const { posts, total } = await postService.getPosts({
      page: pagination.page,
      limit: pagination.limit,
      status,
      type,
      authorId,
      search,
      orderBy,
      order,
    });

    const meta = calculatePaginationMeta(total, pagination.page, pagination.limit);

    res.status(HTTP_STATUS.OK).json(createPaginatedResponse(posts, meta));
  })
);

/**
 * GET /posts/:id
 * Get post by ID (public or authenticated)
 */
router.get(
  '/:id',
  rateLimiters.read,
  optionalAuth,
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const postId = parseInt(id, 10);

    if (isNaN(postId)) {
      res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(createErrorResponse('INVALID_ID', 'Invalid post ID'));
      return;
    }

    const post = await postService.getPostById(postId);

    if (!post) {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(createErrorResponse('POST_NOT_FOUND', 'Post not found'));
      return;
    }

    res.status(HTTP_STATUS.OK).json(createApiResponse(post));
  })
);

/**
 * GET /posts/slug/:slug
 * Get post by slug (public)
 */
router.get(
  '/slug/:slug',
  rateLimiters.read,
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params as { slug: string };

    const post = await postService.getPostBySlug(slug);

    if (!post) {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(createErrorResponse('POST_NOT_FOUND', 'Post not found'));
      return;
    }

    res.status(HTTP_STATUS.OK).json(createApiResponse(post));
  })
);

/**
 * PUT /posts/:id
 * Update post by ID (requires authentication)
 */
router.put(
  '/:id',
  rateLimiters.write,
  authenticateToken,
  requirePermission('post:update'),
  validateParams(idParamSchema),
  validateBody(updatePostSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const postId = parseInt(id, 10);

    if (isNaN(postId)) {
      res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(createErrorResponse('INVALID_ID', 'Invalid post ID'));
      return;
    }

    // Check if post exists
    const existingPost = await postService.getPostById(postId);
    if (!existingPost) {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(createErrorResponse('POST_NOT_FOUND', 'Post not found'));
      return;
    }

    const post = await postService.updatePost(postId, req.body);

    if (!post) {
      res
        .status(HTTP_STATUS.INTERNAL_SERVER_ERROR)
        .json(createErrorResponse('UPDATE_FAILED', 'Failed to update post'));
      return;
    }

    res.status(HTTP_STATUS.OK).json(createApiResponse(post));
  })
);

/**
 * DELETE /posts/:id
 * Delete post by ID (requires authentication)
 */
router.delete(
  '/:id',
  rateLimiters.write,
  authenticateToken,
  requirePermission('post:delete'),
  validateParams(idParamSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const postId = parseInt(id, 10);

    if (isNaN(postId)) {
      res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(createErrorResponse('INVALID_ID', 'Invalid post ID'));
      return;
    }

    const deleted = await postService.deletePost(postId);

    if (!deleted) {
      res
        .status(HTTP_STATUS.NOT_FOUND)
        .json(createErrorResponse('POST_NOT_FOUND', 'Post not found'));
      return;
    }

    res.status(HTTP_STATUS.OK).json(
      createApiResponse({
        message: 'Post deleted successfully',
        id: postId,
      })
    );
  })
);

/**
 * GET /posts/author/:authorId
 * Get posts by author
 */
router.get(
  '/author/:authorId',
  rateLimiters.read,
  validateParams(idParamSchema),
  validateQuery(postQuerySchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const { authorId } = req.params as { authorId: string };
    const { page, limit } = parsePaginationParams(req.query);

    const { posts, total } = await postService.getPostsByAuthor(authorId, page, limit);
    const meta = calculatePaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(createPaginatedResponse(posts, meta));
  })
);

/**
 * GET /posts/published
 * Get published posts
 */
router.get(
  '/published',
  rateLimiters.read,
  validateQuery(postQuerySchema.partial()),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = parsePaginationParams(req.query);

    const { posts, total } = await postService.getPublishedPosts(page, limit);
    const meta = calculatePaginationMeta(total, page, limit);

    res.status(HTTP_STATUS.OK).json(createPaginatedResponse(posts, meta));
  })
);

export { router as postsRouter };
