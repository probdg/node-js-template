import type { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { activityLogger } from '../../src/middleware/activity-logger';
import { logger } from '../../src/services/logger';

// Mock the logger
vi.mock('../../src/services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ActivityLogger Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log incoming request', () => {
    const req = {
      method: 'GET',
      url: '/api/v1/users',
      path: '/api/v1/users',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
        'content-type': 'application/json',
      },
    } as unknown as Request;

    const res = {
      end: vi.fn(),
      statusCode: 200,
      get: vi.fn(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    activityLogger(req, res, next);

    expect(logger.info).toHaveBeenCalledWith('Incoming request', {
      method: 'GET',
      url: '/api/v1/users',
      path: '/api/v1/users',
      ip: '127.0.0.1',
      userAgent: 'test-agent',
      contentType: 'application/json',
      timestamp: expect.any(String),
    });

    expect(next).toHaveBeenCalled();
  });

  it('should log outgoing response when res.end is called', () => {
    const req = {
      method: 'POST',
      url: '/api/v1/users',
      path: '/api/v1/users',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
        'content-type': 'application/json',
      },
    } as unknown as Request;

    const originalEnd = vi.fn();
    const res = {
      end: originalEnd,
      statusCode: 201,
      get: vi.fn(() => '123'),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    activityLogger(req, res, next);

    // Clear the incoming request log
    vi.clearAllMocks();

    // Simulate calling res.end
    (res as any).end();

    expect(logger.info).toHaveBeenCalledWith('Outgoing response', {
      method: 'POST',
      url: '/api/v1/users',
      statusCode: 201,
      duration: expect.stringMatching(/\d+ms/),
      ip: '127.0.0.1',
      contentLength: '123',
      timestamp: expect.any(String),
    });
  });

  it('should log warning for error status codes', () => {
    const req = {
      method: 'GET',
      url: '/api/v1/users/123',
      path: '/api/v1/users/123',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
    } as unknown as Request;

    const originalEnd = vi.fn();
    const res = {
      end: originalEnd,
      statusCode: 404,
      get: vi.fn(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    activityLogger(req, res, next);

    // Clear the incoming request log
    vi.clearAllMocks();

    // Simulate calling res.end
    (res as any).end();

    expect(logger.warn).toHaveBeenCalledWith('Request completed with error status', {
      method: 'GET',
      url: '/api/v1/users/123',
      statusCode: 404,
      duration: expect.stringMatching(/\d+ms/),
      ip: '127.0.0.1',
    });
  });
});
