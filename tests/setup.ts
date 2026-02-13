// Setup environment variables for testing
process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.API_VERSION = 'v1';

// Database
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'nodeapp_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.DB_POOL_MIN = '2';
process.env.DB_POOL_MAX = '10';

// Redis
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = 'test-password';
process.env.REDIS_DB = '0';
process.env.REDIS_TTL = '3600';

// Kafka
process.env.KAFKA_BROKERS = 'localhost:9092';
process.env.KAFKA_CLIENT_ID = 'node-app-test';
process.env.KAFKA_GROUP_ID = 'node-app-group-test';

// MinIO
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_PORT = '9000';
process.env.MINIO_USE_SSL = 'false';
process.env.MINIO_ACCESS_KEY = 'minioadmin';
process.env.MINIO_SECRET_KEY = 'minioadmin';
process.env.MINIO_BUCKET = 'uploads';

// JWT
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1d';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Rate Limiting
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';

// Logging
process.env.LOG_LEVEL = 'error';
process.env.LOG_FILE = 'logs/test.log';

// CORS
process.env.CORS_ORIGIN = 'http://localhost:3000';
