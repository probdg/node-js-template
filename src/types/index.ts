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
  page?: number;
  limit?: number;
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
  host: string;
  port: number;
  password?: string;
  db: number;
  ttl: number;
}

// Kafka types
export interface KafkaConfig {
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
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

// Request types
export interface AuthenticatedRequest {
  user?: TokenPayload;
}
