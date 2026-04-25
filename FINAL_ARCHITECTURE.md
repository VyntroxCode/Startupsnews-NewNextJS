# Zox Next.js - Monolithic Modular Architecture

**Date:** February 2025  
**Project:** StartupNews.fyi - News Platform  
**Framework:** Next.js 16.1.6 with App Router  
**Architecture:** Monolithic with Modular Structure  
**Local Development:** Docker Compose (MariaDB, Redis, etc.)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Module Structure](#module-structure)
3. [Complete File Architecture](#complete-file-architecture)
4. [Docker Setup for Local Development](#docker-setup-for-local-development)
5. [Module Details](#module-details)
6. [Code Refactoring Plan](#code-refactoring-plan)
7. [Database Schema](#database-schema)
8. [API Routes Structure](#api-routes-structure)
9. [Environment Configuration](#environment-configuration)
10. [Development Workflow](#development-workflow)

---

## Architecture Overview

### Monolithic Modular Architecture

This project follows a **monolithic modular architecture** where:
- All code lives in a single Next.js application
- Code is organized into **feature modules** (Posts, Events, Categories, Users, Admin, etc.)
- Each module is self-contained with its own:
  - Domain models/types
  - Repository layer (data access)
  - Service layer (business logic)
  - API routes
  - UI components
  - Hooks

### Module Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Monolith                      │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  Posts   │  │  Events   │  │ Categories│            │
│  │  Module  │  │  Module   │  │  Module   │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │  Users   │  │  Admin   │  │ Analytics │            │
│  │  Module  │  │  Module  │  │  Module   │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│                                                          │
│  ┌──────────────────────────────────────────┐         │
│  │         Shared Infrastructure              │         │
│  │  (Database, Cache, Storage, Utils)          │         │
│  └──────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

### Local Development Stack

```
┌─────────────────────────────────────────┐
│      Next.js Application (Port 3000)    │
└──────────────┬──────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────┐         ┌──────▼────┐
│MariaDB │         │   Redis    │
│:3306   │         │  :6379     │
└────────┘         └───────────┘
```

---

## Module Structure

### Core Modules

1. **Posts Module** - News articles, blog posts
2. **Events Module** - Startup events management
3. **Categories Module** - Post categories and sectors
4. **Users Module** - User management and authentication
5. **Admin Module** - Admin dashboard and CMS
6. **Analytics Module** - Statistics and tracking
7. **Search Module** - Search functionality
8. **Cron Module** - Scheduled tasks (within monolith)

### Module Template Structure

Each module follows this structure:

```
modules/{module-name}/
├── domain/              # Domain models and types
│   ├── types.ts
│   └── entities.ts
├── repository/          # Data access layer
│   └── {module}.repository.ts
├── service/             # Business logic
│   └── {module}.service.ts
├── api/                 # API routes
│   └── route.ts
├── components/          # UI components
│   ├── {Module}List.tsx
│   ├── {Module}Card.tsx
│   └── {Module}Form.tsx
├── hooks/              # React hooks
│   └── use{Module}.ts
└── utils/              # Module-specific utilities
    └── {module}.utils.ts
```

---

## Complete File Architecture

```
zox-nextjs/
├── .env.local                    # Local environment variables
├── .env.example                  # Example environment file
├── .gitignore
├── .dockerignore
├── .eslintrc.json
├── .prettierrc
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── README.md
├── FINAL_ARCHITECTURE.md         # This file
│
├── docker-compose.yml            # Docker Compose for local services
├── Dockerfile                    # Production Dockerfile
├── Dockerfile.dev                # Development Dockerfile
│
├── public/                       # Static assets
│   ├── images/
│   │   ├── logos/
│   │   ├── posts/
│   │   ├── events/
│   │   └── uploads/
│   ├── favicon.ico
│   └── robots.txt
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx           # Root layout
│   │   ├── page.tsx             # Homepage
│   │   ├── loading.tsx          # Global loading UI
│   │   ├── error.tsx            # Global error boundary
│   │   ├── not-found.tsx        # 404 page
│   │   ├── globals.css          # Global styles
│   │   │
│   │   ├── (public)/            # Public routes group
│   │   │   ├── news/
│   │   │   │   ├── page.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── post/
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── loading.tsx
│   │   │   ├── category/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx
│   │   │   ├── sectors/
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx
│   │   │   ├── events/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── event-by-country/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx
│   │   │   ├── search/
│   │   │   │   └── page.tsx
│   │   │   ├── about/
│   │   │   │   └── page.tsx
│   │   │   ├── contact/
│   │   │   │   └── page.tsx
│   │   │   └── api/             # Public API routes
│   │   │       ├── posts/
│   │   │       │   ├── route.ts
│   │   │       │   └── [slug]/
│   │   │       │       └── route.ts
│   │   │       ├── categories/
│   │   │       │   └── route.ts
│   │   │       ├── events/
│   │   │       │   ├── route.ts
│   │   │       │   └── [slug]/
│   │   │       │       └── route.ts
│   │   │       └── health/
│   │   │           └── route.ts
│   │   │
│   │   ├── (admin)/             # Admin routes group (protected)
│   │   │   ├── layout.tsx      # Admin layout with sidebar
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx    # Admin dashboard home
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── posts/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── create/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── edit/
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── categories/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── create/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── edit/
│   │   │   │   │       └── [id]/
│   │   │   │   │           └── page.tsx
│   │   │   │   ├── events/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── create/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── edit/
│   │   │   │   │       └── [id]/
│   │   │   │   │           └── page.tsx
│   │   │   │   ├── users/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── create/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── edit/
│   │   │   │   │       └── [id]/
│   │   │   │   │           └── page.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── analytics/
│   │   │   │       └── page.tsx
│   │   │   └── api/             # Admin API routes
│   │   │       ├── auth/
│   │   │       │   ├── login/
│   │   │       │   │   └── route.ts
│   │   │       │   ├── logout/
│   │   │       │   │   └── route.ts
│   │   │       │   └── verify/
│   │   │       │       └── route.ts
│   │   │       ├── posts/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts
│   │   │       ├── categories/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts
│   │   │       ├── events/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts
│   │   │       ├── users/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts
│   │   │       ├── upload/
│   │   │       │   └── route.ts
│   │   │       └── analytics/
│   │   │           └── route.ts
│   │   │
│   │   └── api/                 # Cron job endpoints (internal)
│   │       └── cron/
│   │           ├── update-trending/
│   │           │   └── route.ts
│   │           ├── cleanup-posts/
│   │           │   └── route.ts
│   │           ├── generate-sitemap/
│   │           │   └── route.ts
│   │           └── sync-events/
│   │               └── route.ts
│   │
│   ├── modules/                  # Feature modules (MODULAR STRUCTURE)
│   │   │
│   │   ├── posts/                # Posts Module
│   │   │   ├── domain/
│   │   │   │   ├── types.ts      # Post types/interfaces
│   │   │   │   └── entities.ts   # Post entity
│   │   │   ├── repository/
│   │   │   │   └── posts.repository.ts
│   │   │   ├── service/
│   │   │   │   └── posts.service.ts
│   │   │   ├── components/
│   │   │   │   ├── PostCard.tsx
│   │   │   │   ├── PostList.tsx
│   │   │   │   ├── PostForm.tsx
│   │   │   │   ├── PostEditor.tsx
│   │   │   │   └── PostFilters.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── usePosts.ts
│   │   │   │   └── usePost.ts
│   │   │   └── utils/
│   │   │       └── posts.utils.ts
│   │   │
│   │   ├── events/               # Events Module
│   │   │   ├── domain/
│   │   │   │   ├── types.ts
│   │   │   │   └── entities.ts
│   │   │   ├── repository/
│   │   │   │   └── events.repository.ts
│   │   │   ├── service/
│   │   │   │   └── events.service.ts
│   │   │   ├── components/
│   │   │   │   ├── EventCard.tsx
│   │   │   │   ├── EventList.tsx
│   │   │   │   └── EventForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useEvents.ts
│   │   │   └── utils/
│   │   │       └── events.utils.ts
│   │   │
│   │   ├── categories/            # Categories Module
│   │   │   ├── domain/
│   │   │   │   ├── types.ts
│   │   │   │   └── entities.ts
│   │   │   ├── repository/
│   │   │   │   └── categories.repository.ts
│   │   │   ├── service/
│   │   │   │   └── categories.service.ts
│   │   │   ├── components/
│   │   │   │   ├── CategoryCard.tsx
│   │   │   │   └── CategoryList.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useCategories.ts
│   │   │   └── utils/
│   │   │       └── categories.utils.ts
│   │   │
│   │   ├── users/                # Users Module
│   │   │   ├── domain/
│   │   │   │   ├── types.ts
│   │   │   │   └── entities.ts
│   │   │   ├── repository/
│   │   │   │   └── users.repository.ts
│   │   │   ├── service/
│   │   │   │   ├── users.service.ts
│   │   │   │   └── auth.service.ts
│   │   │   ├── components/
│   │   │   │   ├── UserCard.tsx
│   │   │   │   └── UserForm.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useUsers.ts
│   │   │   │   └── useAuth.ts
│   │   │   └── utils/
│   │   │       └── auth.utils.ts
│   │   │
│   │   ├── admin/                # Admin Module
│   │   │   ├── domain/
│   │   │   │   └── types.ts
│   │   │   ├── service/
│   │   │   │   └── admin.service.ts
│   │   │   ├── components/
│   │   │   │   ├── AdminSidebar.tsx
│   │   │   │   ├── AdminHeader.tsx
│   │   │   │   ├── AdminLayout.tsx
│   │   │   │   └── DashboardStats.tsx
│   │   │   └── hooks/
│   │   │       └── useAdmin.ts
│   │   │
│   │   ├── analytics/            # Analytics Module
│   │   │   ├── domain/
│   │   │   │   └── types.ts
│   │   │   ├── repository/
│   │   │   │   └── analytics.repository.ts
│   │   │   ├── service/
│   │   │   │   └── analytics.service.ts
│   │   │   ├── components/
│   │   │   │   ├── AnalyticsChart.tsx
│   │   │   │   └── AnalyticsStats.tsx
│   │   │   └── hooks/
│   │   │       └── useAnalytics.ts
│   │   │
│   │   ├── search/               # Search Module
│   │   │   ├── service/
│   │   │   │   └── search.service.ts
│   │   │   ├── components/
│   │   │   │   └── SearchResults.tsx
│   │   │   └── hooks/
│   │   │       └── useSearch.ts
│   │   │
│   │   └── cron/                 # Cron Jobs Module
│   │       ├── jobs/
│   │       │   ├── updateTrendingPosts.ts
│   │       │   ├── cleanupOldPosts.ts
│   │       │   ├── generateSitemap.ts
│   │       │   └── syncEvents.ts
│   │       ├── service/
│   │       │   └── cron.service.ts
│   │       └── scheduler.ts      # Cron scheduler
│   │
│   ├── shared/                   # Shared infrastructure
│   │   ├── database/             # Database layer
│   │   │   ├── connection.ts    # MariaDB connection
│   │   │   ├── migrations/      # Database migrations
│   │   │   │   ├── 001_initial_schema.sql
│   │   │   │   ├── 002_add_indexes.sql
│   │   │   │   └── ...
│   │   │   └── seed.ts           # Database seeding
│   │   │
│   │   ├── cache/                # Caching layer
│   │   │   └── redis.client.ts
│   │   │
│   │   ├── storage/              # File storage
│   │   │   └── file-storage.ts
│   │   │
│   │   ├── utils/                # Shared utilities
│   │   │   ├── date.utils.ts
│   │   │   ├── string.utils.ts
│   │   │   ├── image.utils.ts
│   │   │   ├── validation.utils.ts
│   │   │   └── error.utils.ts
│   │   │
│   │   ├── constants/            # App constants
│   │   │   └── app.constants.ts
│   │   │
│   │   └── types/                # Shared types
│   │       ├── api.types.ts
│   │       └── common.types.ts
│   │
│   ├── components/               # Shared UI components
│   │   ├── ui/                   # Base UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Textarea.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorMessage.tsx
│   │   │   └── ImageUpload.tsx
│   │   │
│   │   ├── layout/               # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── ... (existing components)
│   │   │
│   │   └── features/             # Feature components (legacy - will migrate to modules)
│   │       └── ... (existing components)
│   │
│   ├── middleware/               # Next.js middleware
│   │   ├── auth.middleware.ts
│   │   └── rateLimit.middleware.ts
│   │
│   └── lib/                      # Legacy lib (will be refactored)
│       ├── config.ts             # Site configuration
│       └── data.ts               # Mock data (to be removed)
│
├── scripts/                      # Utility scripts
│   ├── migrate.ts                # Database migration script
│   ├── seed.ts                  # Database seeding script
│   ├── start-cron.ts            # Start cron scheduler
│   └── build.sh
│
└── docs/                         # Documentation
    ├── API.md
    ├── DEPLOYMENT.md
    └── DATABASE.md
```

---

## Docker Setup for Local Development

### Docker Compose Configuration

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  # MariaDB Database
  mariadb:
    image: mariadb:10.11
    container_name: zox-mariadb
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: zox_db
      MYSQL_USER: zox_user
      MYSQL_PASSWORD: zox_password
    ports:
      - "3306:3306"
    volumes:
      - mariadb_data:/var/lib/mysql
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - zox-network
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: zox-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - zox-network
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Adminer (Database Management UI) - Optional
  adminer:
    image: adminer:latest
    container_name: zox-adminer
    restart: unless-stopped
    ports:
      - "8080:8080"
    networks:
      - zox-network
    depends_on:
      - mariadb

  # Redis Commander (Redis Management UI) - Optional
  redis-commander:
    image: rediscommander/redis-commander:latest
    container_name: zox-redis-commander
    restart: unless-stopped
    environment:
      REDIS_HOSTS: local:redis:6379
    ports:
      - "8081:8081"
    networks:
      - zox-network
    depends_on:
      - redis

volumes:
  mariadb_data:
    driver: local
  redis_data:
    driver: local

networks:
  zox-network:
    driver: bridge
```

### Environment Variables

Create `.env.local`:

```bash
# Database
DATABASE_URL=mysql://zox_user:zox_password@localhost:3306/zox_db
DB_HOST=localhost
DB_PORT=3306
DB_NAME=zox_db
DB_USER=zox_user
DB_PASSWORD=zox_password

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# File Upload
UPLOAD_MAX_SIZE=5242880
UPLOAD_DIR=./public/uploads

# Admin
ADMIN_EMAIL=admin@startupnews.fyi
ADMIN_PASSWORD=changeme

# API
API_BASE_URL=http://localhost:3000/api
```

Create `.env.example`:

```bash
# Database
DATABASE_URL=mysql://user:password@localhost:3306/dbname
DB_HOST=localhost
DB_PORT=3306
DB_NAME=zox_db
DB_USER=zox_user
DB_PASSWORD=zox_password

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# File Upload
UPLOAD_MAX_SIZE=5242880
UPLOAD_DIR=./public/uploads

# Admin
ADMIN_EMAIL=admin@startupnews.fyi
ADMIN_PASSWORD=changeme

# API
API_BASE_URL=http://localhost:3000/api
```

### Dockerfile for Development

Create `Dockerfile.dev`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]
```

### Database Initialization Script

Create `scripts/init-db.sql`:

```sql
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS zox_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE zox_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'editor', 'author') DEFAULT 'author',
    avatar_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    parent_id INT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    excerpt TEXT,
    content LONGTEXT NOT NULL,
    category_id INT NOT NULL,
    author_id INT NOT NULL,
    featured_image_url VARCHAR(500),
    featured_image_small_url VARCHAR(500),
    format ENUM('standard', 'video', 'gallery') DEFAULT 'standard',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
    featured BOOLEAN DEFAULT FALSE,
    trending_score DECIMAL(10, 2) DEFAULT 0,
    view_count INT DEFAULT 0,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_slug (slug),
    INDEX idx_category (category_id),
    INDEX idx_author (author_id),
    INDEX idx_status (status),
    INDEX idx_featured (featured),
    INDEX idx_published (published_at),
    INDEX idx_trending (trending_score),
    FULLTEXT idx_search (title, excerpt, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Post tags table
CREATE TABLE IF NOT EXISTS post_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    tag_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    INDEX idx_post (post_id),
    INDEX idx_tag (tag_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    excerpt TEXT,
    description TEXT,
    location VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    image_url VARCHAR(500),
    external_url VARCHAR(500),
    status ENUM('upcoming', 'ongoing', 'past', 'cancelled') DEFAULT 'upcoming',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_location (location),
    INDEX idx_date (event_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NULL,
    event_type VARCHAR(50) NOT NULL,
    user_ip VARCHAR(45),
    user_agent TEXT,
    referrer VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    INDEX idx_post (post_id),
    INDEX idx_type (event_type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(50) DEFAULT 'string',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### .dockerignore

Create `.dockerignore`:

```
node_modules
.next
.git
.env.local
.env*.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
*.pem
coverage
.nyc_output
```

---

## Module Details

### Posts Module Example

**Domain Types** (`modules/posts/domain/types.ts`):

```typescript
export interface Post {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  categoryId: number;
  authorId: number;
  featuredImageUrl?: string;
  featuredImageSmallUrl?: string;
  format: 'standard' | 'video' | 'gallery';
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  trendingScore: number;
  viewCount: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostDto {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  categoryId: number;
  featuredImageUrl?: string;
  format?: 'standard' | 'video' | 'gallery';
  status?: 'draft' | 'published';
  featured?: boolean;
}

export interface UpdatePostDto extends Partial<CreatePostDto> {
  id: number;
}
```

**Repository** (`modules/posts/repository/posts.repository.ts`):

```typescript
import { db } from '@/shared/database/connection';
import { Post } from '../domain/types';

export class PostsRepository {
  async findAll(filters?: {
    categoryId?: number;
    status?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Post[]> {
    // Implementation
  }

  async findById(id: number): Promise<Post | null> {
    // Implementation
  }

  async findBySlug(slug: string): Promise<Post | null> {
    // Implementation
  }

  async create(data: CreatePostDto): Promise<Post> {
    // Implementation
  }

  async update(id: number, data: Partial<Post>): Promise<Post> {
    // Implementation
  }

  async delete(id: number): Promise<void> {
    // Implementation
  }
}
```

**Service** (`modules/posts/service/posts.service.ts`):

```typescript
import { PostsRepository } from '../repository/posts.repository';
import { Post, CreatePostDto, UpdatePostDto } from '../domain/types';

export class PostsService {
  constructor(private repository: PostsRepository) {}

  async getAllPosts(filters?: any): Promise<Post[]> {
    return this.repository.findAll(filters);
  }

  async getPostBySlug(slug: string): Promise<Post | null> {
    return this.repository.findBySlug(slug);
  }

  async createPost(data: CreatePostDto, authorId: number): Promise<Post> {
    // Business logic
    return this.repository.create({ ...data, authorId });
  }

  async updatePost(id: number, data: UpdatePostDto): Promise<Post> {
    // Business logic
    return this.repository.update(id, data);
  }
}
```

---

## Code Refactoring Plan

### Phase 1: Setup Infrastructure (Week 1)

1. **Setup Docker Compose**
   - Create `docker-compose.yml`
   - Create `.env.local` and `.env.example`
   - Test database and Redis connections

2. **Create Module Structure**
   - Create `src/modules/` directory
   - Create base module structure for each module
   - Setup shared infrastructure (`src/shared/`)

3. **Database Setup**
   - Create database connection utility
   - Run initial migrations
   - Create seed script

### Phase 2: Refactor Posts Module (Week 2)

1. **Move Post Types**
   - Move `Post` interface from `lib/data.ts` to `modules/posts/domain/types.ts`
   - Create DTOs for API

2. **Create Repository Layer**
   - Create `PostsRepository` class
   - Implement database queries
   - Replace mock data functions

3. **Create Service Layer**
   - Create `PostsService` class
   - Move business logic from components
   - Implement caching with Redis

4. **Update Components**
   - Update components to use service layer
   - Create module-specific components
   - Update hooks

### Phase 3: Refactor Other Modules (Week 3-4)

1. **Events Module**
   - Similar refactoring as Posts
   - Move event-related code

2. **Categories Module**
   - Refactor category management
   - Update all references

3. **Users & Auth Module**
   - Implement authentication
   - Create user management

### Phase 4: Admin Dashboard (Week 5-6)

1. **Admin Module**
   - Create admin layout
   - Implement CRUD interfaces
   - Add authentication middleware

2. **API Routes**
   - Create admin API routes
   - Implement public API routes
   - Add validation and error handling

### Phase 5: Cron Jobs (Week 7)

1. **Cron Module**
   - Create cron scheduler
   - Implement individual jobs
   - Setup API endpoints for manual triggers

### Phase 6: Cleanup (Week 8)

1. **Remove Legacy Code**
   - Remove `lib/data.ts` mock data
   - Clean up unused components
   - Update all imports

2. **Testing & Documentation**
   - Test all modules
   - Update documentation
   - Code review

---

## Development Workflow

### Starting Development

```bash
# 1. Start Docker services
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your values

# 4. Run database migrations
npm run migrate

# 5. Seed database (optional)
npm run seed

# 6. Start development server
npm run dev
```

### Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart mariadb

# Access MariaDB CLI
docker-compose exec mariadb mysql -u zox_user -p zox_db

# Access Redis CLI
docker-compose exec redis redis-cli
```

### Database Management

- **Adminer UI**: http://localhost:8080
  - System: MySQL
  - Server: mariadb
  - Username: zox_user
  - Password: zox_password
  - Database: zox_db

- **Redis Commander**: http://localhost:8081

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "db:migrate": "tsx scripts/migrate.ts",
    "db:seed": "tsx scripts/seed.ts",
    "db:reset": "docker-compose down -v && docker-compose up -d && npm run db:migrate && npm run db:seed",
    "cron:start": "tsx scripts/start-cron.ts"
  }
}
```

---

## Next Steps

1. **Create Docker Compose file** - Setup local development environment
2. **Create module structure** - Organize code into modules
3. **Setup database connection** - Connect to MariaDB
4. **Refactor Posts module** - Start with one module as template
5. **Implement other modules** - Follow the same pattern
6. **Build admin dashboard** - Create CMS interface
7. **Implement cron jobs** - Add scheduled tasks

---

**Document Version:** 1.0  
**Last Updated:** February 2025  
**Architecture:** Monolithic Modular

