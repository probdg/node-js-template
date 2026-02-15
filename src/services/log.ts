import { databaseService } from './database.js';

export interface LogEntry {
  id: string;
  level: string;
  message: string;
  meta: Record<string, unknown> | null;
  timestamp: Date;
}

export interface LogQueryOptions {
  level?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Service for querying logs from the database
 */
class LogService {
  /**
   * Query logs from the database
   */
  async getLogs(options: LogQueryOptions = {}): Promise<LogEntry[]> {
    const { level, startDate, endDate, limit = 100, offset = 0 } = options;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (level) {
      conditions.push(`level = $${paramIndex}`);
      params.push(level);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`timestamp >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`timestamp <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT id, level, message, meta, timestamp
      FROM logs
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await databaseService.query<LogEntry>(query, params);
    return result.rows;
  }

  /**
   * Get log count by level
   */
  async getLogCountByLevel(startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (startDate) {
      conditions.push(`timestamp >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`timestamp <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT level, COUNT(*)::int as count
      FROM logs
      ${whereClause}
      GROUP BY level
    `;

    const result = await databaseService.query<{ level: string; count: number }>(query, params);

    return result.rows.reduce(
      (acc, row) => {
        acc[row.level] = row.count;
        return acc;
      },
      {} as Record<string, number>
    );
  }

  /**
   * Delete logs older than the specified date
   */
  async deleteOldLogs(beforeDate: Date): Promise<number> {
    const query = 'DELETE FROM logs WHERE timestamp < $1';
    const result = await databaseService.query(query, [beforeDate]);
    return result.rowCount || 0;
  }

  /**
   * Get a single log entry by ID
   */
  async getLogById(id: string): Promise<LogEntry | null> {
    const query = 'SELECT id, level, message, meta, timestamp FROM logs WHERE id = $1';
    const result = await databaseService.query<LogEntry>(query, [id]);
    return result.rows[0] || null;
  }
}

export const logService = new LogService();
