import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as databaseModule from '../../src/services/database';
import { logService } from '../../src/services/log';
import { PrismaClient } from '@prisma/client';

// Mock the database service
vi.mock('../../src/services/database', () => ({
  databaseService: {
    getClient: vi.fn(),
  },
}));

describe('LogService', () => {
  const mockPrismaClient = {
    log: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
    },
  } as unknown as PrismaClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(databaseModule.databaseService.getClient).mockReturnValue(mockPrismaClient);
  });

  describe('getLogs', () => {
    it('should get logs without filters', async () => {
      const mockLogs = [
        {
          id: '1',
          level: 'info',
          message: 'Test message 1',
          meta: { key: 'value' },
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: '2',
          level: 'error',
          message: 'Test message 2',
          meta: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const expectedLogs = [
        {
          id: '1',
          level: 'info',
          message: 'Test message 1',
          meta: { key: 'value' },
          createdAt: mockLogs[0]?.created_at ?? new Date(),
          updatedAt: mockLogs[0]?.updated_at ?? new Date(),
        },
        {
          id: '2',
          level: 'error',
          message: 'Test message 2',
          meta: null,
          createdAt: mockLogs[1]?.created_at ?? new Date(),
          updatedAt: mockLogs[1]?.updated_at ?? new Date(),
        },
      ];

      vi.mocked(mockPrismaClient.log.findMany).mockResolvedValue(mockLogs as any);

      const logs = await logService.getLogs();

      expect(logs).toEqual(expectedLogs);
      expect(mockPrismaClient.log.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: {
          created_at: 'desc',
        },
        take: 100,
        skip: 0,
      });
    });

    it('should filter logs by level', async () => {
      const mockLogs = [
        {
          id: '1',
          level: 'error',
          message: 'Error message',
          meta: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      const expectedLogs = [
        {
          id: '1',
          level: 'error',
          message: 'Error message',
          meta: null,
          createdAt: mockLogs[0]?.created_at ?? new Date(),
          updatedAt: mockLogs[0]?.updated_at ?? new Date(),
        },
      ];

      vi.mocked(mockPrismaClient.log.findMany).mockResolvedValue(mockLogs as any);

      const logs = await logService.getLogs({ level: 'error' });

      expect(logs).toEqual(expectedLogs);
      expect(mockPrismaClient.log.findMany).toHaveBeenCalledWith({
        where: {
          level: 'error',
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 100,
        skip: 0,
      });
    });

    it('should filter logs by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      vi.mocked(mockPrismaClient.log.findMany).mockResolvedValue([]);

      await logService.getLogs({ startDate, endDate });

      expect(mockPrismaClient.log.findMany).toHaveBeenCalledWith({
        where: {
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 100,
        skip: 0,
      });
    });

    it('should support pagination', async () => {
      vi.mocked(mockPrismaClient.log.findMany).mockResolvedValue([]);

      await logService.getLogs({ limit: 50, offset: 10 });

      expect(mockPrismaClient.log.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: {
          created_at: 'desc',
        },
        take: 50,
        skip: 10,
      });
    });
  });

  describe('getLogCountByLevel', () => {
    it('should return log counts grouped by level', async () => {
      const mockResult = [
        { level: 'info', _count: { level: 100 } },
        { level: 'error', _count: { level: 25 } },
        { level: 'warn', _count: { level: 50 } },
      ];

      vi.mocked(mockPrismaClient.log.groupBy).mockResolvedValue(mockResult as any);

      const counts = await logService.getLogCountByLevel();

      expect(counts).toEqual({
        info: 100,
        error: 25,
        warn: 50,
      });
      expect(mockPrismaClient.log.groupBy).toHaveBeenCalledWith({
        by: ['level'],
        where: {},
        _count: {
          level: true,
        },
      });
    });

    it('should filter counts by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      vi.mocked(mockPrismaClient.log.groupBy).mockResolvedValue([]);

      await logService.getLogCountByLevel(startDate, endDate);

      expect(mockPrismaClient.log.groupBy).toHaveBeenCalledWith({
        by: ['level'],
        where: {
          created_at: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          level: true,
        },
      });
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete logs older than specified date', async () => {
      const beforeDate = new Date('2024-01-01');

      vi.mocked(mockPrismaClient.log.deleteMany).mockResolvedValue({ count: 100 } as any);

      const deletedCount = await logService.deleteOldLogs(beforeDate);

      expect(deletedCount).toBe(100);
      expect(mockPrismaClient.log.deleteMany).toHaveBeenCalledWith({
        where: {
          created_at: {
            lt: beforeDate,
          },
        },
      });
    });

    it('should return 0 if no logs were deleted', async () => {
      const beforeDate = new Date('2024-01-01');

      vi.mocked(mockPrismaClient.log.deleteMany).mockResolvedValue({ count: 0 } as any);

      const deletedCount = await logService.deleteOldLogs(beforeDate);

      expect(deletedCount).toBe(0);
    });
  });

  describe('getLogById', () => {
    it('should return a log entry by ID', async () => {
      const mockLog = {
        id: '123',
        level: 'info',
        message: 'Test message',
        meta: { key: 'value' },
        created_at: new Date(),
        updated_at: new Date(),
      };

      const expectedLog = {
        id: '123',
        level: 'info',
        message: 'Test message',
        meta: { key: 'value' },
        createdAt: mockLog.created_at,
        updatedAt: mockLog.updated_at,
      };

      vi.mocked(mockPrismaClient.log.findUnique).mockResolvedValue(mockLog as any);

      const log = await logService.getLogById('123');

      expect(log).toEqual(expectedLog);
      expect(mockPrismaClient.log.findUnique).toHaveBeenCalledWith({
        where: {
          id: '123',
        },
      });
    });

    it('should return null if log not found', async () => {
      vi.mocked(mockPrismaClient.log.findUnique).mockResolvedValue(null);

      const log = await logService.getLogById('nonexistent');

      expect(log).toBeNull();
    });
  });
});
