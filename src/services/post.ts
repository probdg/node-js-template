import { databaseService } from './database.js';
import { logger } from './logger.js';

import type { CreatePostDto, Post, PostQueryParams, UpdatePostDto } from '@/types';

const prisma = () => databaseService.getClient();

class PostService {
  /**
   * Map Prisma Post model to domain Post object
   */
  private mapPrismaPostToPost(prismaPost: {
    id: number;
    uuid: string;
    post_title: string;
    post_content: string;
    post_excerpt: string | null;
    post_status: string;
    post_type: string;
    post_author: string;
    post_name: string;
    comment_status: string;
    ping_status: string;
    guid: string | null;
    post_parent: string | null;
    menu_order: number;
    comment_count: number;
    post_date: Date | null;
    created_at: Date;
    post_modified: Date;
  }): Post {
    return {
      id: prismaPost.id,
      uuid: prismaPost.uuid,
      title: prismaPost.post_title,
      content: prismaPost.post_content,
      excerpt: prismaPost.post_excerpt,
      status: prismaPost.post_status as Post['status'],
      type: prismaPost.post_type as Post['type'],
      authorId: prismaPost.post_author,
      slug: prismaPost.post_name,
      commentStatus: prismaPost.comment_status as Post['commentStatus'],
      pingStatus: prismaPost.ping_status as Post['pingStatus'],
      featuredMedia: prismaPost.guid,
      parentId: prismaPost.post_parent,
      menuOrder: prismaPost.menu_order,
      commentCount: prismaPost.comment_count,
      publishedAt: prismaPost.post_date,
      createdAt: prismaPost.created_at,
      updatedAt: prismaPost.post_modified,
    };
  }

  /**
   * Generate a unique slug from title
   */
  private async generateSlug(title: string, authorId: string): Promise<string> {
    const baseSlug = title
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, '-')
      .replaceAll(/(^-|-$)/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (await this.slugExists(slug, authorId)) {
      slug = `${baseSlug}-${counter++}`;
    }

    return slug;
  }

  /**
   * Check if slug exists for author
   */
  private async slugExists(slug: string, authorId: string): Promise<boolean> {
    try {
      const count = await prisma().post.count({
        where: {
          post_name: slug,
          post_author: authorId,
        },
      });
      return count > 0;
    } catch (error) {
      logger.error('Error checking slug existence:', error);
      throw error;
    }
  }

  /**
   * Create a new post
   */
  async createPost(postData: CreatePostDto): Promise<Post> {
    try {
      const slug = postData.slug || (await this.generateSlug(postData.title, postData.authorId));

      const post = await prisma().post.create({
        data: {
          post_title: postData.title,
          post_content: postData.content,
          post_excerpt: postData.excerpt,
          post_status: postData.status || 'draft',
          post_type: postData.type || 'post',
          post_author: postData.authorId,
          post_name: slug,
          comment_status: postData.commentStatus || 'closed',
          ping_status: postData.pingStatus || 'closed',
          guid: postData.featuredMedia,
          post_parent: postData.parentId,
          menu_order: postData.menuOrder || 0,
          post_date: postData.publishedAt,
        },
      });

      logger.info('Post created successfully', { postId: post.id });
      return this.mapPrismaPostToPost(post);
    } catch (error) {
      logger.error('Error creating post:', error);
      throw error;
    }
  }

  /**
   * Get post by ID
   */
  async getPostById(id: number): Promise<Post | null> {
    try {
      const post = await prisma().post.findUnique({
        where: { id },
      });

      return post ? this.mapPrismaPostToPost(post) : null;
    } catch (error) {
      logger.error('Error fetching post by ID:', error);
      throw error;
    }
  }

  /**
   * Get post by slug
   */
  async getPostBySlug(slug: string): Promise<Post | null> {
    try {
      const post = await prisma().post.findFirst({
        where: { post_name: slug },
      });

      return post ? this.mapPrismaPostToPost(post) : null;
    } catch (error) {
      logger.error('Error fetching post by slug:', error);
      throw error;
    }
  }

