import type { HTTP_STATUS, USER_ROLES, PERMISSIONS } from '@/constants';

// HTTP Status type
export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

// Role types
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Permission types
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ResponseMeta {
  timestamp: string;
  requestId?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  username: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  email?: string;
  username?: string;
  role?: UserRole;
  isActive?: boolean;
}

// Auth types
export interface LoginDto {
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// File types
export interface FileMetadata {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  userId: string;
  createdAt: Date;
}

export interface UploadFileDto {
  file: Buffer;
  filename: string;
  mimetype: string;
}

// Database types
export interface DbConfig {
  enabled: boolean;
  type?: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  min: number;
  max: number;
}

// Redis types
export interface RedisConfig {
  enabled: boolean;
  host: string;
  port: number;
  password?: string;
  db: number;
  ttl: number;
}

// Kafka types
export interface KafkaConfig {
  enabled: boolean;
  brokers: string[];
  clientId: string;
  groupId: string;
}

export interface KafkaMessage<T = unknown> {
  topic: string;
  key?: string;
  value: T;
  headers?: Record<string, string>;
}

// MinIO types
export interface MinioConfig {
  enabled: boolean;
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

// Upload types
export interface UploadConfig {
  directory: string;
  maxFileSize: number;
  allowedMimeTypes: string[];
}

// Request types
export interface AuthenticatedRequest {
  user?: TokenPayload;
}

// Vault types
export interface VaultConfig {
  enabled: boolean;
  encryptionKey: string;
  algorithm: string;
}

export interface VaultEntry {
  id: string;
  key: string;
  encryptedValue: string;
  iv: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVaultEntryDto {
  key: string;
  value: string;
}

export interface UpdateVaultEntryDto {
  value: string;
}

// Post types (WordPress-style)
export type PostStatus = 'publish' | 'draft' | 'private' | 'pending' | 'future';
export type PostType = 'post' | 'page' | 'attachment';
export type CommentStatus = 'open' | 'closed';
export type PingStatus = 'open' | 'closed';

export interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  status: PostStatus;
  type: PostType;
  authorId: string;
  slug: string;
  commentStatus: CommentStatus;
  pingStatus: PingStatus;
  featuredMedia: string | null;
  parentId: string | null;
  menuOrder: number;
  commentCount: number;
  views: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostDto {
  title: string;
  content: string;
  excerpt?: string | null;
  status?: PostStatus;
  type?: PostType;
  authorId: string;
  slug?: string;
  commentStatus?: CommentStatus;
  pingStatus?: PingStatus;
  featuredMedia?: string | null;
  parentId?: string | null;
  menuOrder?: number;
  publishedAt?: Date | null;
}

export interface UpdatePostDto {
  title?: string;
  content?: string;
  excerpt?: string | null;
  status?: PostStatus;
  type?: PostType;
  slug?: string;
  commentStatus?: CommentStatus;
  pingStatus?: PingStatus;
  featuredMedia?: string | null;
  parentId?: string | null;
  menuOrder?: number;
  publishedAt?: Date | null;
}

export interface PostQueryParams {
  page?: number;
  limit?: number;
  status?: PostStatus;
  type?: PostType;
  authorId?: string;
  search?: string;
  orderBy?: 'date' | 'title' | 'modified' | 'views' | 'comment_count';
  order?: 'asc' | 'desc';
}
