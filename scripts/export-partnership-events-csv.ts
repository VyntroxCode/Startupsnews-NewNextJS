/**
 * Export every `partnership_events` row (Partnership Tracker) to CSV — a full-fidelity snapshot
 * used as the backup before destructive re-imports (see
 * scripts/sync-partnership-events-from-live.ts --wipe).
 *
 * Every column is exported, in schema order, so the file can be read back or diffed later.
 * Newlines inside description/venue_address are preserved (quoted), unlike the report-style CSV
 * exporters in this folder that flatten them.
 *
 * Usage: npx tsx scripts/export-partnership-events-csv.ts [--output=path.csv]
 */

import { loadEnvConfig } from '@next/env';
import { query, closeDbConnection } from '../src/shared/database/connection';
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

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const text = value instanceof Date
    ? value.toISOString()
    : typeof value === 'object'
      ? JSON.stringify(value)
      : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

async function main() {
  const outputArg = process.argv.find((arg) => arg.startsWith('--output='));
  const outputFile = outputArg?.split('=')[1]
    || `partnership-events-backup-${new Date().toISOString().slice(0, 10)}.csv`;
  const outputPath = path.isAbsolute(outputFile) ? outputFile : path.join(process.cwd(), outputFile);

  // query<T> is generic over the ROW, and returns T[] — passing Record<string, unknown>[] here
  // made rows an array OF arrays, so `row[c]` was indexing an array with a column name.
  const rows = await query<Record<string, unknown>>(
    `SELECT ${COLUMNS.join(', ')} FROM partnership_events ORDER BY id ASC`
  );

  const lines = [COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(COLUMNS.map((c) => escapeCsv(row[c])).join(','));
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `﻿${lines.join('\n')}\n`, 'utf8');

  console.log(`Exported ${rows.length} partnership_events row(s) -> ${outputPath}`);
  await closeDbConnection();
}

main().catch(async (err) => {
  console.error(err);
  await closeDbConnection();
  process.exit(1);
});
