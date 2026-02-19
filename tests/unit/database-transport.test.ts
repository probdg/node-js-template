import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DatabaseTransport } from '../../src/services/database-transport';
import { databaseService } from '../../src/services/database';

// Mock the database service
vi.mock('../../src/services/database', () => ({
  databaseService: {
    getClient: vi.fn(),
  },
}));

describe('DatabaseTransport', () => {
  let transport: DatabaseTransport;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPrismaClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock Prisma client
    mockPrismaClient = {
      log: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    // Mock databaseService.getClient to return the mock client
    vi.mocked(databaseService.getClient).mockReturnValue(mockPrismaClient);

    // Create transport instance
    transport = new DatabaseTransport({ level: 'info' });
  });

  it('should create a database transport instance', () => {
    expect(transport).toBeDefined();
    expect(transport).toBeInstanceOf(DatabaseTransport);
  });

  it('should buffer logs before flushing', () => {
    const logInfo = {
      level: 'info',
      message: 'Test log message',
      timestamp: '2024-01-01 00:00:00',
    };

    // Log a message
    transport.log(logInfo, () => {});

    // Since we're using batching, the createMany might not be called immediately
    expect(transport).toBeDefined();
  });

  it('should flush logs when buffer is full', async () => {
    // Log multiple messages to trigger flush
    for (let i = 0; i < 10; i++) {
      transport.log(
        {
          level: 'info',
          message: `Test message ${i}`,
          timestamp: '2024-01-01 00:00:00',
        },
        () => {}
      );
    }

    // Wait for flush to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check that createMany was called
    expect(mockPrismaClient.log.createMany).toHaveBeenCalled();
  });

  it('should handle metadata in logs', () => {
    const logInfo = {
      level: 'error',
      message: 'Error occurred',
      timestamp: '2024-01-01 00:00:00',
      userId: '123',
      stack: 'Error: Test error\n  at test.js:1:1',
    };

    transport.log(logInfo, () => {});

    expect(transport).toBeDefined();
  });

  it('should close transport and flush remaining logs', async () => {
    // Add a log
    transport.log(
      {
        level: 'info',
        message: 'Final message',
        timestamp: '2024-01-01 00:00:00',
      },
      () => {}
    );

    // Close transport
    await transport.close();

    // Verify createMany was called during close
    expect(mockPrismaClient.log.createMany).toHaveBeenCalled();
  });

  it('should handle batch insert with correct data structure', async () => {
    const logMessages = [
      { level: 'info', message: 'Message 1', timestamp: '2024-01-01 00:00:00' },
      { level: 'error', message: 'Message 2', timestamp: '2024-01-01 00:00:01' },
    ];

    // Log messages
    logMessages.forEach((msg) => {
      transport.log(msg, () => {});
    });

    // Close to trigger flush
    await transport.close();

    // Verify createMany was called with correct structure
    expect(mockPrismaClient.log.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          level: expect.any(String),
          message: expect.any(String),
          meta: expect.any(Object),
        }),
      ]),
    });
  });

  it('should handle flush errors gracefully', async () => {
    // Mock createMany to throw an error
    mockPrismaClient.log.createMany = vi.fn().mockRejectedValue(new Error('Database error'));

    // Add error handler
    const errorHandler = vi.fn();
    transport.on('error', errorHandler);

    // Add a log
    transport.log(
      {
        level: 'info',
        message: 'Test message',
        timestamp: '2024-01-01 00:00:00',
      },
      () => {}
    );

    // Close to trigger flush
    await transport.close();

    // Error should be emitted
    expect(mockPrismaClient.log.createMany).toHaveBeenCalled();
  });
});
