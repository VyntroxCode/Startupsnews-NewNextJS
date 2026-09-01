/**
 * One-off: populate the new partnership_events.slug / site_status columns (see
 * scripts/migrations/add-partnership-events-public-fields.sql) for all existing rows, now that
 * partnership_events is the direct public read source for /events, /startup-events/:slug, the
 * sidebar widget, sitemap and newsletter — instead of a downstream copy in `events`.
 *
 * Three tiers, in priority order:
 *  1. Rows with event_id pointing at a still-live `events` row: copy that row's slug/status
 *     exactly, so already-public, already-indexed URLs don't move.
 *  2. Rows with no event_id, matched by normalized title against `events_backup_tmp` (loaded
 *     from db-backups/events_predelete_backup_*.sql — the 94 rows scripts/delete-migrated-
 *     upcoming-events-from-events.ts removed from `events` earlier today after nulling their
 *     event_id): recover the original slug from the backup and set site_status='upcoming'
 *     (all 94 were status='upcoming' at deletion time), un-404ing them under their exact
 *     original URL. Requires events_backup_tmp to exist — see the mysql/sed commands in the
 *     accompanying investigation, not re-derived here since it's a one-time load.
 *  3. Everything else: generate a fresh unique slug from event_name (same algorithm as
 *     PartnershipEventsService.resolveSlug), and default site_status by:
 *       - source = 'Public Submission' with no prior review -> 'draft' (preserves the implicit
 *         admin-approval gate these have always had — see PartnershipEventsService.syncLinkedEvent's
 *         gate on input.region/siteStatus, which these rows never went through)
 *       - partnership_status = 'Cancelled' -> 'cancelled'
 *       - partnership_status = 'Expired' -> 'completed'
 *       - else: no event_start_date -> 'draft'; future date -> 'upcoming'; past date -> 'completed'
 *
 * Usage: npx tsx scripts/backfill-partnership-events-public-fields.ts [--dry-run]
 */

import mariadb from 'mariadb';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'zox_db',
  dateStrings: true as const,
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

interface PeRow {
  id: number;
  event_id: number | null;
  event_name: string;
  event_start_date: string | null;
  partnership_status: string | null;
  source: string | null;
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
    const backupTableExists = await conn.query<{ cnt: number }[]>(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events_backup_tmp'`
    );
    const hasBackupTable = Number(backupTableExists[0]?.cnt || 0) > 0;
    if (!hasBackupTable) {
      console.warn('events_backup_tmp not found — tier 2 (recovered slugs for deleted events) will be skipped.');
    }

    // Tier 1: linked to a still-live events row.
    const tier1 = await conn.query(
      `UPDATE partnership_events pe
       JOIN events e ON e.id = pe.event_id
       SET pe.slug = e.slug, pe.site_status = e.status
       WHERE pe.slug IS NULL AND pe.event_id IS NOT NULL`
    );
    console.log(`Tier 1 (linked to live events row): ${(tier1 as { affectedRows?: number }).affectedRows ?? 0} row(s).`);

    // Tier 2: recovered from the pre-delete backup by normalized title match.
    if (hasBackupTable) {
      const tier2 = await conn.query(
        `UPDATE partnership_events pe
         JOIN events_backup_tmp b ON LOWER(TRIM(b.title)) = LOWER(TRIM(pe.event_name))
         SET pe.slug = b.slug, pe.site_status = 'upcoming'
         WHERE pe.slug IS NULL AND pe.event_id IS NULL`
      );
      console.log(`Tier 2 (recovered from pre-delete backup): ${(tier2 as { affectedRows?: number }).affectedRows ?? 0} row(s).`);
    }

    // Tier 3: everything still unslugged — generate fresh, dedupe against existing slugs
    // (including ones just written above by tiers 1/2, and ones assigned earlier in this loop).
    const remaining = await conn.query<PeRow[]>(
      `SELECT id, event_id, event_name, event_start_date, partnership_status, source
       FROM partnership_events WHERE slug IS NULL ORDER BY id ASC`
    );
    console.log(`Tier 3 (generating fresh slugs): ${remaining.length} row(s).`);

    const existingSlugs = new Set(
      (await conn.query<{ slug: string }[]>(`SELECT slug FROM partnership_events WHERE slug IS NOT NULL`)).map((r) => r.slug)
    );

    const today = new Date().toISOString().slice(0, 10);
    let tier3Draft = 0, tier3Upcoming = 0, tier3Completed = 0, tier3Cancelled = 0;

    for (const row of remaining) {
      const base = slugify(row.event_name) || `event-${row.id}`;
      let candidate = base;
      let counter = 1;
      while (existingSlugs.has(candidate)) {
        candidate = `${base}-${counter}`;
        counter++;
      }
      existingSlugs.add(candidate);

      let siteStatus: 'draft' | 'upcoming' | 'completed' | 'cancelled';
      if (row.source === 'Public Submission') {
        siteStatus = 'draft';
        tier3Draft++;
      } else if (row.partnership_status === 'Cancelled') {
        siteStatus = 'cancelled';
        tier3Cancelled++;
      } else if (row.partnership_status === 'Expired') {
        siteStatus = 'completed';
        tier3Completed++;
      } else if (!row.event_start_date) {
        siteStatus = 'draft';
        tier3Draft++;
      } else if (row.event_start_date >= today) {
        siteStatus = 'upcoming';
        tier3Upcoming++;
      } else {
        siteStatus = 'completed';
        tier3Completed++;
      }

      if (!dryRun) {
        await conn.query(`UPDATE partnership_events SET slug = ?, site_status = ? WHERE id = ?`, [candidate, siteStatus, row.id]);
      }
    }
    console.log(`Tier 3 breakdown: draft=${tier3Draft} upcoming=${tier3Upcoming} completed=${tier3Completed} cancelled=${tier3Cancelled}`);

    if (!dryRun) {
      const [{ total }] = await conn.query<{ total: number }[]>(`SELECT COUNT(*) AS total FROM partnership_events WHERE slug IS NULL`);
      console.log(`Remaining rows with NULL slug after backfill: ${total}`);
      const statusCounts = await conn.query<{ site_status: string; cnt: number }[]>(
        `SELECT site_status, COUNT(*) AS cnt FROM partnership_events GROUP BY site_status`
      );
      console.log('Final site_status distribution:', statusCounts);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
