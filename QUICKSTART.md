# Quick Start Guide

This guide will help you get started with the Node.js template quickly.

## 1. Prerequisites

Make sure you have installed:

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker and Docker Compose

## 2. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd node-js-template

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration
```

## 3. Start Development Services

```bash
# Start PostgreSQL, Redis, Kafka, and MinIO using Docker Compose
docker-compose up -d postgres redis kafka zookeeper minio

# Wait a few seconds for services to be ready
# Check services are running
docker-compose ps
```

## 4. Start Development Server

```bash
# Start the application in development mode with hot reload
npm run dev
```

The server will start on http://localhost:3000

## 5. Verify Installation

```bash
# Check health endpoint
curl http://localhost:3000/api/v1/health

# You should see a response like:
# {
#   "success": true,
#   "data": {
#     "status": "healthy",
#     "uptime": 10.234,
#     "services": {
#       "database": true,
#       "redis": true,
#       "kafka": true,
#       "minio": true
#     }
#   }
# }
```

## 6. Run Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 7. Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 8. Using Docker

```bash
# Build and start all services including the application
docker-compose up

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down
```

## Common Commands

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Start development server with hot reload |
| `npm run build`     | Build for production                     |
| `npm start`         | Start production server                  |
| `npm test`          | Run tests                                |
| `npm run lint`      | Lint and fix code                        |
| `npm run format`    | Format code with Prettier                |
| `npm run typecheck` | Run TypeScript type checking             |

## Next Steps

1. **Explore the Code**: Check out the `src/` directory structure
2. **Read the Documentation**: See [README.md](./README.md) for detailed information
3. **Add Your Features**: Start building your application
4. **Follow Best Practices**: See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines

## Troubleshooting

### Services Not Starting

```bash
# Check if services are running
docker-compose ps

# Check service logs
docker-compose logs postgres
docker-compose logs redis
docker-compose logs kafka

# Restart services
docker-compose restart
```

### Database Connection Issues

```bash
# Ensure PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify environment variables in .env
cat .env | grep DB_
```

### Port Already in Use

If you see "port already in use" errors:

```bash
# Find process using the port (example for port 3000)
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change the port in .env
PORT=3001
```

## Support

For issues and questions, please open an issue on GitHub.

Happy coding! 🎉
