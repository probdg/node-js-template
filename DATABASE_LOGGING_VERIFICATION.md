# Database Logging Implementation Verification Guide

This guide explains how to verify the database logging functionality that has been implemented.

## What Was Implemented

### 1. Database Schema

A new `logs` table was added to store application logs with the following structure:

- `id` (UUID) - Primary key
- `level` (VARCHAR) - Log level (info, warn, error, debug)
- `message` (TEXT) - Log message
- `meta` (JSONB) - Additional metadata
- `timestamp` (TIMESTAMP) - When the log was created

Indexes were added on `level` and `timestamp` for efficient querying.

### 2. Custom Winston Transport

A `DatabaseTransport` class was created that:

- Extends Winston's Transport class
- Buffers logs for batch insertion (configurable batch size)
- Automatically flushes logs every 5 seconds or when buffer is full
- Handles errors gracefully without crashing the application
- Properly cleans up on shutdown

### 3. Logger Service Integration

The main logger service was updated to:

- Include the database transport alongside console and file transports
- Initialize the database transport with the database pool connection
- Properly close the transport when shutting down

### 4. Log Query Service

A new `logService` was created with methods to:

- Query logs with filtering (by level, date range, pagination)
- Get log count statistics by level
- Retrieve individual log entries by ID
- Delete old logs for cleanup

### 5. Comprehensive Tests

Unit tests were added for:

- DatabaseTransport functionality
- LogService methods
- All test cases pass successfully

## How to Verify

### Step 1: Start Services

```bash
# Start PostgreSQL and other services
docker-compose up -d postgres redis kafka zookeeper minio

# Wait for services to be ready (about 10 seconds)
docker-compose ps
```

### Step 2: Initialize Database Schema

The `logs` table will be automatically created when PostgreSQL starts using the `scripts/init-db.sql` script.

Verify the table exists:

```bash
docker-compose exec postgres psql -U postgres -d nodeapp -c "\d logs"
```

Expected output should show the logs table structure.

### Step 3: Start the Application

```bash
# Start in development mode
npm run dev
```

The application will:

1. Connect to the database
2. Initialize the database transport
3. Start logging to the database

### Step 4: Generate Some Logs

Make requests to the application to generate logs:

```bash
# Health check (generates info logs)
curl http://localhost:3000/api/v1/health

# Trigger 404 error (generates warn/error logs)
curl http://localhost:3000/api/v1/nonexistent

# Make multiple requests
for i in {1..5}; do
  curl http://localhost:3000/api/v1/health
done
```

### Step 5: Query Logs from Database

You can query logs directly from the database:

```sql
-- Connect to the database
docker-compose exec postgres psql -U postgres -d nodeapp

-- View recent logs
SELECT level, message, timestamp FROM logs ORDER BY timestamp DESC LIMIT 10;

-- Count logs by level
SELECT level, COUNT(*) FROM logs GROUP BY level;

-- View logs with metadata
SELECT level, message, meta FROM logs WHERE level = 'error' LIMIT 5;
```

### Step 6: Use the Log Service Programmatically

Create a test script or add to an existing endpoint:

```typescript
import { logService } from '@/services/log';

// Get recent logs
const recentLogs = await logService.getLogs({ limit: 10 });
console.log('Recent logs:', recentLogs);

// Get error logs only
const errorLogs = await logService.getLogs({
  level: 'error',
  limit: 20,
});
console.log('Error logs:', errorLogs);

// Get logs from last 24 hours
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
const last24Hours = await logService.getLogs({
  startDate: yesterday,
  limit: 100,
});
console.log('Logs from last 24 hours:', last24Hours);

// Get statistics
const stats = await logService.getLogCountByLevel();
console.log('Log statistics:', stats);
// Output: { info: 150, warn: 20, error: 5 }
```

### Step 7: Verify Batch Processing

The database transport batches logs for performance. To verify:

1. Generate multiple logs quickly
2. Wait 5 seconds (the flush interval)
3. Check the database - all logs should appear

```bash
# Generate 15 logs quickly
for i in {1..15}; do
  curl -s http://localhost:3000/api/v1/health > /dev/null
done

# Wait 6 seconds
sleep 6

# Check database
docker-compose exec postgres psql -U postgres -d nodeapp -c "SELECT COUNT(*) FROM logs WHERE timestamp > NOW() - INTERVAL '10 seconds';"
```

## Testing Checklist

- [ ] Database schema created successfully
- [ ] Application starts without errors
- [ ] Logs appear in the database after requests
- [ ] Console logging still works
- [ ] File logging still works
- [ ] Database logging works
- [ ] Can query logs by level
- [ ] Can query logs by date range
- [ ] Can get log statistics
- [ ] Batch processing works (logs appear after flush interval)
- [ ] Application shuts down gracefully (remaining logs are flushed)
- [ ] All unit tests pass (`npm test`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No linting errors (`npm run lint`)

## Performance Considerations

The database logging implementation is designed for production use:

1. **Batch Processing**: Logs are batched and inserted in bulk every 5 seconds or when the buffer reaches 10 entries
2. **Non-Blocking**: Logging operations don't block the application
3. **Error Handling**: Database errors don't crash the application
4. **Indexes**: Queries are optimized with indexes on `level` and `timestamp`
5. **JSONB**: Metadata is stored as JSONB for efficient querying

## Cleanup

To clean up old logs periodically, use the `deleteOldLogs` method:

```typescript
import { logService } from '@/services/log';

// Delete logs older than 30 days
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const deletedCount = await logService.deleteOldLogs(thirtyDaysAgo);
console.log(`Deleted ${deletedCount} old logs`);
```

Consider adding this as a scheduled job (e.g., daily cron job).

## Troubleshooting

### Logs Not Appearing in Database

1. Check database connection:

   ```bash
   docker-compose logs postgres
   docker-compose exec postgres psql -U postgres -d nodeapp -c "SELECT 1;"
   ```

2. Check if logs table exists:

   ```bash
   docker-compose exec postgres psql -U postgres -d nodeapp -c "\dt"
   ```

3. Check application logs for database transport errors

4. Verify the flush interval has passed (wait 6 seconds after generating logs)

### Performance Issues

If logging is too slow:

1. Increase batch size in `DatabaseTransport`
2. Increase flush interval
3. Add more database connections in pool
4. Consider disabling database logging for debug-level logs

### Database Growing Too Large

Implement regular cleanup:

```typescript
// Schedule this to run daily
import { logService } from '@/services/log';

async function cleanupOldLogs() {
  const retentionDays = 30; // Keep logs for 30 days
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const deleted = await logService.deleteOldLogs(cutoffDate);
  console.log(`Cleaned up ${deleted} old logs`);
}
```

## Conclusion

The database logging feature is now fully implemented and tested. It provides:

- ✅ Persistent log storage in PostgreSQL
- ✅ Efficient batch processing
- ✅ Flexible querying capabilities
- ✅ Production-ready performance
- ✅ Comprehensive tests
- ✅ Full documentation

All logs are now automatically persisted to the database alongside console and file logging, making it easy to analyze application behavior and debug issues in production.
