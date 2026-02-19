import type { Prisma } from '@prisma/client';
import type TransportStream from 'winston-transport';
import Transport from 'winston-transport';

import { databaseService } from './database.js';

/**
 * Custom Winston transport for logging to PostgreSQL database using Prisma
 */
export class DatabaseTransport extends Transport {
  private buffer: Array<{ level: string; message: string; meta: Record<string, unknown> }> = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly batchSize = 10;
  private readonly flushIntervalMs = 5000;

  constructor(opts?: TransportStream.TransportStreamOptions) {
    super(opts);
    // Start the automatic flush interval
    this.startFlushInterval();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(info: any, callback: () => void): void {
    // eslint-disable-next-line no-undef
    setImmediate(() => {
      this.emit('logged', info);
    });

    // Extract level, message, and metadata
    const { level, message, timestamp, stack, ...meta } = info;

    // Add to buffer
    this.buffer.push({
      level,
      message,
      meta: {
        ...meta,
        ...(stack ? { stack } : {}),
        timestamp,
      },
    });

    // Flush if buffer is full
    if (this.buffer.length >= this.batchSize) {
      this.flush().catch((error) => {
        // Emit error but don't fail the application
        this.emit('error', error);
      });
    }

    callback();
  }

  private startFlushInterval(): void {
    this.flushInterval ??= setInterval(() => {
      this.flush().catch((error: unknown) => {
        this.emit('error', error);
      });
    }, this.flushIntervalMs);
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const logsToInsert = [...this.buffer];
    this.buffer = [];

    try {
      const prisma = databaseService.getClient();

      // Use createMany for better performance with multiple inserts
      await prisma.log.createMany({
        data: logsToInsert.map((log) => ({
          level: log.level,
          message: log.message,
          meta: log.meta as Prisma.InputJsonValue,
        })),
      });
    } catch (error) {
      // Re-add failed logs to buffer for retry
      this.buffer.unshift(...logsToInsert);
      throw error;
    }
  }

  close(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Flush remaining logs
    this.flush().catch((error: unknown) => {
      this.emit('error', error);
    });
  }
}