  /**
   * Get posts with filtering and pagination
   */
  async getPosts(params: PostQueryParams): Promise<{ posts: Post[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        type,
        authorId,
        search,
        orderBy = 'date',
        order = 'desc',
      } = params;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: {
        post_status?: string;
        post_type?: string;
        post_author?: string;
        OR?: Array<{
          post_title?: { contains: string; mode: 'insensitive' };
          post_content?: { contains: string; mode: 'insensitive' };
        }>;
      } = {};

      if (status) {
        where.post_status = status;
      }

      if (type) {
        where.post_type = type;
      }

      if (authorId) {
        where.post_author = authorId;
      }

      if (search) {
        where.OR = [
          { post_title: { contains: search, mode: 'insensitive' } },
          { post_content: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Map orderBy to Prisma field
      const orderByMap: Record<
        string,
        'post_date' | 'post_title' | 'post_modified' | 'comment_count'
      > = {
        date: 'post_date',
        title: 'post_title',
        modified: 'post_modified',
        comment_count: 'comment_count',
      };

      const orderField = orderByMap[orderBy] || 'post_date';
      const orderDirection = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

      // Get total count and posts in parallel
      const [total, posts] = await Promise.all([
        prisma().post.count({ where }),
        prisma().post.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [orderField]: orderDirection },
        }),
      ]);

      const mappedPosts = posts.map((post) => this.mapPrismaPostToPost(post));

      return { posts: mappedPosts, total };
    } catch (error) {
      logger.error('Error fetching posts:', error);
      throw error;
    }
  }

  /**
   * Update post by ID
   */
  async updatePost(id: number, postData: UpdatePostDto): Promise<Post | null> {
    try {
      // Build update data object
      const updateData: {
        post_title?: string;
        post_content?: string;
        post_excerpt?: string | null;
        post_status?: string;
        post_type?: string;
        post_name?: string;
        comment_status?: string;
        ping_status?: string;
        guid?: string | null;
        post_parent?: string | null;
        menu_order?: number;
        post_date?: Date | null;
      } = {};

      if (postData.title !== undefined) {
        updateData.post_title = postData.title;
      }

      if (postData.content !== undefined) {
        updateData.post_content = postData.content;
      }

      if (postData.excerpt !== undefined) {
        updateData.post_excerpt = postData.excerpt;
      }

      if (postData.status !== undefined) {
        updateData.post_status = postData.status;
      }

      if (postData.type !== undefined) {
        updateData.post_type = postData.type;
      }

      if (postData.slug !== undefined) {
        updateData.post_name = postData.slug;
      }

      if (postData.commentStatus !== undefined) {
        updateData.comment_status = postData.commentStatus;
      }

      if (postData.pingStatus !== undefined) {
        updateData.ping_status = postData.pingStatus;
      }

      if (postData.featuredMedia !== undefined) {
        updateData.guid = postData.featuredMedia;
      }

      if (postData.parentId !== undefined) {
        updateData.post_parent = postData.parentId;
      }

      if (postData.menuOrder !== undefined) {
        updateData.menu_order = postData.menuOrder;
      }

      if (postData.publishedAt !== undefined) {
        updateData.post_date = postData.publishedAt;
      }

      if (Object.keys(updateData).length === 0) {
        return this.getPostById(id);
      }

      const post = await prisma().post.update({
        where: { id },
        data: updateData,
      });

      logger.info('Post updated successfully', { postId: id });
      return this.mapPrismaPostToPost(post);
    } catch (error) {
      logger.error('Error updating post:', error);
      throw error;
    }
  }

  /**
   * Delete post by ID
   */
  async deletePost(id: number): Promise<boolean> {
    try {
      const post = await prisma().post.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!post) {
        return false;
      }

      await prisma().post.delete({
        where: { id },
      });

      logger.info('Post deleted successfully', { postId: id });
      return true;
    } catch (error) {
      logger.error('Error deleting post:', error);
      throw error;
    }
  }

  /**
   * Update comment count for a post
   */
  async updateCommentCount(id: number, increment: boolean): Promise<void> {
    try {
      await prisma().post.update({
        where: { id },
        data: {
          comment_count: {
            increment: increment ? 1 : -1,
          },
        },
      });
    } catch (error) {
      logger.error('Error updating comment count:', error);
      throw error;
    }
  }

  /**
   * Check if post exists
   */
  async postExists(id: number): Promise<boolean> {
    try {
      const count = await prisma().post.count({
        where: { id },
      });
      return count > 0;
    } catch (error) {
      logger.error('Error checking post existence:', error);
      throw error;
    }
  }

  /**
   * Check if author exists
   */
  async authorExists(authorId: string): Promise<boolean> {
    try {
      const count = await prisma().user.count({
        where: { id: authorId },
      });
      return count > 0;
    } catch (error) {
      logger.error('Error checking author existence:', error);
      throw error;
    }
  }

  /**
   * Get posts by author with pagination
   */
  async getPostsByAuthor(
    authorId: string,
    page: number,
    limit: number
  ): Promise<{ posts: Post[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [total, posts] = await Promise.all([
        prisma().post.count({
          where: { post_author: authorId },
        }),
        prisma().post.findMany({
          where: { post_author: authorId },
          skip,
          take: limit,
          orderBy: { post_date: 'desc' },
        }),
      ]);

      const mappedPosts = posts.map((post) => this.mapPrismaPostToPost(post));

      return { posts: mappedPosts, total };
    } catch (error) {
      logger.error('Error fetching posts by author:', error);
      throw error;
    }
  }

  /**
   * Get published posts with pagination
   */
  async getPublishedPosts(page: number, limit: number): Promise<{ posts: Post[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [total, posts] = await Promise.all([
        prisma().post.count({
          where: { post_status: 'publish' },
        }),
        prisma().post.findMany({
          where: { post_status: 'publish' },
          skip,
          take: limit,
          orderBy: { post_date: 'desc' },
        }),
      ]);

      const mappedPosts = posts.map((post) => this.mapPrismaPostToPost(post));

      return { posts: mappedPosts, total };
    } catch (error) {
      logger.error('Error fetching published posts:', error);
      throw error;
    }
  }
}

export const postService = new PostService();
