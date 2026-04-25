/**
 * Export thin-content news posts to CSV.
 *
 * Criteria (default):
 * - word count < 500
 * OR
 * - thin-line content heuristic (very few non-empty lines or mostly short lines)
 *
 * Output CSV columns:
 * - news_post_title
 * - news_body
 * - source_link
 *
 * Usage:
 *   npx tsx scripts/export-thin-content-posts-csv.ts
 *   npx tsx scripts/export-thin-content-posts-csv.ts --minWords=500 --status=published --output=thin-content-posts.csv
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
  source_link: string | null;
}

interface Args {
  minWords: number;
  status: 'published' | 'draft' | 'archived' | 'all';
  output: string;
  mode: 'thin' | 'above';
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    minWords: 500,
    status: 'published',
    output: 'thin-content-posts.csv',
    mode: 'thin',
  };

  for (const arg of argv) {
    if (arg.startsWith('--minWords=')) {
      const v = parseInt(arg.split('=')[1], 10);
      if (!isNaN(v) && v > 0) args.minWords = v;
    } else if (arg.startsWith('--status=')) {
      const status = arg.split('=')[1] as Args['status'];
      if (status === 'published' || status === 'draft' || status === 'archived' || status === 'all') {
        args.status = status;
      }
    } else if (arg.startsWith('--output=')) {
      const out = arg.split('=')[1];
      if (out && out.trim()) args.output = out.trim();
    } else if (arg.startsWith('--mode=')) {
      const mode = arg.split('=')[1] as Args['mode'];
      if (mode === 'thin' || mode === 'above') {
        args.mode = mode;
      }
    }
  }

  return args;
}

function decodeHtmlEntities(input: string): string {
  const namedDecoded = input
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  return namedDecoded
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

function isThinLineContent(text: string): boolean {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return true;
  if (lines.length <= 3) return true;

  const shortLineThreshold = 12;
  const shortLineCount = lines.filter((line) => getWordCount(line) <= shortLineThreshold).length;
  const shortLineRatio = shortLineCount / lines.length;

  // Mostly short lines is a common thin-content pattern.
  return shortLineRatio >= 0.8;
}

function escapeCsv(value: string | null | undefined): string {
  const v = (value ?? '').replace(/\r?\n/g, ' ').trim();
  return `"${v.replace(/"/g, '""')}"`;
}

async function fetchPosts(status: Args['status']): Promise<PostRow[]> {
  const batchSize = 1000;
  return fetchPostsBatch(status, batchSize, 0);
}

async function fetchPostsBatch(status: Args['status'], limit: number, offset: number): Promise<PostRow[]> {
  const statusFilter = status === 'all' ? '' : 'WHERE p.status = ?';
  const params: (string | number)[] = status === 'all' ? [] : [status];

  const sql = `
    SELECT
      p.id,
      p.slug,
      p.title,
      p.content,
      r.source_link
    FROM posts p
    LEFT JOIN (
      SELECT post_id, MAX(link) AS source_link
      FROM rss_feed_items
      WHERE post_id IS NOT NULL
        AND link IS NOT NULL
        AND TRIM(link) != ''
      GROUP BY post_id
    ) r ON r.post_id = p.id
    ${statusFilter}
    ORDER BY p.id DESC
    LIMIT ? OFFSET ?
  `;

  params.push(limit, offset);

  return query<PostRow>(sql, params);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outPath = path.resolve(process.cwd(), args.output);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://startupnews.thebackend.in').replace(/\/$/, '');

  console.log('\nScanning posts for thin content...');
  console.log(`- status: ${args.status}`);
  console.log(`- minWords: ${args.minWords}`);
  console.log(`- mode: ${args.mode}`);
  console.log(`- output: ${outPath}\n`);

  const writeStream = fs.createWriteStream(outPath, { encoding: 'utf8' });
  writeStream.write('news_post_title,news_body,source_link,post_link\n');

  let matched = 0;
  let matchedByWordCount = 0;
  let matchedByThinLines = 0;
  let totalScanned = 0;

  const batchSize = 1000;
  let offset = 0;

  while (true) {
    const posts = await fetchPostsBatch(args.status, batchSize, offset);
    if (posts.length === 0) break;

    totalScanned += posts.length;

    for (const post of posts) {
      const bodyText = htmlToText(post.content || '');
      const wordCount = getWordCount(bodyText);
      const thinLines = isThinLineContent(bodyText);

      const isThin = wordCount < args.minWords || thinLines;
      const isAbove = wordCount > args.minWords;

      if ((args.mode === 'thin' && isThin) || (args.mode === 'above' && isAbove)) {
        matched++;
        if (wordCount < args.minWords) matchedByWordCount++;
        if (thinLines) matchedByThinLines++;

        writeStream.write([
          escapeCsv(post.title || ''),
          escapeCsv(bodyText),
          escapeCsv(post.source_link || ''),
          escapeCsv(`${siteUrl}/post/${post.slug}`),
        ].join(',') + '\n');
      }
    }

    if (posts.length < batchSize) break;
    offset += posts.length;
  }

  await new Promise<void>((resolve, reject) => {
    writeStream.end(() => resolve());
    writeStream.on('error', reject);
  });

  console.log('Done.');
  console.log(`- total scanned: ${totalScanned}`);
  console.log(`- matched: ${matched}`);
  if (args.mode === 'thin') {
    console.log(`- matched by word count (<${args.minWords}): ${matchedByWordCount}`);
    console.log(`- matched by thin-line heuristic: ${matchedByThinLines}`);
  } else {
    console.log(`- matched by word count (>${args.minWords}): ${matched}`);
  }
  console.log(`- csv: ${outPath}\n`);

  await closeDbConnection();
}

main().catch(async (error) => {
  console.error('Failed to export thin-content posts:', error instanceof Error ? error.message : error);
  await closeDbConnection();
  process.exit(1);
});
