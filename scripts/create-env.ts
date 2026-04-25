/**
 * Create .env.local file from template
 * 
 * This script creates a .env.local file with all required environment variables
 * Usage: tsx scripts/create-env.ts
 */

import { writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const envContent = `# ============================================
# Zox Next.js - Local Environment Variables
# ============================================
# This file contains actual credentials for local development
# DO NOT commit this file to version control

# ============================================
# Database Configuration
# ============================================
DB_HOST=localhost
DB_PORT=3306
DB_NAME=zox_db
DB_USER=zox_user
DB_PASSWORD=zox_password
DATABASE_URL=mysql://zox_user:zox_password@localhost:3306/zox_db

# ============================================
# Redis Cache Configuration
# ============================================
# Note: Port is 6382 (changed from 6379 to avoid conflicts)
REDIS_URL=redis://localhost:6382
REDIS_HOST=localhost
REDIS_PORT=6382

# ============================================
# Application Configuration
# ============================================
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=3000

# Post images: when DB has relative URLs (e.g. /uploads/...), they are resolved against this base.
# Also used by npm run db:fix-post-images to normalize existing post image URLs in the DB.
# NEXT_PUBLIC_IMAGE_BASE_URL=https://startupnews-media-2026.s3.us-east-1.amazonaws.com
# S3_IMAGE_BASE_URL=https://startupnews-media-2026.s3.us-east-1.amazonaws.com
# When bucket is not public, set S3_USE_PRESIGNED_URLS=true so featured images use presigned URLs (requires AWS_* keys).
# S3_USE_PRESIGNED_URLS=true
# S3_PRESIGNED_EXPIRES_SECONDS=3600

# ============================================
# JWT Authentication Configuration
# ============================================
# Generate a strong secret: openssl rand -base64 32
JWT_SECRET=zox-nextjs-dev-secret-key-change-in-production-2025
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# ============================================
# File Upload Configuration
# ============================================
UPLOAD_MAX_SIZE=5242880
UPLOAD_DIR=./public/uploads

# ============================================
# Admin User Configuration
# ============================================
# Default admin credentials (created during seed)
ADMIN_EMAIL=admin@startupnews.fyi
ADMIN_PASSWORD=Admin@123!
ADMIN_NAME=Admin User

# ============================================
# API Configuration
# ============================================
API_BASE_URL=http://localhost:3000/api
`;

async function createEnvFile() {
  const envPath = join(process.cwd(), '.env.local');
  
  if (existsSync(envPath)) {
    console.log('⚠️  .env.local already exists. Skipping creation.');
    console.log('   If you want to recreate it, delete the file first.');
    return;
  }

  try {
    await writeFile(envPath, envContent, 'utf-8');
    console.log('✅ .env.local file created successfully!');
    console.log(`   Location: ${envPath}`);
    console.log('\n📝 Next steps:');
    console.log('   1. Review .env.local and update values if needed');
    console.log('   2. Run: npm run db:seed');
    console.log('   3. Start the app: npm run dev');
  } catch (error) {
    console.error('❌ Error creating .env.local:', error);
    process.exit(1);
  }
}

createEnvFile();

