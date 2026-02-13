import { describe, it, expect } from 'vitest';

import { rateLimiters, rateLimiterConfig } from '../../src/middleware/rate-limiter';

describe('Rate Limiter Middleware', () => {
  it('should export rate limiter configurations', () => {
    expect(rateLimiterConfig).toHaveProperty('general');
    expect(rateLimiterConfig).toHaveProperty('auth');
    expect(rateLimiterConfig).toHaveProperty('write');
    expect(rateLimiterConfig).toHaveProperty('read');
    expect(rateLimiterConfig).toHaveProperty('upload');
  });

  it('should have correct general rate limiter config', () => {
    expect(rateLimiterConfig.general).toEqual({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP, please try again later.',
    });
  });

  it('should have stricter auth rate limiter config', () => {
    expect(rateLimiterConfig.auth).toEqual({
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: 'Too many authentication attempts, please try again later.',
    });
  });

  it('should have write operations rate limiter config', () => {
    expect(rateLimiterConfig.write).toEqual({
      windowMs: 15 * 60 * 1000,
      max: 50,
      message: 'Too many write operations, please try again later.',
    });
  });

  it('should have lenient read operations rate limiter config', () => {
    expect(rateLimiterConfig.read).toEqual({
      windowMs: 15 * 60 * 1000,
      max: 200,
      message: 'Too many read requests, please try again later.',
    });
  });

  it('should have strict upload rate limiter config', () => {
    expect(rateLimiterConfig.upload).toEqual({
      windowMs: 60 * 60 * 1000,
      max: 10,
      message: 'Too many file uploads, please try again later.',
    });
  });

  it('should export rate limiters', () => {
    expect(rateLimiters).toHaveProperty('general');
    expect(rateLimiters).toHaveProperty('auth');
    expect(rateLimiters).toHaveProperty('write');
    expect(rateLimiters).toHaveProperty('read');
    expect(rateLimiters).toHaveProperty('upload');
    expect(rateLimiters).toHaveProperty('custom');
  });

  it('should have a custom rate limiter factory', () => {
    expect(typeof rateLimiters.custom).toBe('function');

    const customLimiter = rateLimiters.custom({
      windowMs: 1000,
      max: 10,
      message: 'Custom limit exceeded',
    });

    expect(customLimiter).toBeDefined();
  });
});
