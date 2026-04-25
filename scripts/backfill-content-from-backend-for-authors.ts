/**
 * Backfill post content from backend WordPress by slug for selected authors.
 *
 * Strategy:
 * - Select local posts for target authors with low/empty content body.
 * - Resolve source content from backend WP API: /wp-json/wp/v2/posts?slug=<last-slug-segment>
 * - Update local post content (and optionally excerpt/meta description when empty/short).
 *
 * Usage:
 *   npx tsx scripts/backfill-content-from-backend-for-authors.ts --dry-run
 *   npx tsx scripts/backfill-content-from-backend-for-authors.ts --apply
 *   npx tsx scripts/backfill-content-from-backend-for-authors.ts --apply --authors="Team StartupNews.fyi,Sreejit Kumar"
 */
import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection, getDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

const SOURCE_BASE = (process.env.IMPORT_SOURCE_BASE || process.env.WP_SITE_URL || 'https://startupnews.thebackend.in').replace(/\/$/, '');
const WP_POSTS_ENDPOINT = `${SOURCE_BASE}/wp-json/wp/v2/posts`;
const MIN_LOCAL_WORDS = Number(process.env.BACKFILL_MIN_LOCAL_WORDS || '120');
const MIN_REMOTE_WORDS = Number(process.env.BACKFILL_MIN_REMOTE_WORDS || '180');

type LocalRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  author_name: string;
};

type WpPost = {
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
  link?: string;
  date?: string;
};

function stripHtml(input: string): string {
  return (input || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCountFromHtml(html: string | null | undefined): number {
  const text = stripHtml(html || '');
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function getAuthorsFromArgs(args: string[]): string[] {
  const arg = args.find((a) => a.startsWith('--authors='));
  if (!arg) return ['Team StartupNews.fyi', 'Sreejit Kumar'];
  return arg
    .split('=')[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function lastSlugSegment(slug: string): string {
  const s = (slug || '').trim().replace(/^\/+|\/+$/g, '');
  if (!s) return '';
  const parts = s.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

async function fetchWpPostBySlug(slugSegment: string): Promise<WpPost | null> {
  if (!slugSegment) return null;
  const url = new URL(WP_POSTS_ENDPOINT);
  url.searchParams.set('slug', slugSegment);
  url.searchParams.set('per_page', '1');
  url.searchParams.set('_fields', 'title,excerpt,content,link,date');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'StartupNews-Content-Backfill/1.0' },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return null;
  const rows = await res.json() as WpPost[];
  return rows?.[0] || null;
}

async function getCandidates(authors: string[]): Promise<LocalRow[]> {
  if (authors.length === 0) return [];
  const placeholders = authors.map(() => '?').join(',');
  return query<LocalRow>(
    `
    SELECT
      p.id,
      p.slug,
      p.title,
      p.excerpt,
      p.content,
      u.name AS author_name
    FROM posts p
    INNER JOIN users u ON u.id = p.author_id
    WHERE u.name IN (${placeholders})
    ORDER BY p.id ASC
    `,
    authors
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--apply');
  const authors = getAuthorsFromArgs(args);

  const candidates = await getCandidates(authors);
  if (candidates.length === 0) {
    console.log('No candidate posts found for backfill.');
    await closeDbConnection();
    return;
  }

  let checked = 0;
  let resolvable = 0;
  let updated = 0;
  let skippedNoRemote = 0;
  let skippedRemoteThin = 0;
  let unchanged = 0;
  let errors = 0;

  const pool = await getDbConnection();
  const conn = await pool.getConnection();

  try {
    if (!dryRun) await conn.beginTransaction();

    for (const row of candidates) {
      checked++;
      try {
        const localWords = wordCountFromHtml(row.content);
        if (localWords >= MIN_LOCAL_WORDS) {
          unchanged++;
          continue;
        }

        const wp = await fetchWpPostBySlug(lastSlugSegment(row.slug));
        if (!wp) {
          skippedNoRemote++;
          continue;
        }

        const remoteContent = wp.content?.rendered || '';
        const remoteWords = wordCountFromHtml(remoteContent);
        if (remoteWords < MIN_REMOTE_WORDS) {
          skippedRemoteThin++;
          continue;
        }
        resolvable++;

        const remoteExcerptPlain = stripHtml(wp.excerpt?.rendered || '').slice(0, 500);
        const remoteMeta = remoteExcerptPlain.slice(0, 160);

        if (!dryRun) {
          await conn.query(
            `UPDATE posts
             SET content = ?,
                 excerpt = CASE
                   WHEN excerpt IS NULL OR TRIM(excerpt) = '' THEN ?
                   ELSE excerpt
                 END,
                 meta_description = CASE
                   WHEN meta_description IS NULL OR TRIM(meta_description) = '' THEN ?
                   ELSE meta_description
                 END,
                 updated_at = NOW()
             WHERE id = ?`,
            [remoteContent, remoteExcerptPlain || row.excerpt || '', remoteMeta, row.id]
          );
          updated++;
        }
      } catch (err) {
        errors++;
        console.warn(`Failed id=${row.id} slug=${row.slug}`, err);
      }
    }

    if (!dryRun) {
      await conn.commit();
    }
  } catch (err) {
    if (!dryRun) await conn.rollback();
    throw err;
  } finally {
    conn.release();
    await closeDbConnection();
  }

  console.log(JSON.stringify({
    source: SOURCE_BASE,
    authors,
    dryRun,
    checked,
    resolvable,
    updated,
    skippedNoRemote,
    skippedRemoteThin,
    unchanged,
    errors,
  }, null, 2));
}

main().catch(async (error) => {
  console.error('Backfill failed:', error);
  await closeDbConnection();
  process.exit(1);
});

