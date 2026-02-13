import { describe, it, expect } from 'vitest';
import {
  createApiResponse,
  createErrorResponse,
  createPaginatedResponse,
  parsePaginationParams,
  calculatePaginationMeta,
} from '../src/utils/response';

describe('Response Utils', () => {
  describe('createApiResponse', () => {
    it('should create a successful response with data', () => {
      const data = { message: 'Hello World' };
      const response = createApiResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.meta?.timestamp).toBeDefined();
    });

    it('should include custom meta data', () => {
      const data = { id: 1 };
      const meta = { requestId: '123' };
      const response = createApiResponse(data, meta);

      expect(response.meta?.requestId).toBe('123');
    });
  });

  describe('createErrorResponse', () => {
    it('should create an error response', () => {
      const response = createErrorResponse('NOT_FOUND', 'Resource not found');

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('NOT_FOUND');
      expect(response.error?.message).toBe('Resource not found');
    });

    it('should include error details if provided', () => {
      const details = { field: 'email' };
      const response = createErrorResponse('VALIDATION_ERROR', 'Invalid email', details);

      expect(response.error?.details).toEqual(details);
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create a paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = { page: 1, limit: 10, total: 20, totalPages: 2 };
      const response = createPaginatedResponse(data, pagination);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.meta?.pagination).toEqual(pagination);
    });
  });

  describe('parsePaginationParams', () => {
    it('should parse pagination parameters from query', () => {
      const query = { page: '2', limit: '20' };
      const params = parsePaginationParams(query);

      expect(params.page).toBe(2);
      expect(params.limit).toBe(20);
    });

    it('should use default values if not provided', () => {
      const params = parsePaginationParams({});

      expect(params.page).toBe(1);
      expect(params.limit).toBe(10);
    });

    it('should enforce minimum page value of 1', () => {
      const query = { page: '0' };
      const params = parsePaginationParams(query);

      expect(params.page).toBe(1);
    });

    it('should enforce maximum limit of 100', () => {
      const query = { limit: '200' };
      const params = parsePaginationParams(query);

      expect(params.limit).toBe(100);
    });
  });

  describe('calculatePaginationMeta', () => {
    it('should calculate pagination metadata correctly', () => {
      const meta = calculatePaginationMeta(100, 1, 10);

      expect(meta.total).toBe(100);
      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(10);
      expect(meta.totalPages).toBe(10);
    });

    it('should handle edge case with zero total', () => {
      const meta = calculatePaginationMeta(0, 1, 10);

      expect(meta.totalPages).toBe(0);
    });
  });
});
