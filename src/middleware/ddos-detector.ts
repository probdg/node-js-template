import type { Request, Response, NextFunction } from 'express';

import { config } from '../../config/index.js';
import { logger } from '@/services/logger';

// Configuration for DDoS detection
const DDOS_CONFIG = {
  enabled: config.ddos.enabled,
  // Time window in seconds to track requests
  windowSeconds: config.ddos.windowSeconds,
  // Threshold for requests per IP in the time window to consider as potential DDoS
  requestThreshold: config.ddos.requestThreshold,
  // Threshold for requests per IP in the time window to block
  blockThreshold: config.ddos.blockThreshold,
  // Time to block an IP in seconds
  blockDuration: config.ddos.blockDuration,
};

// In-memory fallback if Redis is not available
const requestTracker = new Map<string, { count: number; firstRequest: number; blocked: boolean }>();

/**
 * DDoS detection and logging middleware
 * Tracks request patterns and logs suspicious activity
 */
export function ddosDetector(req: Request, res: Response, next: NextFunction): void {
  // Skip DDoS detection if disabled
  if (!DDOS_CONFIG.enabled) {
    return next();
  }

  const clientIp = req.ip || 'unknown';
  const currentTime = Date.now();
  const windowMs = DDOS_CONFIG.windowSeconds * 1000;

  // Use synchronous in-memory tracking for better performance
  const result = checkDDoSInMemory(clientIp, currentTime, windowMs);

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
}

/**
 * Check DDoS using in-memory tracking
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
