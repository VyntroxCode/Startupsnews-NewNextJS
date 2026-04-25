# Complete Setup Guide for New PC

This guide explains how to set up the project on a new PC, including database and Redis setup.

## 📋 Current Situation

### What Transfers with Code:
✅ **Code files** - All source code, components, pages  
✅ **Database schema** - `scripts/init-db.sql` (table structure)  
✅ **Seed script** - `scripts/seed.ts` (can recreate data)  
✅ **Docker config** - `docker-compose.yml` (service configuration)  
✅ **Environment template** - `.env.example` (configuration template)

### What DOES NOT Transfer:
❌ **Docker volumes** - Database and Redis data stored locally  
❌ **Environment file** - `.env.local` (should be gitignored)  
❌ **Actual database data** - Posts, events, categories, users  
❌ **Redis cache** - Cached data

---

## 🚀 Setup on New PC (Fresh Start)

### Step 1: Prerequisites
```bash
# Install required software
- Node.js 20+ (https://nodejs.org/)
- Docker Desktop (https://www.docker.com/products/docker-desktop/)
- Git (https://git-scm.com/)
```

### Step 2: Clone Repository
```bash
git clone <repository-url>
cd zox-nextjs
```

### Step 3: Install Dependencies
```bash
npm install
```

### Step 4: Create Environment File
```bash
npm run env:create
```
This creates `.env.local` with default values. Edit if needed.

### Step 5: Start Docker Services
```bash
npm run docker:up
```
This will:
- Start MariaDB container (fresh database)
- Start Redis container (fresh cache)
- Start Adminer (database UI) on port 8080
- Start Redis Commander on port 8081

### Step 6: Initialize Database Schema
```bash
npm run db:migrate
```
This creates all database tables (empty).

### Step 7: Seed Database with Initial Data (Optional)
```bash
npm run db:seed
```
This will:
- Create admin user
- Create all categories
- Migrate posts from `src/lib/data.ts` (if file exists)
- Migrate events from `src/lib/data.ts` (if file exists)

**⚠️ Important:** If you've removed `src/lib/data.ts`, the seed script will only create the admin user and categories. To get your actual data (posts, events), you need to **export from the old PC and import on the new PC** (see "Transferring Data" section below).

### Step 8: Start Development Server
```bash
npm run dev
```

---

## 📦 Transferring Data from Old PC

If you want to transfer the **actual database data** (posts, events, categories) from your old PC:

### Option 1: Database Dump (Recommended)

#### On Old PC:
```bash
# Export database
docker exec zox-mariadb mysqldump -u zox_user -pzox_password zox_db > database-backup.sql

# Or using Docker Compose
docker-compose exec mariadb mysqldump -u zox_user -pzox_password zox_db > database-backup.sql
```

#### On New PC:
```bash
# 1. Start Docker services first
npm run docker:up

# 2. Wait for MariaDB to be ready (30-60 seconds)
# 3. Import database
docker exec -i zox-mariadb mysql -u zox_user -pzox_password zox_db < database-backup.sql

# Or using Docker Compose
docker-compose exec -T mariadb mysql -u zox_user -pzox_password zox_db < database-backup.sql
```

### Option 2: Copy Docker Volumes

#### On Old PC:
```bash
# Find volume location
docker volume inspect zox-nextjs_mariadb_data

# Copy volume data (location will be shown in output)
# On Windows: Usually in C:\ProgramData\docker\volumes\
# On Mac/Linux: Usually in /var/lib/docker/volumes/
```

#### On New PC:
```bash
# Stop Docker services
npm run docker:down

# Copy volume data to new location
# (Location shown by docker volume inspect)

# Start Docker services
npm run docker:up
```

**⚠️ Warning:** Volume copying is complex and platform-specific. Database dump is recommended.

---

## 🔄 Complete Reset (If Needed)

If you want to start completely fresh:

```bash
# This will:
# 1. Stop and remove all containers
# 2. Remove all volumes (deletes all data)
# 3. Start fresh containers
# 4. Run migrations
# 5. Seed database
npm run db:reset
```

---

## 📊 What Gets Created

After running `npm run db:seed`:

- ✅ **1 Admin User**
  - Email: `admin@startupnews.fyi`
  - Password: `Admin@123!`

- ✅ **40 Categories**
  - 32 post categories
  - 8 event location categories

- ✅ **473 Posts** (if seed script has data source)
- ✅ **44 Events** (if seed script has data source)

---

## 🔍 Verify Setup

### Check Docker Services:
```bash
npm run docker:status
# or
docker ps
```

### Test Database Connection:
```bash
npm run docker:test
```

### Access Adminer (Database UI):
- URL: http://localhost:8080
- System: MySQL
- Server: mariadb
- Username: zox_user
- Password: zox_password
- Database: zox_db

### Access Redis Commander:
- URL: http://localhost:8081

---

## ⚠️ Important Notes

1. **Environment Variables**: `.env.local` is gitignored and must be created on each PC
2. **Docker Volumes**: Data is stored in Docker volumes, not in the codebase
3. **Database Data**: To transfer actual data, use database dump method
4. **Redis Cache**: Cache is ephemeral and will be empty on new PC (this is fine)
5. **Uploaded Files**: Files in `public/uploads/` need to be copied separately if you have any

---

## 🆘 Troubleshooting

### Database connection fails:
- Check Docker is running: `docker ps`
- Check MariaDB container is healthy: `docker logs zox-mariadb`
- Verify `.env.local` has correct database credentials

### Port conflicts:
- MariaDB: Change port in `docker-compose.yml` (default: 3306)
- Redis: Already on 6382 to avoid conflicts
- Adminer: Change port in `docker-compose.yml` (default: 8080)

### Seed script fails:
- Ensure database is migrated first: `npm run db:migrate`
- Check database connection: `npm run docker:test`
- Verify seed script has data source (may need update after removing static data)

---

## 📝 Summary

**For Fresh Setup:**
1. Clone repo → Install deps → Create .env → Start Docker → Migrate → Seed → Run dev

**For Data Transfer:**
1. Export database from old PC → Import on new PC

**Result:**
- Fresh database with schema
- Data from seed script OR imported from old PC
- Redis cache (empty, will populate as app runs)
- All services running and ready

