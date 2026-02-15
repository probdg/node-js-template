import type pg from 'pg';
import type TransportStream from 'winston-transport';
import Transport from 'winston-transport';

/**
 * Custom Winston transport for logging to PostgreSQL database
 */
export class DatabaseTransport extends Transport {
  private pool: pg.Pool | null = null;
  private buffer: Array<{ level: string; message: string; meta: Record<string, unknown> }> = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly batchSize = 10;
  private readonly flushIntervalMs = 5000;

  constructor(opts?: TransportStream.TransportStreamOptions) {
    super(opts);
  }

  setPool(pool: pg.Pool): void {
    this.pool = pool;
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
    if (!this.flushInterval) {
      this.flushInterval = setInterval(() => {
        this.flush().catch((error) => {
          this.emit('error', error);
        });
      }, this.flushIntervalMs);
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.pool) {
      return;
    }

    const logsToInsert = [...this.buffer];
    this.buffer = [];

    try {
      const values: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      logsToInsert.forEach((log) => {
        values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})`);
        params.push(log.level, log.message, JSON.stringify(log.meta));
        paramIndex += 3;
      });

      const query = `
        INSERT INTO logs (level, message, meta)
        VALUES ${values.join(', ')}
      `;

      await this.pool.query(query, params);
    } catch (error) {
      // Re-add failed logs to buffer for retry
      this.buffer.unshift(...logsToInsert);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Flush remaining logs
    await this.flush();
  }
}
