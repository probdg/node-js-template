import type {
  ApiResponse,
  ApiError,
  ResponseMeta,
  PaginationMeta,
  PaginationParams,
} from '@/types';
import { HTTP_STATUS } from '@/constants';

/**
 * Create a standardized API response
 */
export function createApiResponse<T>(
  data: T,
  meta?: Partial<ResponseMeta>
): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Create a standardized API error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ApiResponse {
  const error: ApiError = {
    code,
    message,
    ...(details && { details }),
  };

  return {
    success: false,
    error,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Create a paginated API response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  meta?: Partial<ResponseMeta>
): ApiResponse<T[]> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      pagination,
      ...meta,
    },
  };
}

/**
 * Parse pagination parameters from query string
 */
export function parsePaginationParams(
  query: Record<string, unknown>,
  defaults = { page: 1, limit: 10 }
): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page || defaults.page), 10));
  const limit = Math.max(
    1,
    Math.min(100, parseInt(String(query.limit || defaults.limit), 10))
  );

  return { page, limit };
}

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
  };
}

/**
 * Get HTTP status text
 */
export function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    [HTTP_STATUS.OK]: 'OK',
    [HTTP_STATUS.CREATED]: 'Created',
    [HTTP_STATUS.NO_CONTENT]: 'No Content',
    [HTTP_STATUS.BAD_REQUEST]: 'Bad Request',
    [HTTP_STATUS.UNAUTHORIZED]: 'Unauthorized',
    [HTTP_STATUS.FORBIDDEN]: 'Forbidden',
    [HTTP_STATUS.NOT_FOUND]: 'Not Found',
    [HTTP_STATUS.CONFLICT]: 'Conflict',
    [HTTP_STATUS.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
    [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
    [HTTP_STATUS.SERVICE_UNAVAILABLE]: 'Service Unavailable',
  };

  return statusTexts[status] || 'Unknown Status';
}
