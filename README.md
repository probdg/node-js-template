# Node.js Template with Best Practices

A production-ready Node.js/TypeScript template following industry best practices, designed for microservices architecture with PostgreSQL, Redis, Kafka, MinIO, and RBAC (Role-Based Access Control).

## 🚀 Features

- **TypeScript** - Strict type safety with modern TypeScript 5.5+
- **Express.js** - Fast, unopinionated web framework
- **PostgreSQL** - Robust relational database with connection pooling
- **Redis** - High-performance caching and session management
- **Kafka** - Event-driven messaging system for microservices
- **MinIO** - S3-compatible object storage for file management
- **RBAC** - Complete role-based access control system
- **JWT Authentication** - Secure token-based authentication
- **Input Validation** - Request validation using Zod
- **Security** - Helmet, CORS, rate limiting, and security best practices
- **Testing** - Comprehensive unit and integration tests with Vitest
- **Code Quality** - ESLint, Prettier, Husky pre-commit hooks
- **SonarQube** - Code quality and security analysis configuration
- **Docker** - Multi-stage builds for optimized production images
- **CI/CD** - GitHub Actions workflow for automated testing and deployment

## 📋 Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker and Docker Compose (for running services)
- PostgreSQL 16+
- Redis 7+
- Kafka 3.6+
- MinIO

## 🛠️ Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd node-js-template
```

2. **Install dependencies**

```bash
npm install
```

3. **Setup environment variables**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start infrastructure services**

```bash
docker-compose up -d postgres redis kafka zookeeper minio
```

5. **Initialize database**

```bash
# The init-db.sql script will run automatically when PostgreSQL starts
# Or you can run it manually:
npm run migration:run
```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start
```

### Using Docker

```bash
# Build and run all services
docker-compose up

# Run in detached mode
docker-compose up -d

# Stop all services
docker-compose down
```

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint and fix issues |
| `npm run format` | Format code with Prettier |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate test coverage report |
| `npm run typecheck` | Run TypeScript type checking |

## 🏗️ Project Structure

```
node-js-template/
├── src/
│   ├── api/              # API route handlers
│   │   └── health.ts     # Health check endpoints
│   ├── middleware/       # Express middleware
│   │   ├── auth.ts       # Authentication middleware
│   │   ├── rbac.ts       # Role-based access control
│   │   ├── validation.ts # Request validation
│   │   └── error.ts      # Error handling
│   ├── services/         # External service clients
│   │   ├── database.ts   # PostgreSQL service
│   │   ├── redis.ts      # Redis service
│   │   ├── kafka.ts      # Kafka service
│   │   ├── minio.ts      # MinIO service
│   │   └── logger.ts     # Winston logger
│   ├── models/           # Database models
│   ├── utils/            # Utility functions
│   │   ├── response.ts   # API response helpers
│   │   └── schemas.ts    # Zod validation schemas
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts      # Shared types
│   ├── constants/        # Application constants
│   │   └── index.ts      # HTTP status, roles, permissions
│   └── index.ts          # Application entry point
├── config/
│   └── index.ts          # Configuration management
├── tests/
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── scripts/
│   └── init-db.sql       # Database initialization
├── .github/
│   └── workflows/
│       └── ci.yml        # CI/CD pipeline
├── docker-compose.yml    # Multi-container setup
├── Dockerfile            # Production container
├── tsconfig.json         # TypeScript configuration
├── eslint.config.mjs     # ESLint configuration
├── vitest.config.ts      # Vitest configuration
└── sonar-project.properties # SonarQube configuration
```

## 🔐 Authentication & Authorization

### Authentication Flow

1. User logs in with email/password
2. Server validates credentials
3. Server generates JWT access token and refresh token
4. Client stores tokens and includes access token in requests
5. Server validates token on protected routes

### RBAC System

The template includes a complete RBAC system with:

- **Roles**: Admin, User, Guest
- **Permissions**: Fine-grained access control
- **Middleware**: `requireRole()`, `requirePermission()`, `requireAdmin()`

**Example Usage:**

```typescript
import { requireRole, requirePermission } from '@/middleware/rbac';
import { USER_ROLES, PERMISSIONS } from '@/constants';

// Require specific role
router.get('/admin', authenticateToken, requireRole(USER_ROLES.ADMIN), handler);

// Require specific permission
router.post('/users', authenticateToken, requirePermission(PERMISSIONS.USER_CREATE), handler);
```

