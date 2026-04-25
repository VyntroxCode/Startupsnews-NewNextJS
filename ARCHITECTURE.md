# StartupNews.fyi - Architecture Design Document

**Project**: StartupNews.fyi - News & Events Platform  
**Version**: 1.0  
**Last Updated**: March 2026  
**Framework**: Next.js 16.1.6 + React 19 + TypeScript 5.x  

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Features](#core-features)
5. [Data Layer Architecture](#data-layer-architecture)
6. [Authentication & Security](#authentication--security)
7. [API Design](#api-design)
8. [UI Components & Patterns](#ui-components--patterns)
9. [Deployment & Infrastructure](#deployment--infrastructure)
10. [Background Jobs & Scheduling](#background-jobs--scheduling)
11. [Architectural Patterns](#architectural-patterns)
12. [Database Schema](#database-schema)
13. [Development Conventions](#development-conventions)
14. [Performance & Optimization](#performance--optimization)

---

## Overview

**StartupNews.fyi** is a modern, production-grade content management system built on Next.js. It combines a public-facing news platform with a comprehensive admin panel for content management, RSS feed integration, and event management.

### Key Characteristics

- **Dual Interface**: Public news platform + Private admin panel
- **Multi-source Content**: Original articles + RSS feed auto-import
- **Event Management**: Startup events with location-based filtering
- **Real-time Updates**: Background jobs for RSS processing and image optimization
- **Scalable Architecture**: Domain-driven design with service/repository layers
- **Cloud-native**: AWS S3 integration, Redis caching, MariaDB
- **Enterprise Security**: JWT authentication, role-based access control, parameterized SQL, WAF integration

---

## Technology Stack

### Backend & Framework

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 16+ | Server runtime |
| **Framework** | Next.js | 16.1.6 | Full-stack React framework with SSR/SSG |
| **Language** | TypeScript | 5.x | Type-safe JavaScript |
| **Build Tool** | Webpack | 5.x | Module bundling (via Next.js) |
| **HTTP** | native fetch API | - | API requests |

### Data Layer

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Database** | MariaDB | 10.11 | Primary relational database |
| **Query Builder** | mariadb npm | 3.4.5 | Async MySQL/MariaDB client |
| **Connection Pool** | mariadb pool | 3.4.5 | Connection management (15 max, 30s timeout) |
| **Cache** | Redis | 7-alpine | In-memory cache for posts, categories, search |
| **Caching Strategy** | Custom | - | TTL-based caching with graceful degradation |

### Libraries & Tools

| Category | Library | Version | Purpose |
|----------|---------|---------|---------|
| **UI Framework** | React | 19.2.3 | Component library |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS framework |
| **Icons** | FontAwesome | 7.1.0 | Icon library |
| **Rich Text Editor** | Tiptap | 3.19.0 | Headless rich text editor |
| **RSS Parsing** | rss-parser | 3.13.0 | RSS/Atom feed parser |
| **Scheduling** | node-cron | 4.2.1 | Cron job scheduler |
| **Authentication** | jsonwebtoken | 9.0.3 | JWT signing & verification |
| **Password Hashing** | bcryptjs | 3.0.3 | Secure password hashing |
| **AWS Integration** | aws-sdk-js-v3 | ^3.987.0 | S3 client for uploads |
| **Image Processing** | image-size | 2.0.2 | Image dimension detection |
| **Compression** | compression | 1.7.4 | gzip response compression |
| **CORS** | cors | 2.8.5 | Cross-origin resource sharing |
| **Process Manager** | PM2 | Latest | Production process manager |

### Development Tools

```json
{
  "linter": "ESLint 9.x",
  "formatter": "Prettier (via Next.js ESLint config)",
  "type-checker": "TypeScript 5.x (strict mode)",
  "database-tool": "Adminer (Docker, optional)",
  "testing": "Manual (no Jest/Vitest in current setup)",
  "monitoring": "PM2 Plus (optional), built-in health endpoint"
}
```

---

## Project Structure

### Directory Hierarchy

```
src/
├── app/                          # Next.js App Router (pages & API routes)
│   ├── (admin)/                  # Admin layout group (private section)
│   │   ├── admin/                # Admin dashboards & management
│   │   │   ├── authors/          # Author CRUD
│   │   │   ├── banners/          # Featured banner management
│   │   │   ├── categories/       # Post category management
│   │   │   ├── events/           # Event management
│   │   │   ├── posts/            # Main post management interface
│   │   │   │   └── page.tsx      # Post listing with filters
│   │   │   ├── rss-feeds/        # RSS feed configuration & monitoring
│   │   │   ├── login/            # Admin authentication
│   │   │   └── page.tsx          # Admin dashboard home
│   │   └── layout.tsx            # Admin layout wrapper (auth guard, nav)
│   │
│   ├── api/                      # RESTful API endpoints
│   │   ├── admin/                # Protected admin APIs
│   │   │   ├── auth/             # [POST] login, [POST] verify
│   │   │   ├── authors/          # [GET, POST, PUT, DELETE]
│   │   │   ├── banners/          # [GET, POST, PUT, DELETE]
│   │   │   ├── categories/       # [GET, POST, PUT, DELETE]
│   │   │   ├── events/           # [GET, POST, PUT, DELETE]
│   │   │   ├── media/            # Media handling, pre-signed URLs
│   │   │   ├── posts/            # [GET, POST, PUT, DELETE, PUBLISH]
│   │   │   ├── presign/          # [GET] S3 presigned upload URL
│   │   │   ├── rss-feeds/        # [GET, POST, PUT, DELETE, FETCH]
│   │   │   ├── site-settings/    # [GET, PUT] site configuration
│   │   │   ├── stats/            # [GET] analytics data
│   │   │   ├── upload/           # [POST] multipart file upload
│   │   │   └── users/            # [GET, POST, PUT] user management
│   │   │
│   │   ├── posts/                # [GET] public post listings
│   │   ├── posts/[slug]/         # [GET] single post
│   │   ├── events/               # [GET] event listings
│   │   ├── events/[slug]/        # [GET] single event
│   │   ├── categories/           # [GET] category listings
│   │   ├── categories/[slug]/    # [GET] posts by category
│   │   ├── search/               # [GET] full-text search
│   │   ├── banners/              # [GET] banner listings
│   │   ├── health/               # [GET] health check
│   │   └── cron/                 # [POST] trigger scheduled jobs
│   │
│   ├── (public)/                 # Public pages (no auth required)
│   │   ├── category/[slug]/      # Category landing page
│   │   ├── post/[slug]/          # Single article view
│   │   ├── author/[slug]/        # Author profile & articles
│   │   ├── events/               # Events listing & filters
│   │   ├── startup-events/[slug]/# Single event detail
│   │   ├── search/               # Search results page
│   │   ├── news/                 # News aggregation page
│   │   ├── about/                # Static about page
│   │   ├── advertise-with-us/    # Advertising page
│   │   ├── contact-us/           # Contact form
│   │   ├── privacy-policy/       # Privacy policy
│   │   ├── terms-and-conditions/ # Terms page
│   │   ├── return-refund-policy/ # Return policy
│   │   ├── our-partners/         # Partners page
│   │   └── page.tsx              # Home page
│   │
│   ├── layout.tsx                # Root layout (Header, Footer, common UI)
│   ├── favicon.ico               # Favicon
│   ├── robots.ts                 # Dynamic robots.txt generation
│   ├── sitemap.ts                # Dynamic sitemap.xml generation
│   ├── error.tsx                 # Error boundary
│   ├── global-error.tsx          # Root error boundary
│   ├── globals.css               # Global styles (theme CSS)
│   └── styles/                   # Additional CSS modules
│
├── components/                    # Reusable React Components
│   ├── admin/                    # Admin-specific components
│   │   ├── AdminHeader.tsx       # Admin navbar with user menu
│   │   ├── AdminSidebar.tsx      # Admin navigation sidebar
│   │   ├── RichTextEditor.tsx    # Tiptap editor wrapper
│   │   ├── RichTextEditorClient.tsx # Client-side editor component
│   │   ├── ImageUpload.tsx       # S3 multipart uploader
│   │   ├── SearchBar.tsx         # Admin search interface
│   │   ├── Pagination.tsx        # Table pagination controls
│   │   └── LoadingSkeleton.tsx   # Loading placeholder
│   │
│   ├── Header.tsx                # Public header/navbar
│   ├── Footer.tsx                # Public footer
│   ├── FlyMenu.tsx               # Mobile hamburger menu
│   ├── FlyMenuContext.tsx        # Menu state management
│   ├── SearchOverlay.tsx         # Full-screen search modal
│   ├── BannerCarousel.tsx        # Featured carousel slider
│   ├── PostImage.tsx             # Smart image component (fallbacks, blur)
│   ├── CategorySection.tsx       # Category widget (home page)
│   ├── HomeWidgetSection.tsx     # Widget layout section
│   ├── MoreNewsSection.tsx       # Infinite-scroll news list
│   ├── EventCard.tsx             # Event listing card
│   ├── FullArticle.tsx           # Full article renderer
│   ├── InfiniteArticleLoader.tsx # Pagination/infinite scroll
│   ├── AuthorProfile*.tsx        # Author bio & articles
│   ├── ConditionalLayout.tsx     # Route-based layout logic
│   └── ... (20+ additional UI components)
│
├── lib/                          # Business Logic & Utilities
│   ├── data-adapter.ts           # Unified data interface (Post type)
│   ├── data.ts                   # Public data fetching functions
│   ├── admin-auth.ts             # Client-side auth helpers
│   ├── config.ts                 # Site configuration (menu, social, etc.)
│   ├── post-utils.ts             # Post transformation utilities
│   ├── event-utils.ts            # Event transformation utilities
│   ├── content-utils.ts          # Content processing (HTML, markdown)
│   ├── sector-categories.ts      # Category slug → ID mappings (12 sectors)
│   ├── events-constants.ts       # Event type/status constants
│   ├── fetch.ts                  # API fetch wrapper with retry logic
│   ├── cache-keys.ts             # Centralized Redis key generation
│   └── ... (additional utilities)
│
├── modules/                      # Domain-Driven Design Modules
│   ├── posts/
│   │   ├── domain/
│   │   │   └── types.ts          # PostEntity, Post interfaces
│   │   ├── repository/
│   │   │   └── posts.repository.ts  # Database queries (SQL)
│   │   ├── service/
│   │   │   └── posts.service.ts  # Business logic (filtering, caching)
│   │   └── utils/
│   │       └── posts.utils.ts    # Transformations (Entity → Post)
│   │
│   ├── events/
│   │   ├── domain/types.ts
│   │   ├── repository/events.repository.ts
│   │   ├── service/events.service.ts
│   │   └── utils/events.utils.ts
│   │
│   ├── categories/
│   │   ├── domain/types.ts
│   │   ├── repository/categories.repository.ts
│   │   ├── service/categories.service.ts
│   │   └── utils/categories.utils.ts
│   │
│   ├── users/
│   │   ├── domain/types.ts
│   │   ├── repository/users.repository.ts
│   │   ├── service/auth.service.ts
│   │   ├── service/users.service.ts
│   │   └── middleware/auth.middleware.ts
│   │
│   ├── rss-feeds/
│   │   ├── domain/types.ts
│   │   ├── repository/rss-feeds.repository.ts
│   │   ├── service/rss-feeds.service.ts
│   │   └── utils/rss-processors.ts
│   │
│   ├── banners/
│   │   ├── domain/types.ts
│   │   ├── repository/banners.repository.ts
│   │   └── service/banners.service.ts
│   │
│   ├── analytics/
│   │   ├── repository/analytics.repository.ts
│   │   └── service/analytics.service.ts
│   │
│   └── upload/
│       └── service/upload.service.ts
│
├── shared/                       # Shared Infrastructure & Services
│   ├── database/
│   │   └── connection.ts         # MariaDB pool management
│   │
│   ├── cache/
│   │   ├── redis.client.ts       # Redis client singleton
│   │   └── cache-manager.ts      # Caching helpers & TTL strategies
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT verification
│   │   ├── cors.middleware.ts    # CORS configuration
│   │   └── error-handler.ts      # Error handling middleware
│   │
│   ├── locks/
│   │   └── redis-lock.ts         # Distributed locking for jobs
│   │
│   ├── config/
│   │   └── feature-flags.ts      # Runtime feature toggles
│   │
│   └── utils/
│       ├── logger.ts             # Structured logging
│       ├── date.utils.ts         # Date formatting (timeAgo, ISO)
│       ├── string.utils.ts       # String manipulation (slugify, sanitize)
│       ├── s3-presign.ts         # AWS S3 presigned URL generation
│       ├── validation.ts         # Input validation schemas
│       ├── timeout.ts            # Timeout utilities
│       ├── memory-guard.ts       # Memory limit checks
│       ├── execution-guard.ts    # Job execution safeguards
│       └── error.ts              # Custom error classes
│
├── queue/                        # Background Job System
│   ├── queue.memory.ts           # In-memory job queue (single-instance)
│   ├── queue.interface.ts        # Queue interface (IQueue)
│   └── job-types.ts              # Job type definitions & handlers
│
├── workers/                      # Background Job Handlers
│   └── rss.worker.ts             # RSS feed processor
│
└── actions/                      # Server Actions (form submissions)
    └── ... (async server functions)

cron/                             # Scheduled Tasks Module
├── index.ts                      # Cron entry point & scheduler
└── jobs/
    └── rss-feeds-scheduler.job.ts # RSS fetch scheduler (queue jobs)

scripts/                          # Database & Utility Scripts
├── init-db.sql                   # Database schema & initial data
├── migrate.ts                    # Schema migration runner
├── seed.ts                       # Seed test data
├── migrate-from-wordpress.ts     # WordPress data import tool
├── sync-posts-from-wp-to-s3.ts  # Image synchronization
├── backfill-post-images-from-wp.ts
├── sync-events-from-startupnews.ts
├── reset-admin-password.ts
├── invalidate-post-cache.ts      # Manual cache clearing
├── check-post-images.ts          # Image URL validation
├── migrations/                   # SQL migration files
└── ... (20+ utility scripts)

public/                           # Static Assets
└── images/                       # Logos, favicons, static images

.env.local                        # Environment variables
package.json                      # Dependencies & scripts
tsconfig.json                     # TypeScript configuration
next.config.ts                    # Next.js configuration
ecosystem.config.js               # PM2 process configuration
dockerfile                        # Container configuration (if applicable)
docker-compose.yml                # Local dev environment
```

---

## Core Features

### 1. Public Content Platform

| Feature | Description | Location |
|---------|-------------|----------|
| **Home Page** | Featured posts, category widgets, trending stories | `/` |
| **News Listing** | Paginated news feed with filters | `/news` |
| **Single Post View** | Full article with comments section, related posts | `/post/[slug]` |
| **Category Pages** | Posts filtered by sector (12 sectors) | `/category/[slug]` |
| **Author Profiles** | Author bio and all published articles | `/author/[slug]` |
| **Search** | Full-text search across title, excerpt, content | `/search?q=...` |
| **Events** | Upcoming/past events with pagination | `/events` |
| **Event Details** | Single event page with registration link | `/startup-events/[slug]` |
| **Static Pages** | About, contact, privacy, terms, advertise | Static routes |

### 2. Admin Panel

| Feature | Purpose | Location |
|---------|---------|----------|
| **Dashboard** | Analytics overview, recent posts | `/admin` |
| **Post Management** | Create, edit, publish, delete posts (with rich text editor) | `/admin/posts` |
| **Event Management** | Manage startup events | `/admin/events` |
| **Category Management** | CRUD categories (12 sectors enforced) | `/admin/categories` |
| **Author Management** | Manage author profiles and bios | `/admin/authors` |
| **RSS Feed Config** | Add/edit RSS sources, monitor fetch status | `/admin/rss-feeds` |
| **Banners** | Featured content carousel management | `/admin/banners` |
| **Site Settings** | Global configuration (site name, logo, meta) | `/admin/site-settings` |
| **Analytics** | Post view counts, trending posts | `/admin/stats` |

### 3. Content Sources

| Source | Method | Automation |
|--------|--------|-----------|
| **Manual Posts** | Rich text editor (Tiptap) in admin | On-demand via admin |
| **RSS Feeds** | Auto-fetch RSS/Atom feeds | Background job (configurable interval) |
| **WordPress** | Migration script (one-time import) | Script-based `migrate-from-wordpress.ts` |
| **External Events** | Admin form or API | On-demand via admin |

### 4. Media Management

| Feature | Implementation |
|---------|-----------------|
| **Image Upload** | S3 presigned URLs + multipart upload (admin) |
| **Featured Images** | Required for post publishing (validation) |
| **Image Processing** | Dimension detection, format validation |
| **RSS Image Download** | Auto-download RSS article images (background job) |
| **Image Optimization** | CDN caching (CloudFront) + S3 storage |
| **Fallback Handling** | PostImage component with grey placeholder fallback |

### 5. RSS Feed Processing

| Step | Description | Module |
|------|-------------|--------|
| **Scheduling** | Check feeds due for refresh (node-cron) | `rss-feeds-scheduler.job.ts` |
| **Queue** | Enqueue RSS_FEED_PROCESS jobs | `queue.memory.ts` |
| **Locking** | Redis lock per feed (prevent concurrency) | `redis-lock.ts` |
| **Fetch** | Parse RSS/Atom feed | `rss-parser` library |
| **Processing** | Extract items, generate post content | `rss.worker.ts` |
| **Image Download** | Download images from RSS articles | `rss.worker.ts` |
| **Upload** | Upload to S3, store URL | `upload.service.ts` |
| **Post Creation** | Create draft/auto-publish posts | `posts.service.ts` |
| **Deduplication** | Link duplicate RSS items (by GUID) | `rss_feed_items.post_id` |

---

## Data Layer Architecture

### Database Design

#### Connection Management

```typescript
// src/shared/database/connection.ts
- Pool size: 15 (3 during build to prevent exhaustion)
- Wait queue timeout: 30s (prod), 8s (dev for fast failure)
- Idle timeout: 60s
- Max retries: 3 with exponential backoff
- SSL support: Optional via DB_SSL env
```

#### Core Entities & Relationships

```sql
-- Users (5 columns)
users {
  id: int PRIMARY KEY,
  email: varchar UNIQUE,
  password_hash: varchar,
  name: varchar,
  role: ENUM('admin', 'editor', 'author'),
  avatar_url: varchar NULL,
  is_active: boolean DEFAULT true,
  last_login: timestamp NULL,
  created_at: timestamp,
  updated_at: timestamp
}

-- Categories (sectors)
categories {
  id: int PRIMARY KEY,
  name: varchar UNIQUE,
  slug: varchar UNIQUE INDEX,
  description: text NULL,
  image_url: varchar NULL,
  parent_id: int NULL (FK categories.id),
  sort_order: int,
  created_at: timestamp,
  updated_at: timestamp
}

-- Posts (main content)
posts {
  id: int PRIMARY KEY,
  slug: varchar UNIQUE INDEX,
  title: varchar NOT NULL,
  excerpt: text,
  content: LONGTEXT NOT NULL,
  author_id: int FK users.id,
  category_id: int FK categories.id,
  featured_image_url: varchar NULL,
  featured_image_small_url: varchar NULL,
  status: ENUM('draft', 'published', 'archived') DEFAULT 'draft',
  format: ENUM('standard', 'video', 'gallery'),
  featured: boolean DEFAULT false,
  trending_score: int DEFAULT 0,
  view_count: int DEFAULT 0,
  published_at: timestamp NULL,
  created_at: timestamp,
  updated_at: timestamp,
  meta_description: varchar NULL,
  FULLTEXT INDEX idx_search (title, excerpt, content)
}

-- Categories for posts
post_categories {
  id: int PRIMARY KEY,
  post_id: int FK posts.id,
  category_id: int FK categories.id,
  UNIQUE(post_id, category_id)
}

-- Events
events {
  id: int PRIMARY KEY,
  slug: varchar UNIQUE INDEX,
  title: varchar NOT NULL,
  excerpt: text,
  description: text,
  location: varchar NOT NULL,
  event_date: date NOT NULL,
  event_time: time NOT NULL,
  image_url: varchar NULL,
  external_url: varchar NULL,
  status: ENUM('upcoming', 'ongoing', 'past', 'cancelled'),
  created_at: timestamp,
  updated_at: timestamp
}

-- RSS Feeds
rss_feeds {
  id: int PRIMARY KEY,
  name: varchar,
  url: varchar UNIQUE,
  enabled: boolean DEFAULT true,
  category_id: int FK categories.id,
  author_id: int FK users.id,
  fetch_interval_minutes: int DEFAULT 60,
  max_items_per_fetch: int DEFAULT 10,
  auto_publish: boolean DEFAULT false,
  logo_url: varchar NULL,
  last_fetched_at: timestamp NULL,
  last_error: text NULL,
  created_at: timestamp,
  updated_at: timestamp
}

-- RSS Feed Items (articles from feeds)
rss_feed_items {
  id: int PRIMARY KEY,
  rss_feed_id: int FK rss_feeds.id,
  post_id: int FK posts.id NULL (linked if created post),
  guid: varchar UNIQUE (unique per feed + guid),
  title: varchar,
  url: varchar,
  pubDate: timestamp,
  description: text,
  author: varchar NULL,
  source_author: varchar NULL,
  source_logo_url: varchar NULL,
  created_at: timestamp
}

-- Banners (featured carousel)
banners {
  id: int PRIMARY KEY,
  title: varchar,
  excerpt: text,
  image_url: varchar,
  link_url: varchar NULL,
  status: ENUM('active', 'inactive'),
  sort_order: int,
  created_at: timestamp,
  updated_at: timestamp
}

-- Analytics
analytics {
  id: int PRIMARY KEY,
  post_id: int FK posts.id,
  visitor_id: varchar (anonymized IP/cookie),
  created_at: timestamp,
  INDEX idx_post_id (post_id),
  INDEX idx_created_at (created_at)
}

-- Sessions
sessions {
  id: varchar PRIMARY KEY,
  user_id: int FK users.id,
  token_hash: varchar,
  expires_at: timestamp,
  created_at: timestamp
}

-- Site Settings
site_settings {
  id: int PRIMARY KEY,
  key: varchar UNIQUE,
  value: text,
  updated_at: timestamp
}
```

### Caching Strategy

#### Redis Integration

```typescript
// Cache Layer (src/shared/cache/cache-manager.ts)
Configuration:
- URL: process.env.REDIS_URL (redis://localhost:6379)
- Graceful Degradation: If Redis unavailable, app continues (cache=null)
- Connection Retry: Exponential backoff on startup
- TTL Strategy: Configurable per data type

Cache Keys (Pattern):
posts:all:{filters_hash}         # 60s (category list, featured)
posts:single:{slug}              # 300s (single post)
posts:featured                   # 60s
posts:trending                   # 60s
categories:all                   # 3600s
search:results:{query_hash}      # 300s
events:upcoming                  # 300s
events:all                       # 300s
banners:active                   # 300s

Invalidation:
- Time-based: TTL expiry
- Event-based: Manual via API (`/api/admin/cache/invalidate`)
- Deployment: Clear all on build
```

#### Cache-Aside Pattern

```typescript
async function getPostsByCategory(categorySlug: string) {
  const cacheKey = `posts:${categorySlug}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Cache miss: fetch from DB
  const posts = await postsRepository.findByCategory(categorySlug);
  
  // Populate cache with TTL
  await redis.setEx(cacheKey, 60, JSON.stringify(posts));
  return posts;
}
```

### Data Adapter Pattern

The `data-adapter.ts` file provides a **unified public interface** to decouple UI from database:

```typescript
// Internal database entity
type PostEntity = {
  id: string;
  slug: string;
  title: string;
  content: string; // LONGTEXT
  featured_image_url: string | null;
  author_id: string;
  category_id: string;
  published_at: Date;
  created_at: Date;
  // ... more DB columns
}

// Public API interface (UI uses this)
type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string; // Truncated from content
  content: string;
  category: string; // Human-readable name
  categorySlug: string;
  date: string; // ISO format
  timeAgo: string; // "2 hours ago"
  image: string; // Featured image
  authorName: string;
  authorSlug: string;
  sourceUrl?: string; // For RSS articles
  sourceName?: string;
  // ... additional UI fields
}

// Transformation happens in service layer
export async function getPostsByCategory(slug: string): Promise<Post[]> {
  const entities = await PostsRepository.findByCategory(slug);
  return entities.map(entity => PostsUtils.entityToDto(entity));
}
```

---

## Authentication & Security

### JWT Authentication Flow

```
1. Login (/api/admin/auth/login)
   Email + Password → Verify bcrypt hash
   ↓
2. Token Generation
   Payload: { userId, email, role, iat, exp }
   Secret: process.env.JWT_SECRET
   Expiry: 7 days
   ↓
3. Token Storage (Client)
   localStorage.setItem('adminToken', token)
   Cookie (httpOnly, Secure, SameSite=Lax)
   ↓
4. Token Verification (Protected Routes)
   Extract from: Authorization header, X-Admin-Token, form body, cookies, query params
   Validate: Signature, expiration, user active status
   Attach user context to request
   ↓
5. Authorization
   Check role (admin, editor, author)
   Allow/deny based on resource ownership
```

### Security Measures

#### Input Validation & Injection Prevention

| Threat | Mitigation |
|--------|-----------|
| **SQL Injection** | Parameterized queries (mariadb prepared statements) |
| **XSS (Cross-Site Scripting)** | Tiptap sanitization, React escaping, Content Security Policy |
| **CSRF (Cross-Site Request Forgery)** | SameSite=Lax cookies, form action validation |
| **Weak Passwords** | Minimum 8 chars enforced (admin form) |
| **Password Reuse** | bcryptjs with salt rounds = 10 |
| **Token Hijacking** | httpOnly cookies, token expiry (7 days), HTTPS only |

#### API Security Headers

```typescript
// src/shared/middleware/headers.middleware.ts
{
  'X-Content-Type-Options': 'nosniff',          // Prevent MIME type guessing
  'X-Frame-Options': 'DENY',                    // Prevent clickjacking
  'X-XSS-Protection': '1; mode=block',          // XSS defense
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=()',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' // HTTPS only
}

// Public pages with SEO
{ 'X-Robots-Tag': 'index, follow' }

// Admin/API routes (hardening)
{ 'X-Robots-Tag': 'noindex, nofollow' }
```

#### Role-Based Access Control (RBAC)

```typescript
enum Role {
  ADMIN = 'admin',      // Full control
  EDITOR = 'editor',    // Can publish posts, manage RSS
  AUTHOR = 'author'     // Can create/edit own posts only
}

// Middleware enforces roles
async function requireAuth(req: Request, minimumRole: Role) {
  const user = await verifyJWT(req);
  if (!user) return null;
  if (!hasRole(user.role, minimumRole)) {
    return { error: 'Insufficient permissions', status: 403 };
  }
  return { user };
}

// Usage: requireAuth(req, 'editor') // Only admin/editor allowed
```

---

## API Design

### RESTful Endpoint Structure

#### Public Endpoints (No Auth)

```
GET    /api/posts                 # Paginated posts (filters: category, author, search)
GET    /api/posts/[slug]          # Single post detail
GET    /api/categories            # All categories
GET    /api/categories/[slug]     # Category detail
GET    /api/events                # Upcoming/past events (filters: location, date)
GET    /api/events/[slug]         # Single event detail
GET    /api/search?q=...&page=1  # Full-text search (title, excerpt, content)
GET    /api/banners               # Active banners
GET    /api/health                # Health check (DB, cache status)
```

#### Admin Endpoints (JWT Auth Required)

```
POST   /api/admin/auth/login      # { email, password } → { token }
POST   /api/admin/auth/verify     # Verify token validity

GET    /api/admin/posts           # List posts (incl drafts)
POST   /api/admin/posts           # Create post
PUT    /api/admin/posts/[id]      # Update post
DELETE /api/admin/posts/[id]      # Delete post
POST   /api/admin/posts/[id]/publish # Publish (with validation)
POST   /api/admin/posts/bulk-status  # Bulk update status

GET    /api/admin/events          # Events list
POST   /api/admin/events          # Create event
PUT    /api/admin/events/[id]     # Update event
DELETE /api/admin/events/[id]     # Delete event

GET    /api/admin/categories      # Categories (filtered to sectors)
POST   /api/admin/categories      # Create category
PUT    /api/admin/categories/[id] # Update category
DELETE /api/admin/categories/[id] # Delete category

GET    /api/admin/authors         # Authors list
POST   /api/admin/authors         # Create author
PUT    /api/admin/authors/[id]    # Update author

GET    /api/admin/banners         # Banners list
POST   /api/admin/banners         # Create banner
PUT    /api/admin/banners/[id]    # Update banner

POST   /api/admin/upload          # Multipart file upload → S3
GET    /api/admin/presign         # Get S3 presigned URL

GET    /api/admin/rss-feeds       # RSS feeds list
POST   /api/admin/rss-feeds       # Add new RSS feed
PUT    /api/admin/rss-feeds/[id]  # Update feed settings
DELETE /api/admin/rss-feeds/[id]  # Delete feed
POST   /api/admin/rss-feeds/[id]/fetch # Manual fetch (bypass queue)

GET    /api/admin/stats           # Analytics (top posts, view trends)

GET    /api/admin/site-settings   # Get site configuration
PUT    /api/admin/site-settings   # Update settings
```

### Request/Response Format

```typescript
// Success Response
{
  success: true,
  data: { /* entity or array */ },
  count?: number,                    // For paginated responses
  total?: number,                    // Total records (pagination)
  page?: number,                     // Current page
  pageSize?: number                  // Records per page
}

// Error Response
{
  success: false,
  error: "Human-readable error message",
  code?: string,                     // Error code (VALIDATION_ERROR, NOT_FOUND, etc.)
  details?: { /* field: message */ } // Validation errors
}

// HTTP Status Codes
200 OK                 - Successful GET, PUT
201 Created            - Successful POST (resource created)
204 No Content         - Successful DELETE
400 Bad Request        - Invalid input/body
401 Unauthorized       - Missing/invalid JWT
403 Forbidden          - Insufficient role/permissions
404 Not Found          - Resource doesn't exist
422 Unprocessable      - Validation failed
429 Too Many Requests  - Rate limited
500 Internal Server    - Database/server error
503 Service Unavail.   - Redis/cache unavailable
```

---

## UI Components & Patterns

### Component Architecture

#### Public Components

| Component | Purpose | Notes |
|-----------|---------|-------|
| `Header.tsx` | Top navigation with logo, menu, search | Responsive, sticky |
| `Footer.tsx` | Footer links, social, copyright | Full-width |
| `FlyMenu.tsx` | Mobile hamburger menu | Expandable sections |
| `SearchOverlay.tsx` | Full-screen search modal | Keyboard shortcuts (Cmd+K) |
| `BannerCarousel.tsx` | Hero carousel slider | Auto-rotate, featured posts |
| `PostImage.tsx` | Smart image wrapper | Lazy load, fallback handling, S3 URLs |
| `CategorySection.tsx` | Category widget grid | Home page featured categories |
| `EventCard.tsx` | Event listing card | Location, date, CTA button |
| `FullArticle.tsx` | Full article renderer | Rich text content, meta info |
| `InfiniteArticleLoader.tsx` | Pagination/infinite scroll | Load more button or scroll-triggered |

#### Admin Components

| Component | Purpose |
|-----------|---------|
| `AdminHeader.tsx` | Admin navbar with user menu & logout |
| `AdminSidebar.tsx` | Admin navigation sidebar |
| `RichTextEditor.tsx` | Tiptap editor wrapper for post content |
| `RichTextEditorClient.tsx` | Client-side editor component |
| `ImageUpload.tsx` | S3 multipart uploader with progress |
| `SearchBar.tsx` | Admin search with autocomplete |
| `Pagination.tsx` | Table pagination controls |
| `LoadingSkeleton.tsx` | Skeleton placeholders during load |

### Component Patterns

#### Data Fetching Pattern

```typescript
// Server Component (Next.js App Router)
async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const posts = await getPostsByCategory(slug);
  
  return (
    <div>
      {posts.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  );
}

// Client Component with Hooks
'use client';
function SearchModal() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Post[]>([]);
  
  useEffect(() => {
    if (!query) return;
    fetchSearch(query).then(setResults);
  }, [query]);
  
  return <SearchResults results={results} />;
}
```

#### Image Handling

```typescript
// PostImage component handles:
// 1. S3 image URLs (presigned or public)
// 2. External image URLs (from RSS)
// 3. Fallback grey placeholder
// 4. Lazy loading + blur effect
// 5. Responsive sizing via 'next/image'

<PostImage
  src={post.image}              // S3 or external URL
  alt={post.title}
  width={800}
  height={500}
  priority={isFeatured}         // LCP optimization
  sizes="(max-width: 767px) 100vw, 800px" // Responsive
  style={{ objectFit: 'cover' }}
/>
```

---

## Deployment & Infrastructure

### Process Management (PM2)

#### Configuration (`ecosystem.config.js`)

```javascript
module.exports = {
  apps: [
    {
      name: 'zox-web',
      script: 'npm',
      args: 'start',
      cwd: '/home/ubuntu/zox-nextjs',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NODE_OPTIONS: '--max-old-space-size=4096',
      },
      error_file: './logs/zox-web-error.log',
      out_file: './logs/zox-web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'zox-cron',
      script: 'npm',
      args: 'run cron:start',
      cwd: '/home/ubuntu/zox-nextjs',
      autorestart: true,
      env: {
        NODE_ENV: 'production',
        ENABLE_CRON: 'true',
        ENABLE_RSS_PROCESSING: 'true',
        ENABLE_IMAGE_DOWNLOAD: 'true',
      },
      error_file: './logs/zox-cron-error.log',
      out_file: './logs/zox-cron-out.log',
    },
  ],
};
```

#### Common PM2 Commands

```bash
# Start
pm2 start ecosystem.config.js
pm2 restart ecosystem.config.js

# Monitor
pm2 status
pm2 logs zox-web
pm2 logs zox-cron
pm2 monit                        # Real-time monitoring

# Manage
pm2 stop zox-web
pm2 delete zox-web
pm2 save                         # Auto-start on reboot
pm2 unstartup
```

### Environment Configuration

#### `.env.local` Template

```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=startupnews_db
DB_SSL=false                     # Optional, for SSL connections

# Redis Cache
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your_very_long_random_secret_string_32_chars_min

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
NEXT_PUBLIC_IMAGE_BASE_URL=https://your-bucket.s3.amazonaws.com

# Application
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://startupnews.thebackend.in
PORT=3000

# Feature Flags
ENABLE_RSS_PROCESSING=true
ENABLE_IMAGE_DOWNLOAD=true
ENABLE_IMAGE_CACHE_FALLBACK=true
CRON_JOB_TIMEOUT_MS=300000       # 5 minutes

# Logging
LOG_LEVEL=info                   # debug, info, warn, error
```

### Build Process

```bash
# Development
npm run dev              # Next.js dev server (hot reload)

# Production Build
npm run build            # Webpack compilation + static generation
                         # Generates: .next/standalone, .next/static

# Start Production
npm start                # Via PM2, uses .next/standalone

# Cron Jobs
npm run cron:start       # Start as PM2 process
npm run cron:rss-feeds   # Run RSS scheduler (one-time)

# Scripts (utilities)
npm run migrate          # Database schema migration
npm run seed             # Populate test data
npm run import-wp        # WordPress migration
```

### Docker Compose (Local Dev)

```yaml
version: '3.8'
services:
  mariadb:
    image: mariadb:10.11
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: startupnews_db
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  adminer:
    image: adminer
    ports:
      - "8080:8080"

volumes:
  mysql-data:
```

### CDN & Caching Strategy

#### CloudFront + ALB Architecture

```
User Browser
    ↓
CloudFront (Edge Cache)
    ├─ HTML pages: s-maxage=300 (5 min)
    ├─ Static assets (_next/*): Cache-Control: public, max-age=31536000, immutable (1 year)
    ├─ Robots/Sitemap: s-maxage=0 (always fresh, but cached in browser)
    └─ API routes: no-cache (always hits origin)
    ↓
ALB (Application Load Balancer)
    ├─ Health checks (/api/health)
    ├─ SSL termination
    └─ Route to EC2 instances
    ↓
EC2 Instance (PM2-managed Node.js)
    ├─ Port 3000: zox-web
    ├─ Port: zox-cron (background jobs)
    └─ Databases: RDS MariaDB, ElastiCache Redis
```

#### Cache Invalidation

```bash
# Manual invalidation (CloudFront)
aws cloudfront create-invalidation \
  --distribution-id <DIST_ID> \
  --paths "/*"                  # Clear everything

# Or specific paths
--paths "/api/posts/*" "/category/*"

# On deployment
# - Build triggers cache clear
# - RSS processing updates incremental pages
# - Admin actions (publish,delete) invalidate specific paths
```

---

## Background Jobs & Scheduling

### Cron Architecture

#### System Overview

```
PM2 Process: zox-cron
    ↓
Scheduler (node-cron)
    ┌─ Every 10 minutes: Run RSS Feed Scheduler Job
    │   ↓
    │   Check RSS feeds (last_fetched_at + interval)
    │   ↓
    │   Acquire Redis lock (per feed)
    │   ↓
    │   Enqueue RSS_FEED_PROCESS job
    │
    └─ Memory Job Queue (MemoryQueue)
        ├─ Dequeue jobs (FIFO)
        ├─ Invoke RSS Worker
        ├─ Retry logic (exponential backoff)
        └─ Grace shutdown (SIGTERM → flush queue)
```

#### Job Types

```typescript
// src/queue/job-types.ts
enum JobType {
  RSS_FEED_PROCESS = 'RSS_FEED_PROCESS',
  // Future: SEND_EMAIL, GENERATE_REPORT, etc.
}

interface JobPayload {
  [JobType.RSS_FEED_PROCESS]: {
    feedId: string;
    feedUrl: string;
    categoryId?: string;
    maxItems?: number;
    downloadImages?: boolean;
  }
}

interface Job<T = any> {
  id: string;
  type: JobType;
  payload: T;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  scheduledAt?: Date;
}
```

#### RSS Processing Workflow

```typescript
// cron/jobs/rss-feeds-scheduler.job.ts
async function execute() {
  const feeds = await RssFeedsRepository.findDueForFetch();
  
  for (const feed of feeds) {
    // Acquire Redis lock (30 second TTL)
    const lock = await acquireLock(`rss-feed:${feed.id}`);
    if (!lock) continue; // Another process is handling this feed
    
    try {
      // Enqueue job
      await queue.enqueue(JobType.RSS_FEED_PROCESS, {
        feedId: feed.id,
        feedUrl: feed.url,
        categoryId: feed.category_id,
        maxItems: feed.max_items_per_fetch,
        downloadImages: process.env.ENABLE_IMAGE_DOWNLOAD === 'true',
      });
      
      // Update timestamp
      await RssFeedsRepository.updateLastFetchedAt(feed.id);
    } catch (error) {
      await RssFeedsRepository.recordError(feed.id, error.message);
    } finally {
      await releaseLock(lock);
    }
  }
}

// src/workers/rss.worker.ts
queue.process(JobType.RSS_FEED_PROCESS, async (job) => {
  const { feedId, feedUrl, categoryId, maxItems, downloadImages } = job.payload;
  
  // 1. Fetch feed
  const parser = new Parser();
  const feed = await parser.parseURL(feedUrl);
  
  // 2. Process items
  for (const item of feed.items.slice(0, maxItems)) {
    // 3. Check if exists (by GUID)
    const existing = await RssFeedItemsRepository.findByGuid(feedId, item.guid);
    
    if (!existing) {
      // 4. Download images (if enabled)
      let imageUrl = item.image?.url;
      if (downloadImages && imageUrl) {
        imageUrl = await downloadAndUploadImage(imageUrl, feed.image?.url);
      }
      
      // 5. Create post
      const post = await PostsService.createFromRss({
        title: item.title,
        excerpt: item.summary || item.description,
        content: item.content || item.description,
        categoryId,
        image: imageUrl,
        source: feed.link,
        sourceAuthor: item.creator,
        autoPublish: feed.auto_publish,
      });
      
      // 6. Link RSS item to post
      await RssFeedItemsRepository.create({
        rssFeedId: feedId,
        postId: post.id,
        guid: item.guid,
        title: item.title,
        url: item.link,
        pubDate: item.pubDate,
        description: item.description,
        author: item.creator,
      });
    }
  }
  
  console.log(`✓ Processed RSS feed ${feedId}: ${feed.items.length} items`);
});
```

### Job Queue Implementation

```typescript
// src/queue/queue.memory.ts
class MemoryQueue implements IQueue {
  private jobs: Map<string, Job> = new Map();
  private handlers: Map<JobType, JobHandler> = new Map();
  private processing = false;
  
  async enqueue(type: JobType, payload: any): Promise<string> {
    const job: Job = {
      id: generateId(),
      type,
      payload,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
    };
    this.jobs.set(job.id, job);
    this.process(); // Start processing if idle
    return job.id;
  }
  
  process(jobHandler: JobHandler): void {
    this.handlers.set(jobHandler.type, jobHandler);
  }
  
  private async execute() {
    for (const [jobId, job] of this.jobs) {
      const handler = this.handlers.get(job.type);
      if (!handler) continue;
      
      try {
        await withTimeout(handler.fn(job), 300000); // 5 min timeout
        this.jobs.delete(jobId);
      } catch (error) {
        job.attempts++;
        if (job.attempts >= job.maxAttempts) {
          this.jobs.delete(jobId);
          logger.error(`Job ${jobId} failed after ${job.maxAttempts} attempts`, error);
        } else {
          const delay = Math.pow(2, job.attempts) * 1000; // Exponential backoff
          job.scheduledAt = new Date(Date.now() + delay);
        }
      }
    }
  }
  
  async gracefulShutdown(): Promise<void> {
    // Wait for all in-progress jobs to complete
    // Then stop accepting new jobs
    process.on('SIGTERM', async () => {
      logger.info('Graceful shutdown: flushing job queue...');
      while (this.jobs.size > 0) {
        await this.execute();
        await delay(1000);
      }
      process.exit(0);
    });
  }
}
```

---

## Architectural Patterns

### 1. Domain-Driven Design (DDD)

The project is structured around business domains (posts, events, users, etc.), each with:

```
modules/[domain]/
├── domain/
│   └── types.ts          # Core entities, interfaces
├── repository/
│   └── [domain].repository.ts # Data access (SQL queries)
├── service/
│   └── [domain].service.ts    # Business logic, validation, caching
└── utils/
    └── [domain].utils.ts      # Transformations, helpers
```

**Example: Posts Module**
```typescript
// domain/types.ts - Pure data types
interface PostEntity { id, slug, title, content, ... }
interface CreatePostInput { title, content, categoryId, ... }

// repository/posts.repository.ts - Database queries
class PostsRepository {
  async findBySlug(slug: string): Promise<PostEntity | null>
  async findByCategory(categoryId: string): Promise<PostEntity[]>
  async create(input: CreatePostInput): Promise<PostEntity>
}

// service/posts.service.ts - Business rules
class PostsService {
  async publishPost(id: string): Promise<void> {
    // Validate: title, content, image not empty
    // Check: author permissions
    // Update: published_at, status
    // Invalidate: Redis cache
  }
}

// utils/posts.utils.ts - Conversions
class PostsUtils {
  static entityToDto(entity: PostEntity): Post {
    return { ...entity, timeAgo: formatTimeAgo(entity.published_at) };
  }
}
```

### 2. Service Layer Pattern

Services encapsulate business logic and orchestrate multiple repositories:

```typescript
// Caching + filtering + validation all in one place
class PostsService {
  constructor(
    private repository: PostsRepository,
    private cache: CacheManager,
    private auth: AuthService
  ) {}
  
  async getAllPosts(filters: { category?: string; search?: string }): Promise<Post[]> {
    // 1. Generate cache key
    const cacheKey = `posts:${JSON.stringify(filters)}`;
    
    // 2. Try cache
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;
    
    // 3. Query database
    const entities = await this.repository.findPosts(filters);
    
    // 4. Transform to DTOs
    const posts = entities.map(PostsUtils.entityToDto);
    
    // 5. Cache with TTL
    await this.cache.set(cacheKey, posts, 300); // 5 min
    
    return posts;
  }
  
  async publishPost(postId: string): Promise<void> {
    const user = await this.auth.getCurrentUser();
    if (!user?.can('publish_posts')) {
      throw new ForbiddenError('Cannot publish posts');
    }
    
    const post = await this.repository.findById(postId);
    if (!post.featured_image_url) {
      throw new ValidationError('Featured image required');
    }
    if (!post.content?.trim()) {
      throw new ValidationError('Content cannot be empty');
    }
    
    await this.repository.updateStatus(postId, 'published');
    await this.cache.invalidate(`posts:*`); // Invalidate all post caches
  }
}
```

### 3. Adapter/Facade Pattern

The `data-adapter.ts` provides a **unified interface** to the entire data layer:

```typescript
// Clients never directly import repositories
// They use the adapter instead

// BAD (tight coupling):
// import { PostsRepository } from '@/modules/posts/repository';
// const post = await PostsRepository.findBySlug(slug);

// GOOD (loose coupling):
// import { getPostBySlug } from '@/lib/data-adapter';
// const post = await getPostBySlug(slug);

export const getPostBySlug = (slug: string) =>
  PostsService.getBySlug(slug);

export const getPostsByCategory = (categorySlug: string) =>
  PostsService.getByCategory(categorySlug);

export const createPost = (input: CreatePostInput) =>
  PostsService.create(input);
```

### 4. Middleware Pattern

```typescript
// Middleware chain for protected routes
export async function requireAuth(req: Request, role?: Role) {
  // 1. Extract token from multiple sources
  const token = extractToken(req);
  
  // 2. Verify JWT
  const decoded = await verifyJWT(token);
  
  // 3. Check user is active
  const user = await UsersService.getById(decoded.userId);
  if (!user?.is_active) {
    return NextResponse.json({ error: 'User inactive' }, { status: 403 });
  }
  
  // 4. Check role
  if (role && !hasRole(user.role, role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  
  return { user };
}

// Usage in route handler
export async function POST(req: Request) {
  const auth = await requireAuth(req, 'editor');
  if (!auth || auth.error) return NextResponse.json(auth, { status: 403 });
  const { user } = auth;
  // Process with user context
}
```

### 5. Factory Pattern

Services are instantiated with dependencies:

```typescript
// In route handler
const dbConnection = await getDbConnection();
const redisClient = getRedisClient();

const postsRepository = new PostsRepository(dbConnection);
const postsService = new PostsService(postsRepository, redisClient);

const posts = await postsService.getByCategory('ai-deeptech');
```

### 6. Singleton Pattern

Database pools and Redis clients are singletons:

```typescript
// src/shared/database/connection.ts
let pool: Pool | null = null;

export async function getDbConnection(): Promise<Pool> {
  if (!pool) {
    pool = createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      maxConnections: 15,
      waitForConnections: true,
      connectionTimeout: 30000,
      idleTimeout: 60000,
    });
  }
  return pool;
}

export async function closeDbConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
```

### 7. Graceful Degradation

If Redis is unavailable, the app continues without caching:

```typescript
// src/shared/cache/cache-manager.ts
class CacheManager {
  async get(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      if (!client) return null; // Redis not available
      return await client.get(key);
    } catch (error) {
      logger.warn('Cache get error, continuing without cache', error);
      return null; // Fall through to DB
    }
  }
}

// Redis unavailable → no cache blocking → DB queries work normally
```

---

## Database Schema

### Complete Schema Diagram

```
┌─────────────┐
│    Users    │
├─────────────┤
│ id (PK)     │
│ email       │───┐
│ password    │   │
│ name        │   │
│ role        │   │
└─────────────┘   │
                  │
┌─────────────────┼──────────────┐
│                 │              │
│          ┌──────▼─────┐   ┌────▼──────────┐
│          │   Posts    │   │  RssFeeds    │
│          ├────────────┤   ├──────────────┤
│          │ id (PK)    │   │ id (PK)      │
│          │ slug       │   │ url          │
│          │ title      │   │ category_id  │
│          │ content    │   │ author_id    │
│          │ author_id  │──▶│ enabled      │
│          │ category_id│   │ last_fetched │
│          │ featured   │   └──────────────┘
│          │ status     │        │
│          │ created_at │        │
│          └────────────┘        │
│                 │              │
│          ┌──────▼─────────────▶│
│          │ RssFeedItems        │
│          ├────────────────────┤
│          │ id (PK)            │
│          │ rss_feed_id (FK)   │
│          │ post_id (FK)       │
│          │ guid (unique)      │
│          │ title, url         │
│          └────────────────────┘
│
└────────────────────────┐
                         │
                    ┌────▼──────────┐
                    │ Categories    │
                    ├───────────────┤
                    │ id (PK)       │
                    │ slug (unique) │
                    │ name          │
                    │ parent_id (FK)│
                    │ created_at    │
                    └───────────────┘

┌──────────────────────────┐
│     Events               │
├──────────────────────────┤
│ id (PK)                  │
│ slug                     │
│ title                    │
│ location                 │
│ event_date, event_time   │
│ status                   │
│ created_at               │
└──────────────────────────┘

┌──────────────────────────┐
│     Banners              │
├──────────────────────────┤
│ id (PK)                  │
│ title                    │
│ image_url                │
│ link_url                 │
│ status                   │
│ sort_order               │
└──────────────────────────┘

┌──────────────────────────┐
│     Analytics            │
├──────────────────────────┤
│ id (PK)                  │
│ post_id (FK) [INDEX]     │
│ visitor_id               │
│ created_at [INDEX]       │
└──────────────────────────┘

┌──────────────────────────┐
│     Sessions             │
├──────────────────────────┤
│ id (PK)                  │
│ user_id (FK)             │
│ token_hash               │
│ expires_at               │
└──────────────────────────┘

┌──────────────────────────┐
│    SiteSettings          │
├──────────────────────────┤
│ id (PK)                  │
│ key (UNIQUE)             │
│ value                    │
│ updated_at               │
└──────────────────────────┘
```

### Indexing Strategy

```sql
-- Primary Keys (automatic)
ALTER TABLE users ADD PRIMARY KEY (id);
ALTER TABLE categories ADD PRIMARY KEY (id);
ALTER TABLE posts ADD PRIMARY KEY (id);

-- Unique Indexes
ALTER TABLE users ADD UNIQUE KEY (email);
ALTER TABLE categories ADD UNIQUE KEY (slug);
ALTER TABLE posts ADD UNIQUE KEY (slug);
ALTER TABLE rss_feeds ADD UNIQUE KEY (url);
ALTER TABLE rss_feed_items ADD UNIQUE KEY (rss_feed_id, guid);

-- Full-Text Search
ALTER TABLE posts ADD FULLTEXT KEY idx_search (title, excerpt, content);

-- Performance Indexes
ALTER TABLE posts ADD KEY idx_category_id (category_id);
ALTER TABLE posts ADD KEY idx_author_id (author_id);
ALTER TABLE posts ADD KEY idx_published_at (published_at);
ALTER TABLE posts ADD KEY idx_status (status);
ALTER TABLE posts ADD KEY idx_featured (featured);

ALTER TABLE rss_feeds ADD KEY idx_enabled (enabled);
ALTER TABLE rss_feeds ADD KEY idx_category_id (category_id);

ALTER TABLE analytics ADD KEY idx_post_id (post_id);
ALTER TABLE analytics ADD KEY idx_created_at (created_at);

ALTER TABLE rss_feed_items ADD KEY idx_rss_feed_id (rss_feed_id);
ALTER TABLE rss_feed_items ADD KEY idx_post_id (post_id);
```

---

## Development Conventions

### Naming Conventions

| Domain | Convention | Examples |
|--------|-----------|----------|
| **Variables** | camelCase | `postTitle`, `categorySlug`, `isPublished` |
| **Functions** | camelCase | `getPostBySlug()`, `publishPost()`, `formatDate()` |
| **Classes** | PascalCase | `PostsService`, `CategoriesRepository`, `AuthMiddleware` |
| **Database** | snake_case | `featured_image_url`, `published_at`, `author_id` |
| **Routes** | kebab-case (URL), [brackets] (params) | `/admin/posts`, `/api/posts/[id]` |
| **Files** | camelCase, PascalCase (components) | `posts.service.ts`, `Header.tsx`, `category.utils.ts` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_PAGE_SIZE = 20`, `CACHE_TTL_SECONDS = 300` |

### Code Organization

```typescript
// Organize imports by layer
import { /* types */ } from '@/modules/posts/domain/types';      // 1. Domain
import { PostsService } from '@/modules/posts/service';         // 2. Service
import { getDbConnection } from '@/shared/database';            // 3. Shared
import { logger } from '@/shared/utils/logger';                // 4. Utils
import { Post } from '@/lib/data-adapter';                     // 5. Lib/Adapters

// Export file structure
export { TypeName, InterfaceName };
export { ClassName };
export { functionName, variableName };
```

### Error Handling

```typescript
// Custom error classes for domain errors
class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

class ForbiddenError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} ${id} not found`);
    this.name = 'NotFoundError';
  }
}

// In route handlers, catch and map errors
try {
  const post = await postsService.publishPost(id);
  return NextResponse.json({ success: true, data: post }, { status: 200 });
} catch (error) {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      { success: false, error: error.message, field: error.field },
      { status: 422 }
    );
  } else if (error instanceof ForbiddenError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 403 });
  } else if (error instanceof NotFoundError) {
    return NextResponse.json({ success: false, error: error.message }, { status: 404 });
  }
  return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
}
```

### Logging Conventions

```typescript
// Structured logging with context
logger.info('Post published', {
  postId: post.id,
  slug: post.slug,
  userId: user.id,
  timestamp: new Date().toISOString(),
});

logger.error('RSS feed fetch failed', {
  feedId: feed.id,
  feedUrl: feed.url,
  error: error.message,
  retryAttempt: attempt,
});

// Log levels: debug, info, warn, error
```

### Date Handling

```typescript
// Always use ISO 8601 format (string) in APIs/DB
const isoDate = new Date().toISOString(); // "2026-03-11T10:30:00.000Z"

// Format for display
const timeAgo = formatTimeAgo(new Date('2026-03-10')); // "1 day ago"
const displayDate = formatDate(new Date('2026-03-10')); // "March 10, 2026"

// Database timestamps are always ISO strings
{
  created_at: "2026-03-10T15:30:00.000Z",
  updated_at: "2026-03-11T10:00:00.000Z",
  published_at: "2026-03-10T16:45:00.000Z"
}
```

---

## Performance & Optimization

### Caching Strategy

#### Multi-Level Caching

```
Browser    ──────→  HTTP Cache-Control headers
  ↓
CloudFront ──────→  s-maxage, stale-while-revalidate
  ↓
Redis      ──────→  Query result cache (5 min for lists)
  ↓
Database   ──────→  Last-mile source of truth
```

#### Cache Timing

| Data Type | TTL | Invalidation |
|-----------|-----|--------------|
| Post list (home/category) | 60s | On publish/delete |
| Single post | 300s | On edit/delete |
| Categories | 3600s | Rarely changes |
| Search results | 300s | Manual |
| Events | 300s | On update |
| Banners | 300s | On update |

### Image Optimization

#### S3 + CloudFront

- **Storage**: AWS S3 bucket (regional)
- **Delivery**: CloudFront CDN (global edge locations)
- **Caching**: 1 year for immutable content-hash URLs
- **Compression**: gzip at CloudFront
- **Formats**: JPEG/WebP with Next.js Image optimization

#### Next.js Image Component

```typescript
<Image
  src="/path/to/image.jpg"        // S3 URL
  alt="Alt text"
  width={800}
  height={600}
  priority={isFeatured}           // LCP
  sizes="(max-width: 767px) 100vw, 50vw" // Responsive
  quality={85}                    // Compression
  placeholder="blur"              // Blur-up effect
  blurDataURL="..."               // Base64 placeholder
/>
```

### Database Query Optimization

#### Indexes

```typescript
// Use indexed columns in WHERE/JOIN clauses
.where('category_id = ?')     // Indexed
.where('published_at > ?')    // Indexed
.where('status = ?')          // Indexed

// Avoid full-text search in high-traffic queries
// Use FULLTEXT index for /search only
```

#### Connection Pooling

```typescript
// Connection pool config
{
  maxConnections: 15,
  waitForConnections: true,
  connectionTimeout: 30000,
  idleTimeout: 60000
}

// Ensures  efficient reuse, prevents connection exhaustion
```

### API Rate Limiting

```typescript
// Optional: implement rate limiting for public APIs
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per window
  message: 'Too many requests from this IP',
});

export const publicPostsLimiter = limiter;
```

### Memory Management

```typescript
// Execution guards for job safety
export async function withMemoryGuard<T>(
  fn: () => Promise<T>,
  maxMemoryMB = 500
): Promise<T> {
  const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  
  const result = await fn();
  
  const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;
  const usedMemory = finalMemory - initialMemory;
  
  if (usedMemory > maxMemoryMB) {
    logger.warn(`Job used high memory: ${usedMemory.toFixed(2)}MB`, { maxMemoryMB });
  }
  
  return result;
}
```

---

## Conclusion

StartupNews.fyi is a **production-grade CMS** built on modern web technologies with strong architectural foundations:

✅ **Clean Architecture**: Domain-driven design with service/repository layers  
✅ **Scalability**: Multi-level caching, CDN integration, background job processing  
✅ **Security**: JWT auth, parameterized SQL, RBAC, WAF integration  
✅ **Performance**: Index optimization, connection pooling, image optimization  
✅ **Maintainability**: Clear separation of concerns, extensive documentation  
✅ **Reliability**: Graceful degradation, error handling, health checks  

### Key Takeaways for Development

1. **Always use the data adapter** (`data-adapter.ts`) instead of direct repository imports
2. **Leverage the service layer** for business logic, validation, and caching
3. **Follow DDD structure** when adding new domains
4. **Validate inputs** before database operations
5. **Cache strategically** with appropriate TTLs
6. **Log with context** for debugging and monitoring
7. **Test before deploying** (no automated tests currently, so manual testing critical)
8. **Monitor RSS processing** carefully (can impact database/memory)

---

**Document Version**: 1.0  
**Last Updated**: March 2026  
**Maintainer**: Development Team
