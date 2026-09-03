/**
 * Restore the Partnership Tracker (`partnership_events`) from a CSV backup.
 *
 * Counterpart to scripts/export-partnership-events-csv.ts. Written after the table was truncated
 * on 2026-09-02 (#610) and had to be rebuilt from an admin CSV export.
 *
 * Column mapping is driven by the CSV *header row*, not by position, so it accepts both the
 * full 43-column export from export-partnership-events-csv.ts and the 41-column admin export
 * (which omits `slug` and `site_status`). Any column not present in the header is reconstructed:
 *
 *   slug          <- listing_link's /startup-events/<slug> segment, else the "Suggested slug: x"
 *                    note that /submit-event writes into `comment`, else slugify(event_name).
 *                    Deduped with -2, -3 ... because the column is UNIQUE.
 *   site_status   <- 'draft'     when partnership_status = 'Draft'   (unapproved submissions)
 *                    'completed' when partnership_status = 'Expired' or the start date has passed
 *                    'upcoming'  otherwise
 *                    This mirrors PartnershipEventsRepository.markPastAsCompleted and the
 *                    public filter `site_status = 'upcoming' AND event_start_date >= CURDATE()`.
 *
 * `--fix-encoding` repairs UTF-8 that was mis-decoded as cp1252 ("MÃ©ridien" -> "Méridien"). It is
 * OFF by default: run a --dry-run first and only enable it if the preview shows mojibake, since
 * applying it to already-correct text corrupts it.
 *
 * Usage:
 *   npx tsx scripts/import-partnership-events-csv.ts --file=backup.csv --dry-run
 *   npx tsx scripts/import-partnership-events-csv.ts --file=backup.csv --wipe
 *   npx tsx scripts/import-partnership-events-csv.ts --file=backup.csv          # upsert by id
 */

import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';
import { slugify } from '../src/shared/utils/string.utils';
import * as fs from 'fs';
import * as path from 'path';

loadEnvConfig(process.cwd());

const COLUMNS = [
  'id', 'event_id', 'slug', 'site_status', 'event_name', 'city', 'country', 'organiser', 'poc',
  'contact', 'email', 'website', 'email_thread', 'initiated_date', 'event_start_date',
  'event_start_time', 'event_end_date', 'event_end_time', 'venue_address', 'google_location_link',
  'description', 'event_type', 'ticket_currency', 'ticket_price', 'speakers', 'poster_url',
  'banner_url', 'banner_start_date', 'banner_id', 'banner_active', 'social_media_posts',
  'social_creatives', 'partnership_status', 'partnership_type', 'last_updated_date', 'comment',
  'listing', 'listing_link', 'source', 'created_at', 'updated_at', 'created_by', 'updated_by',
] as const;

const DATE_COLUMNS = new Set([
  'initiated_date', 'event_start_date', 'event_end_date', 'banner_start_date', 'last_updated_date',
]);
const TIMESTAMP_COLUMNS = new Set(['created_at', 'updated_at']);
const INT_COLUMNS = new Set(['id', 'event_id', 'banner_id', 'banner_active']);

/** RFC 4180 parser: handles quoted fields, embedded commas/newlines and "" escapes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') { inQuotes = true; }
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\r') { /* handled by \n */ }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else { field += char; }
  }

  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

/** Reverse UTF-8 bytes that were decoded as cp1252/latin-1. Lossless only for 2-byte sequences. */
function fixEncoding(text: string): string {
  try {
    const repaired = Buffer.from(text, 'latin1').toString('utf8');
    return repaired.includes('�') ? text : repaired;
  } catch {
    return text;
  }
}

function deriveSlug(row: Record<string, string>): string {
  const fromLink = row.listing_link?.match(/\/startup-events\/([A-Za-z0-9-]+)/)?.[1];
  if (fromLink) return fromLink;

  const fromComment = row.comment?.match(/Suggested slug:\s*([A-Za-z0-9-]+)/)?.[1];
  if (fromComment) return fromComment;

  return slugify(row.event_name || '') || `event-${row.id}`;
}

function deriveSiteStatus(row: Record<string, string>, today: string): string {
  const partnership = (row.partnership_status || '').trim().toLowerCase();
  if (partnership === 'draft') return 'draft';
  if (partnership === 'expired') return 'completed';

  const start = row.event_start_date?.trim();
  if (start && start < today) return 'completed';
  return start ? 'upcoming' : 'draft';
}

function normalise(column: string, raw: string): string | number | null {
  const value = raw.trim();
  if (value === '') return column === 'banner_active' ? 0 : null;

  if (INT_COLUMNS.has(column)) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (DATE_COLUMNS.has(column)) {
    return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
  }
  if (TIMESTAMP_COLUMNS.has(column)) {
    return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 19).replace('T', ' ') : null;
  }
  return raw;
}

