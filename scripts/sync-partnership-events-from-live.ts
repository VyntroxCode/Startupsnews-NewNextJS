/**
 * Rebuild the Partnership Tracker (`partnership_events`) from the live public site.
 *
 * Scrapes https://startupnews.fyi/events for the country -> city -> event grouping, then each
 * /startup-events/<slug> detail page for the event's own content, and writes the result back into
 * `partnership_events` — which is the direct public source for /events on this deployment (see
 * src/modules/partnership-events/utils/public-event.utils.ts).
 *
 * Why scrape: prod and this checkout run separate databases. The rows here were migrated before
 * descriptions/posters existed, so /events on dev.startupgpt.fyi falls back to the Unsplash
 * placeholder (DEFAULT_EVENT_IMAGE) and renders no description.
 *
 * Field mapping (live -> partnership_events). Selectors come from
 * src/app/startup-events/[slug]/page.tsx and src/app/events/page.tsx, so they track the markup:
 *   event_name           <- <h2 class="event-detail-title">
 *   description          <- innerHTML of <div class="event-detail-description">   (full HTML —
 *                           NOT the 160-char og:description)
 *   poster_url           <- <meta property="og:image">   (images.startupnews.fyi CDN, already an
 *                           allowed remotePattern in next.config.ts, so no re-upload is needed)
 *   country              <- <h2 class="event-by-country-region"> on the listing
 *   city                 <- <h2 class="events-carousel-title"> on the listing, else the detail
 *                           page's .event-detail-location when it differs from the country
 *                           (mirrors `location: city || country` in partnershipEntityToStartupEvent,
 *                           so the rebuilt rows regroup into the same sections)
 *   event_start/end_date <- .event-detail-date  ("2 September - 4 September 2026")
 *   event_start/end_time <- .event-detail-time
 *   venue_address        <- .event-detail-venue-address-link / -inline
 *   google_location_link <- href of .event-detail-venue-address-link
 *   speakers             <- .event-detail-speaker-card blocks (name/designation/company/others)
 *   website              <- href of .event-detail-book-btn ("Book Now" / registration link)
 *   site_status          <- 'upcoming' (everything on the public listing is published)
 * Tracker-only columns (organiser, poc, contact, email, ticket_*, banner_*, social_*, comment)
 * have no public source and are left NULL for an admin to fill in.
 *
 * Usage:
 *   npx tsx scripts/sync-partnership-events-from-live.ts --dry-run
 *   npx tsx scripts/sync-partnership-events-from-live.ts --wipe     # DELETE all rows, then import
 *   npx tsx scripts/sync-partnership-events-from-live.ts            # upsert by slug, no deletes
 *   npx tsx scripts/sync-partnership-events-from-live.ts --limit=5 --dry-run
 *
 * Back the table up first with: npx tsx scripts/export-partnership-events-csv.ts
 */

import mariadb from 'mariadb';
import { loadEnvConfig } from '@next/env';
import { deleteCacheByPrefix } from '../src/shared/cache/redis.client';

loadEnvConfig(process.cwd());

const LIVE_ORIGIN = 'https://startupnews.fyi';
const LISTING_URL = `${LIVE_ORIGIN}/events`;
const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const FETCH_DELAY_MS = 250;
const CONCURRENCY = 5;
const ACTOR = 'live-events-sync';
const SOURCE_LABEL = 'Scraped from live site';
const PARTNERSHIP_STATUS_DEFAULT = 'Only Listing';

const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'zox_db',
  dateStrings: true as const,
};

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** Drop <script>/<style> so the RSC flight payload — which repeats every class name inside escaped
 *  JSON — can never be mistaken for the rendered markup. */
function renderedMarkup(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '');
}

/** innerHTML of the first element carrying `className`, tracking nesting so rich-text <div>s
 *  inside a description don't truncate it at the wrong closing tag. */
