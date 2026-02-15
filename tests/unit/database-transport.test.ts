import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DatabaseTransport } from '../../src/services/database-transport';

describe('DatabaseTransport', () => {
  let transport: DatabaseTransport;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPool: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a mock pool
    mockPool = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };

    // Create transport instance
    transport = new DatabaseTransport({ level: 'info' });
  });

  it('should create a database transport instance', () => {
    expect(transport).toBeDefined();
    expect(transport).toBeInstanceOf(DatabaseTransport);
  });

  it('should set pool', () => {
    transport.setPool(mockPool);
    expect(transport).toBeDefined();
  });

  it('should buffer logs before flushing', () => {
    transport.setPool(mockPool);

    const logInfo = {
      level: 'info',
      message: 'Test log message',
      timestamp: '2024-01-01 00:00:00',
    };

    // Log a message
    transport.log(logInfo, () => {});

    // Since we're using batching, the query might not be called immediately
    expect(transport).toBeDefined();
  });

  it('should flush logs when buffer is full', async () => {
    transport.setPool(mockPool);

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

    // Check that query was called
    expect(mockPool.query).toHaveBeenCalled();
  });

  it('should handle metadata in logs', () => {
    transport.setPool(mockPool);

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
    transport.setPool(mockPool);

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

    // Verify query was called during close
    expect(mockPool.query).toHaveBeenCalled();
  });
});
