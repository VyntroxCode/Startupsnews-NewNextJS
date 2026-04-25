import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';
import * as fs from 'fs';
import * as path from 'path';

loadEnvConfig(process.cwd());

interface Row {
  post_id: number;
  post_heading: string;
  post_body: string;
  post_link: string;
  rss_feed_name: string;
  rss_feed_url: string;
  category: string;
  posted_author_name: string;
  internal_author_name: string;
  rss_item_author_name: string;
}

const TARGET_NAMES = [
  'sreejit',
  'honey',
  'sameera',
  'team snfyi',
  'startupnews.fyi',
  'team startupnews.fyi',
  'team startupnews fyi',
  'startupnews fyi',
];

function escapeCsv(value: string | null | undefined): string {
  const text = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  return `"${text.replace(/"/g, '""')}"`;
}

async function main() {
  const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
  const outputFile = outputArg ? outputArg.split('=')[1] : 'requested-authors-rss-posts.csv';
  const outPath = path.resolve(process.cwd(), outputFile);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://startupnews.thebackend.in').replace(/\/$/, '');

  const placeholders = TARGET_NAMES.map(() => '?').join(', ');
  const params = [...TARGET_NAMES, ...TARGET_NAMES];

  const sql = `
    SELECT
      p.id AS post_id,
      p.title AS post_heading,
      p.content AS post_body,
      CONCAT(?, '/post/', p.slug) AS post_link,
      COALESCE(f.name, '') AS rss_feed_name,
      COALESCE(f.url, '') AS rss_feed_url,
      COALESCE(c.name, '') AS category,
      COALESCE(NULLIF(TRIM(u.name), ''), NULLIF(TRIM(i.author), ''), '') AS posted_author_name,
      COALESCE(u.name, '') AS internal_author_name,
      COALESCE(i.author, '') AS rss_item_author_name
    FROM posts p
    LEFT JOIN users u ON u.id = p.author_id
    LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN rss_feed_items i ON i.post_id = p.id
    LEFT JOIN rss_feeds f ON f.id = i.rss_feed_id
     WHERE LOWER(TRIM(COALESCE(u.name, ''))) IN (${placeholders})
       OR LOWER(TRIM(COALESCE(i.author, ''))) IN (${placeholders})
       OR LOWER(TRIM(COALESCE(u.name, ''))) LIKE '%startupnews%'
       OR LOWER(TRIM(COALESCE(i.author, ''))) LIKE '%startupnews%'
    ORDER BY p.id DESC
  `;

  const rows = await query<Row>(sql, [siteUrl, ...params]);

  const headers = [
    'post_heading',
    'post_body',
    'post_link',
    'rss_feed_name',
    'rss_feed_url',
    'category',
    'author_name',
    'internal_author_name',
    'rss_item_author_name',
  ];

  const stream = fs.createWriteStream(outPath, { encoding: 'utf8' });
  stream.write(headers.join(',') + '\n');

  for (const row of rows) {
    stream.write([
      escapeCsv(row.post_heading),
      escapeCsv(row.post_body),
      escapeCsv(row.post_link),
      escapeCsv(row.rss_feed_name),
      escapeCsv(row.rss_feed_url),
      escapeCsv(row.category),
      escapeCsv(row.posted_author_name),
      escapeCsv(row.internal_author_name),
      escapeCsv(row.rss_item_author_name),
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
  console.error('Failed to export requested-author RSS posts CSV:', error);
  await closeDbConnection();
  process.exit(1);
});
