import type { Request, Response, NextFunction } from 'express';
import type { RedisClientType } from 'redis';

import { logger } from '@/services/logger';
import { redisService } from '@/services/redis';

// Configuration for DDoS detection
const DDOS_CONFIG = {
  // Time window in seconds to track requests
  windowSeconds: 60,
  // Threshold for requests per IP in the time window to consider as potential DDoS
  requestThreshold: 100,
  // Threshold for requests per IP in the time window to block
  blockThreshold: 200,
  // Time to block an IP in seconds
  blockDuration: 300, // 5 minutes
};

// In-memory fallback if Redis is not available
const requestTracker = new Map<string, { count: number; firstRequest: number; blocked: boolean }>();

/**
 * DDoS detection and logging middleware
 * Tracks request patterns and logs suspicious activity
 */
export function ddosDetector(req: Request, res: Response, next: NextFunction): void {
  const clientIp = req.ip || 'unknown';
  const currentTime = Date.now();
  const windowMs = DDOS_CONFIG.windowSeconds * 1000;

  // Check if using Redis or in-memory tracking
  checkDDoS(clientIp, currentTime, windowMs)
    .then((result) => {
      if (result.blocked) {
        logger.error('DDoS: Request blocked', {
          ip: clientIp,
          url: req.url,
          method: req.method,
          requestCount: result.count,
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString(),
        });

        res.status(429).json({
          status: 'error',
          code: 'DDOS_DETECTED',
          message: 'Too many requests. You have been temporarily blocked.',
        });
        return;
      }

      if (result.suspicious) {
        logger.warn('DDoS: Suspicious activity detected', {
          ip: clientIp,
          url: req.url,
          method: req.method,
          requestCount: result.count,
          threshold: DDOS_CONFIG.requestThreshold,
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString(),
        });
      }

      next();
    })
    .catch((error) => {
      // If DDoS check fails, log error and allow request
      logger.error('DDoS detection error:', error);
      next();
    });
}

/**
 * Check if IP should be blocked or flagged for suspicious activity
 */
async function checkDDoS(
  ip: string,
  currentTime: number,
  windowMs: number
): Promise<{ blocked: boolean; suspicious: boolean; count: number }> {
  try {
    // Try to use Redis for distributed tracking
    const client = await redisService.getClient();
    if (client) {
      return await checkDDoSWithRedis(ip, currentTime, windowMs, client);
    }
  } catch (error) {
    // Fall back to in-memory tracking
    logger.debug('Redis not available for DDoS detection, using in-memory tracking');
  }

  // In-memory fallback
  return checkDDoSInMemory(ip, currentTime, windowMs);
}

/**
 * Check DDoS using Redis
 */
async function checkDDoSWithRedis(
  ip: string,
  _currentTime: number,
  _windowMs: number,
  client: RedisClientType
): Promise<{ blocked: boolean; suspicious: boolean; count: number }> {
  const blockKey = `ddos:block:${ip}`;
  const countKey = `ddos:count:${ip}`;

  // Check if IP is blocked
  const isBlocked = await client.get(blockKey);
  if (isBlocked) {
    return { blocked: true, suspicious: false, count: 0 };
  }

  // Increment request count
  const count = await client.incr(countKey);

  // Set expiry on first request
  if (count === 1) {
    await client.expire(countKey, DDOS_CONFIG.windowSeconds);
  }

  // Check if threshold is exceeded
  if (count >= DDOS_CONFIG.blockThreshold) {
    await client.setEx(blockKey, DDOS_CONFIG.blockDuration, '1');
    return { blocked: true, suspicious: false, count };
  }

  const suspicious = count >= DDOS_CONFIG.requestThreshold;
  return { blocked: false, suspicious, count };
}

/**
 * Check DDoS using in-memory tracking (fallback)
 */
function checkDDoSInMemory(
  ip: string,
  currentTime: number,
  windowMs: number
): { blocked: boolean; suspicious: boolean; count: number } {
  let tracker = requestTracker.get(ip);

  // Clean up expired entries
  if (tracker && currentTime - tracker.firstRequest > windowMs) {
    requestTracker.delete(ip);
    tracker = undefined;
  }

  // Initialize tracker if not exists
  if (!tracker) {
    tracker = { count: 0, firstRequest: currentTime, blocked: false };
    requestTracker.set(ip, tracker);
  }

  // Check if IP is blocked
  if (tracker.blocked) {
    return { blocked: true, suspicious: false, count: tracker.count };
  }

  // Increment count
  tracker.count++;

  // Check if threshold is exceeded
  if (tracker.count >= DDOS_CONFIG.blockThreshold) {
    tracker.blocked = true;
    // Unblock after duration
    setTimeout(() => {
      requestTracker.delete(ip);
    }, DDOS_CONFIG.blockDuration * 1000);
    return { blocked: true, suspicious: false, count: tracker.count };
  }

  const suspicious = tracker.count >= DDOS_CONFIG.requestThreshold;
  return { blocked: false, suspicious, count: tracker.count };
}

/**
 * Configuration getter for testing and customization
 */
export function getDDoSConfig() {
  return { ...DDOS_CONFIG };
}

/**
 * Update DDoS configuration
 */
export function updateDDoSConfig(config: Partial<typeof DDOS_CONFIG>): void {
  Object.assign(DDOS_CONFIG, config);
}
