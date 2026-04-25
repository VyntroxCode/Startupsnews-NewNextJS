# Zox NextJS - Comprehensive Technical Documentation

**Last Updated:** March 2026  
**Project:** StartupNews.fyi - Next.js News Platform  
**Framework:** Next.js 16.1.6 with App Router  
**Team:** Development Team

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture & Design](#architecture--design)
4. [Directory Structure](#directory-structure)
5. [Module Breakdown](#module-breakdown)
6. [Database Schema](#database-schema)
7. [API Routes](#api-routes)
8. [Authentication & Security](#authentication--security)
9. [Image Handling](#image-handling)
10. [Caching & Redis Strategy](#caching--redis-strategy)
11. [Cron Jobs & Background Processing](#cron-jobs--background-processing)
12. [Development Environment](#development-environment)
13. [Build & Deployment](#build--deployment)
14. [Development Workflow](#development-workflow)
15. [Key Design Patterns](#key-design-patterns)
16. [Performance Considerations](#performance-considerations)
17. [Known Issues & Considerations](#known-issues--considerations)

---

## Project Overview

### Purpose

**Zox NextJS** is a modern, full-stack news and startup content platform built with Next.js. It's a port of the Zox News WordPress theme, preserving the original layout and styling while leveraging Next.js performance and architecture benefits.

### Core Features

- **Public-facing content site** with featured posts, trending articles, categories, and search
- **Author management** with profile pages and biography support
- **Admin dashboard** for CRUD operations on posts, categories, events, banners, and users
- **RSS feed integration** - automated synchronization from external RSS sources
- **Event management** - creation, editing, and filtering by country
- **Multi-category support** - posts organized by category and sector
- **Image management** - AWS S3 integration with presigned URLs and fallback rendering
- **User authentication** - JWT-based admin authentication with secure password hashing
- **Responsive design** - mobile-first approach matching original theme
- **Caching layer** - Redis-based caching for performance optimization

### Key Statistics

- **Next.js Version:** 16.1.6
- **React Version:** 19.2.3
- **TypeScript:** Full project coverage
- **Modules:** 7 core modules (Posts, Events, Categories, Users, RSSFeeds, Banners, Upload)
- **API Routes:** 40+ endpoints
- **Database Tables:** 10+ core tables
- **Build Time:** 5.3-6.6 seconds (webpack)

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1.6 | React framework with App Router |
| React | 19.2.3 | UI library |
| Tailwind CSS | 4 | Utility-first CSS framework |
| TypeScript | 5 | Type safety |
| Tiptap | 3.19.0 | Rich text editor |
| FontAwesome | 7.1.0 | Icon library |

### Backend & Storage

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 20+ | Runtime |
| MariaDB | 10.11 | Primary database |
| Redis | 7.x (Alpine) | Caching & locks |
| AWS S3 | v3 SDK | Image storage |
| node-cron | 4.2.1 | Task scheduling |

### Development Tools

| Tool | Purpose |
|------|---------|
| tsx | TypeScript executor for scripts |
| ESLint | Code linting |
| PostCSS | CSS processing |
| PM2 | Production process management |
| Docker Compose | Local service orchestration |

### Authentication & Security

| Library | Version | Purpose |
|---------|---------|---------|
| jsonwebtoken | 9.0.3 | JWT token generation/verification |
| bcryptjs | 3.0.3 | Password hashing |

---

## Architecture & Design

### High-Level Architecture Diagram

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                     NEXT.JS APP (SSR + API)               │
                    │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐ │
                    │  │   App Router │  │  API Routes │  │  Cron (optional   │ │
                    │  │   (pages)   │  │ /api/*      │  │   separate process)│ │
                    │  └──────┬──────┘  └──────┬──────┘  └─────────┬─────────┘ │
                    │         │                │                    │           │
                    │         ▼                ▼                    ▼           │
                    │  ┌─────────────────────────────────────────────────────┐  │
                    │  │           Data Adapter (lib/data-adapter.ts)        │  │
                    │  │  getFeat1Posts, getTrendingPosts, getPostBySlug     │  │
                    │  └──────────────────────────┬──────────────────────────┘  │
                    │                              │                             │
                    └──────────────────────────────┼─────────────────────────────┘
                                                   │
         ┌─────────────────────────────────────────┼─────────────────────────────────────────┐
         │                                         ▼                                         │
         │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
         │  │PostsService  │  │EventsService │  │CategoriesService  │RssFeedsService    │  │
         │  │(posts.*)     │  │(events.*)    │  │(categories.*)     │(rss-feeds.*)      │  │
         │  └──────┬───────┘  └──────┬───────┘  └──────┬────────────┘└──────────┬────────┘  │
         │         │                 │                 │                         │          │
         │         ▼                 ▼                 ▼                         ▼          │
         │  ┌────────────────────────────────────────────────────────────────────────────┐ │
         │  │  Repository Layer (Data Access - Direct DB Queries)                       │ │
         │  │  PostsRepository, EventsRepository, CategoriesRepository, etc.            │ │
         │  └────────────────────────────┬───────────────────────────────────────────────┘ │
         │                               │                                                  │
         └───────────────────────────────┼──────────────────────────────────────────────────┘
                                         │
         ┌───────────────────────────────┴──────────────────────────────────┐
         │                                                                   │
         ▼                    ▼                    ▼                        ▼
    ┌──────────┐         ┌──────────┐        ┌──────────┐          ┌──────────┐
    │ MariaDB  │         │   Redis  │        │  AWS S3  │          │  File    │
    │ (zox_db) │         │ (cache)  │        │ (images) │          │  System  │
    │          │         │          │        │          │          │          │
    │ Posts    │         │Locks     │        │startupnews-media-2026
    │Categories│         │Caches    │        │          │          │Public/   │
    │Users     │         │Sessions  │        │JSons     │          │uploads   │
    │Events    │         │          │        │PDFs      │          │          │
    │RSSFeeds  │         │          │        │          │          │          │
    └──────────┘         └──────────┘        └──────────┘          └──────────┘
```

### Architectural Principles

1. **Monolithic Modular Structure**
   - Single Next.js application
   - Organized into feature-based modules
   - Each module owns its domain, repository, service, API, and components

2. **Layered Architecture**
   - **Presentation Layer:** Next.js pages and React components
   - **Data Adapter Layer:** Single entry point for server-side data (`lib/data-adapter.ts`)
   - **Service Layer:** Business logic (PostsService, EventsService, etc.)
   - **Repository Layer:** Direct database access
   - **Infrastructure Layer:** Shared utilities, database, cache, AWS

3. **API-First Design**
   - Dedicated API routes for all operations
   - REST conventions for CRUD operations
   - Admin API routes separate from public endpoints (`/api/admin/*` vs `/api/*`)
   - Request/response validation at route layer

4. **Caching Strategy**
   - Redis for distributed caching
   - Redis locks for preventing race conditions in cron jobs
   - Cache invalidation on mutations
   - Configurable cache TTLs

5. **Separation of Concerns**
   - Admin operations in `(admin)` route group
   - Public operations in public route group
   - Shared infrastructure isolated in `/src/shared`

---

## Directory Structure

### Root Directory

```
zox-nextjs/
├── .env.local                          # Environment variables (gitignored)
├── .env.example                        # Example environment template
├── .eslinrc.json                       # ESLint configuration
├── package.json                        # Dependencies and scripts
├── tsconfig.json                       # TypeScript configuration
├── next.config.ts                      # Next.js configuration
├── tailwind.config.ts                  # Tailwind CSS configuration
├── postcss.config.mjs                  # PostCSS configuration
├── docker-compose.yml                  # Local development services
├── ecosystem.config.js                 # PM2 process configuration
│
├── docs/                               # Documentation files
│   ├── PROJECT_DOCUMENTATION.md        # Detailed project docs
│   ├── AUTHOR_MANAGEMENT_SETUP.md      # Author system guide
│   ├── CRON_AND_SETTINGS.md            # Cron job documentation
│   ├── S3-IMAGES-SETUP.md              # S3 image handling
│   └── TROUBLESHOOTING.md              # Common issues
│
├── scripts/                            # One-time scripts and migrations
│   ├── migrate.ts                      # Database schema migration
│   ├── seed.ts                         # Database seeding
│   ├── migrate-from-wordpress.ts       # WP data import
│   ├── backfill-post-images-*.ts       # Image URL migration
│   ├── sync-events-from-startupnews.ts # External event sync
│   ├── export-thin-content-posts.ts    # Content reporting
│   └── ...                             # Other utility scripts
│
├── cron/                               # Scheduled background jobs
│   ├── index.ts                        # Cron entry point
│   └── jobs/
│       ├── rss-feeds-scheduler.job.ts  # RSS fetch scheduler
│       └── ...
│
├── src/
│   ├── app/                            # Next.js App Router
│   ├── components/                     # React components
│   ├── lib/                            # Utilities and adapters
│   ├── modules/                        # Feature modules
│   ├── shared/                         # Shared infrastructure
│   ├── hooks/                          # React hooks
│   ├── workers/                        # Background workers
│   ├── queue/                          # Job queue system
│   └── proxy.ts                        # Proxy configuration
│
├── public/                             # Static assets
│   ├── images/
│   │   ├── logos/
│   │   ├── posts/
│   │   ├── events/
│   │   └── uploads/
│   └── favicon.ico
│
├── logs/                               # Application logs
├── node_modules/                       # Dependencies
└── .git/                               # Git repository
```

### Source Code Directory (`src/`)

```
src/
├── app/                                    # Next.js App Router
│   ├── (admin)/                           # Admin routes group
│   │   ├── layout.tsx                     # Admin layout with auth guard
│   │   └── admin/                         # Admin pages
│   │       ├── posts/                     # Post management
│   │       │   ├── page.tsx               # Post listing
│   │       │   ├── create/page.tsx        # Create post
│   │       │   └── edit/[id]/page.tsx     # Edit post
│   │       ├── events/                    # Event management
│   │       │   ├── page.tsx
│   │       │   ├── create/page.tsx
│   │       │   └── edit/[id]/page.tsx
│   │       ├── categories/                # Category management
│   │       ├── banners/                   # Banner management
│   │       ├── authors/                   # Author management
│   │       └── rss-feeds/                 # RSS feed configuration
│   │
│   ├── (public)/                          # Public routes
│   │   ├── page.tsx                       # Homepage
│   │   ├── news/page.tsx                  # All posts
│   │   ├── post/[slug]/page.tsx           # Single post
│   │   ├── category/[slug]/page.tsx       # Category posts
│   │   ├── sectors/[slug]/page.tsx        # Sector posts
│   │   ├── author/[slug]/page.tsx         # Author profile
│   │   ├── events/page.tsx                # Events listing
│   │   ├── events/[slug]/page.tsx         # Single event
│   │   ├── events/event-by-country/page.tsx  # Events by country
│   │   ├── search/page.tsx                # Search results
│   │   ├── about/page.tsx                 # Static pages
│   │   ├── contact-us/page.tsx
│   │   └── api/                           # Public API routes
│   │       ├── posts/route.ts
│   │       ├── posts/[slug]/route.ts
│   │       ├── categories/route.ts
│   │       ├── events/route.ts
│   │       └── health/route.ts
│   │
│   ├── api/                               # API routes root
│   │   ├── admin/                         # Admin API endpoints
│   │   │   ├── posts/route.ts             # POST (create), GET (list)
│   │   │   ├── posts/[id]/route.ts        # PUT (update), DELETE
│   │   │   ├── posts/bulk-status/route.ts # Bulk operations
│   │   │   ├── events/...
│   │   │   ├── categories/...
│   │   │   ├── banners/...
│   │   │   ├── authors/...
│   │   │   ├── upload/route.ts            # S3 direct upload
│   │   │   ├── presign/route.ts           # S3 presigned URLs
│   │   │   ├── media/ingest/route.ts      # Image ingestion
│   │   │   ├── auth/login/route.ts        # JWT login
│   │   │   ├── auth/verify/route.ts       # Token verification
│   │   │   ├── stats/route.ts             # Dashboard stats
│   │   │   └── site-settings/...          # Site configuration
│   │   │
│   │   ├── events/populate-content/route.ts
│   │   ├── banners/route.ts
│   │   ├── site-settings/...
│   │   └── health/route.ts
│   │
│   ├── layout.tsx                         # Root layout
│   ├── page.tsx                           # Catchall or homepage
│   ├── globals.css                        # Global styles
│   ├── error.tsx                          # Global error boundary
│   ├── not-found.tsx                      # 404 handler
│   └── styles/                            # Additional stylesheets
│       └── media-queries.css              # Responsive breakpoints
│
├── components/                             # React components
│   ├── Header.tsx                         # Top navigation
│   ├── Footer.tsx                         # Footer
│   ├── FlyMenu.tsx                        # Mobile hamburger menu
│   ├── SearchOverlay.tsx                  # Search modal
│   ├── PostImage.tsx                      # Post image renderer
│   ├── AuthorPostCardImage.tsx            # Author post card images
│   ├── AuthorProfileAvatar.tsx            # Author profile photos
│   ├── EventCard.tsx                      # Event card component
│   ├── EventByCountryCard.tsx             # Country-grouped events
│   ├── BannerCarousel.tsx                 # Banner slider
│   ├── MoreNewsSection.tsx                # Paginated news list
│   ├── InfiniteArticleLoader.tsx          # Infinite scroll component
│   ├── SidebarTabber.tsx                  # Sidebar tabs
│   ├── TopLoader.tsx                      # Progress bar
│   └── admin/                             # Admin components
│       ├── PostForm.tsx                   # Post editor form
│       ├── EventForm.tsx                  # Event editor form
│       ├── CategoryForm.tsx               # Category editor form
│       └── ...
│
├── hooks/                                  # React hooks
│   ├── useAdminData.ts                    # Admin data fetching with cache
│   ├── usePaginatedPosts.ts               # Pagination hook
│   ├── useInfiniteScroll.ts               # Infinite scroll hook
│   └── ...
│
├── lib/                                    # Shared libraries
│   ├── data-adapter.ts                    # Server-side data access (470+ lines)
│   ├── admin-auth.ts                      # Admin authentication utilities
│   ├── config.ts                          # Site configuration
│   ├── data.ts                            # Mock/seed data
│   ├── post-utils.ts                      # Post-related utilities
│   ├── event-utils.ts                     # Event-related utilities
│   ├── content-utils.ts                   # Content processing
│   ├── sector-categories.ts               # Sector mappings
│   └── events-constants.ts                # Event constants
│
├── modules/                                # Feature modules
│   ├── posts/                             # Posts module
│   │   ├── domain/
│   │   │   └── types.ts                   # PostEntity, interfaces
│   │   ├── repository/
│   │   │   └── posts.repository.ts        # DB queries
│   │   ├── service/
│   │   │   └── posts.service.ts           # Business logic
│   │   ├── api/
│   │   │   └── route.ts                   # API endpoints
│   │   └── utils/
│   │       └── posts.utils.ts             # Image presigning, URL resolution
│   │
│   ├── events/                            # Events module (similar structure)
│   ├── categories/                        # Categories module
│   ├── users/                             # Users module (auth, admin)
│   ├── rss-feeds/                         # RSS feeds module
│   │   ├── domain/types.ts                # RssFeedEntity
│   │   ├── repository/
│   │   ├── service/
│   │   │   ├── rss-feeds.service.ts
│   │   │   ├── rss-parser.service.ts
│   │   │   └── rss-post-creator.service.ts
│   │   └── api/
│   │
│   ├── banners/                           # Banners module
│   └── upload/                            # Upload module
│
├── shared/                                 # Shared infrastructure
│   ├── database/
│   │   ├── connection.ts                  # MariaDB pool
│   │   └── migrations/                    # Schema migrations
│   │
│   ├── cache/
│   │   ├── redis.client.ts                # Redis client
│   │   └── cache.utils.ts                 # Caching helpers
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts             # JWT verification
│   │   └── ...
│   │
│   ├── config/
│   │   ├── env-validation.ts              # Environment setup check
│   │   ├── feature-flags.ts               # Feature flags
│   │   └── ...
│   │
│   ├── utils/
│   │   ├── logger.ts                      # Logging utility
│   │   ├── execution-guard.ts             # Prevent concurrent runs
│   │   ├── timeout.ts                     # Timeout wrapper
│   │   └── ...
│   │
│   └── locks/
│       └── redis-lock.ts                  # Distributed locking
│
├── workers/                                # Background workers
│   ├── rss.worker.ts                      # RSS feed processing worker
│   └── ...
│
├── queue/                                  # Job queue
│   ├── queue.memory.ts                    # In-memory job queue
│   ├── job-types.ts                       # Job type definitions
│   └── ...
│
├── actions/                                # Server actions (if using)
└── proxy.ts                                # Proxy configuration for dev
```

---

## Module Breakdown

### Posts Module (`src/modules/posts/`)

**Responsibility:** Core news/article content management

**Structure:**
```
posts/
├── domain/
│   └── types.ts                 # PostEntity, PostCreateDto, PostUpdateDto
├── repository/
│   └── posts.repository.ts      # DB: CRUD, search, filters, pagination
├── service/
│   └── posts.service.ts         # Business logic, caching, filtering
├── api/
│   └── route.ts                 # GET (list), POST (create + admin)
└── utils/
    └── posts.utils.ts           # Image URL resolution, presigning, etc.
```

**Key Entities:**
- `PostEntity`: id, title, slug, content, excerpt, featured_image, status, created_at, updated_at, categories, tags, author, etc.

**Key Methods:**
- `getAll()` - List with pagination
- `getBySlug(slug)` - Single post
- `getFeatured()` - Featured posts
- `getTrending()` - Trending posts
- `create()`, `update()`, `delete()` - Admin operations

**Caching:**
- Posts list: `posts:all:*` (TTL: 3600s)
- Individual post: `post:slug:*` (TTL: 7200s)

### Events Module (`src/modules/events/`)

**Responsibility:** Startup events management

**Key Entities:**
- `EventEntity`: id, title, slug, description, date_from, date_to, location, country, image, status

**Features:**
- Filtering by status (draft, published)
- Sorting by date
- Country-based grouping

### Categories Module (`src/modules/categories/`)

**Responsibility:** Post and event categorization

**Key Entities:**
- `CategoryEntity`: id, name, slug, description, image, parent_id

**Features:**
- Nested categories (parent-child relationships)
- Post count per category
- Sector mapping

### Users Module (`src/modules/users/`)

**Responsibility:** User management and authentication

**Sub-modules:**
- `AuthService`: JWT generation, verification, password hashing
- `UsersService`: User CRUD operations

**Key Entities:**
- `UserEntity`: id, email, name, password_hash, role, author_description, status

**Roles:**
- `admin`: Full access
- `editor`: Post publishing
- `author`: Own posts only
- `subscriber`: Reading only

### RSS Feeds Module (`src/modules/rss-feeds/`)

**Responsibility:** External RSS feed synchronization

**Sub-modules:**
- `RssFeedsService`: Feed management
- `RssParserService`: Feed parsing and validation
- `RssPostCreatorService`: Post creation from feed items

**Process:**
1. Scheduler queries configured feeds
2. RssParserService fetches and parses feed XML
3. Image downloader fetches images to S3
4. RssPostCreatorService creates posts with metadata links

**Key Features:**
- Duplicate detection by URL
- Image deduplication
- Author extraction
- Category auto-tagging

### Banners Module (`src/modules/banners/`)

**Responsibility:** Promotional content management

**Key Entities:**
- `BannerEntity`: id, title, image, link, duration, status

### Upload Module (`src/modules/upload/`)

**Responsibility:** File upload and S3 integration

**Features:**
- Direct S3 uploads with presigned URLs
- Image optimization and resizing
- Media ingestion from external URLs

---

## Database Schema

### Core Tables

#### `users`
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'editor', 'author', 'subscriber') DEFAULT 'subscriber',
  author_description TEXT NULL,           -- Bio for author profiles
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status)
);
```

#### `posts`
```sql
CREATE TABLE posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  content LONGTEXT NOT NULL,
  excerpt TEXT NULL,
  featured_image VARCHAR(500) NULL,
  author_id INT,
  status ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  is_gone_410 TINYINT(1) DEFAULT 0,       -- 410 Gone (removed content)
  is_featured TINYINT(1) DEFAULT 0,
  is_trending TINYINT(1) DEFAULT 0,
  featured_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at TIMESTAMP NULL,
  created_from VARCHAR(100),              -- 'wordpress', 'manual', 'rss'
  external_source_url VARCHAR(500) NULL,  -- Original source for RSS posts
  FOREIGN KEY (author_id) REFERENCES users(id),
  INDEX idx_slug (slug),
  INDEX idx_status (status),
  INDEX idx_author_id (author_id),
  INDEX idx_featured (is_featured),
  INDEX idx_trending (is_trending),
  INDEX idx_created_at (created_at),
  INDEX idx_published_at (published_at),
  FULLTEXT INDEX ft_content (title, content, excerpt)
);
```

#### `post_categories`
```sql
CREATE TABLE post_categories (
  post_id INT NOT NULL,
  category_id INT NOT NULL,
  PRIMARY KEY (post_id, category_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

#### `post_tags`
```sql
CREATE TABLE post_tags (
  post_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

#### `categories`
```sql
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT NULL,
  image VARCHAR(500) NULL,
  parent_id INT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id),
  INDEX idx_slug (slug),
  INDEX idx_parent_id (parent_id),
  INDEX idx_status (status)
);
```

#### `tags`
```sql
CREATE TABLE tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  post_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_slug (slug)
);
```

#### `events`
```sql
CREATE TABLE events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description LONGTEXT NULL,
  featured_image VARCHAR(500) NULL,
  date_from DATETIME NOT NULL,
  date_to DATETIME NULL,
  location VARCHAR(255) NULL,
  country VARCHAR(100) NULL,
  status ENUM('draft', 'published') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_country (country),
  INDEX idx_date_from (date_from),
  INDEX idx_status (status)
);
```

#### `rss_feeds`
```sql
CREATE TABLE rss_feeds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL UNIQUE,
  description TEXT NULL,
  category_id INT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  last_sync_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_status (status),
  INDEX idx_url (url)
);
```

#### `rss_feed_items`
```sql
CREATE TABLE rss_feed_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rss_feed_id INT NOT NULL,
  post_id INT NULL,
  guid VARCHAR(500) NOT NULL,
  title VARCHAR(255) NOT NULL,
  link VARCHAR(500) NOT NULL,
  external_image VARCHAR(500) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rss_feed_id) REFERENCES rss_feeds(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL,
  UNIQUE KEY unique_feed_guid (rss_feed_id, guid),
  INDEX idx_post_id (post_id),
  INDEX idx_created_at (created_at)
);
```

#### `banners`
```sql
CREATE TABLE banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  image VARCHAR(500) NULL,
  link VARCHAR(500) NULL,
  sort_order INT DEFAULT 0,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_sort_order (sort_order)
);
```

#### `site_settings`
```sql
CREATE TABLE site_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value LONGTEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key (setting_key)
);
```

### Relationships Summary

```
users
  ├─ author_id ──→ posts (1:N)
  └─ (staff users can have author profiles)

posts
  ├─ author_id ──→ users
  ├─ post_categories ──→ categories (M:M)
  ├─ post_tags ──→ tags (M:M)
  └─ rss_feed_items ──→ created from RSS

categories
  ├─ parent_id ──→ categories (self-reference, hierarchical)
  ├─ posts ──→ post_categories (M:M)
  └─ rss_feeds ──→ default category for feed items

events
  └─ independent entity

rss_feeds
  ├─ category_id ──→ categories
  └─ items ──→ rss_feed_items (1:N)

rss_feed_items
  ├─ rss_feed_id ──→ rss_feeds
  └─ post_id ──→ posts (nullable, for tracking)

banners
  └─ independent entity

site_settings
  └─ key-value configuration store
```

---

## API Routes

### Authentication Routes

#### Admin Login
```
POST /api/admin/auth/login
Body: { email: string, password: string }
Response: { token: string, user: UserPayload }
Error: 401 Unauthorized
```

#### Token Verification
```
POST /api/admin/auth/verify
Header: Authorization: Bearer <token>
Response: { valid: boolean, user: UserPayload }
```

### Admin Routes (Protected with JWT)

#### Posts API
```
GET  /api/admin/posts                    # List with pagination
POST /api/admin/posts                     # Create new post
PUT  /api/admin/posts/[id]                # Update post
DELETE /api/admin/posts/[id]              # Delete post
POST /api/admin/posts/bulk-status         # Bulk status change
```

#### Events API
```
GET    /api/admin/events
POST   /api/admin/events
PUT    /api/admin/events/[id]
DELETE /api/admin/events/[id]
```

#### Categories API
```
GET    /api/admin/categories
POST   /api/admin/categories
PUT    /api/admin/categories/[id]
DELETE /api/admin/categories/[id]
```

#### Banners API
```
GET    /api/admin/banners
POST   /api/admin/banners
PUT    /api/admin/banners/[id]
DELETE /api/admin/banners/[id]
```

#### Authors API
```
GET    /api/admin/authors                # List all authors
PUT    /api/admin/authors/[id]           # Update author profile
DELETE /api/admin/authors/[id]           # Remove author
```

#### RSS Feeds API
```
GET    /api/admin/rss-feeds
POST   /api/admin/rss-feeds
DELETE /api/admin/rss-feeds/[id]
POST   /api/admin/rss-feeds/[id]/sync    # Manual feed sync
```

#### Upload & Media
```
POST   /api/admin/upload                 # Direct file upload
POST   /api/admin/presign                # Get S3 presigned URL
POST   /api/admin/media/ingest           # Download image from URL to S3
```

#### Dashboard
```
GET    /api/admin/stats                  # Dashboard statistics
GET    /api/admin/users                  # Manage users
```

#### Site Settings
```
GET    /api/admin/site-settings/footer-copyright
PUT    /api/admin/site-settings/footer-copyright
```

### Public Routes

#### Posts API
```
GET  /api/posts                 # List published posts
GET  /api/posts/[slug]          # Single post details
```

#### Events API
```
GET  /api/events                # List events
GET  /api/events/[slug]         # Single event
```

#### Categories API
```
GET  /api/categories            # List categories
```

#### Health Check
```
GET  /api/health                # System health status
```

### Request/Response Examples

#### Create Post (Admin)
```json
POST /api/admin/posts

{
  "title": "Article Title",
  "slug": "article-title",
  "content": "<p>Rich HTML content</p>",
  "excerpt": "Short summary",
  "featuredImage": "https://s3.../image.jpg",
  "categoryIds": [1, 2],
  "tagIds": [3, 4],
  "status": "published",
  "isFeatured": true,
  "externalSourceUrl": null,
  "publishedAt": "2026-03-20T10:00:00Z"
}

Response 201:
{
  "id": 123,
  "title": "Article Title",
  "slug": "article-title",
  ...all fields...
}
```

#### Update Post (Admin)
```json
PUT /api/admin/posts/123

{
  "title": "Updated Title",
  "content": "...",
  "status": "published",
  ...only changed fields needed...
}

Response 200: Updated post entity
```

#### List Posts (Public)
```
GET /api/posts?page=1&limit=10&status=published

Response 200:
{
  "data": [
    {
      "id": 1,
      "title": "...",
      "slug": "...",
      "excerpt": "...",
      "featuredImage": "...",
      "publishedAt": "...",
      "author": { "id": 1, "name": "..." },
      "categories": [{ "id": 1, "name": "..." }]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "totalPages": 15
  }
}
```

---

## Authentication & Security

### JWT Authentication

**Flow:**
1. User submits email + password to `/api/admin/auth/login`
2. Server hashes password with bcryptjs and compares with stored hash
3. If valid, generates JWT token with 15-minute expiration
4. Client stores token in httpOnly cookie (secure, sameSite attributes)
5. Subsequent requests include Authorization header: `Bearer <token>`
6. Middleware verifies token before processing protected routes

**Configuration:**
```env
JWT_SECRET=your-super-secret-key           # Must be strong
JWT_EXPIRES_IN=15m                         # Token expiration
JWT_REFRESH_EXPIRES_IN=7d                  # Refresh token expiration
```

### Authorization

**Admin Middleware** (`src/shared/middleware/auth.middleware.ts`):
- Verifies JWT token presence and validity
- Extracts user information from token
- Enforces role-based access control (RBAC)
- Rejects requests without valid token with 401

**Protected Routes:**
- All `/api/admin/*` routes require valid JWT

**Public Routes:**
- `/api/*` (non-admin) routes available without authentication
- App pages available to all users

### Password Security

- Passwords hashed with bcryptjs (rounds: 10)
- Never stored in plain text
- Comparison done via bcryptjs.compare()
- All password reset flows should invalidate old sessions

### Security Headers

Configured in [next.config.ts](next.config.ts#L50):
```
X-Robots-Tag: noindex, nofollow, noarchive, nosnippet
Cache-Control: Varies based on content type
```

### CORS & CSRF

- Next.js handles CSRF automatically for server actions
- Cross-origin requests validated at API route level
- Allowed origins configured for AWS deployment

---

## Image Handling

### Image Storage

**Primary Storage:** AWS S3 (`startupnews-media-2026`)

**Fallback:** Local file system (`public/uploads/`)

**Supported Formats:** JPG, PNG, WebP, GIF

### Image Processing Pipeline

#### 1. Upload Flow

**Client-Side:**
1. User selects image in admin panel
2. Client uploads to `/api/admin/upload`
3. Server validates file (size, type, dimensions)
4. Server uploads to S3 with presigned URL or direct upload
5. Server returns image URL to client

**Direct S3 Upload:**
```
POST /api/admin/upload
Body: FormData { file: File }
Response: { url: string, isOptimized: boolean }
```

#### 2. Presigned URL Flow

For large files or client-side uploads:
```
POST /api/admin/presign
Body: { fileName: string, contentType: string, fileSize: number }
Response: { presignedUrl: string, key: string }
```

Client uses presigned URL to upload directly to S3.

#### 3. External Image Ingestion

When images referenced in RSS feeds or external sources:
```
POST /api/admin/media/ingest
Body: { 
  imageUrl: string,
  category: string,
  deduplicateHash?: string
}
Response: { s3Url: string, localPath: string }
```

Process:
1. Download image from external URL
2. Optimize and resize (optional)
3. Upload to S3
4. Store reference in database
5. Return final S3 URL

### Image URL Resolution

**Location:** `src/modules/posts/utils/posts.utils.ts`

Process:
1. Check if image is S3 URL
2. If presigned URL required, generate via S3 SDK
3. If local fallback needed, serve from `public/` directory
4. Handle broken URLs with placeholder fallback

**Image URL Patterns:**
```
S3: https://startupnews-media-2026.s3.amazonaws.com/path/image.jpg
S3 (regional): https://startupnews-media-2026.s3.us-east-1.amazonaws.com/path/image.jpg
Presigned: https://startupnews-media-2026.s3.amazonaws.com/...?X-Amz-Signature=...
Local: https://startupnews.thebackend.in/images/...
```

### Image Rendering Components

#### PostImage Component
```tsx
// Wrapper component for post thumbnails
// Handles URL resolution, fallback to placeholder
// Applies blurred background + contained image styling

<PostImage 
  src={post.featuredImage}
  alt={post.title}
  fallbackColor="#ddd"
/>
```

#### AuthorPostCardImage Component
```tsx
// Direct Next Image with contain mode
// Blurred background layer (z:0)
// Main image (z:1)
// Category badge (z:3)

<AuthorPostCardImage
  src={post.featuredImage}
  alt={post.title}
  onError={() => console.log('load failed')}
/>
```

#### AuthorProfileAvatar Component
```tsx
// Author profile photo with blurred background
// Fallback to name initial letter
// Fixed 150x150px size

<AuthorProfileAvatar
  src={author.photoUrl}
  alt={author.name}
  name={author.name}
/>
```

### Image Styling

**CSS Classes** (in `src/app/globals.css`):

```css
/* Post thumbnail in author cards */
.author-grid-image {
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}

.author-grid-image-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-size: 130%;
  background-position: center;
  filter: blur(20px);
  transform: scale(1.06);
}

.author-grid-image-main {
  position: absolute;
  inset: 0;
  z-index: 1;
  object-fit: contain !important;
}

/* Author profile photo */
.author-page-avatar {
  width: 150px;
  height: 150px;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
  margin: 0 auto;
}

.author-page-avatar-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-size: 130%;
  background-position: center;
  filter: blur(20px);
  transform: scale(1.06);
}

/* Events card images */
.event-by-country-card-img {
  aspect-ratio: 16 / 10;
  position: relative;
  width: 100%;
  overflow: hidden;
}

/* Category badge positioning */
.author-grid-cat {
  position: absolute;
  bottom: 8px;
  left: 8px;
  z-index: 3;
}
```

### Image Optimization Notes

1. **Aspect Ratios**
   - Post thumbnails: 16:9
   - Events: 16:10
   - Author avatar: 1:1

2. **Rendering Strategy**
   - Use `object-fit: contain` to avoid cropping
   - Use `object-fit: cover` only for decorative images
   - Provide blurred background for visual completeness

3. **Fallbacks**
   - Silent grey placeholder if image fails to load
   - Empty alt text for decorative images
   - Specific alt text for content images (accessibility)

4. **Performance**
   - Use Next.js Image component for optimization
   - Enable `fill` prop for responsive sizing
   - Lazy load images below fold
   - Serve WebP format when supported

---

## Caching & Redis Strategy

### Redis Configuration

**Connection** (`src/shared/cache/redis.client.ts`):
```env
REDIS_HOST=localhost
REDIS_PORT=6382      # Non-standard to avoid conflicts
REDIS_PASSWORD=      # Optional
REDIS_DB=0           # Default DB
```

**Client:**
- Singleton Redis client
- Connection pooling handled by redis package
- Graceful shutdown on app termination

### Caching Layers

#### 1. Page Cache

**Homepage & Listings:**
- Cache entire rendered HTML in Redis
- TTL: 5-60 minutes (configurable)
- Invalidated on:
  - Post create/update/delete
  - Category/event changes
  - Manual invalidation via admin

**Key Pattern:**
```
page:home:featured
page:news:page:1
page:category:tech:page:1
```

#### 2. Data Cache

**Posts & Events:**
```
posts:all:page:1              # List (TTL: 1 hour)
posts:featured                # Featured posts (TTL: 2 hours)
posts:trending                # Trending posts (TTL: 30 min)
post:slug:my-article          # Single post (TTL: 2 hours)

events:all:page:1             # List (TTL: 1 hour)
events:country:us:page:1      # By country (TTL: 1 hour)
event:slug:startup-summit     # Single event (TTL: 2 hours)

categories:all                # Category list (TTL: 6 hours)
categories:with-counts        # Counts per category (TTL: 1 hour)

authors:all                   # Author list (TTL: 4 hours)
author:slug:john-doe          # Author profile (TTL: 2 hours)
```

#### 3. Session Cache

**Admin Sessions:**
```
session:jwt:{userId}          # Active session (TTL: match JWT)
admin:token:{token}           # Token blacklist
```

**User Activity:**
```
search:recent:{userId}        # Recent searches
cart:items:{userId}           # Shopping cart (if applicable)
```

### Cache Invalidation Strategy

#### Automatic Invalidation

**Post Changes:**
```typescript
// src/modules/posts/service/posts.service.ts

async create(post) {
  const saved = await repository.create(post);
  await cache.invalidateByPattern('posts:*');
  await cache.invalidateByPattern('page:*');
  return saved;
}

async update(id, updates) {
  const updated = await repository.update(id, updates);
  await cache.del(`post:slug:${updated.slug}`);
  await cache.invalidateByPattern('posts:*');
  return updated;
}

async delete(id) {
  const post = await repository.get(id);
  await repository.delete(id);
  await cache.del(`post:slug:${post.slug}`);
  await cache.invalidateByPattern('posts:*');
}
```

**Event Changes:**
```typescript
// Similar pattern for events
await cache.invalidateByPattern('events:*');
```

#### Manual Invalidation

Via admin dashboard:
```
POST /api/admin/cache/invalidate
Body: { pattern: 'posts:*' }
Response: { invalidated: number }
```

### Distributed Locks

**Use Case:** Prevent concurrent cron jobs

**Implementation** (`src/shared/locks/redis-lock.ts`):
```typescript
const lock = await createCronLock(
  'rss-feeds-sync',
  {
    ttl: 3600,              // Lock expires after 1 hour
    waitMs: 5000,           // Try for 5 seconds
    retryIntervalMs: 100    // Retry every 100ms
  }
);

try {
  // Only one process executes this
  await syncRssFeeds();
} finally {
  await lock.release();
}
```

### Cache Warming

**On Application Start:**
```typescript
// Preload frequently accessed data
async function warmCache() {
  await cache.set('categories:all', categoriesData, 86400);
  await cache.set('events:active', eventsData, 3600);
}
```

**Scheduled Cache Refresh:**
```typescript
// Cron job to refresh cache before expiration
@Cron('0 */2 * * *')  // Every 2 hours
async refreshCache() {
  const featured = await getFeaturedPosts();
  await cache.set('posts:featured', featured, 7200);
}
```

### Redis Memory Management

**Configuration:**
```redis
maxmemory 512mb                  # Max memory for Redis
maxmemory-policy allkeys-lru     # LRU eviction policy
```

**Monitoring:**
```bash
# Check memory usage
redis-cli INFO memory

# Set expiration on existing keys
redis-cli KEYS "posts:*" | xargs -I {} redis-cli EXPIRE {} 3600

# Get cache statistics
redis-cli DBSIZE
redis-cli SCAN 0 MATCH "posts:*" COUNT 100
```

---

## Cron Jobs & Background Processing

### Cron Entry Point

**File:** `cron/index.ts` (250+ lines)

**Purpose:** Scheduled task execution with:
- Node cron scheduling
- Distributed locks (prevent concurrent runs)
- Job queuing
- Timeout protection
- Graceful shutdown

**Execution Modes:**

1. **Daemon Mode** (continuous)
   ```bash
   npm run cron:start
   # Process runs indefinitely, executing jobs on schedule
   ```

2. **One-Shot Mode** (single execution, useful in Lambda)
   ```bash
   RUN_ONCE=1 npm run cron:start
   # Executes scheduler once and exits
   ```

### Jobs Structure

```
cron/
├── index.ts                          # Main entry point
└── jobs/
    ├── rss-feeds-scheduler.job.ts    # RSS feed sync
    ├── image-download.job.ts         # Image processing
    └── cleanup.job.ts                # Database cleanup
```

### RSS Feeds Scheduler Job

**File:** `cron/jobs/rss-feeds-scheduler.job.ts`

**Schedule:** Configurable (default: every 6 hours)

**Process:**

1. **Acquire Distributed Lock**
   ```typescript
   const lock = await createCronLock('rss:feeds:sync', { ttl: 3600 });
   ```

2. **Query Active Feeds**
   ```typescript
   const feeds = await RssFeedsRepository.findActive();
   ```

3. **Queue Feed Processing Jobs**
   ```typescript
   for (const feed of feeds) {
     queue.enqueue({
       type: JobType.PROCESS_RSS_FEED,
       feedId: feed.id,
       priority: 'normal'
     });
   }
   ```

4. **Worker Processes Queue**
   - Worker fetches feed from URL
   - Parser extracts items
   - Item processor:
     - Checks for duplicates (by GUID)
     - Downloads images to S3
     - Creates post in database
     - Links RSS item to post
   - Updates `last_sync_at` timestamp

5. **Error Handling**
   - Continues on partial failures
   - Logs errors for monitoring
   - Retries with exponential backoff
   - Maximum retry attempts: 3

### Job Queue System

**In-Memory Queue** (`src/queue/queue.memory.ts`):

```typescript
interface Job {
  type: JobType;
  feedId?: number;
  postId?: number;
  priority: 'high' | 'normal' | 'low';
  retries: number;
  lastError?: string;
}

// Usage
const queue = getQueue();
queue.enqueue({
  type: JobType.PROCESS_RSS_FEED,
  feedId: 1,
  priority: 'normal'
});

// Process
while (queue.hasJobs()) {
  const job = queue.dequeue();
  try {
    await processJob(job);
  } catch (error) {
    if (job.retries < 3) {
      job.retries += 1;
      queue.enqueue(job);  // Retry
    }
  }
}
```

### Feature Flags

**File:** `src/shared/config/feature-flags.ts`

```typescript
interface FeatureFlags {
  ENABLE_CRON: boolean;                  // Overall cron switch
  ENABLE_RSS_PROCESSING: boolean;        // RSS sync
  ENABLE_IMAGE_DOWNLOAD: boolean;        // Image processing
  ENABLE_CACHE: boolean;                 // Redis caching
  ENABLE_PRESIGNED_URLS: boolean;        // S3 presigning
}
```

**Configuration:**
```env
ENABLE_CRON=true
ENABLE_RSS_PROCESSING=true
ENABLE_IMAGE_DOWNLOAD=true
```

**Usage:**
```typescript
if (featureFlags.ENABLE_RSS_PROCESSING) {
  await scheduler.schedule();
}
```

### Execution Guard

**Purpose:** Prevent concurrent scheduler execution

```typescript
class ExecutionGuard {
  constructor(timeoutMs: number, onTimeout: () => void) {}
  
  isExecuting(): boolean
  startExecution(): void
  endExecution(): void
}

// Usage
const guard = new ExecutionGuard(300000, () => {
  log.warn('Scheduler timeout - force killing stuck process');
});

if (guard.isExecuting()) {
  log.warn('Previous run still active - skipping');
  return;
}

guard.startExecution();
try {
  await runScheduler();
} finally {
  guard.endExecution();
}
```

### Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  log.info('Shutting down - SIGTERM received');
  
  // 1. Stop accepting new jobs
  scheduler.pause();
  
  // 2. Wait for in-flight jobs (timeout: 30s)
  await waitForJobsToComplete(30000);
  
  // 3. Release locks
  await distributedLock.release();
  
  // 4. Close connections
  await closeDbConnection();
  await closeRedisClient();
  
  // 5. Exit gracefully
  process.exit(0);
});
```

---

## Development Environment

### Prerequisites

- **Node.js:** 20.x or higher
- **npm:** 10.x or higher
- **Docker Desktop:** For local services (MariaDB, Redis)
- **Git:** For version control

### Quick Start

#### 1. Clone and Install

```bash
cd /home/ubuntu
git clone https://github.com/yourusername/zox-nextjs.git
cd zox-nextjs
npm install
```

#### 2. Start Services

```bash
# Start Docker containers (MariaDB, Redis, Adminer, Redis Commander)
docker-compose up -d

# Verify services are running
docker-compose ps
```

#### 3. Environment Setup

```bash
# Create .env.local with required variables
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local
```

**Required Variables:**
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=zox_db
DB_USER=zox_user
DB_PASSWORD=zox_password
DATABASE_URL=mysql://zox_user:zox_password@localhost:3306/zox_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6382
REDIS_URL=redis://localhost:6382

# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000

# JWT
JWT_SECRET=dev-secret-key-change-in-production
JWT_EXPIRES_IN=15m

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=startupnews-media-2026

# Admin User
ADMIN_EMAIL=admin@startupnews.fyi
ADMIN_PASSWORD=Admin@123!
ADMIN_NAME=Admin User
```

#### 4. Database Setup

```bash
# Run migrations (creates tables)
npm run db:migrate

# Seed database (initial data)
npm run db:seed

# Or migrate from WordPress
npm run db:migrate-from-wordpress
```

#### 5. Start Development Server

```bash
# Using webpack (recommended)
npm run dev

# Or using Turbopack (experimental)
npm run dev:turbo

# Opens on http://localhost:3000
```

### Development URLs

- **Frontend:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin
- **Database UI (Adminer):** http://localhost:8080
- **Redis UI (Redis Commander):** http://localhost:8081
- **Health Check:** http://localhost:3000/api/health

### Admin Credentials

After seeding:
- **Email:** `admin@startupnews.fyi`
- **Password:** `Admin@123!`

---

## Build & Deployment

### Production Build

```bash
# Build Next.js application
npm run build

# Start production server
npm start
```

**Build Output:**
- `.next/` directory with optimized bundle
- Build time: 5-6 seconds
- Bundle analysis: `npm run analyze` (if available)

### Production Server (PM2)

**Configuration:** `ecosystem.config.js`

```javascript
module.exports = {
  apps: [
    {
      name: 'zox-web',                    // Web server
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      max_memory_restart: '4G',
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'zox-cron',                   // Background jobs
      script: 'npm',
      args: 'run cron:start',
      instances: 1,
      autorestart: true,
      env: { 
        NODE_ENV: 'production',
        ENABLE_CRON: true,
        ENABLE_RSS_PROCESSING: true
      }
    }
  ]
};
```

**Commands:**
```bash
# Start all services
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# Logs
pm2 logs zox-web
pm2 logs zox-cron

# Restart
pm2 restart all
pm2 reload all

# Stop
pm2 stop all
pm2 delete all
```

### Docker Deployment

**Production Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

**Build & Run:**
```bash
docker build -t startupnews:latest .
docker run -p 3000:3000 \
  -e DATABASE_URL=mysql://... \
  -e REDIS_HOST=host.docker.internal \
  startupnews:latest
```

### Environment-Specific Configurations

**Development:**
```env
NODE_ENV=development
DEBUG=*:*
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENABLE_CACHE=false
```

**Production:**
```env
NODE_ENV=production
DEBUG=errors:*
NEXT_PUBLIC_APP_URL=https://startupnews.fyi
ENABLE_CACHE=true
ENABLE_CRON=true
```

### Deployment Checklist

- [ ] Set all required environment variables
- [ ] Run database migrations
- [ ] Build application successfully
- [ ] Test health endpoint: `/api/health`
- [ ] Verify admin login works
- [ ] Test RSS sync (if enabled)
- [ ] Validate S3 image uploads
- [ ] Check Redis connectivity
- [ ] Monitor logs for errors
- [ ] Set up monitoring/alerting

---

## Development Workflow

### Feature Development Workflow

#### 1. Create a Feature Branch
```bash
git checkout -b feature/post-sharing
```

#### 2. Make Changes
- Create/edit files in appropriate modules
- Follow existing code patterns
- Add TypeScript types
- Write tests if applicable

#### 3. Test Locally
```bash
npm run dev         # Run development server
npm run lint        # Check code quality
npm run db:migrate  # Update schema if needed
```

#### 4. Commit and Push
```bash
git add .
git commit -m "feat: Add post sharing feature"
git push origin feature/post-sharing
```

#### 5. Create Pull Request
- Describe changes
- Link related issues
- Request review

#### 6. Merge and Deploy
```bash
npm run build       # Verify build
pm2 restart all     # Restart services
```

### Code Organization Guidelines

#### Module Structure

When adding a new feature, follow this structure:

```
modules/new-feature/
├── domain/
│   └── types.ts                # Interfaces & types
├── repository/
│   └── new-feature.repository.ts  # DB access
├── service/
│   └── new-feature.service.ts     # Business logic
├── api/
│   └── route.ts                # API endpoints
└── utils/
    └── new-feature.utils.ts    # Helper functions
```

#### Component Organization

```
components/
├── NewFeature.tsx              # Main component
├── NewFeatureCard.tsx          # Sub-component
├── NewFeatureForm.tsx          # Form component
└── NewFeatureList.tsx          # List component
```

#### Hook Organization

```
hooks/
└── useNewFeature.ts            # Custom hook
```

### Database Changes

#### Adding a New Table

1. **Create Migration Script:**
   ```typescript
   // scripts/migrate-add-new-table.ts
   import { getDbConnection } from '@/shared/database/connection';

   async function migrate() {
     const conn = await getDbConnection();
     await conn.query(`
       CREATE TABLE new_table (
         id INT AUTO_INCREMENT PRIMARY KEY,
         name VARCHAR(255) NOT NULL,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_name (name)
       )
     `);
     console.log('Migration completed');
   }

   migrate().then(() => process.exit(0));
   ```

2. **Run Migration:**
   ```bash
   tsx scripts/migrate-add-new-table.ts
   ```

3. **Commit Changes:**
   - Add migration script to git
   - Document schema change in DATABASE_MIGRATION_SUMMARY.md

#### Adding a Column

```typescript
// In migration script or one-time script
await conn.query(`
  ALTER TABLE posts 
  ADD COLUMN new_field VARCHAR(255) NULL 
  AFTER existing_field
`);
```

### Testing & Quality

**Code Quality:**
```bash
npm run lint        # Run ESLint
```

**Manual Testing Checklist:**
- [ ] Feature works on desktop
- [ ] Feature works on mobile
- [ ] Forms validate correctly
- [ ] Error handling works
- [ ] Loading states display
- [ ] Images load correctly
- [ ] Search works
- [ ] Admin operations work

### Debugging

**Enable Debug Logging:**
```env
DEBUG=*:*  # All logs
DEBUG=posts:*  # Posts module only
DEBUG=rss:*  # RSS module only
```

**Browser DevTools:**
```javascript
// In browser console
// Check admin data refresh
window.__ADMIN_DATA_UPDATED_EVENT__ = (detail) => console.log(detail);
```

**Database Queries:**
```bash
# Connect to MariaDB
docker exec -it zox-mariadb mariadb -uzox_user -pzox_password zox_db

# Common queries
SELECT COUNT(*) FROM posts WHERE status = 'published';
SELECT * FROM rss_feed_items WHERE post_id IS NULL LIMIT 10;
SELECT * FROM posts WHERE created_from = 'rss' ORDER BY created_at DESC;
```

**Redis Inspection:**
```bash
# Connect to Redis
docker exec -it zox-redis redis-cli

# Key operations
KEYS "posts:*"
GET "post:slug:my-article"
DEL "posts:all:*"
FLUSHDB  # Clear all (dev only)
```

---

## Key Design Patterns

### 1. Data Adapter Pattern

**Location:** `src/lib/data-adapter.ts`

**Purpose:** Single entry point for all server-side data access

```typescript
// Instead of importing repository directly in components:
const posts = await PostsRepository.getAll();

// Use data adapter:
const posts = await getFeaturedPosts();
const postsByTag = await getPostsByTag(tagId);
const singlePost = await getPostBySlug(slug);
```

**Benefits:**
- Centralized caching logic
- Consistent error handling
- Easy to mock for testing
- Performance optimization point

### 2. Repository Pattern

**Each module has a repository:**

```typescript
// src/modules/posts/repository/posts.repository.ts
export class PostsRepository {
  static async getAll(filters: PostFilters): Promise<Post[]>
  static async getOne(id: number): Promise<Post | null>
  static async create(data: PostCreateDto): Promise<Post>
  static async update(id: number, data: PostUpdateDto): Promise<Post>
  static async delete(id: number): Promise<boolean>
}
```

**Benefits:**
- Separation of concerns
- Easy to test with mocks
- Database logic isolated

### 3. Service Pattern

**Each module has a service layer:**

```typescript
// src/modules/posts/service/posts.service.ts
export class PostsService {
  async getPublished(): Promise<Post[]>
  async getFeatured(): Promise<Post[]>
  async getTrending(): Promise<Post[]>
  async publish(id: number): Promise<Post>
  async archive(id: number): Promise<Post>
}
```

**Benefits:**
- Business logic encapsulated
- Reusable operations
- Easier to maintain

### 4. Caching Decorator Pattern

```typescript
async function getCachedPosts(cacheKey: string, ttl: number) {
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return cached;
  
  // Fetch from source
  const data = await PostsRepository.getAll();
  
  // Store in cache
  await redis.set(cacheKey, JSON.stringify(data), ttl);
  
  return data;
}
```

### 5. Middleware Pattern

**Authentication Middleware:**
```typescript
// src/shared/middleware/auth.middleware.ts
export async function requireAuth(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split(' ')[1];
  if (!token) throw new Error('Unauthorized');
  
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded;
}
```

### 6. Queue Pattern

**Job enqueueing with retry logic:**

```typescript
const queue = getQueue();

queue.enqueue({
  type: JobType.SEND_EMAIL,
  userId: user.id,
  priority: 'high'
});

// Worker processes queue
while (queue.hasJobs()) {
  const job = queue.dequeue();
  try {
    await processJob(job);
  } catch (error) {
    job.retries++;
    if (job.retries < MAX_RETRIES) {
      queue.enqueue(job);  // Retry
    }
  }
}
```

---

## Performance Considerations

### Frontend Performance

1. **Code Splitting**
   - Next.js automatically splits code by route
   - Dynamic imports for heavy components:
     ```typescript
     const ExpensiveComponent = dynamic(() => import('@/components/Expensive'));
     ```

2. **Image Optimization**
   - Use Next.js Image component (automatic optimization)
   - Specify dimensions to prevent layout shift
   - Use appropriate formats (WebP when supported)

3. **Caching Headers**
   - Static assets (JS, CSS): 1 year cache
   - HTML pages: 5 minutes cache (CDN), with stale-while-revalidate

### Backend Performance

1. **Database Queries**
   - Add indexes for frequently filtered columns
   - Use connection pooling (MariaDB)
   - Avoid N+1 queries (eager load relations)

2. **Redis Caching**
   - Cache frequently accessed data
   - Set TTLs based on data freshness requirements
   - Warm cache on application startup

3. **API Optimization**
   - Pagination (avoid fetching all records)
   - Field selection (return only needed fields)
   - Compression (gzip for large responses)

### Build Performance

**Current Build Time:** 5-6 seconds

**Optimization:**
- TypeScript strict mode enabled
- ESLint runs during build
- Node.js `--max-old-space-size=4096` for large projects

### Runtime Performance

**Metrics to Monitor:**
- Time to First Paint (TTL)
- Time to Interactive (TTI)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- First Input Delay (FID)

**Tools:**
- Google Lighthouse
- Web Vitals monitoring
- Application Performance Monitoring (APM)

---

## Known Issues & Considerations

### Current Limitations

1. **Image Rendering**
   - Some images with unusual aspect ratios may get cropped
   - Fallback to placeholder if image fails to load
   - S3 URL signing required for private images

2. **RSS Processing**
   - May timeout on feeds with 1000+ items
   - Image size limits: < 10MB per image
   - Duplicate detection based on feed GUID only

3. **Admin Auto-Refresh**
   - Requires active browser tab to propagate
   - WebSocket recommended for real-time sync in large teams

4. **Caching**
   - Cache invalidation on bulk operations may miss edge cases
   - Redis memory must be monitored

### Future Improvements

1. **Architecture**
   - [ ] Move RSS processing to separate microservice
   - [ ] Implement GraphQL for flexible queries
   - [ ] Add WebSocket support for real-time updates
   - [ ] Implement event sourcing for audit trail

2. **Features**
   - [ ] Advanced content scheduling
   - [ ] Content recommendations/ML
   - [ ] Multi-language support
   - [ ] Webhooks for external integrations
   - [ ] Comment system
   - [ ] User-generated content moderation

3. **Infrastructure**
   - [ ] Database replication/failover
   - [ ] Redis Cluster for high availability
   - [ ] CDN integration (CloudFront)
   - [ ] Load balancing with health checks
   - [ ] Containerized deployment (Kubernetes)

4. **Monitoring**
   - [ ] Error tracking (Sentry)
   - [ ] Analytics (Mixpanel, Amplitude)
   - [ ] Performance monitoring (New Relic)
   - [ ] Log aggregation (ELK stack)

### Troubleshooting Guide

**Database Connection Failed**
```bash
# Check if MariaDB is running
docker ps | grep mariadb

# Verify credentials
docker exec zox-mariadb mysql -uzox_user -pzox_password zox_db -e "SELECT 1"

# Check connection pool in code
DEBUG=*:* npm run dev
```

**Redis Connection Failed**
```bash
# Check Redis is running
docker exec zox-redis redis-cli ping

# Verify port configuration
netstat -tlnp | grep 6382
```

**Build Fails**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build

# Check disk space
df -h
```

**Admin Login Not Working**
```bash
# Verify admin user exists
docker exec zox-mariadb mysql -uzox_user -pzox_password zox_db \
  -e "SELECT email, name FROM users WHERE role='admin'"

# Reset password
npm run db:reset-admin
```

**RSS Feed Not Syncing**
```bash
# Check feature flag
grep ENABLE_RSS_PROCESSING .env.local

# Check logs
pm2 logs zox-cron

# Test feed manually
RUN_ONCE=1 npm run cron:rss-feeds
```

---

## Appendices

### A. Environment Variables Reference

**See:** `.env.example` in project root

### B. Database Migration Guide

**See:** `docs/PROJECT_DOCUMENTATION.md`

### C. AWS S3 Setup

**See:** `docs/S3-IMAGES-SETUP.md`

### D. RSS Configuration

**See:** `docs/CRON_AND_SETTINGS.md`

### E. Deployment Guide

**See:** `SETUP_NEW_PC_GUIDE.md`

---

## Contributing

When contributing to this project:

1. Follow the code organization guidelines
2. Write TypeScript with strict mode enabled
3. Add comments for complex logic
4. Test changes locally before committing
5. Commit with descriptive messages
6. Include related documentation updates

---

## License

[Specify your license here - e.g., MIT, Apache 2.0, etc.]

---

## Support & Contact

For questions or issues:
- Check existing documentation in `docs/`
- Review troubleshooting section
- Contact the development team

---

**Document Version:** 3.0  
**Last Updated:** March 26, 2026  
**Maintained By:** Development Team