async function main() {
  const fileArg = process.argv.find((a) => a.startsWith('--file='))?.split('=')[1];
  const dryRun = process.argv.includes('--dry-run');
  const wipe = process.argv.includes('--wipe');
  const shouldFixEncoding = process.argv.includes('--fix-encoding');

  if (!fileArg) {
    console.error('Missing --file=<path-to-csv>');
    process.exit(1);
  }

  const filePath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  const text = fs.readFileSync(filePath, 'utf8').replace(/^﻿/, '');
  const parsed = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ''));

  if (parsed.length < 2) {
    console.error('CSV has no data rows');
    process.exit(1);
  }

  const header = parsed[0].map((h) => h.trim().replace(/^﻿/, ''));
  const unknown = header.filter((h) => !COLUMNS.includes(h as typeof COLUMNS[number]));
  if (unknown.length) {
    console.error(`Unknown column(s) in header: ${unknown.join(', ')}`);
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const seenSlugs = new Set<string>();
  const records: Record<string, string>[] = [];

  // --skip-existing-titles: leave rows already in the tracker completely alone, matching on
  // event_name rather than slug. Used when folding the `events` export in on top of a tracker
  // that is already populated — the same event is often titled identically but slugged
  // differently, so a slug-only check would let it through as a duplicate row.
  // Titles reaching us from different exports differ in whitespace ("it:  The" vs "it: The"), so
  // collapse runs of whitespace before comparing — otherwise a row already present slips through
  // as new and gets inserted twice.
  const titleKey = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ');

  const skipExistingTitles = process.argv.includes('--skip-existing-titles');
  const existingTitles = new Set<string>();
  if (skipExistingTitles) {
    const rows = await query<{ event_name: string }>(
      'SELECT event_name FROM partnership_events'
    );
    rows.forEach((r) => existingTitles.add(titleKey(r.event_name)));
    console.log(`Loaded ${existingTitles.size} existing title(s) to skip against`);
  }
  const skippedTitles: string[] = [];

  for (const cells of parsed.slice(1)) {
    const row: Record<string, string> = {};
    header.forEach((col, i) => {
      row[col] = shouldFixEncoding ? fixEncoding(cells[i] ?? '') : (cells[i] ?? '');
    });

    if (!row.event_name?.trim()) {
      console.warn(`Skipping row id=${row.id || '?'}: event_name is empty (NOT NULL column)`);
      continue;
    }

    if (skipExistingTitles && existingTitles.has(titleKey(row.event_name))) {
      skippedTitles.push(row.event_name.trim());
      continue;
    }

    if (!header.includes('slug') || !row.slug?.trim()) {
      const base = deriveSlug(row);
      let candidate = base;
      let suffix = 2;
      while (seenSlugs.has(candidate)) candidate = `${base}-${suffix++}`;
      row.slug = candidate;
    }
    seenSlugs.add(row.slug);

    if (!header.includes('site_status') || !row.site_status?.trim()) {
      row.site_status = deriveSiteStatus(row, today);
    }

    records.push(row);
  }

  const statusCounts = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.site_status] = (acc[r.site_status] || 0) + 1;
    return acc;
  }, {});
  const publicCount = records.filter(
    (r) => r.site_status === 'upcoming' && r.event_start_date?.trim() >= today
  ).length;

  console.log(`Parsed ${records.length} row(s) from ${path.basename(filePath)}`);
  if (skippedTitles.length) {
    console.log(`Skipped ${skippedTitles.length} row(s) whose title is already in the tracker:`);
    skippedTitles.forEach((t) => console.log(`  - ${t}`));
  }
  console.log(`Header columns: ${header.length}/${COLUMNS.length}` +
    (header.length < COLUMNS.length
      ? ` (reconstructing ${COLUMNS.filter((c) => !header.includes(c)).join(', ')})`
      : ''));
  console.log(`site_status: ${Object.entries(statusCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`);
  console.log(`Would appear on public /events: ${publicCount}`);

  if (dryRun) {
    const sample = records[0];
    console.log('\nFirst row preview:');
    for (const col of ['id', 'slug', 'site_status', 'event_name', 'organiser', 'poc', 'email',
      'event_start_date', 'partnership_status', 'source']) {
      console.log(`  ${col.padEnd(20)} ${String(sample[col] ?? '').slice(0, 90)}`);
    }
    console.log('\nDRY RUN — no DB writes');
    await closeDbConnection();
    return;
  }

  if (wipe) {
    await query('TRUNCATE TABLE partnership_events');
    console.log('Truncated partnership_events');
  }

  // Only write the columns the CSV actually carries (plus slug/site_status, which are always
  // reconstructed). A narrower export — e.g. one that deliberately omits `description` so a
  // cleaner copy already in the table survives — must not have its missing columns nulled out.
  const writeColumns = COLUMNS.filter(
    (c) => header.includes(c) || c === 'slug' || c === 'site_status'
  );
  const skipped = COLUMNS.filter((c) => !writeColumns.includes(c));
  if (skipped.length) {
    console.log(`Leaving untouched (absent from CSV): ${skipped.join(', ')}`);
  }

  const assignments = writeColumns.map((c) => `${c} = VALUES(${c})`).join(', ');
  const sql =
    `INSERT INTO partnership_events (${writeColumns.join(', ')}) ` +
    `VALUES (${writeColumns.map(() => '?').join(', ')}) ` +
    `ON DUPLICATE KEY UPDATE ${assignments}`;

  let imported = 0;
  for (const row of records) {
    const params = writeColumns.map((col) => normalise(col, row[col] ?? ''));
    try {
      await query(sql, params as (string | number | null)[]);
      imported++;
    } catch (err) {
      console.error(`Failed on id=${row.id} "${row.event_name}":`, (err as Error).message);
      throw err;
    }
  }

  const [{ total }] = await query<{ total: number }>(
    'SELECT COUNT(*) AS total FROM partnership_events'
  );
  console.log(`Imported ${imported} row(s). Table now holds ${total}.`);

  await closeDbConnection();
}

main().catch(async (err) => {
  console.error(err);
  await closeDbConnection();
  process.exit(1);
});