## 🗄️ Database

### Schema

- **users** - User accounts with roles
- **roles** - Role definitions
- **permissions** - Permission definitions
- **role_permissions** - Role-permission mappings
- **files** - File metadata
- **sessions** - User sessions

### Migrations

Database schema is initialized automatically using `scripts/init-db.sql` when PostgreSQL container starts.

## 📦 Services

### PostgreSQL

Connection pooling with automatic reconnection and health checks.

```typescript
import { databaseService } from '@/services/database';

const result = await databaseService.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### Redis

Caching with TTL support and JSON serialization.

```typescript
import { redisService } from '@/services/redis';

await redisService.setJson('user:123', userData, 3600);
const user = await redisService.getJson('user:123');
```

### Kafka

Event-driven messaging with producer and consumer support.

```typescript
import { kafkaService } from '@/services/kafka';
import { KAFKA_TOPICS } from '@/constants';

// Publish event
await kafkaService.publish({
  topic: KAFKA_TOPICS.USER_CREATED,
  value: { userId: '123', email: 'user@example.com' },
});

// Subscribe to events
await kafkaService.subscribe(KAFKA_TOPICS.USER_CREATED, async (payload) => {
  console.log('User created:', payload.message.value);
});
```

### MinIO

S3-compatible object storage for file uploads.

```typescript
import { minioService } from '@/services/minio';

// Upload file
await minioService.uploadFile('filename.jpg', buffer, { 'Content-Type': 'image/jpeg' });

// Get presigned URL
const url = await minioService.getFileUrl('filename.jpg');
```

## 🧪 Testing

The template uses Vitest for fast unit and integration testing.

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('MyFunction', () => {
  it('should return expected value', () => {
    const result = myFunction();
    expect(result).toBe('expected');
  });
});
```

## 🔍 Code Quality

### ESLint

Configured with TypeScript, security, and import plugins.

```bash
npm run lint
```

### Prettier

Consistent code formatting across the project.

```bash
npm run format
```

### Pre-commit Hooks

Husky and lint-staged ensure code quality before commits.

- Auto-format with Prettier
- Fix ESLint issues
- Validate commit messages (Conventional Commits)

### SonarQube

Run SonarQube analysis for code quality and security:

```bash
sonar-scanner
```

## 🚢 Deployment

### Docker

Build and push Docker image:

```bash
docker build -t node-js-template:latest .
docker push your-registry/node-js-template:latest
```

### Environment Variables

Ensure all required environment variables are set in production:

- Database credentials
- Redis configuration
- Kafka brokers
- MinIO credentials
- JWT secrets
- CORS origins

## 📊 Health Checks

The application exposes several health check endpoints:

- `GET /api/v1/health` - Overall health status
- `GET /api/v1/health/live` - Liveness probe
- `GET /api/v1/health/ready` - Readiness probe

## 🔒 Security

### Implemented Security Features

- **Helmet** - Security headers (XSS, clickjacking protection)
- **CORS** - Configurable cross-origin resource sharing
- **Rate Limiting** - Protection against brute force attacks
- **JWT** - Secure token-based authentication
- **Input Validation** - Zod schemas for all inputs
- **SQL Injection Prevention** - Parameterized queries
- **Password Hashing** - Bcrypt for secure password storage
- **Security Middleware** - Request sanitization and validation

### Best Practices

1. Never commit secrets to version control
2. Use environment variables for configuration
3. Implement proper error handling
4. Log security events
5. Keep dependencies updated
6. Follow principle of least privilege

## 📚 API Documentation

### Standard Response Format

All API responses follow a standard format:

```typescript
// Success response
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "pagination": { ... }
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test changes
- `chore:` Build process or auxiliary tool changes

## 📄 License

This project is licensed under the MIT License.

## 👥 Support

For issues and questions, please open an issue on GitHub.

## 🙏 Acknowledgments

This template is based on best practices from:
- [sadigitID/nuxt-template](https://github.com/sadigitID/nuxt-template)
- Node.js community guidelines
- SonarQube quality standards
- OWASP security recommendations

---

**Happy Coding! 🎉**