import express from 'express';
import type { Request, Response } from 'express';
import { databaseService } from '@/services/database';
import { redisService } from '@/services/redis';
import { kafkaService } from '@/services/kafka';
import { minioService } from '@/services/minio';
import { createApiResponse } from '@/utils/response';
import { HTTP_STATUS } from '@/constants';
import { asyncHandler } from '@/middleware/error';

const router = express.Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: boolean;
    redis: boolean;
    kafka: boolean;
    minio: boolean;
  };
}

/**
 * GET /health
 * Basic health check endpoint
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const health: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: await databaseService.healthCheck(),
        redis: await redisService.healthCheck(),
        kafka: await kafkaService.healthCheck(),
        minio: await minioService.healthCheck(),
      },
    };

    // Determine overall health status
    const allServicesHealthy = Object.values(health.services).every((s) => s === true);
    const someServicesHealthy = Object.values(health.services).some((s) => s === true);

    if (allServicesHealthy) {
      health.status = 'healthy';
    } else if (someServicesHealthy) {
      health.status = 'degraded';
    } else {
      health.status = 'unhealthy';
    }

    const statusCode =
      health.status === 'healthy'
        ? HTTP_STATUS.OK
        : health.status === 'degraded'
          ? HTTP_STATUS.OK
          : HTTP_STATUS.SERVICE_UNAVAILABLE;

    res.status(statusCode).json(createApiResponse(health));
  })
);

/**
 * GET /health/live
 * Liveness probe - checks if application is running
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json(
    createApiResponse({
      status: 'alive',
      timestamp: new Date().toISOString(),
    })
  );
});

/**
 * GET /health/ready
 * Readiness probe - checks if application is ready to accept traffic
 */
router.get(
  '/ready',
  asyncHandler(async (_req: Request, res: Response) => {
    const dbHealthy = await databaseService.healthCheck();
    const redisHealthy = await redisService.healthCheck();

    const ready = dbHealthy && redisHealthy;

    const statusCode = ready ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;

    res.status(statusCode).json(
      createApiResponse({
        ready,
        timestamp: new Date().toISOString(),
        checks: {
          database: dbHealthy,
          redis: redisHealthy,
        },
      })
    );
  })
);

export { router as healthRouter };
