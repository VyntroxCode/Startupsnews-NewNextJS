/**
 * Partner logos / Our Partners disaster-recovery snapshot.
 *
 * Why this exists: commit e5056bc (2026-08-24) moved /our-partners from 127 logo URLs
 * hardcoded in the page's JSX to the admin-managed `partner_logos` table, which made the DB the
 * ONLY copy of that list. The one-time seed was never run against zox_db, so the public page
 * silently rendered "Logos coming soon." for nine days before anyone noticed (see agent.md #621).
 * A hardcoded list can't drift out of existence; a DB table can. This restores that safety net
 * without giving up the admin UI: the DB stays the source of truth, and this keeps a committed
 * copy in git that can rebuild it from scratch.
 *
 * Snapshot everything (partner_logos + the our-partners intro copy) into git:
 *   npm run logos:snapshot
 *
 * Rebuild the DB from the committed snapshot (safe by default — refuses to touch a non-empty
 * table unless you pass --force, which replaces every row):
 *   npm run logos:restore
 *   npm run logos:restore -- --force
 *
 * Re-run `npm run logos:snapshot` and commit the JSON whenever logos are changed in
 * Admin -> Inner Pages, otherwise the snapshot goes stale.
 */
import { loadEnvConfig } from '@next/env';

// tsx doesn't read .env.local the way `next` does. Safe above the connection import despite ESM
// hoisting, because connection.ts builds its pool lazily inside getPool() — env is read on the
// first query, not at module-eval time.
loadEnvConfig(process.cwd());

import { query, queryOne, closeDbConnection } from '@/shared/database/connection';
import { PARTNER_LOGO_SECTIONS } from '@/modules/inner-pages/domain/types';
import * as fs from 'fs';
import * as path from 'path';

const SNAPSHOT_PATH = path.join(process.cwd(), 'data', 'partner-logos.snapshot.json');

/** The page keys whose admin-managed rich-text intro ships with the logos. */
const CONTENT_PAGE_KEYS = ['our-partners'] as const;

interface SnapshotLogo {
  section: string;
  imageUrl: string;
  linkUrl: string | null;
  sortOrder: number;
}

interface Snapshot {
  /** Bumped only on a breaking shape change, so restore can refuse a file it can't read. */
  version: 1;
  capturedAt: string;
  counts: { logos: number; bySection: Record<string, number>; content: number };
  logos: SnapshotLogo[];
  innerPageContent: { pageKey: string; contentHtml: string }[];
}

async function exportSnapshot() {
  const rows = await query<{ section: string; image_url: string; link_url: string | null; sort_order: number }>(
    'SELECT section, image_url, link_url, sort_order FROM partner_logos ORDER BY section, sort_order, id'
  );
  if (rows.length === 0) {
    // Overwriting a good snapshot with an empty one is exactly the failure this script guards
    // against, so bail loudly rather than committing a file that restores nothing.
    throw new Error(
      'partner_logos is EMPTY — refusing to overwrite the snapshot with 0 logos. ' +
        'If the table really should be empty, delete the snapshot file by hand.'
    );
  }

  const content: { pageKey: string; contentHtml: string }[] = [];
  for (const pageKey of CONTENT_PAGE_KEYS) {
    const row = await queryOne<{ content_html: string }>(
      'SELECT content_html FROM inner_page_content WHERE page_key = ?',
      [pageKey]
    );
    if (row) content.push({ pageKey, contentHtml: row.content_html });
  }

  const bySection: Record<string, number> = {};
  for (const r of rows) bySection[r.section] = (bySection[r.section] || 0) + 1;

  const unknown = Object.keys(bySection).filter(
    (s) => !(PARTNER_LOGO_SECTIONS as readonly string[]).includes(s)
  );
  if (unknown.length) {
    // Not fatal — the rows are still worth snapshotting — but these are invisible on the public
    // page and in the admin list, so say so instead of silently capturing dead rows.
    console.warn(`WARNING: sections not in PARTNER_LOGO_SECTIONS (these render nowhere): ${unknown.join(', ')}`);
  }

  const snapshot: Snapshot = {
    version: 1,
    capturedAt: new Date().toISOString(),
    counts: { logos: rows.length, bySection, content: content.length },
    logos: rows.map((r) => ({
      section: r.section,
      imageUrl: r.image_url,
      linkUrl: r.link_url,
      sortOrder: Number(r.sort_order),
    })),
    innerPageContent: content,
  };

  fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  console.log(`Wrote ${path.relative(process.cwd(), SNAPSHOT_PATH)}`);
  console.log(`  ${rows.length} logos — ${Object.entries(bySection).map(([s, c]) => `${s}: ${c}`).join(', ')}`);
  console.log(`  ${content.length} inner_page_content row(s): ${content.map((c) => c.pageKey).join(', ') || '(none)'}`);
  console.log('\nCommit this file so the list survives any DB loss.');
}

async function restoreSnapshot(force: boolean) {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    throw new Error(`No snapshot at ${SNAPSHOT_PATH} — run \`npm run logos:snapshot\` first.`);
  }
  const snapshot: Snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
  if (snapshot.version !== 1) {
    throw new Error(`Snapshot version ${snapshot.version} is newer than this script understands.`);
  }
  if (!snapshot.logos?.length) {
    throw new Error('Snapshot contains no logos — nothing to restore.');
  }

  const existing = await queryOne<{ c: number | bigint }>('SELECT COUNT(*) as c FROM partner_logos');
  const existingCount = Number(existing?.c || 0);
  if (existingCount > 0 && !force) {
    console.log(
      `partner_logos already has ${existingCount} rows — not touching them.\n` +
        'Pass --force to DELETE all rows and replace them with the snapshot.'
    );
    return;
  }
  if (existingCount > 0) {
    console.log(`--force: deleting ${existingCount} existing rows.`);
    await query('DELETE FROM partner_logos');
  }

  for (const logo of snapshot.logos) {
    await query(
      'INSERT INTO partner_logos (section, image_url, link_url, sort_order, created_by) VALUES (?, ?, ?, ?, ?)',
      [logo.section, logo.imageUrl, logo.linkUrl, logo.sortOrder, 'snapshot-restore']
    );
  }
  console.log(`Restored ${snapshot.logos.length} logos (snapshot captured ${snapshot.capturedAt}).`);

  for (const c of snapshot.innerPageContent || []) {
    await query(
      `INSERT INTO inner_page_content (page_key, content_html, updated_by) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE content_html = VALUES(content_html), updated_by = VALUES(updated_by)`,
      [c.pageKey, c.contentHtml, 'snapshot-restore']
    );
    console.log(`Restored inner_page_content for ${c.pageKey}.`);
  }

  console.log('\nNow clear the caches so the public page picks it up:');
  console.log("  redis-cli DEL 'partner-logos:by-section' 'inner-page-content:our-partners'");
}

async function main() {
  const mode = process.argv[2] === 'restore' ? 'restore' : 'export';
  if (mode === 'restore') await restoreSnapshot(process.argv.includes('--force'));
  else await exportSnapshot();
  await closeDbConnection();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await closeDbConnection().catch(() => {});
  process.exit(1);
});
