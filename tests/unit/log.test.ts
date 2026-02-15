import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as databaseModule from '../../src/services/database';
import { logService } from '../../src/services/log';

// Mock the database service
vi.mock('../../src/services/database', () => ({
  databaseService: {
    query: vi.fn(),
  },
}));

describe('LogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLogs', () => {
    it('should get logs without filters', async () => {
      const mockLogs = [
        {
          id: '1',
          level: 'info',
          message: 'Test message 1',
          meta: { key: 'value' },
          timestamp: new Date(),
        },
        {
          id: '2',
          level: 'error',
          message: 'Test message 2',
          meta: null,
          timestamp: new Date(),
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(databaseModule.databaseService, 'query').mockResolvedValue({
        rows: mockLogs,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const logs = await logService.getLogs();

      expect(logs).toEqual(mockLogs);
      expect(databaseModule.databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, level, message, meta, timestamp'),
        [100, 0]
      );
    });

    it('should filter logs by level', async () => {
      const mockLogs = [
        {
          id: '1',
          level: 'error',
          message: 'Error message',
          meta: null,
          timestamp: new Date(),
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(databaseModule.databaseService, 'query').mockResolvedValue({
        rows: mockLogs,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const logs = await logService.getLogs({ level: 'error' });

      expect(logs).toEqual(mockLogs);
      expect(databaseModule.databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE level = $1'),
        ['error', 100, 0]
      );
    });

    it('should filter logs by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(databaseModule.databaseService, 'query').mockResolvedValue({
        rows: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await logService.getLogs({ startDate, endDate });

      expect(databaseModule.databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE timestamp >= $1 AND timestamp <= $2'),
        [startDate, endDate, 100, 0]
      );
    });

    it('should support pagination', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(databaseModule.databaseService, 'query').mockResolvedValue({
        rows: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await logService.getLogs({ limit: 50, offset: 10 });

      expect(databaseModule.databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        [50, 10]
      );
    });
  });

  describe('getLogCountByLevel', () => {
    it('should return log counts grouped by level', async () => {
      const mockResult = [
        { level: 'info', count: 100 },
        { level: 'error', count: 25 },
        { level: 'warn', count: 50 },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(databaseModule.databaseService, 'query').mockResolvedValue({
        rows: mockResult,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const counts = await logService.getLogCountByLevel();

      expect(counts).toEqual({
        info: 100,
        error: 25,
        warn: 50,
      });
    });

    it('should filter counts by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(databaseModule.databaseService, 'query').mockResolvedValue({
        rows: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      await logService.getLogCountByLevel(startDate, endDate);

      expect(databaseModule.databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE timestamp >= $1 AND timestamp <= $2'),
        [startDate, endDate]
      );
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete logs older than specified date', async () => {
      const beforeDate = new Date('2024-01-01');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(databaseModule.databaseService, 'query').mockResolvedValue({
        rowCount: 100,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const deletedCount = await logService.deleteOldLogs(beforeDate);

      expect(deletedCount).toBe(100);
      expect(databaseModule.databaseService.query).toHaveBeenCalledWith(
        'DELETE FROM logs WHERE timestamp < $1',
        [beforeDate]
      );
    });

    it('should return 0 if no logs were deleted', async () => {
      const beforeDate = new Date('2024-01-01');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(databaseModule.databaseService, 'query').mockResolvedValue({
        rowCount: 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

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
        timestamp: new Date(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(databaseModule.databaseService, 'query').mockResolvedValue({
        rows: [mockLog],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const log = await logService.getLogById('123');

      expect(log).toEqual(mockLog);
      expect(databaseModule.databaseService.query).toHaveBeenCalledWith(
        'SELECT id, level, message, meta, timestamp FROM logs WHERE id = $1',
        ['123']
      );
    });

    it('should return null if log not found', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.spyOn(databaseModule.databaseService, 'query').mockResolvedValue({
        rows: [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const log = await logService.getLogById('nonexistent');

      expect(log).toBeNull();
    });
  });
});
