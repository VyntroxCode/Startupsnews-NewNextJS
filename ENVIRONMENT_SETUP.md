# Environment Setup Guide

## Overview

This document provides complete instructions for setting up the environment variables and database for the Zox Next.js application.

---

## 📋 Prerequisites

- Docker Desktop installed and running
- Node.js 20+ installed
- npm or yarn package manager

---

## 🚀 Quick Setup

### 1. Start Docker Services

```bash
npm run docker:up
```

This starts:
- MariaDB on port 3306
- Redis on port 6382
- Adminer (DB UI) on port 8080
- Redis Commander on port 8081

### 2. Create Environment File

```bash
npm run env:create
```

This creates `.env.local` with all required variables.

### 3. Initialize Database

```bash
# Run migrations (create tables)
npm run db:migrate

# Seed database (migrate data from data.ts)
npm run db:seed
```

### 4. Start Application

```bash
npm run dev
```

---

## 📝 Environment Variables

### Required Variables

All environment variables are documented in `.env.example`. The following are required:

#### Database Configuration
```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=zox_db
DB_USER=zox_user
DB_PASSWORD=zox_password
DATABASE_URL=mysql://zox_user:zox_password@localhost:3306/zox_db
```

#### Redis Configuration
```bash
REDIS_URL=redis://localhost:6382
REDIS_HOST=localhost
REDIS_PORT=6382
```

#### Application Configuration
```bash
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000
```

#### JWT Authentication
```bash
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

#### File Upload
```bash
UPLOAD_MAX_SIZE=5242880  # 5MB
UPLOAD_DIR=./public/uploads
```

#### Admin User (for seed script)
```bash
ADMIN_EMAIL=admin@startupnews.fyi
ADMIN_PASSWORD=Admin@123!
ADMIN_NAME=Admin User
```

---

## 🔐 Admin Credentials

After running `npm run db:seed`, you can login with:

**Email:** `admin@startupnews.fyi`  
**Password:** `Admin@123!`

**⚠️ Change these credentials in production!**

---

## 📊 Database Schema

The database includes the following tables:

1. **users** - User accounts and authentication
2. **categories** - Post categories
3. **posts** - Blog posts/articles
4. **post_tags** - Tags for posts
5. **events** - Startup events
6. **analytics** - Analytics data
7. **sessions** - User sessions
8. **settings** - Application settings

---

## 🧪 Verification

### Test Database Connection

```bash
npm run docker:test
```

### Verify Data Migration

```bash
# Check posts count
docker exec zox-mariadb mariadb -uzox_user -pzox_password zox_db -e "SELECT COUNT(*) FROM posts;"

# Check events count
docker exec zox-mariadb mariadb -uzox_user -pzox_password zox_db -e "SELECT COUNT(*) FROM events;"

# Check categories count
docker exec zox-mariadb mariadb -uzox_user -pzox_password zox_db -e "SELECT COUNT(*) FROM categories;"
```

### Test Admin Login

```bash
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@startupnews.fyi","password":"Admin@123!"}'
```

---

## 🔄 Reset Database

To completely reset the database and re-seed:

```bash
npm run db:reset
```

This will:
1. Stop and remove Docker containers and volumes
2. Start fresh containers
3. Run migrations
4. Seed data

---

## 📚 Additional Resources

- **Docker Setup:** See `DOCKER_SETUP_ANALYSIS.md`
- **Migration Details:** See `DATABASE_MIGRATION_SUMMARY.md`
- **API Documentation:** See `FINAL_ARCHITECTURE.md`

---

## ⚠️ Troubleshooting

### Database Connection Issues

1. Check Docker containers are running:
   ```bash
   docker-compose ps
   ```

2. Check database is accessible:
   ```bash
   docker exec zox-mariadb mariadb -uzox_user -pzox_password zox_db -e "SELECT 1;"
   ```

### Redis Connection Issues

1. Verify Redis port (should be 6382):
   ```bash
   docker-compose ps redis
   ```

2. Update `.env.local` if port changed:
   ```bash
   REDIS_URL=redis://localhost:6382
   ```

### Seed Script Errors

1. Ensure database is initialized:
   ```bash
   npm run db:migrate
   ```

2. Check environment variables are set:
   ```bash
   cat .env.local
   ```

---

## ✅ Setup Complete

Once all steps are completed:
- ✅ Docker services running
- ✅ Environment variables configured
- ✅ Database initialized
- ✅ Data migrated
- ✅ Admin user created

You can now:
- Access the application at `http://localhost:3000`
- Login to admin panel with credentials above
- Manage posts, categories, and events via API or admin panel

