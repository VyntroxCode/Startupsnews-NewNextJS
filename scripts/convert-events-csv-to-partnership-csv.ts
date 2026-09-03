/**
 * Convert an `events`-table CSV export into the DB-column CSV that
 * scripts/import-partnership-events-csv.ts consumes, so events rows missing from the Partnership
 * Tracker can be folded in.
 *
 * Written on 2026-09-02 to top up `partnership_events` (restored from an admin .xlsx, which only
 * carried the tracker's own 103 rows) with the public events the tracker had never held.
 *
 * Defaults for the tracker-only columns follow scripts/sync-partnership-events-from-live.ts, which
 * solves the same "an events row has no partnership record" problem by scraping instead:
 *   partnership_status  <- 'Only Listing'   (there is no partnership behind a listing-only event)
 *   source              <- SOURCE_LABEL, so these rows stay identifiable afterwards
 *   created_by/updated_by <- ACTOR
 * organiser, poc, contact, email, ticket_*, banner_*, social_* have no source here and stay NULL.
 *
 * Column mapping (events -> partnership_events):
 *   id           -> event_id     (the link back to the events row, NOT partnership_events.id)
 *   title        -> event_name
 *   slug         -> slug         (UNIQUE — the importer skips titles already present, but check
 *                                 --report output for slug collisions before importing)
 *   description  -> description
 *   location     -> city / country, split by COUNTRY_CITY_DATA (see splitLocation)
 *   event_date   -> event_start_date
 *   event_time   -> event_start_time
 *   image_url    -> poster_url
 *   external_url -> website
 *   status       -> site_status  (same vocabulary: draft/upcoming/completed/cancelled)
 *   created_at/updated_at -> carried across so the tracker shows the original dates
 * `excerpt` is dropped: partnership_events has no excerpt column (autoExcerpt derives one).
 *
 * Usage:
 *   npx tsx scripts/convert-events-csv-to-partnership-csv.ts --file=events.csv --out=out.csv
 *   npx tsx scripts/convert-events-csv-to-partnership-csv.ts --file=events.csv --out=out.csv --status=upcoming
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  COUNTRY_ISO2,
  canonicalCountryName,
  countryForCity,
  flagForCountry,
} from '../src/modules/partnership-events/domain/country-city-data';

const SOURCE_LABEL = 'events table export';
const ACTOR = 'events-csv-import';
const PARTNERSHIP_STATUS_DEFAULT = 'Only Listing';

const OUT_COLUMNS = [
  'event_id', 'slug', 'site_status', 'event_name', 'city', 'country', 'website',
  'event_start_date', 'event_start_time', 'description', 'poster_url',
  'partnership_status', 'last_updated_date', 'source', 'created_at', 'updated_at',
  'created_by', 'updated_by',
] as const;

/** RFC 4180 parser — same one as import-partnership-events-csv.ts. */
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

/**
 * `events.location` is the flattened `city || country` that partnershipEntityToStartupEvent
 * produces, so it can be either — or neither, for the non-geographic labels the listing uses
 * ("Online", "Cohort", "International Events", "Other Cities"). Put it back in the column it came
 * from, so /events regroups these rows into the sections they are already in.
 */
function splitLocation(location: string): { city: string; country: string } {
  const value = location.trim();
  if (!value) return { city: '', country: '' };

  const fromCity = countryForCity(value);
  if (fromCity) return { city: value, country: fromCity };

  // A bare country name: keep city empty rather than repeating the country into it, matching how
  // the sync script treats a detail location that just echoes its country. Tested against
  // COUNTRY_ISO2 (all 195 names) rather than COUNTRY_CITY_DATA, which is only the short curated
  // city map — checking that one drops every country without listed cities (Thailand, Egypt, ...).
  // flagForCountry covers the non-sovereign entries (Hong Kong, Macau, Taiwan, Kosovo) that are
  // absent from COUNTRY_ISO2 but do appear in saved records.
  const asCountry = canonicalCountryName(value);
  if (COUNTRY_ISO2[asCountry] !== undefined || flagForCountry(asCountry)) {
    return { city: '', country: asCountry };
  }

  // Unknown city, or a non-geographic label — city keeps it so the card still names it.
  return { city: value, country: '' };
}

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function main() {
  const fileArg = process.argv.find((a) => a.startsWith('--file='))?.slice('--file='.length);
  const outArg = process.argv.find((a) => a.startsWith('--out='))?.slice('--out='.length);
  const statusArg = process.argv.find((a) => a.startsWith('--status='))?.slice('--status='.length);

  if (!fileArg || !outArg) {
    console.error('Usage: --file=<events.csv> --out=<partnership.csv> [--status=upcoming]');
    process.exit(1);
  }

  const inputPath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  const outputPath = path.isAbsolute(outArg) ? outArg : path.join(process.cwd(), outArg);

  const grid = parseCsv(fs.readFileSync(inputPath, 'utf8').replace(/^﻿/, ''))
    .filter((r) => r.some((c) => c.trim() !== ''));
  if (grid.length < 2) {
    console.error('CSV has no data rows');
    process.exit(1);
  }

  const header = grid[0].map((h) => h.trim());
  for (const required of ['id', 'title', 'slug', 'location', 'event_date', 'status']) {
    if (!header.includes(required)) {
      console.error(`CSV is missing the "${required}" column — is this an events-table export?`);
      process.exit(1);
    }
  }

  const records = grid.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });

  const wanted = statusArg
    ? records.filter((r) => r.status.trim() === statusArg)
    : records;

  const today = new Date().toISOString().slice(0, 10);
  const lines = [OUT_COLUMNS.join(',')];
  const noCountry: string[] = [];
  let skipped = 0;

  for (const row of wanted) {
    if (!row.title.trim()) { skipped++; continue; }
    const { city, country } = splitLocation(row.location);
    if (!country) noCountry.push(row.location.trim() || '(empty)');

    const out: Record<string, string> = {
      event_id: row.id.trim(),
      slug: row.slug.trim(),
      site_status: row.status.trim(),
      event_name: row.title,
      city,
      country,
      website: row.external_url ?? '',
      event_start_date: row.event_date.trim(),
      event_start_time: (row.event_time ?? '').trim(),
      description: row.description ?? '',
      poster_url: (row.image_url ?? '').trim(),
      partnership_status: PARTNERSHIP_STATUS_DEFAULT,
      last_updated_date: today,
      source: SOURCE_LABEL,
      created_at: (row.created_at ?? '').trim(),
      updated_at: (row.updated_at ?? '').trim(),
      created_by: ACTOR,
      updated_by: ACTOR,
    };
    lines.push(OUT_COLUMNS.map((c) => csvEscape(out[c] ?? '')).join(','));
  }

  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

  console.log(`Read ${records.length} events row(s)` + (statusArg ? `, ${wanted.length} with status="${statusArg}"` : ''));
  if (skipped) console.log(`Skipped ${skipped} row(s) with an empty title`);
  console.log(`Wrote ${lines.length - 1} row(s) to ${outputPath}`);
  if (noCountry.length) {
    const tally = noCountry.reduce<Record<string, number>>((a, l) => { a[l] = (a[l] || 0) + 1; return a; }, {});
    console.log(`\n${noCountry.length} row(s) have no resolvable country (city keeps the label):`);
    Object.entries(tally).forEach(([label, n]) => console.log(`  ${label} × ${n}`));
  }
}

main();