function extractElementHtml(html: string, className: string, tag = 'div', from = 0): string | null {
  const open = new RegExp(`<${tag}\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, 'i');
  const slice = html.slice(from);
  const start = slice.match(open);
  if (!start || start.index === undefined) return null;

  const contentStart = from + start.index + start[0].length;
  const boundary = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'gi');
  boundary.lastIndex = contentStart;

  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = boundary.exec(html)) !== null) {
    if (m[0].startsWith('</')) {
      if (--depth === 0) return html.slice(contentStart, m.index).trim() || null;
    } else {
      depth++;
    }
  }
  return null;
}

function extractText(html: string, className: string, tag = 'span'): string | null {
  const inner = extractElementHtml(html, className, tag);
  return inner ? stripTags(inner) || null : null;
}

function extractAnchor(html: string, className: string): { href: string; text: string } | null {
  const re = new RegExp(`<a\\b([^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*)>([\\s\\S]*?)</a>`, 'i');
  const m = html.match(re);
  if (!m) return null;
  const href = m[1].match(/href="([^"]*)"/i)?.[1];
  if (!href) return null;
  return { href: decodeEntities(href), text: stripTags(m[2]) };
}

function extractOgImage(html: string): string | null {
  const url = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)?.[1];
  const decoded = url ? decodeEntities(url.trim()) : null;
  return decoded && decoded.startsWith('http') ? decoded : null;
}

/** "2 September - 4 September 2026" / "17 September 2026" -> YYYY-MM-DD start + optional end. */
function parseDateRange(text: string): { start: string; end: string | null } | null {
  const year = text.match(/\b(20\d{2})\b/)?.[1];
  if (!year) return null;
  const dates = [...text.matchAll(/(\d{1,2})\s+([A-Za-z]+)/g)]
    .map((m) => {
      const month = MONTHS[m[2].toLowerCase()];
      return month ? `${year}-${String(month).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
    })
    .filter((d): d is string => d !== null);
  if (dates.length === 0) return null;
  return { start: dates[0], end: dates.length > 1 && dates[1] !== dates[0] ? dates[1] : null };
}

interface Speaker { name: string; designation: string; company: string; others: string }

function extractSpeakers(html: string): Speaker[] {
  const section = extractElementHtml(html, 'event-detail-speakers-row');
  if (!section) return [];
  const speakers: Speaker[] = [];
  const cardOpen = /<div\b[^>]*class="[^"]*\bevent-detail-speaker-card\b[^"]*"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = cardOpen.exec(section)) !== null) {
    const card = extractElementHtml(section, 'event-detail-speaker-card', 'div', m.index);
    if (!card) continue;
    const name = extractText(card, 'event-detail-speaker-name', 'div');
    if (!name) continue;
    speakers.push({
      name,
      designation: extractText(card, 'event-detail-speaker-designation', 'div') || '',
      company: extractText(card, 'event-detail-speaker-company', 'div') || '',
      others: extractText(card, 'event-detail-speaker-others', 'div') || '',
    });
  }
  return speakers;
}

async function fetchHtml(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) return await res.text();
      if (res.status === 404 || res.status === 410) return null;
    } catch {
      // fall through to retry
    }
    await sleep(500 * (attempt + 1));
  }
  return null;
}

interface ListingEntry { slug: string; country: string | null; city: string | null }

/**
 * Walk the listing markup in document order, carrying the most recent country heading and carousel
 * title down onto the event links beneath them. A carousel with no title means the section IS the
 * country (or a non-geographic label like "Online"), which is why city stays null there.
 */
