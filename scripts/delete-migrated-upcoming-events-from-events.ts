/**
 * One-off, run once after migrate-events-to-partnership-tracker.ts has covered every upcoming
 * event: removes the `events` rows for upcoming events that now have a matching partnership_events
 * row, since the user wants Partnership Tracker to be the sole home for these going forward.
 *
 * WARNING: `events` is what actually renders the public /events listing and /events/[slug] pages —
 * deleting a row here takes that event off the live site (404) and blanks the description/date/time
 * fallback data Partnership Tracker reads from the linked event for rows that don't store their own
 * copy of that data. This was confirmed with the user before running.
 *
 * Safety:
 *   - Only deletes events that have a matching partnership_events row (event_id link or exact
 *     title match) — never deletes an upcoming event with no tracker counterpart.
 *   - Backs up the full row for every deleted event to db-backups/ as an INSERT-statement .sql
 *     file, so this is reversible.
 *   - Nulls partnership_events.event_id for every affected row first, so no tracker row is left
 *     pointing at a deleted event (which would otherwise silently show blank "linked event" data
 *     without ever refreshing per PartnershipEventsService.getLinkedEventSummaries' self-heal logic
 *     only re-adopting when event_id is unset, not when it's stale).
 *
 * Usage: npx tsx scripts/delete-migrated-upcoming-events-from-events.ts [--dry-run]
 */

import mariadb from 'mariadb';
import { loadEnvConfig } from '@next/env';
import fs from 'fs';
import path from 'path';

loadEnvConfig(process.cwd());

const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'zox_db',
  dateStrings: true as const,
};

interface EventRow {
  [key: string]: unknown;
  id: number;
  title: string;
}

function sqlEscape(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) console.log('DRY RUN – no DB writes');

  if (!DB.user || !DB.password) {
    console.error('Missing DB_USER/DB_PASSWORD in .env.local');
    process.exit(1);
  }

  const conn = await mariadb.createConnection(DB);
  try {
    const events = await conn.query<EventRow[]>(
      `SELECT * FROM events WHERE status = 'upcoming' AND event_date >= CURDATE() ORDER BY id ASC`
    );
    console.log(`Found ${events.length} upcoming event(s) in 'events'.`);

    const partnerRows = await conn.query<{ id: number; event_id: number | null; event_name: string }[]>(
      `SELECT id, event_id, event_name FROM partnership_events`
    );
    const byEventId = new Map<number, number>(); // events.id -> partnership_events.id
    const byTitle = new Map<string, number>(); // normalized title -> partnership_events.id
    for (const p of partnerRows) {
      if (p.event_id) byEventId.set(p.event_id, p.id);
      byTitle.set(p.event_name.trim().toLowerCase(), p.id);
    }

    const toDelete: EventRow[] = [];
    const skipped: EventRow[] = [];
    for (const e of events) {
      const matched = byEventId.has(e.id) || byTitle.has(e.title.trim().toLowerCase());
      if (matched) toDelete.push(e);
      else skipped.push(e);
    }

    console.log(`${toDelete.length} matched to a partnership_events row (will delete).`);
    if (skipped.length) {
      console.log(`${skipped.length} have NO matching partnership_events row (will be kept, not deleted):`);
      for (const e of skipped) console.log(`  keep [${e.id}] "${e.title}"`);
    }

    if (!toDelete.length) {
      console.log('Nothing to delete.');
      return;
    }

    const ids = toDelete.map((e) => e.id);

    // Backup: full row data as INSERT statements, so this is reversible.
    const backupDir = path.join(process.cwd(), '..', 'db-backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `events_predelete_backup_${ts}.sql`);
    const columns = Object.keys(toDelete[0]);
    const lines = toDelete.map((row) => {
      const values = columns.map((c) => sqlEscape(row[c]));
      return `INSERT INTO events (${columns.join(', ')}) VALUES (${values.join(', ')});`;
    });
    fs.writeFileSync(backupFile, lines.join('\n') + '\n');
    console.log(`Backed up ${toDelete.length} row(s) to ${backupFile}`);

    if (dryRun) {
      console.log(`\nDRY RUN — would null event_id on ${ids.length} partnership_events row(s), then delete ${ids.length} events row(s):`);
      for (const e of toDelete) console.log(`  delete [${e.id}] "${e.title}"`);
      return;
    }

    const placeholders = ids.map(() => '?').join(',');
    const nullResult = await conn.query(
      `UPDATE partnership_events SET event_id = NULL WHERE event_id IN (${placeholders})`,
      ids
    );
    console.log(`Nulled event_id on ${(nullResult as { affectedRows?: number }).affectedRows ?? 0} partnership_events row(s).`);

    const delResult = await conn.query(`DELETE FROM events WHERE id IN (${placeholders})`, ids);
    console.log(`Deleted ${(delResult as { affectedRows?: number }).affectedRows ?? 0} row(s) from events.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
