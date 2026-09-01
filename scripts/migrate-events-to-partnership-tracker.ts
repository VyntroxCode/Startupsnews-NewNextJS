/**
 * One-off: copy upcoming `events` rows into `partnership_events` (Partnership Tracker) so they
 * show up there too, linked back via event_id (same link column syncLinkedEvent uses in
 * src/modules/partnership-events/service/partnership-events.service.ts, just written in reverse).
 *
 * Scope: events.status = 'upcoming' AND event_date >= CURDATE() (matches
 * EventsRepository.findForPublicUpcoming's definition of "upcoming").
 * Dedup: skips any event that already has a partnership_events row with matching event_id, so
 * re-running this is safe and events added through the tracker's own Add/Edit flow (which already
 * auto-creates the linked event) are never duplicated.
 *
 * Field mapping (reverse of PartnershipEventsService.syncLinkedEvent):
 *   event_name            <- title
 *   city                  <- location
 *   country               <- country
 *   event_start_date      <- event_date
 *   event_end_date        <- event_end_date
 *   event_start_time      <- event_time
 *   event_end_time        <- event_end_time
 *   venue_address         <- venue_address
 *   google_location_link  <- google_location_link
 *   description           <- description
 *   speakers              <- speakers (EventSpeaker and Speaker have the same shape)
 *   poster_url            <- image_url
 *   website               <- external_url
 *   event_id              <- id (the link back)
 * Everything else (organiser, poc, contact, email, ticket_*, banner_*, social_*, etc.) has no
 * source in `events`, so it's left NULL for the admin to fill in.
 * partnership_status defaults to 'Only Listing' — chosen with the user because these events are
 * already live on the site with no partnership deal tracked, and leaving it blank would bucket
 * them as "Unmapped" and hide them from the tracker's default view.
 *
 * Usage: npx tsx scripts/migrate-events-to-partnership-tracker.ts [--dry-run]
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

const PARTNERSHIP_STATUS_DEFAULT = 'Only Listing';
const SOURCE_LABEL = 'Migrated from Events';
const ACTOR = 'events-migration-script';

interface EventRow {
  id: number;
  title: string;
  location: string;
  country: string | null;
  event_date: string;
  event_end_date: string | null;
  event_time: string | null;
  event_end_time: string | null;
  venue_address: string | null;
  google_location_link: string | null;
  description: string | null;
  speakers: string | null;
  image_url: string | null;
  external_url: string | null;
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
      `SELECT id, title, location, country, event_date, event_end_date, event_time, event_end_time,
              venue_address, google_location_link, description, speakers, image_url, external_url
       FROM events
       WHERE status = 'upcoming' AND event_date >= CURDATE()
       ORDER BY event_date ASC`
    );
    console.log(`Found ${events.length} upcoming event(s) in 'events'.`);

    const alreadyLinkedRows = await conn.query<{ event_id: number }[]>(
      `SELECT event_id FROM partnership_events WHERE event_id IS NOT NULL`
    );
    const alreadyLinked = new Set(alreadyLinkedRows.map((r) => Number(r.event_id)));

    let migrated = 0;
    let skipped = 0;

    for (const e of events) {
      if (alreadyLinked.has(e.id)) {
        skipped++;
        console.log(`  skip [${e.id}] "${e.title}" — already linked in partnership_events`);
        continue;
      }

      console.log(`  migrate [${e.id}] "${e.title}" (${e.event_date}, ${e.location})`);
      if (dryRun) {
        migrated++;
        continue;
      }

      await conn.query(
        `INSERT INTO partnership_events (
           event_id, event_name, city, country,
           event_start_date, event_start_time, event_end_date, event_end_time,
           venue_address, google_location_link, description, speakers,
           poster_url, website,
           partnership_status, source, created_by, updated_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          e.id,
          e.title,
          e.location || null,
          e.country || null,
          e.event_date,
          e.event_time || null,
          e.event_end_date || null,
          e.event_end_time || null,
          e.venue_address || null,
          e.google_location_link || null,
          e.description || null,
          e.speakers || JSON.stringify([]),
          e.image_url || null,
          e.external_url || null,
          PARTNERSHIP_STATUS_DEFAULT,
          SOURCE_LABEL,
          ACTOR,
          ACTOR,
        ]
      );
      migrated++;
    }

    console.log(`\nDone. ${migrated} migrated, ${skipped} skipped (already linked).`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
