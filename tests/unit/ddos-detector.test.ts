import type { Request, Response, NextFunction } from 'express';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ddosDetector, getDDoSConfig, updateDDoSConfig } from '../../src/middleware/ddos-detector';
import { logger } from '../../src/services/logger';
import { redisService } from '../../src/services/redis';

// Mock the logger
vi.mock('../../src/services/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock redis service
vi.mock('../../src/services/redis', () => ({
  redisService: {
    getClient: vi.fn(),
  },
}));

describe('DDoS Detector Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset config to defaults
    updateDDoSConfig({
      windowSeconds: 60,
      requestThreshold: 100,
      blockThreshold: 200,
      blockDuration: 300,
    });
  });

  it('should allow normal traffic through', async () => {
    vi.mocked(redisService.getClient).mockRejectedValue(new Error('Redis not available'));

    const req = {
      ip: '192.168.1.1',
      url: '/api/v1/users',
      method: 'GET',
      headers: { 'user-agent': 'test-agent' },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    ddosDetector(req, res, next);

    // Wait for async operation
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(next).toHaveBeenCalled();
  });

  it('should log warning for suspicious activity', async () => {
    vi.mocked(redisService.getClient).mockRejectedValue(new Error('Redis not available'));

    // Set low threshold for testing
    updateDDoSConfig({
      requestThreshold: 2,
      blockThreshold: 10,
    });

    const req = {
      ip: '192.168.1.2',
      url: '/api/v1/users',
      method: 'GET',
      headers: { 'user-agent': 'test-agent' },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    // Make multiple requests to trigger warning
    ddosDetector(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 10));

    ddosDetector(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 10));

    ddosDetector(req, res, next);
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should have logged suspicious activity
    expect(logger.warn).toHaveBeenCalledWith(
      'DDoS: Suspicious activity detected',
      expect.objectContaining({
        ip: '192.168.1.2',
        url: '/api/v1/users',
        method: 'GET',
      })
    );
  });

  it('should block IP when threshold exceeded', async () => {
    vi.mocked(redisService.getClient).mockRejectedValue(new Error('Redis not available'));

    // Set very low threshold for testing
    updateDDoSConfig({
      requestThreshold: 1,
      blockThreshold: 3,
    });

    const req = {
      ip: '192.168.1.3',
      url: '/api/v1/users',
      method: 'GET',
      headers: { 'user-agent': 'test-agent' },
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;

    const next = vi.fn() as NextFunction;

    // Make requests to exceed block threshold
    for (let i = 0; i < 5; i++) {
      ddosDetector(req, res, next);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should have blocked and logged error
    expect(logger.error).toHaveBeenCalledWith(
      'DDoS: Request blocked',
      expect.objectContaining({
        ip: '192.168.1.3',
      })
    );

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      code: 'DDOS_DETECTED',
      message: 'Too many requests. You have been temporarily blocked.',
    });
  });

  it('should return current DDoS configuration', () => {
    const config = getDDoSConfig();
    expect(config).toHaveProperty('windowSeconds');
    expect(config).toHaveProperty('requestThreshold');
    expect(config).toHaveProperty('blockThreshold');
    expect(config).toHaveProperty('blockDuration');
  });
});
