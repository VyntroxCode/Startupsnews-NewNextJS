import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';
import * as fs from 'fs';
import * as path from 'path';

loadEnvConfig(process.cwd());

interface PostRow {
  post_id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  post_link: string;
  status: 'draft' | 'published' | 'archived' | string;
  source: 'manual' | 'rss';
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  author_id: number | null;
  author_name: string | null;
  featured: number | boolean | null;
  format: string | null;
  rss_feed_name: string | null;
  rss_feed_url: string | null;
  rss_item_author_name: string | null;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  published_at: Date | string | null;
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  return `"${text.replace(/"/g, '""')}"`;
}

function toIso(v: Date | string | null): string {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
}

async function main() {
  const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
  const outputFile = outputArg?.split('=')[1] || 'all-posts-admin-filters.csv';
  const outPath = path.resolve(process.cwd(), outputFile);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://startupnews.thebackend.in').replace(/\/$/, '');

  // This query includes all fields needed to reproduce admin panel filtering:
  // - status (published/draft/archived)
  // - source (manual/rss)
  // - category_id/category_name/category_slug
  // - searchable fields (title/excerpt/slug)
  const rows = await query<PostRow>(
    `SELECT
      p.id AS post_id,
      p.title,
      p.slug,
      p.excerpt,
      CONCAT(?, '/post/', p.slug) AS post_link,
      COALESCE(p.status, 'draft') AS status,
      CASE WHEN r.post_id IS NULL THEN 'manual' ELSE 'rss' END AS source,
      p.category_id,
      c.name AS category_name,
      c.slug AS category_slug,
      p.author_id,
      u.name AS author_name,
      p.featured,
      p.format,
      r.feed_name AS rss_feed_name,
      r.feed_url AS rss_feed_url,
      r.item_author AS rss_item_author_name,
      p.created_at,
      p.updated_at,
      p.published_at
    FROM posts p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN users u ON u.id = p.author_id
    LEFT JOIN (
      SELECT
        i.post_id,
        MAX(f.name) AS feed_name,
        MAX(f.url) AS feed_url,
        MAX(i.author) AS item_author
      FROM rss_feed_items i
      LEFT JOIN rss_feeds f ON f.id = i.rss_feed_id
      WHERE i.post_id IS NOT NULL
      GROUP BY i.post_id
    ) r ON r.post_id = p.id
    ORDER BY p.id DESC`,
    [siteUrl]
  );

  const headers = [
    'post_id',
    'title',
    'slug',
    'excerpt',
    'post_link',
    'status',
    'is_unpublished',
    'source',
    'category_id',
    'category_name',
    'category_slug',
    'author_id',
    'author_name',
    'actual_display_author',
    'featured',
    'format',
    'rss_feed_name',
    'rss_feed_url',
    'rss_item_author_name',
    'search_title',
    'search_excerpt',
    'search_slug',
    'created_at',
    'updated_at',
    'published_at',
  ];

  const stream = fs.createWriteStream(outPath, { encoding: 'utf8' });
  stream.write(headers.join(',') + '\n');

  for (const row of rows) {
    const status = row.status || 'draft';
    const isUnpublished = status !== 'published' ? 1 : 0;
    const assignedAuthor = (row.author_name || '').trim();
    const rssItemAuthor = (row.rss_item_author_name || '').trim();
    const actualDisplayAuthor = assignedAuthor.toLowerCase() === 'admin user'
      ? (rssItemAuthor || assignedAuthor)
      : (assignedAuthor || rssItemAuthor);

    stream.write([
      escapeCsv(row.post_id),
      escapeCsv(row.title),
      escapeCsv(row.slug),
      escapeCsv(row.excerpt),
      escapeCsv(row.post_link),
      escapeCsv(status),
      escapeCsv(isUnpublished),
      escapeCsv(row.source),
      escapeCsv(row.category_id),
      escapeCsv(row.category_name),
      escapeCsv(row.category_slug),
      escapeCsv(row.author_id),
      escapeCsv(row.author_name),
      escapeCsv(actualDisplayAuthor),
      escapeCsv(row.featured),
      escapeCsv(row.format),
      escapeCsv(row.rss_feed_name),
      escapeCsv(row.rss_feed_url),
      escapeCsv(row.rss_item_author_name),
      escapeCsv(row.title),
      escapeCsv(row.excerpt),
      escapeCsv(row.slug),
      escapeCsv(toIso(row.created_at)),
      escapeCsv(toIso(row.updated_at)),
      escapeCsv(toIso(row.published_at)),
    ].join(',') + '\n');
  }

  await new Promise<void>((resolve, reject) => {
    stream.end(() => resolve());
    stream.on('error', reject);
  });

  console.log(`CSV generated: ${outPath}`);
  console.log(`Rows exported: ${rows.length}`);

  await closeDbConnection();
}

main().catch(async (error) => {
  console.error('Failed to export admin posts filter CSV:', error);
  await closeDbConnection();
  process.exit(1);
});
