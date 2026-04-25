# Zox Next.js - Complete Project Architecture & Scaling Plan

**Date:** February 2025  
**Project:** StartupNews.fyi - News Platform  
**Framework:** Next.js 16.1.6 with App Router  
**Deployment Target:** AWS EC2 with MariaDB, ALB, Security Groups, CloudFront

---

## Table of Contents

1. [Current Codebase Analysis](#current-codebase-analysis)
2. [Proposed Architecture Overview](#proposed-architecture-overview)
3. [Complete File Structure](#complete-file-structure)
4. [Admin Dashboard Architecture](#admin-dashboard-architecture)
5. [Backend & Cron System Architecture](#backend--cron-system-architecture)
6. [Database Schema Design](#database-schema-design)
7. [API Architecture](#api-architecture)
8. [Deployment Architecture](#deployment-architecture)
9. [Security Considerations](#security-considerations)
10. [Migration Plan](#migration-plan)

---

## Current Codebase Analysis

### Existing Structure

```
zox-nextjs/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # Homepage
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Global styles
│   │   ├── news/              # News listing page
│   │   ├── post/[slug]/       # Single post page
│   │   ├── category/[slug]/   # Category page
│   │   ├── events/            # Events pages
│   │   ├── search/            # Search page
│   │   └── styles/            # Theme CSS files
│   ├── components/            # React components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── EventCard.tsx
│   │   └── ... (15 components)
│   └── lib/                   # Utilities & config
│       ├── config.ts          # Site configuration
│       └── data.ts            # Mock data (893 lines)
├── public/                    # Static assets
├── package.json
├── tsconfig.json
└── next.config.ts
```

### Current State Assessment

**Strengths:**
- ✅ Next.js 16 with App Router
- ✅ TypeScript with strict mode
- ✅ Server Components implementation
- ✅ Responsive design (mobile/desktop)
- ✅ Component-based architecture
- ✅ Static generation for posts

**Gaps Identified:**
- ❌ No API routes or backend integration
- ❌ Mock data hardcoded (no database)
- ❌ No authentication system
- ❌ No admin dashboard
- ❌ No cron job system
- ❌ No environment configuration
- ❌ No error handling infrastructure
- ❌ No API service layer

---

## Proposed Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CloudFront CDN                            │
│              (Static Assets & Caching)                       │
└──────────────────────┬───────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────┐
│              Application Load Balancer (ALB)                 │
│         (HTTPS, SSL Termination, Health Checks)             │
└──────────────────────┬───────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
┌───────▼────────┐          ┌─────────▼──────────┐
│   EC2 Instance │          │   EC2 Instance     │
│  (Next.js App) │          │  (Next.js App)     │
│   Auto Scaling │          │   Auto Scaling     │
└───────┬────────┘          └─────────┬──────────┘
        │                             │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │     MariaDB Database        │
        │   (RDS or EC2 Instance)    │
        └────────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │   Cron Job System            │
        │   (Node.js Cron Service)     │
        └────────────────────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 16.1.6 (App Router)
- React 19.2.3
- TypeScript 5
- Tailwind CSS 4

**Backend:**
- Next.js API Routes (for admin API)
- Node.js Cron Jobs (separate service)
- MariaDB (MySQL compatible)

**Infrastructure:**
- AWS EC2 (Auto Scaling Group)
- Application Load Balancer (ALB)
- CloudFront CDN
- Security Groups
- Route 53 (DNS)

**Additional Services:**
- Redis (caching & sessions)
- S3 (file storage)
- CloudWatch (monitoring)

---

## Complete File Structure

### Proposed Project Structure

```
zox-nextjs/
├── .env.local                    # Local environment variables
├── .env.production              # Production environment variables
├── .env.example                 # Example environment file
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── README.md
├── PROJECT_ARCHITECTURE.md      # This file
│
├── public/                      # Static assets
│   ├── images/
│   │   ├── logos/
│   │   ├── posts/
│   │   ├── events/
│   │   └── uploads/
│   ├── favicon.ico
│   └── robots.txt
│
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Homepage
│   │   ├── loading.tsx         # Global loading UI
│   │   ├── error.tsx           # Global error boundary
│   │   ├── not-found.tsx       # 404 page
│   │   ├── globals.css         # Global styles
│   │   │
│   │   ├── (public)/           # Public routes group
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
│   │   │   ├── events/
│   │   │   │   ├── page.tsx
│   │   │   │   └── event-by-country/
│   │   │   │       └── page.tsx
│   │   │   ├── search/
│   │   │   │   └── page.tsx
│   │   │   └── api/            # Public API routes
│   │   │       ├── posts/
│   │   │       │   ├── route.ts
│   │   │       │   └── [slug]/
│   │   │       │       └── route.ts
│   │   │       ├── categories/
│   │   │       │   └── route.ts
│   │   │       └── events/
│   │   │           └── route.ts
│   │   │
│   │   ├── (admin)/            # Admin routes group (protected)
│   │   │   ├── layout.tsx      # Admin layout with sidebar
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx    # Admin dashboard home
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── posts/
│   │   │   │   │   ├── page.tsx        # Posts list
│   │   │   │   │   ├── create/
│   │   │   │   │   │   └── page.tsx    # Create post
│   │   │   │   │   ├── edit/
│   │   │   │   │   │   └── [id]/
│   │   │   │   │   │       └── page.tsx # Edit post
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── page.tsx    # Post detail
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
│   │   │   │   ├── analytics/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── api/        # Admin API routes
│   │   │   │       ├── auth/
│   │   │   │       │   ├── login/
│   │   │   │       │   │   └── route.ts
│   │   │   │       │   ├── logout/
│   │   │   │       │   │   └── route.ts
│   │   │   │       │   └── verify/
│   │   │   │       │       └── route.ts
│   │   │   │       ├── posts/
│   │   │   │       │   ├── route.ts        # GET, POST
│   │   │   │       │   └── [id]/
│   │   │   │       │       └── route.ts    # GET, PUT, DELETE
│   │   │   │       ├── categories/
│   │   │   │       │   ├── route.ts
│   │   │   │       │   └── [id]/
│   │   │   │       │       └── route.ts
│   │   │   │       ├── events/
│   │   │   │       │   ├── route.ts
│   │   │   │       │   └── [id]/
│   │   │   │       │       └── route.ts
│   │   │   │       ├── users/
│   │   │   │       │   ├── route.ts
│   │   │   │       │   └── [id]/
│   │   │   │       │       └── route.ts
│   │   │   │       ├── upload/
│   │   │   │       │   └── route.ts       # File upload endpoint
│   │   │   │       └── analytics/
│   │   │   │           └── route.ts
│   │   │   │
│   │   └── api/                # Public API (if needed)
│   │       └── health/
│   │           └── route.ts    # Health check endpoint
│   │
│   ├── components/            # React components
│   │   ├── ui/                # Reusable UI components
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
│   │   ├── layout/            # Layout components
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── AdminHeader.tsx
│   │   │   └── AdminLayout.tsx
│   │   │
│   │   ├── features/          # Feature-specific components
│   │   │   ├── posts/
│   │   │   │   ├── PostCard.tsx
│   │   │   │   ├── PostList.tsx
│   │   │   │   ├── PostForm.tsx
│   │   │   │   └── PostEditor.tsx
│   │   │   ├── events/
│   │   │   │   ├── EventCard.tsx
│   │   │   │   ├── EventList.tsx
│   │   │   │   └── EventForm.tsx
│   │   │   ├── categories/
│   │   │   │   ├── CategoryCard.tsx
│   │   │   │   └── CategoryList.tsx
│   │   │   └── search/
│   │   │       └── SearchResults.tsx
│   │   │
│   │   └── shared/            # Shared components
│   │       ├── FlyMenu.tsx
│   │       ├── FlyMenuButton.tsx
│   │       ├── FlyMenuContext.tsx
│   │       ├── FlyMenuFade.tsx
│   │       ├── SearchOverlay.tsx
│   │       ├── Sidebar.tsx
│   │       ├── ThemeScript.tsx
│   │       └── ... (existing components)
│   │
│   ├── lib/                    # Library code
│   │   ├── config.ts           # Site configuration
│   │   ├── constants.ts        # App constants
│   │   ├── utils.ts            # Utility functions
│   │   ├── validations.ts      # Validation schemas (Zod)
│   │   └── db/                 # Database utilities
│   │       ├── connection.ts   # MariaDB connection
│   │       ├── migrations/     # Database migrations
│   │       │   ├── 001_initial_schema.sql
│   │       │   ├── 002_add_indexes.sql
│   │       │   └── ...
│   │       └── seed.ts         # Database seeding
│   │
│   ├── services/               # Business logic & API services
│   │   ├── api/                # API client
│   │   │   ├── client.ts       # Axios/fetch client setup
│   │   │   ├── posts.service.ts
│   │   │   ├── categories.service.ts
│   │   │   ├── events.service.ts
│   │   │   ├── users.service.ts
│   │   │   └── auth.service.ts
│   │   │
│   │   ├── database/           # Database services
│   │   │   ├── posts.repository.ts
│   │   │   ├── categories.repository.ts
│   │   │   ├── events.repository.ts
│   │   │   ├── users.repository.ts
│   │   │   └── analytics.repository.ts
│   │   │
│   │   ├── cache/              # Caching services
│   │   │   └── redis.service.ts
│   │   │
│   │   ├── storage/           # File storage services
│   │   │   └── s3.service.ts
│   │   │
│   │   └── email/             # Email services
│   │       └── email.service.ts
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── usePosts.ts
│   │   ├── useCategories.ts
│   │   ├── useEvents.ts
│   │   ├── useAuth.ts
│   │   ├── usePagination.ts
│   │   ├── useDebounce.ts
│   │   └── useLocalStorage.ts
│   │
│   ├── middleware/             # Next.js middleware
│   │   ├── auth.middleware.ts  # Authentication middleware
│   │   └── rateLimit.middleware.ts
│   │
│   ├── types/                  # TypeScript types
│   │   ├── database.types.ts   # Database entity types
│   │   ├── api.types.ts        # API request/response types
│   │   ├── auth.types.ts
│   │   └── common.types.ts
│   │
│   ├── utils/                  # Utility functions
│   │   ├── date.utils.ts
│   │   ├── string.utils.ts
│   │   ├── image.utils.ts
│   │   ├── validation.utils.ts
│   │   └── error.utils.ts
│   │
│   └── styles/                 # Additional styles
│       ├── admin.css           # Admin-specific styles
│       └── components.css     # Component styles
│
├── scripts/                    # Utility scripts
│   ├── migrate.ts             # Database migration script
│   ├── seed.ts                # Database seeding script
│   ├── build.sh               # Build script
│   └── deploy.sh              # Deployment script
│
├── cron/                       # Cron job system (separate service)
│   ├── package.json           # Separate package.json for cron
│   ├── tsconfig.json
│   ├── index.ts               # Cron service entry point
│   ├── jobs/                  # Individual cron jobs
│   │   ├── updateTrendingPosts.ts
│   │   ├── cleanupOldPosts.ts
│   │   ├── sendNewsletter.ts
│   │   ├── syncEvents.ts
│   │   ├── generateSitemap.ts
│   │   └── updateAnalytics.ts
│   ├── services/              # Services for cron jobs
│   │   ├── db.service.ts
│   │   ├── email.service.ts
│   │   └── sitemap.service.ts
│   └── utils/
│       └── logger.ts
│
├── infrastructure/            # Infrastructure as Code
│   ├── terraform/             # Terraform configurations
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── ec2.tf
│   │   ├── alb.tf
│   │   ├── rds.tf
│   │   ├── security-groups.tf
│   │   └── cloudfront.tf
│   │
│   └── docker/               # Docker configurations
│       ├── Dockerfile        # Production Dockerfile
│       ├── Dockerfile.dev    # Development Dockerfile
│       ├── docker-compose.yml
│       └── docker-compose.prod.yml
│
├── tests/                     # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── docs/                      # Documentation
    ├── API.md                # API documentation
    ├── DEPLOYMENT.md         # Deployment guide
    └── DATABASE.md           # Database schema documentation
```

---

## Admin Dashboard Architecture

### Admin Dashboard Features

1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control (Admin, Editor, Author)
   - Session management
   - Password reset functionality

2. **Content Management**
   - Posts CRUD operations
   - Rich text editor (TinyMCE or similar)
   - Image upload and management
   - Category management
   - Tag management
   - Featured post selection
   - Post scheduling

3. **Event Management**
   - Events CRUD operations
   - Event categorization by location
   - Event date management
   - Event image upload

4. **User Management**
   - User CRUD operations
   - Role assignment
   - User activity logs

5. **Analytics Dashboard**
   - Post views statistics
   - Popular posts
   - Category performance
   - User engagement metrics

6. **Settings**
   - Site configuration
   - SEO settings
   - Social media links
   - Email configuration

### Admin Dashboard File Structure

```
src/app/(admin)/
├── layout.tsx                 # Admin layout with sidebar
├── admin/
│   ├── page.tsx              # Dashboard home with stats
│   ├── login/
│   │   └── page.tsx          # Login page
│   ├── posts/
│   │   ├── page.tsx          # Posts list with filters
│   │   ├── create/
│   │   │   └── page.tsx      # Create post form
│   │   ├── edit/
│   │   │   └── [id]/
│   │   │       └── page.tsx  # Edit post form
│   │   └── [id]/
│   │       └── page.tsx      # Post preview
│   ├── categories/
│   │   ├── page.tsx
│   │   ├── create/
│   │   │   └── page.tsx
│   │   └── edit/
│   │       └── [id]/
│   │           └── page.tsx
│   ├── events/
│   │   ├── page.tsx
│   │   ├── create/
│   │   │   └── page.tsx
│   │   └── edit/
│   │       └── [id]/
│   │           └── page.tsx
│   ├── users/
│   │   ├── page.tsx
│   │   ├── create/
│   │   │   └── page.tsx
│   │   └── edit/
│   │       └── [id]/
│   │           └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   └── analytics/
│       └── page.tsx
```

### Admin Components

```
src/components/layout/
├── AdminLayout.tsx            # Main admin layout wrapper
├── AdminSidebar.tsx           # Sidebar navigation
├── AdminHeader.tsx             # Top header with user menu
└── AdminBreadcrumbs.tsx       # Breadcrumb navigation

src/components/features/posts/
├── PostForm.tsx               # Post create/edit form
├── PostEditor.tsx             # Rich text editor wrapper
├── PostList.tsx               # Posts table/list
├── PostFilters.tsx            # Filter component
└── PostStatusBadge.tsx        # Status indicator
```

---

## Backend & Cron System Architecture

### Cron Job System (Separate Service)

The cron system runs as a separate Node.js service that can be deployed on the same EC2 instance or a separate instance.

#### Cron Jobs List

1. **Update Trending Posts** (Every 6 hours)
   - Calculate trending score based on views, shares, comments
   - Update `trending_score` column in posts table

2. **Cleanup Old Posts** (Daily at 2 AM)
   - Archive posts older than 1 year
   - Delete draft posts older than 30 days

3. **Send Newsletter** (Weekly on Monday 9 AM)
   - Generate weekly newsletter
   - Send to subscribed users

4. **Sync Events** (Daily at 3 AM)
   - Fetch events from external APIs (if any)
   - Update event status (upcoming/past)

5. **Generate Sitemap** (Daily at 4 AM)
   - Generate XML sitemap
   - Upload to S3
   - Submit to search engines

6. **Update Analytics** (Hourly)
   - Aggregate analytics data
   - Update statistics tables

#### Cron Service Structure

```
cron/
├── package.json
├── tsconfig.json
├── index.ts                   # Main entry point
├── config/
│   └── database.config.ts    # Database connection
├── jobs/
│   ├── updateTrendingPosts.ts
│   ├── cleanupOldPosts.ts
│   ├── sendNewsletter.ts
│   ├── syncEvents.ts
│   ├── generateSitemap.ts
│   └── updateAnalytics.ts
├── services/
│   ├── db.service.ts         # Database service
│   ├── email.service.ts      # Email service
│   └── sitemap.service.ts    # Sitemap generation
└── utils/
    └── logger.ts             # Logging utility
```

#### Cron Service Implementation Example

```typescript
// cron/index.ts
import cron from 'node-cron';
import { updateTrendingPosts } from './jobs/updateTrendingPosts';
import { cleanupOldPosts } from './jobs/cleanupOldPosts';
import { sendNewsletter } from './jobs/sendNewsletter';
import { syncEvents } from './jobs/syncEvents';
import { generateSitemap } from './jobs/generateSitemap';
import { updateAnalytics } from './jobs/updateAnalytics';
import logger from './utils/logger';

// Update trending posts every 6 hours
cron.schedule('0 */6 * * *', async () => {
  logger.info('Running: Update Trending Posts');
  try {
    await updateTrendingPosts();
    logger.info('Completed: Update Trending Posts');
  } catch (error) {
    logger.error('Error in Update Trending Posts:', error);
  }
});

// Cleanup old posts daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  logger.info('Running: Cleanup Old Posts');
  try {
    await cleanupOldPosts();
    logger.info('Completed: Cleanup Old Posts');
  } catch (error) {
    logger.error('Error in Cleanup Old Posts:', error);
  }
});

// ... other cron jobs

logger.info('Cron service started');
```

---

## Database Schema Design

### MariaDB Schema

```sql
-- Users table
CREATE TABLE users (
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
);

-- Categories table
CREATE TABLE categories (
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
);

-- Posts table
CREATE TABLE posts (
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
);

-- Post tags table (many-to-many)
CREATE TABLE post_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    tag_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    INDEX idx_post (post_id),
    INDEX idx_tag (tag_name)
);

-- Events table
CREATE TABLE events (
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
);

-- Analytics table
CREATE TABLE analytics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NULL,
    event_type VARCHAR(50) NOT NULL, -- 'view', 'share', 'click'
    user_ip VARCHAR(45),
    user_agent TEXT,
    referrer VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    INDEX idx_post (post_id),
    INDEX idx_type (event_type),
    INDEX idx_created (created_at)
);

-- Sessions table (for admin authentication)
CREATE TABLE sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
);

-- Settings table
CREATE TABLE settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(50) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (key)
);
```

---

## API Architecture

### API Routes Structure

#### Public API Routes

```
/api/posts
  GET    - List posts (with pagination, filters)
  GET    /[slug] - Get single post

/api/categories
  GET    - List all categories

/api/events
  GET    - List events (with filters)
  GET    /[slug] - Get single event

/api/search
  GET    - Search posts and events
```

#### Admin API Routes

```
/api/admin/auth/login
  POST   - Admin login

/api/admin/auth/logout
  POST   - Admin logout

/api/admin/auth/verify
  GET    - Verify session

/api/admin/posts
  GET    - List posts (admin view)
  POST   - Create post

/api/admin/posts/[id]
  GET    - Get post
  PUT    - Update post
  DELETE - Delete post

/api/admin/categories
  GET    - List categories
  POST   - Create category

/api/admin/categories/[id]
  GET    - Get category
  PUT    - Update category
  DELETE - Delete category

/api/admin/events
  GET    - List events
  POST   - Create event

/api/admin/events/[id]
  GET    - Get event
  PUT    - Update event
  DELETE - Delete event

/api/admin/users
  GET    - List users
  POST   - Create user

/api/admin/users/[id]
  GET    - Get user
  PUT    - Update user
  DELETE - Delete user

/api/admin/upload
  POST   - Upload image/file

/api/admin/analytics
  GET    - Get analytics data
```

### API Service Layer Example

```typescript
// src/services/api/posts.service.ts
import { apiClient } from './client';
import { Post, CreatePostDto, UpdatePostDto } from '@/types/api.types';

export const postsService = {
  async getAll(params?: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
  }): Promise<{ posts: Post[]; total: number }> {
    const response = await apiClient.get('/api/posts', { params });
    return response.data;
  },

  async getBySlug(slug: string): Promise<Post> {
    const response = await apiClient.get(`/api/posts/${slug}`);
    return response.data;
  },

  async create(data: CreatePostDto): Promise<Post> {
    const response = await apiClient.post('/api/admin/posts', data);
    return response.data;
  },

  async update(id: number, data: UpdatePostDto): Promise<Post> {
    const response = await apiClient.put(`/api/admin/posts/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/admin/posts/${id}`);
  },
};
```

---

## Deployment Architecture

### AWS Infrastructure Setup

#### 1. EC2 Instance Configuration

**Instance Type:** t3.medium or t3.large (depending on traffic)
**AMI:** Amazon Linux 2023 or Ubuntu 22.04 LTS
**Storage:** 20GB+ EBS volume

**Software Stack:**
- Node.js 20.x
- PM2 (Process Manager)
- Nginx (Reverse Proxy)
- MariaDB Client

#### 2. Application Load Balancer (ALB)

**Configuration:**
- Internet-facing
- HTTPS listener (port 443) with SSL certificate
- HTTP listener (port 80) redirecting to HTTPS
- Health check path: `/api/health`
- Target group: EC2 instances (port 3000)

**Security Groups:**
- ALB Security Group: Allow 80, 443 from 0.0.0.0/0
- EC2 Security Group: Allow 3000 from ALB security group only

#### 3. CloudFront Distribution

**Configuration:**
- Origin: ALB endpoint
- Caching behavior:
  - Static assets (images, CSS, JS): Cache for 1 year
  - HTML pages: Cache for 1 hour
  - API routes: No cache
- SSL certificate: CloudFront default or custom
- Compression: Enabled

#### 4. MariaDB Database

**Option 1: RDS MariaDB (Recommended)**
- Instance: db.t3.medium
- Multi-AZ: Enabled for production
- Automated backups: Enabled
- Security Group: Allow 3306 from EC2 security group only

**Option 2: MariaDB on EC2**
- Separate EC2 instance for database
- Security Group: Allow 3306 from application EC2 only

#### 5. Security Groups Configuration

**ALB Security Group:**
```
Inbound:
  - HTTP (80) from 0.0.0.0/0
  - HTTPS (443) from 0.0.0.0/0
Outbound:
  - All traffic
```

**EC2 Application Security Group:**
```
Inbound:
  - HTTP (3000) from ALB Security Group
  - SSH (22) from your IP only
Outbound:
  - All traffic
```

**Database Security Group:**
```
Inbound:
  - MySQL/Aurora (3306) from EC2 Application Security Group
Outbound:
  - None
```

### Deployment Process

#### 1. Build Process

```bash
# Build Next.js application
npm run build

# The build creates:
# - .next/ directory with optimized production build
# - Standalone output (if configured in next.config.ts)
```

#### 2. PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'zox-nextjs',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

#### 3. Nginx Configuration

```nginx
# /etc/nginx/sites-available/zox-nextjs
upstream nextjs {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Static files
    location /_next/static {
        alias /var/www/zox-nextjs/.next/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /images {
        alias /var/www/zox-nextjs/public/images;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to Next.js
    location / {
        proxy_pass http://nextjs;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. Environment Variables

```bash
# .env.production
NODE_ENV=production
DATABASE_URL=mysql://user:password@db-host:3306/zox_db
REDIS_URL=redis://redis-host:6379
S3_BUCKET=zox-uploads
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
JWT_SECRET=your-jwt-secret
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

### Auto Scaling Configuration

**Auto Scaling Group:**
- Min instances: 2
- Max instances: 10
- Desired capacity: 2
- Health check: ELB
- Scaling policies:
  - Scale up when CPU > 70% for 5 minutes
  - Scale down when CPU < 30% for 10 minutes

---

## Security Considerations

### 1. Authentication & Authorization

- JWT tokens with short expiration (15 minutes)
- Refresh tokens stored in httpOnly cookies
- Role-based access control (RBAC)
- Rate limiting on authentication endpoints

### 2. API Security

- Input validation using Zod schemas
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitize user input)
- CSRF protection
- Rate limiting (express-rate-limit)

### 3. Database Security

- Encrypted connections (SSL/TLS)
- Strong passwords
- Least privilege access
- Regular backups
- Database firewall rules

### 4. Infrastructure Security

- Security groups (minimal required ports)
- SSL/TLS certificates (Let's Encrypt or ACM)
- Regular security updates
- Logging and monitoring
- DDoS protection (AWS Shield)

### 5. File Upload Security

- File type validation
- File size limits
- Virus scanning (optional)
- S3 bucket with proper permissions
- CDN for static assets

---

## Migration Plan

### Phase 1: Foundation (Week 1-2)

1. **Database Setup**
   - Set up MariaDB instance
   - Create database schema
   - Run migrations
   - Seed initial data

2. **API Layer**
   - Create API service layer
   - Implement database repositories
   - Set up API routes
   - Add error handling

3. **Environment Configuration**
   - Set up environment variables
   - Configure database connection
   - Set up Redis (if using)

### Phase 2: Admin Dashboard (Week 3-4)

1. **Authentication**
   - Implement JWT authentication
   - Create login/logout pages
   - Add middleware for route protection

2. **Content Management**
   - Posts CRUD interface
   - Rich text editor integration
   - Image upload functionality
   - Category management

3. **Event Management**
   - Events CRUD interface
   - Event form with validation

### Phase 3: Cron System (Week 5)

1. **Cron Service Setup**
   - Set up separate cron service
   - Implement individual cron jobs
   - Add logging and error handling
   - Set up PM2 for cron service

### Phase 4: Migration from Mock Data (Week 6)

1. **Data Migration**
   - Export mock data
   - Import into database
   - Update all components to use API
   - Test all functionality

### Phase 5: Deployment (Week 7-8)

1. **Infrastructure Setup**
   - Set up EC2 instances
   - Configure ALB
   - Set up CloudFront
   - Configure security groups

2. **Application Deployment**
   - Build production bundle
   - Deploy to EC2
   - Configure PM2
   - Set up Nginx
   - Test production environment

3. **Monitoring & Optimization**
   - Set up CloudWatch
   - Configure alerts
   - Performance testing
   - Optimization

---

## Additional Considerations

### Caching Strategy

1. **Redis Cache**
   - Cache frequently accessed posts
   - Cache category lists
   - Session storage
   - Rate limiting counters

2. **Next.js Caching**
   - ISR (Incremental Static Regeneration) for posts
   - Static generation for categories
   - API route caching

### Monitoring & Logging

1. **Application Logs**
   - Winston or Pino for logging
   - Log rotation
   - Centralized logging (CloudWatch)

2. **Performance Monitoring**
   - CloudWatch metrics
   - Application performance monitoring (APM)
   - Error tracking (Sentry)

### Backup Strategy

1. **Database Backups**
   - Daily automated backups
   - Retention: 30 days
   - Test restore procedures

2. **File Backups**
   - S3 versioning enabled
   - Cross-region replication (optional)

---

## Conclusion

This architecture provides a scalable, maintainable, and production-ready structure for the Zox Next.js project. The separation of concerns, modular design, and proper infrastructure setup will support:

- **Scalability:** Auto-scaling EC2 instances, load balancing, CDN
- **Maintainability:** Clear file structure, separation of concerns
- **Security:** Multiple layers of security, authentication, authorization
- **Performance:** Caching, CDN, optimized database queries
- **Reliability:** Health checks, monitoring, backups

The admin dashboard and cron system are designed to be modular and can be developed and deployed independently, making the development process more manageable.

---

**Document Version:** 1.0  
**Last Updated:** February 2025  
**Maintained By:** Development Team

