/**
 * Convert an admin "Export to Excel" .xlsx from the Partnership Tracker into the DB-column CSV
 * that scripts/import-partnership-events-csv.ts consumes.
 *
 * The admin export (downloadEventsExcel in src/app/(admin)/admin/partnership-tracker/page.tsx)
 * writes human-readable headers, not DB column names, and flattens two JSON columns to text.
 * This script reverses that so the tested importer can do the actual DB write.
 *
 * Known-lossy points, all unavoidable because the export never carried them:
 *   id, event_id, banner_id, banner_active, source, created_at/updated_at, created_by/updated_by
 *     -> not exported at all. Rows get fresh AUTO_INCREMENT ids; banner_active takes its
 *        column default (1) and the timestamps default to now.
 *   speakers      -> exported as "Name, Designation, Company, Others | ..." by speakersExportText,
 *                    which is not reversible when a field itself contains a comma. Split on ", "
 *                    and fill positionally; 5+ parts fold the tail into `others`.
 *   social_creatives -> "LinkedIn: <url> | ..."; reversed via SOCIAL_CREATIVE_PLATFORM_LABELS.
 *
 * "Website Region" is dropped: in the pre-a26f573 export it held the linked events-row location,
 * which is not a partnership_events column (`city` already carries it).
 *
 * "Website Listing Status" from that same older build reads "Not listed yet" for records with no
 * linked public event. Those are emitted with an empty site_status so the importer's
 * deriveSiteStatus classifies them, rather than being guessed as published here.
 *
 * Usage:
 *   npx tsx scripts/convert-partnership-xlsx-to-csv.ts --file=export.xlsx --out=export.csv
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { SOCIAL_CREATIVE_PLATFORM_LABELS } from '../src/modules/partnership-events/domain/types';

/** Sheet header -> partnership_events column. Mirrors STANDARD_HEADERS + EXPORT_EXTRA_HEADERS. */
const HEADER_TO_COLUMN: Record<string, string> = {
  'Name of the event': 'event_name',
  City: 'city',
  Country: 'country',
  'Organiser/Company Name': 'organiser',
  'POC - Name': 'poc',
  'Contact No.': 'contact',
  'Email ID': 'email',
  'Website Link': 'website',
  'Email Thread': 'email_thread',
  'Initiated date': 'initiated_date',
  'Event Start Date': 'event_start_date',
  'Event End Date': 'event_end_date',
  'Partnership Status': 'partnership_status',
  'Partnership Type (Domestic or International)': 'partnership_type',
  'Last Updated Date': 'last_updated_date',
  comment: 'comment',
  'Listing (Yes/In process/No)': 'listing',
  'Listing link (if yes)': 'listing_link',
  'Event Start Time': 'event_start_time',
  'Event End Time': 'event_end_time',
  'Venue Address': 'venue_address',
  'Google Location Link': 'google_location_link',
  'Event Description': 'description',
  'Event Type': 'event_type',
  'Ticket Currency': 'ticket_currency',
  'Ticket Starts From': 'ticket_price',
  'Key Speakers/Guests': 'speakers',
  'Event Poster Link': 'poster_url',
  'Event Banner Link': 'banner_url',
  'Banner Start Date': 'banner_start_date',
  'Social Media Post Content': 'social_media_posts',
  'Social Media Creative Link': 'social_creatives',
  'Website Event Link': 'slug',
  'Website Listing Status': 'site_status',
};

/** Derived-on-export column with no DB counterpart — see the header comment. */
const IGNORED_HEADERS = new Set(['Website Region']);

/** Reverse of SITE_STATUS_BADGE's label lookup. "Not listed yet" has no site_status to restore. */
const LABEL_TO_SITE_STATUS: Record<string, string> = {
  Draft: 'draft',
  Published: 'upcoming',
  Completed: 'completed',
  Cancelled: 'cancelled',
  'Not listed yet': '',
};

const LABEL_TO_PLATFORM = Object.fromEntries(
  Object.entries(SOCIAL_CREATIVE_PLATFORM_LABELS).map(([key, label]) => [label, key])
);

