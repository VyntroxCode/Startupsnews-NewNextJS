/**
 * 1. Remove all posts from zox_db.
 * 2. Copy all posts from WordPress DB (source: startupnews.fyi backend).
 * 3. For each post: featured/thumbnail image → S3; all <img> in content → download, upload to S3, replace URLs in content.
 *
 * Requires .env.local:
 *   - DB_* (zox_db), WP_DB_* (WordPress DB)
 *   - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (for S3 upload)
 *   - AWS_REGION (default: us-east-1)
 *   - S3_BUCKET (default: startupnews-media-2026)
 *   - S3_IMAGE_BASE_URL (e.g. https://startupnews-media-2026.s3.us-east-1.amazonaws.com) for final URL
 *
 * Usage: npm run db:sync-posts-from-wp-s3
 *        npx tsx scripts/sync-posts-from-wp-to-s3.ts [--dry-run] [--limit N]
 */

import mariadb from 'mariadb';
import { loadEnvConfig } from '@next/env';
import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

loadEnvConfig(process.cwd());

const ZOX = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'zox_db',
};

const WP = {
  host: process.env.WP_DB_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.WP_DB_PORT || process.env.DB_PORT || '3306', 10),
  user: process.env.WP_DB_USER || process.env.DB_USER,
  password: process.env.WP_DB_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.WP_DB_NAME || 'wp_startupnews',
};

const TABLE_PREFIX = process.env.WP_TABLE_PREFIX || 'wp_';
const WP_SITE_URL = (process.env.WP_SITE_URL || 'https://startupnews.fyi').replace(/\/$/, '');
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || 'startupnews-media-2026';
const S3_BASE_URL = (process.env.S3_IMAGE_BASE_URL || process.env.NEXT_PUBLIC_IMAGE_BASE_URL || '')
  .replace(/\/$/, '') || `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com`;
const S3_UPLOAD_PREFIX = (process.env.S3_UPLOAD_PREFIX || 'startupnews-in').replace(/^\/|\/$/g, '');

function s3KeyWithPrefix(relativeKey: string): string {
  return S3_UPLOAD_PREFIX ? `${S3_UPLOAD_PREFIX}/${relativeKey}` : relativeKey;
}

function truncate(str: string, max: number): string {
  if (!str || str.length <= max) return str;
  return str.slice(0, max);
}

/** Safe S3 key: [prefix/]uploads/YYYY/MM/safe-name.ext */
function s3KeyFromUrl(postId: number, postDate: Date | string, imageUrl: string): string {
  const d = postDate ? new Date(postDate) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const ext = (imageUrl.split('.').pop()?.split(/[?#]/)[0] || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return s3KeyWithPrefix(`uploads/${y}/${m}/${postId}-${Date.now().toString(36)}.${ext}`);
}

async function downloadImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'StartupNews-Sync/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

async function uploadToS3(
  s3: S3Client,
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType || 'image/jpeg',
      CacheControl: 'public, max-age=31536000',
    })
  );
  return `${S3_BASE_URL}/${key}`;
}

