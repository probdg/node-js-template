import type { Prisma } from '../../generated/prisma/client.js';

import { databaseService } from './database.js';

const prisma = () => databaseService.getClient();

export interface LogEntry {
  id: string;
  level: string;
  message: string;
  meta: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LogQueryOptions {
  level?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Service for querying logs from the database using Prisma
 */
class LogService {
  /**
   * Query logs from the database
   */
  async getLogs(options: LogQueryOptions = {}): Promise<LogEntry[]> {
    const { level, startDate, endDate, limit = 100, offset = 0 } = options;

    const where: Prisma.LogWhereInput = {};

    if (level) {
      where.level = level;
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = startDate;
      }
      if (endDate) {
        where.created_at.lte = endDate;
      }
    }

    const logs = await prisma().log.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return logs.map((log) => ({
      id: log.id,
      level: log.level,
      message: log.message,
      meta: log.meta as Record<string, unknown> | null,
      createdAt: log.created_at,
      updatedAt: log.updated_at,
    }));
  }

  /**
   * Get log count by level
   */
  async getLogCountByLevel(startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
    const where: Prisma.LogWhereInput = {};

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = startDate;
      }
      if (endDate) {
        where.created_at.lte = endDate;
      }
    }

    const result = await prisma().log.groupBy({
      by: ['level'],
      where,
      _count: {
        level: true,
      },
    });

    return result.reduce(
      (acc: Record<string, number>, item) => {
        const count = item._count;
        if (count && typeof count === 'object' && 'level' in count) {
          acc[item.level] = count.level;
        }
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /**
   * Delete logs older than the specified date
   */
  async deleteOldLogs(beforeDate: Date): Promise<number> {
    const result = await prisma().log.deleteMany({
      where: {
        created_at: {
          lt: beforeDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Get a single log entry by ID
   */
  async getLogById(id: string): Promise<LogEntry | null> {
    const log = await prisma().log.findUnique({
      where: {
        id,
      },
    });

    if (!log) {
      return null;
    }

    return {
      id: log.id,
      level: log.level,
      message: log.message,
      meta: log.meta as Record<string, unknown> | null,
      createdAt: log.created_at,
      updatedAt: log.updated_at,
    };
  }
}

export const logService = new LogService();
