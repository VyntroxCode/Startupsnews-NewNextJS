/**
 * Fetch events from https://startupnews.fyi/startup-events/, parse HTML.
 * For each event fetch its detail page to get og:image (banner) and description;
 * upload banner to S3, then clear events table and insert all.
 *
 * Requires .env.local: DB_*, AWS_* (for S3), S3_BUCKET, S3_IMAGE_BASE_URL (or NEXT_PUBLIC_IMAGE_BASE_URL).
 *
 * Usage: npx tsx scripts/sync-events-from-startupnews.ts [--dry-run] [--limit N]
 */

import mariadb from 'mariadb';
import { loadEnvConfig } from '@next/env';
import { deleteCacheByPrefix } from '../src/shared/cache/redis.client';
import {
  downloadAndUploadEventImageToS3,
  downloadAndUploadToS3,
  isS3Configured,
} from '../src/modules/rss-feeds/utils/image-to-s3';

loadEnvConfig(process.cwd());

const SOURCE_URL = 'https://startupnews.fyi/startup-events/';
const FETCH_DELAY_MS = 400;
const MAX_ARCHIVE_PAGES = 25;
const DB = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'zox_db',
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const REGION_MAP: Record<string, string> = {
  'Delhi NCR': 'Delhi NCR',
  'Bengaluru': 'Bengaluru',
  'Mumbai': 'Mumbai',
  'Hyderabad': 'Hyderabad',
  'Other Cities': 'Other Cities',
  'International': 'International Events',
  'Dubai': 'Dubai',
  'Co-Hort': 'Cohort',
  'Online': 'Online',
};

