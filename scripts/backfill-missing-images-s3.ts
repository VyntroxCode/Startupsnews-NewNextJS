#!/usr/bin/env node

import { loadEnvConfig } from '@next/env';
import { getDbConnection, closeDbConnection, query, queryOne } from '../src/shared/database/connection';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

loadEnvConfig(process.cwd());

// S3 Configuration
const S3_BUCKET = process.env.AWS_S3_BUCKET || 'startupnews-media-2026';
const S3_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_PREFIX = 'startupnews-in/imports/from-backend';

const s3Client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

function extractImageUrlsFromHtml(html: string): string[] {
  if (!html) return [];
  const urls: string[] = [];
  const imgRegex = /src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1];
    if (url && !url.startsWith('data:') && !url.includes('s3') && !url.includes('amazonaws')) {
      urls.push(url);
    }
  }
  return urls;
}

async function uploadImageToS3(imageUrl: string, filename: string): Promise<string | null> {
  try {
    // Skip if already S3 URL
    if (imageUrl.includes('s3') || imageUrl.includes('amazonaws')) {
      return imageUrl;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'StartupNews-Importer/1.0' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const key = `${S3_PREFIX}/${filename}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: response.headers.get('content-type') || 'image/jpeg',
      })
    );

    const s3Url = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
    return s3Url;
  } catch (err: any) {
    return null;
  }
}

async function main() {
  console.log('Starting backfill of missing images...');
  await getDbConnection();

  try {
    // Get posts without images
    const postsWithoutImages = await query<any>(
      `SELECT id, title, content FROM posts 
       WHERE (featured_image_url IS NULL OR featured_image_url = '') 
       AND content IS NOT NULL 
       AND published_at >= '2026-03-12' 
       AND status = 'published'
       ORDER BY id DESC
       LIMIT 5000`
    );

    console.log(`Found ${postsWithoutImages.length} posts without images`);

    let updated = 0;
    let failed = 0;

    for (const post of postsWithoutImages) {
      try {
        const imageUrls = extractImageUrlsFromHtml(post.content);
        
        if (imageUrls.length === 0) {
          failed++;
          continue;
        }

        // Upload first image
        const s3Url = await uploadImageToS3(imageUrls[0], `featured-backfill-${post.id}-${Date.now()}.jpg`);
        
        if (!s3Url) {
          failed++;
          continue;
        }

        // Update post with image
        await query(
          'UPDATE posts SET featured_image_url = ?, featured_image_small_url = ? WHERE id = ?',
          [s3Url, s3Url, post.id]
        );

        updated++;

        if (updated % 50 === 0) {
          console.log(`Progress: Updated ${updated}, Failed ${failed}`);
        }
      } catch (err: any) {
        failed++;
      }
    }

    console.log(`\nBackfill complete:`);
    console.log(`  Updated: ${updated} posts with images`);
    console.log(`  Failed: ${failed} posts`);

    // Final count
    const [stats] = await query<any>(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN featured_image_url LIKE '%s3%' THEN 1 ELSE 0 END) as with_s3_images,
        SUM(CASE WHEN (featured_image_url IS NULL OR featured_image_url = '') THEN 1 ELSE 0 END) as without_images
       FROM posts 
       WHERE published_at >= '2026-03-12' AND status = 'published'`
    );

    console.log(`\nFinal stats for March 12+ posts:`);
    console.log(`  Total: ${stats.total}`);
    console.log(`  With S3 images: ${stats.with_s3_images}`);
    console.log(`  Without images: ${stats.without_images}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await closeDbConnection();
  }
}

main();