async function scrapeListing(): Promise<ListingEntry[]> {
  const html = await fetchHtml(LISTING_URL);
  if (!html) throw new Error(`Could not fetch ${LISTING_URL}`);
  const body = renderedMarkup(html);

  const token = /<h2[^>]*class="[^"]*\bevent-by-country-region\b[^"]*"[^>]*>([\s\S]*?)<\/h2>|<h2[^>]*class="[^"]*\bevents-carousel-title\b[^"]*"[^>]*>([\s\S]*?)<\/h2>|href="(?:https:\/\/startupnews\.fyi)?\/startup-events\/([^"?#]+?)\/?"/gi;

  const bySlug = new Map<string, ListingEntry>();
  let country: string | null = null;
  let city: string | null = null;
  let m: RegExpExecArray | null;

  while ((m = token.exec(body)) !== null) {
    if (m[1] !== undefined) {
      country = stripTags(m[1]) || null;
      city = null;
    } else if (m[2] !== undefined) {
      city = stripTags(m[2]) || null;
    } else if (m[3]) {
      const existing = bySlug.get(m[3]);
      // Links above the first heading (e.g. a featured card) have no country; a later, properly
      // sectioned occurrence of the same slug wins.
      if (!existing || (!existing.country && country)) {
        bySlug.set(m[3], { slug: m[3], country, city });
      }
    }
  }
  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

interface ScrapedEvent extends ListingEntry {
  url: string;
  title: string | null;
  description: string | null;
  posterUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime: string | null;
  endTime: string | null;
  venueAddress: string | null;
  googleLocationLink: string | null;
  website: string | null;
  speakers: Speaker[];
}

async function scrapeEvent(entry: ListingEntry): Promise<ScrapedEvent | null> {
  const url = `${LIVE_ORIGIN}/startup-events/${entry.slug}`;
  const html = await fetchHtml(url);
  if (!html) return null;
  const body = renderedMarkup(html);

  const range = parseDateRange(extractText(body, 'event-detail-date') || '');
  const timeText = extractText(body, 'event-detail-time');
  const [startTime, endTime] = (timeText || '').split(/\s*-\s*/);
  const detailLocation = extractText(body, 'event-detail-location');
  const venueLink = extractAnchor(body, 'event-detail-venue-address-link');
  const bookLink = extractAnchor(body, 'event-detail-book-btn');

  // The card's location is `city || country`, so when the listing gave no city we can recover one
  // here — unless it just repeats the country, which means the source row had no city at all.
  const city = entry.city
    || (detailLocation && detailLocation !== entry.country ? detailLocation : null);

  return {
    ...entry,
    city,
    url,
    title: extractText(body, 'event-detail-title', 'h2'),
    description: extractElementHtml(body, 'event-detail-description'),
    posterUrl: extractOgImage(html),
    startDate: range?.start ?? null,
    endDate: range?.end ?? null,
    startTime: startTime?.trim() || null,
    endTime: endTime?.trim() || null,
    venueAddress: venueLink?.text || extractText(body, 'event-detail-venue-address-inline') || null,
    googleLocationLink: venueLink?.href || null,
    website: bookLink?.href || null,
    speakers: extractSpeakers(body),
  };
}

/** Scrape a few pages at a time so a 93-page crawl isn't 93 sequential round-trips. */
async function scrapeAll(entries: ListingEntry[]): Promise<ScrapedEvent[]> {
  const out: ScrapedEvent[] = [];
  let done = 0;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((e) => scrapeEvent(e)));
    for (const r of results) if (r) out.push(r);
    done += batch.length;
    process.stdout.write(`\r  scraped ${done}/${entries.length}`);
    if (i + CONCURRENCY < entries.length) await sleep(FETCH_DELAY_MS);
  }
  process.stdout.write('\n');
  return out;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const wipe = process.argv.includes('--wipe');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;

  if (dryRun) console.log('DRY RUN — no DB writes\n');
  if (!DB.user || !DB.password) {
    console.error('Missing DB_USER/DB_PASSWORD in .env.local');
    process.exit(1);
  }

  let entries = await scrapeListing();
  console.log(`Found ${entries.length} events on ${LISTING_URL}`);
  if (limit && limit > 0) entries = entries.slice(0, limit);

  const scraped = await scrapeAll(entries);
  const usable = scraped.filter((e) => e.title && e.startDate);
  const rejected = scraped.filter((e) => !e.title || !e.startDate);

  console.log(
    `Scraped ${scraped.length} detail pages: `
    + `${scraped.filter((e) => e.description).length} with description, `
    + `${scraped.filter((e) => e.posterUrl).length} with poster, `
    + `${scraped.filter((e) => e.venueAddress).length} with venue, `
    + `${scraped.filter((e) => e.speakers.length).length} with speakers`
  );
  if (rejected.length) {
    console.log(`\n${rejected.length} page(s) skipped — missing a title or a parseable date:`);
    for (const e of rejected) console.log(`  ${e.slug} (title=${!!e.title}, date=${!!e.startDate})`);
  }
  if (usable.length === 0) {
    console.error('\nNothing usable scraped — refusing to touch the table.');
    process.exit(1);
  }

  const conn = await mariadb.createConnection(DB);
  try {
    if (wipe) {
      const [{ n }] = await conn.query<{ n: number }[]>('SELECT COUNT(*) n FROM partnership_events');
      console.log(`\n${dryRun ? 'Would delete' : 'Deleting'} all ${n} existing partnership_events row(s)`);
      if (!dryRun) {
        await conn.query('DELETE FROM partnership_events');
        await conn.query('ALTER TABLE partnership_events AUTO_INCREMENT = 1');
      }
    }

    const insertSql = `
      INSERT INTO partnership_events (
        slug, site_status, event_name, city, country,
        event_start_date, event_start_time, event_end_date, event_end_time,
        venue_address, google_location_link, description, speakers,
        poster_url, website, partnership_status, source,
        last_updated_date, created_by, updated_by
      ) VALUES (?, 'upcoming', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)
      ON DUPLICATE KEY UPDATE
        event_name = VALUES(event_name),
        city = VALUES(city),
        country = VALUES(country),
        event_start_date = VALUES(event_start_date),
        event_end_date = VALUES(event_end_date),
        venue_address = COALESCE(VALUES(venue_address), venue_address),
        google_location_link = COALESCE(VALUES(google_location_link), google_location_link),
        description = COALESCE(VALUES(description), description),
        poster_url = COALESCE(VALUES(poster_url), poster_url),
        website = COALESCE(VALUES(website), website),
        last_updated_date = CURDATE(),
        updated_by = VALUES(updated_by)
    `;

    let written = 0;
    for (const e of usable) {
      if (!dryRun) {
        await conn.query(insertSql, [
          e.slug.slice(0, 255),
          (e.title as string).slice(0, 500),
          e.city?.slice(0, 255) || null,
          e.country?.slice(0, 255) || null,
          e.startDate,
          e.startTime,
          e.endDate,
          e.endTime,
          e.venueAddress || null,
          e.googleLocationLink?.slice(0, 500) || null,
          e.description || null,
          JSON.stringify(e.speakers),
          e.posterUrl?.slice(0, 500) || null,
          e.website?.slice(0, 500) || null,
          PARTNERSHIP_STATUS_DEFAULT,
          SOURCE_LABEL,
          ACTOR,
          ACTOR,
        ]);
      }
      written++;
    }

    console.log(`\n${dryRun ? 'Would import' : 'Imported'} ${written} event(s) into partnership_events`);

    if (!dryRun && written > 0) {
      await Promise.all([
        deleteCacheByPrefix('events:all:'),
        deleteCacheByPrefix('events:by-region:'),
        deleteCacheByPrefix('events:public:'),
        deleteCacheByPrefix('partnership-events:'),
      ]);
      console.log('Cleared event caches');
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
