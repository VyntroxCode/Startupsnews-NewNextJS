import { loadEnvConfig } from '@next/env';
import { closeDbConnection, getDbConnection } from '../src/shared/database/connection';

loadEnvConfig(process.cwd());

const SOURCE_BASE = (process.env.IMPORT_SOURCE_BASE || process.env.WP_SITE_URL || 'https://startupnews.thebackend.in').replace(/\/$/, '');
const WP_POSTS_ENDPOINT = `${SOURCE_BASE}/wp-json/wp/v2/posts`;
const DEFAULT_CSV_PATH = 'DataNotCopiedFromBackend.csv';
const TARGET_AUTHORS = ['Team StartupNews.fyi', 'Sreejit Kumar'];

type CsvRow = {
  title: string;
  foundInFyi: string;
  wordCount: string;
  publishedDate: string;
  backendUrl: string;
};

type WpPost = {
  slug?: string;
  date?: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  content?: { rendered?: string };
};

type LocalPostRow = {
  id: number;
  slug: string;
  author_name: string;
};

type IdRow = { id: number };

function parseArgs(args: string[]) {
  const dryRun = args.includes('--dry-run') || !args.includes('--apply');
  const csvArg = args.find((a) => a.startsWith('--csv='));
  const csvPath = csvArg?.split('=').slice(1).join('=').trim() || DEFAULT_CSV_PATH;
  return { dryRun, csvPath };
}

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

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      cells.push(cur.trim());
      cur = '';
      continue;
    }

    cur += ch;
  }

  cells.push(cur.trim());
  return cells;
}

async function readCsvRows(csvPath: string): Promise<CsvRow[]> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const resolved = path.resolve(process.cwd(), csvPath);
  const raw = await fs.readFile(resolved, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < 5) continue;
    const backendUrl = cells[cells.length - 1].trim();
    if (!backendUrl) continue;
    rows.push({
      title: cells[0] || '',
      foundInFyi: cells[1] || '',
      wordCount: cells[2] || '',
      publishedDate: cells[3] || '',
      backendUrl,
    });
  }
  return rows;
}

function slugFromBackendUrl(urlValue: string): string {
  try {
    const u = new URL(urlValue.trim());
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    return '';
  }
}

async function fetchWpPostBySlug(slug: string): Promise<WpPost | null> {
  if (!slug) return null;
  const url = new URL(WP_POSTS_ENDPOINT);
  url.searchParams.set('slug', slug);
  url.searchParams.set('per_page', '1');
  url.searchParams.set('_fields', 'slug,date,title,excerpt,content');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'StartupNews-Csv-Migrate/1.0' },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) return null;
  const rows = await res.json() as WpPost[];
  return rows?.[0] || null;
}

