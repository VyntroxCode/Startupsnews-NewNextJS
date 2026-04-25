# Docker Setup Guide

This guide will help you set up the local development environment using Docker.

## Prerequisites

- Docker Desktop installed (Windows/Mac) or Docker Engine (Linux)
- Node.js 20+ installed
- npm or yarn

## Quick Start

### 1. Start Docker Services

```bash
# Start all services (MariaDB, Redis, Adminer, Redis Commander)
npm run docker:up

# Or using docker-compose directly
docker-compose up -d
```

This will start:
- **MariaDB** on port `3306`
- **Redis** on port `6379`
- **Adminer** (Database UI) on port `8080`
- **Redis Commander** (Redis UI) on port `8081`

### 2. Setup Environment Variables

```bash
# Copy example environment file
cp .env.example .env.local

# Edit .env.local with your preferred values (optional)
# The default values should work for local development
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Verify Services

Check if services are running:

```bash
# Check Docker containers
docker-compose ps

# Check MariaDB connection
docker-compose exec mariadb mysql -u zox_user -pzox_password -e "SHOW DATABASES;"

# Check Redis connection
docker-compose exec redis redis-cli ping
```

### 5. Access Management UIs

- **Adminer (Database UI)**: http://localhost:8080
  - System: `MySQL`
  - Server: `mariadb`
  - Username: `zox_user`
  - Password: `zox_password`
  - Database: `zox_db`

- **Redis Commander**: http://localhost:8081
  - No authentication needed for local development

### 6. Start Development Server

```bash
npm run dev
```

Your Next.js app will be available at http://localhost:3000

## Docker Commands

### Start Services
```bash
npm run docker:up
# or
docker-compose up -d
```

### Stop Services
```bash
npm run docker:down
# or
docker-compose down
```

### View Logs
```bash
npm run docker:logs
# or
docker-compose logs -f

# View logs for specific service
docker-compose logs -f mariadb
docker-compose logs -f redis
```

### Restart Services
```bash
npm run docker:restart
# or
docker-compose restart
```

### Stop and Remove Volumes (Clean Reset)
```bash
docker-compose down -v
```

## Database Management

### Access MariaDB CLI

```bash
# Interactive shell
docker-compose exec mariadb mysql -u zox_user -p zox_db

# Execute SQL command
docker-compose exec mariadb mysql -u zox_user -pzox_password zox_db -e "SHOW TABLES;"
```

### Access Redis CLI

```bash
docker-compose exec redis redis-cli

# Test connection
docker-compose exec redis redis-cli ping
# Should return: PONG
```

### Database Initialization

The database schema is automatically initialized when the MariaDB container starts for the first time using `scripts/init-db.sql`.

If you need to reset the database:

```bash
# Stop and remove volumes
docker-compose down -v

# Start again (will reinitialize)
docker-compose up -d
```

## Troubleshooting

### Port Already in Use

If you get port conflicts:

1. **Check what's using the port:**
   ```bash
   # Windows
   netstat -ano | findstr :3306
   
   # Mac/Linux
   lsof -i :3306
   ```

2. **Change port in docker-compose.yml:**
   ```yaml
   ports:
     - "3307:3306"  # Change 3306 to 3307
   ```

3. **Update .env.local** with new port

### Database Connection Issues

1. **Check if MariaDB is running:**
   ```bash
   docker-compose ps
   ```

2. **Check MariaDB logs:**
   ```bash
   docker-compose logs mariadb
   ```

3. **Verify credentials in .env.local match docker-compose.yml**

### Redis Connection Issues

1. **Check if Redis is running:**
   ```bash
   docker-compose ps
   ```

2. **Test Redis connection:**
   ```bash
   docker-compose exec redis redis-cli ping
   ```

3. **Check Redis logs:**
   ```bash
   docker-compose logs redis
   ```

### Container Won't Start

1. **Check Docker is running:**
   ```bash
   docker ps
   ```

2. **Check for errors:**
   ```bash
   docker-compose logs
   ```

3. **Try rebuilding:**
   ```bash
   docker-compose up -d --force-recreate
   ```

## Data Persistence

Data is persisted in Docker volumes:
- `mariadb_data` - Database data
- `redis_data` - Redis data

To completely reset (delete all data):
```bash
docker-compose down -v
```

## Production Considerations

For production deployment:
- Use managed database services (RDS, etc.)
- Use managed Redis (ElastiCache, etc.)
- Don't use Adminer/Redis Commander in production
- Use environment-specific configuration
- Enable SSL/TLS for database connections

## Next Steps

After Docker setup:
1. Run database migrations: `npm run db:migrate`
2. Seed database (optional): `npm run db:seed`
3. Start development: `npm run dev`

See `FINAL_ARCHITECTURE.md` for complete architecture details.

