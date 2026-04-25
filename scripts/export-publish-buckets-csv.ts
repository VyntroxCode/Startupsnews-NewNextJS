/**
 * Export post CSVs by publish/word-count buckets.
 *
 * Outputs (default):
 * 1) unpublished-posts.csv
 *    Columns: heading,body
 *
 * 2) published-less-than-500-words.csv
 *    Columns: heading,body,post_link
 *
 * 3) published-500-or-more-words.csv
 *    Columns: heading,body,post_link
 *
 * Usage:
 *   npx tsx scripts/export-publish-buckets-csv.ts
 */

import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';
import * as fs from 'fs';
import * as path from 'path';

loadEnvConfig(process.cwd());

interface PostRow {
  id: number;
  slug: string;
  title: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    });
}

function htmlToText(html: string): string {
  if (!html) return '';

  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n')
    .replace(/<\s*\/div\s*>/gi, '\n')
    .replace(/<\s*\/li\s*>/gi, '\n')
    .replace(/<\s*\/h[1-6]\s*>/gi, '\n');

  const noTags = withBreaks.replace(/<[^>]*>/g, ' ');
  const decoded = decodeHtmlEntities(noTags);

  return decoded
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function getWordCount(text: string): number {
  if (!text) return 0;
  return text
    .replace(/[^a-zA-Z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
}

function escapeCsv(value: string | null | undefined): string {
  const v = (value ?? '').replace(/\r?\n/g, ' ').trim();
  return `"${v.replace(/"/g, '""')}"`;
}

async function fetchPostsBatch(limit: number, offset: number): Promise<PostRow[]> {
  return query<PostRow>(
    `SELECT id, slug, title, content, status
     FROM posts
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

async function main() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://startupnews.thebackend.in').replace(/\/$/, '');

  const unpublishedPath = path.resolve(process.cwd(), 'unpublished-posts.csv');
  const publishedLt500Path = path.resolve(process.cwd(), 'published-less-than-500-words.csv');
  const publishedGe500Path = path.resolve(process.cwd(), 'published-500-or-more-words.csv');

  const unpublishedStream = fs.createWriteStream(unpublishedPath, { encoding: 'utf8' });
  const lt500Stream = fs.createWriteStream(publishedLt500Path, { encoding: 'utf8' });
  const ge500Stream = fs.createWriteStream(publishedGe500Path, { encoding: 'utf8' });

  unpublishedStream.write('heading,body\n');
  lt500Stream.write('heading,body,post_link\n');
  ge500Stream.write('heading,body,post_link\n');

  let totalScanned = 0;
  let unpublishedCount = 0;
  let publishedLt500 = 0;
  let publishedGe500 = 0;

  const batchSize = 1000;
  let offset = 0;

  console.log('\nExporting CSV buckets...');

  while (true) {
    const rows = await fetchPostsBatch(batchSize, offset);
    if (rows.length === 0) break;

    totalScanned += rows.length;

    for (const post of rows) {
      const bodyText = htmlToText(post.content || '');

      if (post.status !== 'published') {
        unpublishedCount++;
        unpublishedStream.write([
          escapeCsv(post.title || ''),
          escapeCsv(bodyText),
        ].join(',') + '\n');
        continue;
      }

      const wc = getWordCount(bodyText);
      const postLink = `${siteUrl}/post/${post.slug}`;

      if (wc < 500) {
        publishedLt500++;
        lt500Stream.write([
          escapeCsv(post.title || ''),
          escapeCsv(bodyText),
          escapeCsv(postLink),
        ].join(',') + '\n');
      } else {
        publishedGe500++;
        ge500Stream.write([
          escapeCsv(post.title || ''),
          escapeCsv(bodyText),
          escapeCsv(postLink),
        ].join(',') + '\n');
      }
    }

    if (rows.length < batchSize) break;
    offset += rows.length;
  }

  await Promise.all([
    new Promise<void>((resolve, reject) => {
      unpublishedStream.end(() => resolve());
      unpublishedStream.on('error', reject);
    }),
    new Promise<void>((resolve, reject) => {
      lt500Stream.end(() => resolve());
      lt500Stream.on('error', reject);
    }),
    new Promise<void>((resolve, reject) => {
      ge500Stream.end(() => resolve());
      ge500Stream.on('error', reject);
    }),
  ]);

  console.log('Done.');
  console.log(`- total scanned: ${totalScanned}`);
  console.log(`- unpublished (heading+body): ${unpublishedCount}`);
  console.log(`- published <500 (heading+body+post_link): ${publishedLt500}`);
  console.log(`- published >=500 (heading+body+post_link): ${publishedGe500}`);
  console.log(`- file: ${unpublishedPath}`);
  console.log(`- file: ${publishedLt500Path}`);
  console.log(`- file: ${publishedGe500Path}\n`);

  await closeDbConnection();
}

main().catch(async (error) => {
  console.error('Failed to export publish buckets:', error instanceof Error ? error.message : error);
  await closeDbConnection();
  process.exit(1);
});