const MONTHS: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function sanitizeEventText(raw: string): string {
  return decodeEntities(raw)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\.[a-z0-9_-]+\s*\{[^}]*\}/gi, ' ')
    .replace(/@media[^\{]*\{[\s\S]*?\}/gi, ' ')
    .replace(/\b[a-z-]+\s*:\s*[^;]+;?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripEventBoilerplate(text: string): string {
  return text
    .replace(/^\s*(description\s*)?(event details|about event)\s*/i, '')
    .replace(/^\s*description\s*/i, '')
    .trim();
}

/** Parse "3 January 2026" or "30 January - 1 February" to Date (use first date). */
function parseEventDate(text: string): Date {
  const t = text.trim();
  const yearMatch = t.match(/\b(20\d{2})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
  const firstDateMatch = t.match(/(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)/i);
  if (firstDateMatch) {
    const day = parseInt(firstDateMatch[1], 10);
    const monthName = firstDateMatch[2].toLowerCase();
    const month = MONTHS[monthName] ?? 0;
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function parseEventDateFromSlug(slug: string): Date | null {
  const s = slug.toLowerCase();

  const dayMonthYear = s.match(/(\d{1,2})-(january|february|march|april|may|june|july|august|september|october|november|december)-(\d{4})/i);
  if (dayMonthYear) {
    const day = parseInt(dayMonthYear[1], 10);
    const month = MONTHS[dayMonthYear[2].toLowerCase()];
    const year = parseInt(dayMonthYear[3], 10);
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const monthDayYear = s.match(/(january|february|march|april|may|june|july|august|september|october|november|december)-(\d{1,2})(?:-[a-z]+-\d{1,2})*-(\d{4})/i);
  if (monthDayYear) {
    const month = MONTHS[monthDayYear[1].toLowerCase()];
    const day = parseInt(monthDayYear[2], 10);
    const year = parseInt(monthDayYear[3], 10);
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

function extractDateFromDetailHtml(html: string): Date | null {
  const candidates: string[] = [];
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
  const pageTitle = html.match(/<title>([^<]+)<\/title>/i);
  const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

  if (ogTitle?.[1]) candidates.push(ogTitle[1]);
  if (pageTitle?.[1]) candidates.push(pageTitle[1]);
  if (heading?.[1]) candidates.push(heading[1]);

  const bodyExcerpt = sanitizeEventText(html).slice(0, 3000);
  if (bodyExcerpt) candidates.push(bodyExcerpt);

  const merged = candidates.join(' | ').toLowerCase();

  const pattern1 = merged.match(/(\d{1,2})\s*[-to]+\s*(\d{1,2})\s*(january|february|march|april|may|june|july|august|september|october|november|december)[,\s]+(20\d{2})/i);
  if (pattern1) {
    const day = parseInt(pattern1[1], 10);
    const month = MONTHS[pattern1[3].toLowerCase()];
    const year = parseInt(pattern1[4], 10);
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const pattern2 = merged.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s*(\d{1,2})(?:\s*[-,]\s*\d{1,2})?[,\s]+(20\d{2})/i);
  if (pattern2) {
    const month = MONTHS[pattern2[1].toLowerCase()];
    const day = parseInt(pattern2[2], 10);
    const year = parseInt(pattern2[3], 10);
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const pattern3 = merged.match(/(\d{1,2})\s*(january|february|march|april|may|june|july|august|september|october|november|december)[,\s]+(20\d{2})/i);
  if (pattern3) {
    const day = parseInt(pattern3[1], 10);
    const month = MONTHS[pattern3[2].toLowerCase()];
    const year = parseInt(pattern3[3], 10);
    const d = new Date(year, month, day);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

function slugFromUrl(url: string): string {
  const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/\/$/, '');
  const segment = path.split('/').filter(Boolean).pop() || '';
  return segment || `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface ParsedEvent {
  title: string;
  externalUrl: string;
  slug: string;
  location: string;
  eventDate: Date;
  dateText: string;
}

function regionFromCategorySlug(slug?: string): string | null {
  if (!slug) return null;
  const s = slug.toLowerCase();

  if (s.includes('mumbai')) return 'Mumbai';
  if (s.includes('bengaluru') || s.includes('bangalore')) return 'Bengaluru';
  if (s.includes('hyderabad')) return 'Hyderabad';
  if (s.includes('delhi')) return 'Delhi NCR';
  if (s.includes('dubai')) return 'Dubai';
  if (s.includes('international')) return 'International Events';
  if (s.includes('co-hort') || s.includes('cohort')) return 'Cohort';
  if (s.includes('online')) return 'Online';
  if (s.includes('other-cities') || s.includes('othercities')) return 'Other Cities';

  return null;
}

function inferRegionFromArchiveUrl(pageUrl: string): string | null {
  const m = pageUrl.match(/^https:\/\/startupnews\.fyi\/event-category\/([^/]+)\/?/i);
  if (!m || !m[1]) return null;
  return regionFromCategorySlug(m[1]);
}

function inferRegionFromEventText(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('| mumbai') || t.includes(' mumbai ')) return 'Mumbai';
  if (t.includes('| bengaluru') || t.includes('| bangalore') || t.includes(' bengaluru ') || t.includes(' bangalore ')) return 'Bengaluru';
  if (t.includes('| hyderabad') || t.includes(' hyderabad ')) return 'Hyderabad';
  if (t.includes('| delhi') || t.includes('| delhi ncr') || t.includes(' delhi ncr ')) return 'Delhi NCR';
  if (t.includes('| dubai') || t.includes(' dubai ')) return 'Dubai';
  if (t.includes('| online') || t.includes(' online ')) return 'Online';
  return null;
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/#.*$/, '').replace(/\/$/, '/');
}

function isArchivePageUrl(url: string): boolean {
  return (
    url === SOURCE_URL
    || /^https:\/\/startupnews\.fyi\/startup-events\/page\/\d+\/?$/.test(url)
    || /^https:\/\/startupnews\.fyi\/event-category\/[^/]+\/?$/.test(url)
    || /^https:\/\/startupnews\.fyi\/event-category\/[^/]+\/page\/\d+\/?$/.test(url)
  );
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'StartupNews-Sync/1.0' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Extract og:image URL from event page HTML. */
function extractOgImage(html: string): string | null {
  const m = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
  if (m && m[1]) {
    const url = m[1].trim().replace(/&amp;/g, '&');
    if (url.startsWith('http')) return url;
  }
  return null;
}

/** Extract meta description or og:description for excerpt. Use descriptionFromBody when meta is useless (e.g. "Book Now"). */
function extractExcerpt(html: string, descriptionFromBody: string | null = null): string | null {
  const m = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i)
    || html.match(/<meta\s+name="description"\s+content="([^"]+)"/i);
  if (m && m[1]) {
    const s = stripEventBoilerplate(sanitizeEventText(m[1]));
    if (s.length > 30 && s.toLowerCase() !== 'book now') {
      return s.slice(0, 500) || null;
    }
  }
  if (descriptionFromBody?.trim()) {
    const trimmed = stripEventBoilerplate(descriptionFromBody.trim());
    const firstPara = trimmed.split(/\n\n+/)[0] || trimmed;
    return (firstPara.slice(0, 500) || trimmed.slice(0, 400)).trim() || null;
  }
  return null;
}

/** Extract event description from page (first substantial paragraph after Event Description). */
function extractDescription(html: string): string | null {
  const match = html.match(/Event Description[\s\S]*?<(?:div|p)[^>]*>([\s\S]*?)<\/(?:div|p)>/i)
    || html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i);
  if (match && match[1]) {
    const raw = stripEventBoilerplate(sanitizeEventText(match[1]));
    return raw.slice(0, 2000) || null;
  }
  return null;
}

function parseHtml(html: string, pageUrl: string): ParsedEvent[] {
  const events: ParsedEvent[] = [];
  const regionOrder = Object.keys(REGION_MAP);
  const pageRegion = inferRegionFromArchiveUrl(pageUrl);
  const linkRegex = /<a\s+href="(https:\/\/startupnews\.fyi\/startup-events\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  const headingRegex = new RegExp(
    `<(?:h2|h3)[^>]*>\\s*([^<]*?)\\s*</(?:h2|h3)>`,
    'gi'
  );

  const linkMatches: { index: number; url: string; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(html)) !== null) {
    const url = m[1];
    const text = decodeEntities(m[2].trim());
    if (!url || url === SOURCE_URL || !text) continue;
    if (!/^https:\/\/startupnews\.fyi\/startup-events\/[^/]+\/?$/.test(url)) continue;
    linkMatches.push({ index: m.index, url, text });
  }

  const headings: { index: number; name: string }[] = [];
  while ((m = headingRegex.exec(html)) !== null) {
    const name = m[1].trim();
    const normalized = regionOrder.find((r) =>
      name.toLowerCase().includes(r.toLowerCase())
    );
    if (normalized) headings.push({ index: m.index, name: REGION_MAP[normalized] || name });
  }

  for (const { index: linkIndex, url, text } of linkMatches) {
    const prevHeading = [...headings].reverse().find((h) => h.index < linkIndex);
    const textRegion = inferRegionFromEventText(text);
    const region = prevHeading?.name || pageRegion || textRegion || 'Other Cities';
    const parts = text.split('|').map((p) => p.trim());
    const title = parts[0] || text;
    const datePart = parts.length > 1 ? parts[parts.length - 1] : '';
    const eventDate = parseEventDate(datePart);
    events.push({
      title,
      externalUrl: url,
      slug: slugFromUrl(url),
      location: region,
      eventDate,
      dateText: datePart || eventDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }),
    });
  }

  return events;
}

function extractMatchingLinks(
  html: string,
  baseUrl: string,
  predicate: (url: string) => boolean,
): string[] {
  const urls = new Set<string>();
  const linkRegex = /<a\s+href="([^"]+)"[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1].trim();
    if (!rawHref || rawHref.startsWith('#')) continue;
    let url: string;
    try {
      url = normalizeUrl(new URL(rawHref, baseUrl).toString());
    } catch {
      continue;
    }
    if (predicate(url)) {
      urls.add(url);
    }
  }
  return [...urls];
}

function archiveSeedUrlsFromPage(html: string, baseUrl: string): string[] {
  return extractMatchingLinks(html, baseUrl, (url) =>
    url === SOURCE_URL
    || /^https:\/\/startupnews\.fyi\/event-category\/[^/]+\/?$/.test(url)
    || /^https:\/\/startupnews\.fyi\/startup-events\/page\/\d+\/?$/.test(url)
    || /^https:\/\/startupnews\.fyi\/event-category\/[^/]+\/page\/\d+\/?$/.test(url)
  );
}

function pageLinksFromArchive(html: string, baseUrl: string): string[] {
  return extractMatchingLinks(html, baseUrl, (url) =>
    url === SOURCE_URL
    || /^https:\/\/startupnews\.fyi\/startup-events\/page\/\d+\/?$/.test(url)
    || /^https:\/\/startupnews\.fyi\/event-category\/[^/]+\/page\/\d+\/?$/.test(url)
  );
}

async function collectArchivePages(): Promise<string[]> {
  const queue: string[] = [SOURCE_URL];
  const seen = new Set<string>();
  const archivePages = new Set<string>();

  while (queue.length > 0 && archivePages.size < MAX_ARCHIVE_PAGES) {
    const url = normalizeUrl(queue.shift() || '');
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const html = await fetchHtml(url);
    if (!html) continue;

    archivePages.add(url);

    for (const seedUrl of archiveSeedUrlsFromPage(html, url)) {
      if (!seen.has(seedUrl)) queue.push(seedUrl);
    }

    for (const pageUrl of pageLinksFromArchive(html, url)) {
      if (!seen.has(pageUrl)) queue.push(pageUrl);
    }
  }

  return [...archivePages];
}

interface EnrichedEvent extends ParsedEvent {
  /** Banner image: first source URL from og:image, then replaced by S3 URL after upload */
  imageUrl: string | null;
  excerpt: string | null;
  description: string | null;
}

async function fetchEventPageDetails(event: ParsedEvent, dryRun: boolean): Promise<EnrichedEvent> {
  let imageUrl: string | null = null;
  let excerpt: string | null = null;
  let description: string | null = null;

  try {
    const res = await fetch(event.externalUrl, {
      headers: { 'User-Agent': 'StartupNews-Sync/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ...event, imageUrl, excerpt, description };
    const html = await res.text();
    imageUrl = extractOgImage(html);
    description = extractDescription(html);
    excerpt = extractExcerpt(html, description);

    // If the listing did not provide a reliable date, infer from detail page/slug.
    if (!event.dateText || !/(20\d{2})/.test(event.dateText)) {
      const detailDate = extractDateFromDetailHtml(html) || parseEventDateFromSlug(event.slug);
      if (detailDate) {
        event.eventDate = detailDate;
      }
    }
  } catch {
    // keep nulls
  }

  return { ...event, imageUrl, excerpt, description };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
  if (dryRun) console.log('DRY RUN – no DB or S3 writes');

  const archivePages = await collectArchivePages();
  console.log(`Discovered ${archivePages.length} archive pages`);

  const parsed: ParsedEvent[] = [];
  for (let i = 0; i < archivePages.length; i++) {
    const pageUrl = archivePages[i];
    process.stdout.write(`\rParsing archive ${i + 1}/${archivePages.length}: ${pageUrl}`);
    const html = await fetchHtml(pageUrl);
    if (!html) continue;
    parsed.push(...parseHtml(html, pageUrl));
    if (i < archivePages.length - 1) await sleep(100);
  }
  console.log('');

  const bySlug = new Map<string, ParsedEvent>();
  for (const e of parsed) {
    if (!bySlug.has(e.slug)) bySlug.set(e.slug, e);
  }
  let unique = [...bySlug.values()];
  if (limit && limit > 0) unique = unique.slice(0, limit);
  console.log(`Parsed ${unique.length} unique events from ${SOURCE_URL}`);

  const enriched: EnrichedEvent[] = [];
  for (let i = 0; i < unique.length; i++) {
    const e = unique[i];
    process.stdout.write(`\rFetching event ${i + 1}/${unique.length}: ${e.slug.slice(0, 40)}...`);
    const detail = await fetchEventPageDetails(e, dryRun);
    enriched.push(detail);
    if (!dryRun && i < unique.length - 1) await sleep(FETCH_DELAY_MS);
  }
  console.log('');

  if (isS3Configured() && !dryRun) {
    for (let i = 0; i < enriched.length; i++) {
      const e = enriched[i];
      let s3ImageUrl: string | null = null;
      if (e.imageUrl && e.imageUrl.startsWith('http')) {
        s3ImageUrl = await downloadAndUploadEventImageToS3(e.slug, e.imageUrl);
        if (s3ImageUrl) enriched[i].imageUrl = s3ImageUrl;
      }
      if (!s3ImageUrl) {
        const fallback = await downloadAndUploadToS3(
          'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
          `event-default-${e.slug.slice(0, 30)}`
        );
        if (fallback) enriched[i].imageUrl = fallback;
      }
      process.stdout.write(`\rUploaded images ${i + 1}/${enriched.length}`);
      if (i < enriched.length - 1) await sleep(200);
    }
    console.log('');
  }

  if (!dryRun && DB.user && DB.password) {
    const conn = await mariadb.createConnection(DB);
    try {
      await conn.query('DELETE FROM events');
      console.log('Cleared events table');
      const insertSql = `
        INSERT INTO events (title, slug, excerpt, description, location, event_date, event_time, image_url, external_url, status)
        VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, 'upcoming')
      `;
      for (const e of enriched) {
        const imageUrl = e.imageUrl && e.imageUrl.startsWith('http') ? e.imageUrl : null;
        await conn.query(insertSql, [
          e.title.slice(0, 500),
          e.slug.slice(0, 500),
          e.excerpt || null,
          e.description || null,
          e.location,
          e.eventDate,
          imageUrl,
          e.externalUrl,
        ]);
      }
      console.log(`Inserted ${enriched.length} events`);
      await Promise.all([
        deleteCacheByPrefix('events:all:'),
        deleteCacheByPrefix('events:by-region:'),
        deleteCacheByPrefix('events:public:'),
      ]);
      console.log('Cleared event caches');
    } finally {
      await conn.end();
    }
  } else if (dryRun) {
    const withBanner = enriched.filter((e) => e.imageUrl);
    console.log(`Would insert ${enriched.length} events (${withBanner.length} with banner from page). Sample:`, enriched.slice(0, 2).map((e) => ({ title: e.title, imageUrl: e.imageUrl ? 'yes' : 'no', excerpt: e.excerpt?.slice(0, 60) })));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