/** Reverse speakersExportText. Positional and best-effort — see the header comment. */
function parseSpeakers(text: string): string {
  const entries = text.split(' | ').map((s) => s.trim()).filter(Boolean);
  if (!entries.length) return '';

  const speakers = entries.map((entry) => {
    const parts = entry.split(', ').map((p) => p.trim());
    return {
      name: parts[0] || '',
      designation: parts[1] || '',
      company: parts[2] || '',
      others: parts.slice(3).join(', '),
    };
  });
  return JSON.stringify(speakers);
}

/** Reverse creativesExportText. The URL never contains " | ", so the split is safe. */
function parseCreatives(text: string): string {
  const entries = text.split(' | ').map((s) => s.trim()).filter(Boolean);
  if (!entries.length) return '';

  const creatives = entries.map((entry) => {
    const separator = entry.indexOf(': ');
    if (separator === -1) return { platform: 'other', image: entry };
    const label = entry.slice(0, separator);
    return { platform: LABEL_TO_PLATFORM[label] || 'other', image: entry.slice(separator + 2) };
  });
  return JSON.stringify(creatives);
}

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function main() {
  const fileArg = process.argv.find((a) => a.startsWith('--file='))?.slice('--file='.length);
  const outArg = process.argv.find((a) => a.startsWith('--out='))?.slice('--out='.length);

  if (!fileArg || !outArg) {
    console.error('Usage: --file=<path-to-xlsx> --out=<path-to-csv>');
    process.exit(1);
  }

  const inputPath = path.isAbsolute(fileArg) ? fileArg : path.join(process.cwd(), fileArg);
  const outputPath = path.isAbsolute(outArg) ? outArg : path.join(process.cwd(), outArg);

  const workbook = XLSX.readFile(inputPath, { raw: false });
  const sheetName = workbook.SheetNames[0];
  const grid = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: '',
  });

  if (grid.length < 2) {
    console.error(`Sheet "${sheetName}" has no data rows`);
    process.exit(1);
  }

  const sheetHeader = grid[0].map((h) => String(h).trim());
  const unknown = sheetHeader.filter((h) => h && !HEADER_TO_COLUMN[h] && !IGNORED_HEADERS.has(h));
  if (unknown.length) {
    console.error(`Unrecognised sheet column(s): ${unknown.join(', ')}`);
    process.exit(1);
  }

  // Emit only the columns this sheet actually carries — the importer leaves the rest alone.
  const outColumns = sheetHeader
    .filter((h) => HEADER_TO_COLUMN[h])
    .map((h) => HEADER_TO_COLUMN[h]);

  const lines = [outColumns.join(',')];
  let unlisted = 0;

  for (const cells of grid.slice(1)) {
    const record: Record<string, string> = {};

    sheetHeader.forEach((header, i) => {
      const column = HEADER_TO_COLUMN[header];
      if (!column) return;
      const raw = String(cells[i] ?? '');

      if (column === 'speakers') record[column] = parseSpeakers(raw.trim());
      else if (column === 'social_creatives') record[column] = parseCreatives(raw.trim());
      else if (column === 'slug') record[column] = raw.match(/\/startup-events\/([^/\s?#]+)/)?.[1] ?? '';
      else if (column === 'site_status') {
        const label = raw.trim();
        if (label === 'Not listed yet') unlisted++;
        record[column] = LABEL_TO_SITE_STATUS[label] ?? '';
      } else record[column] = raw;
    });

    if (!record.event_name?.trim()) continue;
    lines.push(outColumns.map((c) => csvEscape(record[c] ?? '')).join(','));
  }

  fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

  console.log(`Sheet "${sheetName}": ${grid.length - 1} row(s) in, ${lines.length - 1} written`);
  console.log(`Columns: ${outColumns.length} (dropped: ${sheetHeader.filter((h) => IGNORED_HEADERS.has(h)).join(', ') || 'none'})`);
  if (unlisted) console.log(`${unlisted} row(s) had "Not listed yet" — site_status left for the importer to derive`);
  console.log(`Wrote ${outputPath}`);
}

main();