function toMysqlDatetime(input?: string): string | null {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function getAuthorId(
  conn: Awaited<ReturnType<Awaited<ReturnType<typeof getDbConnection>>['getConnection']>>
): Promise<number> {
  for (const name of TARGET_AUTHORS) {
    const rows = await conn.query(
      `SELECT id FROM users WHERE role = 'author' AND name = ? LIMIT 1`,
      [name]
    ) as IdRow[];
    if (rows[0]?.id) return rows[0].id;
  }
  const fallback = await conn.query(
    `SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1`
  ) as IdRow[];
  if (!fallback[0]?.id) throw new Error('No author/admin user found');
  return fallback[0].id;
}

async function getDefaultCategoryId(
  conn: Awaited<ReturnType<Awaited<ReturnType<typeof getDbConnection>>['getConnection']>>
): Promise<number> {
  const preferred = ['tech', 'ai-deeptech', 'business', 'funding'];
  for (const slug of preferred) {
    const rows = await conn.query(`SELECT id FROM categories WHERE slug = ? LIMIT 1`, [slug]) as IdRow[];
    if (rows[0]?.id) return rows[0].id;
  }
  const any = await conn.query(`SELECT id FROM categories ORDER BY id ASC LIMIT 1`) as IdRow[];
  if (!any[0]?.id) throw new Error('No category found');
  return any[0].id;
}

async function findLocalPostBySlug(conn: Awaited<ReturnType<Awaited<ReturnType<typeof getDbConnection>>['getConnection']>>, slug: string): Promise<LocalPostRow | null> {
  const placeholders = TARGET_AUTHORS.map(() => '?').join(',');
  const rows = await conn.query(
    `SELECT p.id, p.slug, u.name AS author_name
     FROM posts p
     INNER JOIN users u ON u.id = p.author_id
     WHERE p.slug = ? AND u.name IN (${placeholders})
     LIMIT 1`,
    [slug, ...TARGET_AUTHORS]
  ) as LocalPostRow[];
  return rows[0] || null;
}

async function findLocalPostByRssLink(
  conn: Awaited<ReturnType<Awaited<ReturnType<typeof getDbConnection>>['getConnection']>>,
  backendUrl: string
): Promise<LocalPostRow | null> {
  const placeholders = TARGET_AUTHORS.map(() => '?').join(',');
  const withSlash = backendUrl.endsWith('/') ? backendUrl : `${backendUrl}/`;
  const withoutSlash = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;

  const rows = await conn.query(
    `SELECT p.id, p.slug, u.name AS author_name
     FROM posts p
     INNER JOIN users u ON u.id = p.author_id
     INNER JOIN rss_feed_items r ON r.post_id = p.id
     WHERE u.name IN (${placeholders})
       AND r.link IN (?, ?)
     ORDER BY r.id DESC
     LIMIT 1`,
    [...TARGET_AUTHORS, withSlash, withoutSlash]
  ) as LocalPostRow[];

  return rows[0] || null;
}

async function main() {
  const { dryRun, csvPath } = parseArgs(process.argv.slice(2));
  const rows = await readCsvRows(csvPath);
  if (rows.length === 0) {
    console.log(`No rows found in ${csvPath}`);
    await closeDbConnection();
    return;
  }

  const pool = await getDbConnection();
  const conn = await pool.getConnection();

  let checked = 0;
  let wpFound = 0;
  let localMatched = 0;
  let updated = 0;
  let inserted = 0;
  let madeManual = 0;
  let skippedNoSlug = 0;
  let skippedWpMissing = 0;
  let skippedLocalMissing = 0;
  let errors = 0;

  try {
    if (!dryRun) await conn.beginTransaction();
    const insertAuthorId = await getAuthorId(conn);
    const defaultCategoryId = await getDefaultCategoryId(conn);

    for (const row of rows) {
      checked++;
      try {
        const slug = slugFromBackendUrl(row.backendUrl);
        if (!slug) {
          skippedNoSlug++;
          continue;
        }

        const wp = await fetchWpPostBySlug(slug);
        if (!wp?.content?.rendered) {
          skippedWpMissing++;
          continue;
        }
        wpFound++;

        let local = await findLocalPostByRssLink(conn, row.backendUrl);
        if (!local) {
          local = await findLocalPostBySlug(conn, slug);
        }
        if (local) {
          localMatched++;
        }

        const wpPublishedAt = toMysqlDatetime(wp.date) || toMysqlDatetime(row.publishedDate) || null;
        const wpExcerptPlain = stripHtml(wp.excerpt?.rendered || '').slice(0, 500);
        const wpMeta = wpExcerptPlain.slice(0, 160);
        const wpTitle = stripHtml(wp.title?.rendered || row.title || slug).slice(0, 255) || slug;

        if (!dryRun) {
          let targetPostId = local?.id;

          if (!targetPostId) {
            await conn.query(
              `INSERT INTO posts (
                 title, slug, excerpt, meta_description, content, category_id, author_id,
                 format, status, featured, published_at, created_at, updated_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, 'standard', 'published', 0, ?, NOW(), NOW())`,
              [wpTitle, slug, wpExcerptPlain, wpMeta, wp.content.rendered, defaultCategoryId, insertAuthorId, wpPublishedAt]
            );
            const insertedRow = await conn.query(
              `SELECT id FROM posts WHERE slug = ? ORDER BY id DESC LIMIT 1`,
              [slug]
            ) as IdRow[];
            if (!insertedRow[0]?.id) throw new Error(`Inserted post not found for slug=${slug}`);
            targetPostId = insertedRow[0].id;
            inserted++;
          } else {
            await conn.query(
              `UPDATE posts
               SET content = ?,
                   excerpt = CASE WHEN excerpt IS NULL OR TRIM(excerpt) = '' THEN ? ELSE excerpt END,
                   meta_description = CASE WHEN meta_description IS NULL OR TRIM(meta_description) = '' THEN ? ELSE meta_description END,
                   published_at = COALESCE(?, published_at),
                   updated_at = NOW()
               WHERE id = ?`,
              [wp.content.rendered, wpExcerptPlain, wpMeta, wpPublishedAt, targetPostId]
            );
            updated++;
          }

          const rssUpdate = await conn.query(
            `UPDATE rss_feed_items
             SET post_id = NULL, updated_at = NOW()
             WHERE post_id = ?`,
            [targetPostId]
          ) as { affectedRows?: number };
          if ((rssUpdate.affectedRows || 0) > 0) {
            madeManual++;
          }
        } else {
          if (local) {
            updated++;
          } else {
            inserted++;
            skippedLocalMissing++;
          }
        }
      } catch (err) {
        errors++;
        console.warn(`Failed row url=${row.backendUrl}`, err);
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
    csvPath,
    source: SOURCE_BASE,
    targetAuthors: TARGET_AUTHORS,
    dryRun,
    checked,
    wpFound,
    localMatched,
    updated,
    inserted,
    madeManual,
    skippedNoSlug,
    skippedWpMissing,
    skippedLocalMissing,
    errors,
  }, null, 2));
}

main().catch(async (error) => {
  console.error('CSV migration failed:', error);
  await closeDbConnection();
  process.exit(1);
});