function getContentType(url: string, buf: Buffer): string {
  const ext = (url.split('.').pop()?.split(/[?#]/)[0] || '').toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
  };
  return map[ext] || 'image/jpeg';
}

/** Extract all img src (and data-src) URLs from HTML, deduped, absolute */
function extractImageUrlsFromHtml(html: string, baseUrl: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  const regex = /<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    let src = m[1].trim();
    if (!src || src.startsWith('data:')) continue;
    if (src.startsWith('//')) src = 'https:' + src;
    else if (src.startsWith('/')) src = baseUrl.replace(/\/$/, '') + src;
    else if (!src.startsWith('http')) src = baseUrl.replace(/\/$/, '') + '/' + src.replace(/^\//, '');
    if (seen.has(src)) continue;
    seen.add(src);
    urls.push(src);
  }
  return urls;
}

/** S3 key for in-content images (body) */
function s3KeyBody(postId: number, postDate: Date | string, index: number, imageUrl: string): string {
  const d = postDate ? new Date(postDate) : new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const ext = (imageUrl.split('.').pop()?.split(/[?#]/)[0] || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  return s3KeyWithPrefix(`uploads/${y}/${m}/${postId}-body-${index}.${ext}`);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx >= 0 && process.argv[limitIdx + 1] ? parseInt(process.argv[limitIdx + 1], 10) : 0;

  const needAws = !dryRun;
  const rawKey = process.env.AWS_ACCESS_KEY_ID ?? '';
  const rawSecret = process.env.AWS_SECRET_ACCESS_KEY ?? '';
  const awsAccessKeyId = rawKey.replace(/^["']|["']$/g, '').trim();
  const awsSecretAccessKey = rawSecret.replace(/^["']|["']$/g, '').trim();
  if (needAws && (!awsAccessKeyId || !awsSecretAccessKey)) {
    console.error('\n❌ Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local for S3 upload.\n');
    process.exit(1);
  }

  const s3 = (needAws
    ? new S3Client({
    region: AWS_REGION.trim(),
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
  })
    : null) as S3Client | null;

  if (needAws && s3) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
    } catch (e: unknown) {
      const err = e as { message?: string; name?: string; $metadata?: { httpStatusCode?: number }; Code?: string };
      const msg = err.message || '';
      const code = err.Code || err.name || '';
      const status = err.$metadata?.httpStatusCode;
      if (/signature.*does not match|SignatureDoesNotMatch/i.test(msg) || code === 'SignatureDoesNotMatch') {
        console.error('\n❌ S3 signature error: credentials are wrong or secret was mangled.');
        console.error('   - Ensure AWS_SECRET_ACCESS_KEY has no extra spaces/quotes and matches IAM.');
        process.exit(1);
      }
      if (status === 403) {
        console.warn('\n⚠️  S3 HeadBucket returned 403 (IAM may lack ListBucket). Continuing; uploads will use source URL if PutObject fails.\n');
      } else {
        console.error('\n❌ S3 pre-check failed:', code || msg, status ? `(HTTP ${status})` : '');
        process.exit(1);
      }
    }
  }

  let wpPool: mariadb.Pool | null = null;
  let zoxPool: mariadb.Pool | null = null;

  try {
    wpPool = mariadb.createPool({ ...WP, connectionLimit: 2 });
    zoxPool = mariadb.createPool({ ...ZOX, connectionLimit: 2 });

    const wpConn = await wpPool.getConnection();
    const zoxConn = await zoxPool.getConnection();
    const prefix = TABLE_PREFIX;

    console.log('\n📥 Sync posts from WordPress → zox_db (images to S3)\n');
    console.log('   WordPress DB:', WP.database, '@', WP.host);
    console.log('   Zox DB:      ', ZOX.database);
    console.log('   S3 bucket:   ', S3_BUCKET, '→ folder:', S3_UPLOAD_PREFIX || '(root)', `(${dryRun ? 'dry run, no upload' : 'upload enabled'})\n`);

    // 1. Clear zox posts (post_tags CASCADE or delete explicitly)
    if (!dryRun) {
      await zoxConn.query('DELETE FROM post_tags');
      await zoxConn.query('DELETE FROM posts');
      console.log('   ✅ Cleared all posts and post_tags from zox_db.\n');
    } else {
      console.log('   [dry-run] Would clear posts and post_tags.\n');
    }

    // 2. Fetch WP posts with category slug and featured image URL
    const wpPosts = (await wpConn.query(
      `SELECT p.ID, p.post_title, p.post_name, p.post_excerpt, p.post_content, p.post_date,
              a.guid AS featured_image_url,
              att_meta.meta_value AS attached_file,
              (SELECT t.slug FROM ${prefix}term_relationships tr
               JOIN ${prefix}term_taxonomy tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
               JOIN ${prefix}terms t ON t.term_id = tt.term_id
               WHERE tt.taxonomy = 'category' AND tr.object_id = p.ID LIMIT 1) AS category_slug
       FROM ${prefix}posts p
       LEFT JOIN ${prefix}postmeta pm ON pm.post_id = p.ID AND pm.meta_key = '_thumbnail_id'
       LEFT JOIN ${prefix}posts a ON a.ID = pm.meta_value AND a.post_type = 'attachment'
       LEFT JOIN ${prefix}postmeta att_meta ON att_meta.post_id = a.ID AND att_meta.meta_key = '_wp_attached_file'
       WHERE p.post_type = 'post' AND p.post_status = 'publish'
       ORDER BY p.post_date DESC
       ${limit > 0 ? `LIMIT ${limit}` : ''}`
    )) as Array<{
      ID: number;
      post_title: string;
      post_name: string;
      post_excerpt: string;
      post_content: string;
      post_date: Date | string;
      featured_image_url: string | null;
      attached_file: string | null;
      category_slug: string | null;
    }>;

    if (!wpPosts || wpPosts.length === 0) {
      console.log('   No WordPress posts found.\n');
      wpConn.release();
      zoxConn.release();
      return;
    }

    // Dedupe by the slug we will actually insert (truncated to 500) so no duplicate key
    const seenSlugs = new Set<string>();
    const wpPostsDeduped = wpPosts.filter((p) => {
      const slug = truncate((p.post_name || '').trim() || String(p.ID), 500);
      if (!slug || seenSlugs.has(slug)) return false;
      seenSlugs.add(slug);
      return true;
    });
    if (wpPostsDeduped.length < wpPosts.length) {
      console.log(`   Deduped slugs: ${wpPosts.length} → ${wpPostsDeduped.length} posts.\n`);
    }

    const zoxCategories = (await zoxConn.query(
      'SELECT id, slug, name FROM categories'
    )) as Array<{ id: number; slug: string; name: string }>;
    const categoryMap = new Map<string, number>();
    for (const c of zoxCategories) {
      categoryMap.set(c.slug.toLowerCase(), c.id);
      categoryMap.set(c.name.toLowerCase(), c.id);
    }
    const defaultCategoryId = categoryMap.get('uncategorized') ?? categoryMap.get('Uncategorized') ?? zoxCategories[0]?.id ?? 1;

    const adminRows = (await zoxConn.query(
      'SELECT id FROM users WHERE role = ? LIMIT 1',
      ['admin']
    )) as Array<{ id: number }>;
    const authorId = adminRows?.[0]?.id ?? 1;

    let created = 0;
    let skipped = 0;
    let imagesUploaded = 0;
    let imageFail = 0;
    let s3ErrorLogged = false;

    for (const row of wpPostsDeduped) {
      const slug = truncate((row.post_name || '').trim() || String(row.ID), 500);
      if (!slug) {
        skipped++;
        continue;
      }

      const title = truncate((row.post_title || 'Untitled').trim(), 500);
      const excerpt = (row.post_excerpt || '').trim().slice(0, 2000);
      let content = (row.post_content || '').trim() || '<p></p>';
      const pubDate = row.post_date ? new Date(row.post_date) : null;

      // Process all images in post content: upload to S3 and replace URLs
      const contentImageUrls = extractImageUrlsFromHtml(content, WP_SITE_URL);
      const urlReplacements = new Map<string, string>();
      for (let i = 0; i < contentImageUrls.length; i++) {
        const srcUrl = contentImageUrls[i];
        if (!srcUrl.startsWith('http')) continue;
        const buf = await downloadImage(srcUrl);
        if (buf && !dryRun && s3) {
          try {
            const key = s3KeyBody(row.ID, row.post_date, i, srcUrl);
            const contentType = getContentType(srcUrl, buf);
            const s3Url = await uploadToS3(s3, key, buf, contentType);
            urlReplacements.set(srcUrl, s3Url);
            imagesUploaded++;
          } catch (e) {
            imageFail++;
          }
        } else if (dryRun && srcUrl) {
          urlReplacements.set(srcUrl, `${S3_BASE_URL}/uploads/2026/01/${row.ID}-body-${i}.jpg`);
        }
      }
      for (const [oldUrl, newUrl] of urlReplacements) {
        content = content.split(oldUrl).join(newUrl);
      }

      // Resolve image URL for download: guid (if http) or WP site URL + wp-content/uploads + _wp_attached_file
      let imageUrl: string | null = (row.featured_image_url && String(row.featured_image_url).trim()) || null;
      if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) imageUrl = null;
      if (!imageUrl && row.attached_file) {
        const path = (row.attached_file as string).trim().replace(/^\//, '');
        if (path) imageUrl = `${WP_SITE_URL}/wp-content/uploads/${path}`;
      }
      if (!imageUrl && row.post_content) {
        const m = row.post_content.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (m && m[1]) {
          const src = m[1].trim();
          if (src.startsWith('http')) imageUrl = src;
          else if (src.startsWith('/')) imageUrl = WP_SITE_URL + src;
        }
      }

      let finalImageUrl: string | null = null;
      if (imageUrl && (imageUrl.startsWith('http://') || imageUrl.startsWith('https://'))) {
        const buf = await downloadImage(imageUrl);
        if (buf && !dryRun && s3) {
          const key = s3KeyFromUrl(row.ID, row.post_date, imageUrl);
          const contentType = getContentType(imageUrl, buf);
          try {
            finalImageUrl = await uploadToS3(s3, key, buf, contentType);
            imagesUploaded++;
          } catch (e) {
            const msg = (e as Error).message || '';
            if (!s3ErrorLogged) {
              console.warn(`   ⚠️  S3 upload failed (post ${row.ID}):`, msg);
              console.warn(`   (Further S3 errors will not be printed. Using original image URLs. Check AWS key/secret and bucket.)`);
              s3ErrorLogged = true;
            }
            imageFail++;
            finalImageUrl = null; // store only S3 URLs so app does not show placeholder for non-S3
          }
        } else if (dryRun && imageUrl) {
          finalImageUrl = `${S3_BASE_URL}/uploads/2026/01/${row.ID}.jpg`; // placeholder for dry run
        }
        // when upload skipped or failed: leave finalImageUrl null so DB has only S3 URLs or null (app shows default)
      }

      const categorySlug = (row.category_slug && String(row.category_slug).trim().toLowerCase()) || '';
      const categoryId = categoryMap.get(categorySlug) ?? categoryMap.get(row.category_slug as string) ?? defaultCategoryId;

      const imageUrlTrunc = finalImageUrl ? truncate(finalImageUrl, 500) : null;

      if (!dryRun) {
        try {
          await zoxConn.query(
            `INSERT INTO posts (
            title, slug, excerpt, content, category_id, author_id,
            featured_image_url, featured_image_small_url, format, status, featured,
            published_at, trending_score, view_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              title,
              slug,
              excerpt,
              content,
              categoryId,
              authorId,
              imageUrlTrunc,
              imageUrlTrunc,
              'standard',
              'published',
              0,
              pubDate,
              0,
              0,
            ]
          );
        } catch (err: unknown) {
          const e = err as { errno?: number; code?: string };
          if (e.errno === 1062 || e.code === 'ER_DUP_ENTRY') {
            skipped++;
            continue;
          }
          throw err;
        }
      }
      created++;
      if (created <= 5) {
        console.log(`   ${dryRun ? '[dry-run] ' : ''}${title.slice(0, 45)}... ${imageUrlTrunc ? 'image' : 'no image'}`);
      }
    }

    console.log(`\n   ✅ Posts ${dryRun ? 'would be ' : ''}created: ${created}`);
    console.log(`   📷 Images uploaded to S3: ${imagesUploaded}${dryRun ? ' (skipped in dry run)' : ''}`);
    if (imageFail) console.log(`   ⚠️  Image upload failed: ${imageFail}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log('');

    wpConn.release();
    zoxConn.release();
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  } finally {
    if (wpPool) await wpPool.end();
    if (zoxPool) await zoxPool.end();
  }
}

main();
