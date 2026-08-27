'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import * as XLSX from 'xlsx';
import { getAuthHeaders, getAdminUser } from '@/lib/admin-auth';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import ImageUpload from '@/components/admin/ImageUpload';
import RichTextEditor from '@/components/admin/RichTextEditor';
import EventsManagementTabs from '@/components/admin/events/EventsManagementTabs';
import {
  PARTNERSHIP_STATUS_OPTIONS, PARTNERSHIP_TYPE_OPTIONS, SITE_STATUS_OPTIONS,
  EVENT_DESCRIPTION_MIN_LENGTH,
  POSTER_SPEC, BANNER_SPEC, SOCIAL_CREATIVE_SPEC, SOCIAL_CREATIVE_PLATFORMS, SOCIAL_CREATIVE_PLATFORM_LABELS,
  type Speaker, type SocialCreative, type LinkedEventSummary,
} from '@/modules/partnership-events/domain/types';
import { COUNTRY_NAMES, citiesForCountry, countryForCity } from '@/modules/partnership-events/domain/country-city-data';
import { COUNTRY_CODE_OPTIONS, PHONE_RULES, CUSTOM_CODE_RE, IMAGE_SPECS, slugify } from '@/components/submit-event/constants';
import { STANDARD_HEADERS, partnershipEventToExportRow, dedupKey } from '@/modules/partnership-events/utils/partnership-events.utils';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-pt-display' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-pt-body' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-pt-mono' });

/* ============================================================
   TYPES
   ============================================================ */
interface PartnershipEvent {
  id: number;
  eventId: number | null;
  linkedEvent: LinkedEventSummary | null;
  eventName: string;
  city: string;
  country: string;
  organiser: string;
  poc: string;
  contact: string;
  email: string;
  website: string;
  emailThread: string;
  initiatedDate: string;
  eventStartDate: string;
  eventStartTime: string;
  eventEndDate: string;
  eventEndTime: string;
  venueAddress: string;
  googleLocationLink: string;
  description: string;
  eventType: string;
  ticketCurrency: string;
  ticketPrice: string;
  speakers: Speaker[];
  posterUrl: string;
  bannerUrl: string;
  bannerStartDate: string;
  socialMediaPosts: string;
  socialCreatives: SocialCreative[];
  partnershipStatus: string;
  partnershipType: string;
  lastUpdatedDate: string;
  comment: string;
  listing: string;
  listingLink: string;
  source: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

type EventDraft = Omit<PartnershipEvent, 'id' | 'eventId' | 'linkedEvent' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'> & {
  /** Not a partnership_events column — drives the linked public Event (location). */
  region: string;
  /** Not a partnership_events column — drives the linked public Event's real status. No "Completed" here; that's automatic (see markPastEventsAsExpired). */
  siteStatus: 'draft' | 'upcoming' | 'cancelled';
  /** Not a partnership_events column — drives the linked public Event's URL slug. Auto-follows
   * Event Name until the admin edits it directly (see slugManuallyEdited). */
  slug: string;
};

const emptySpeaker = (): Speaker => ({ name: '', designation: '', company: '', others: '' });

const emptyDraft = (): EventDraft => ({
  eventName: '', city: '', country: '', organiser: '', poc: '', contact: '', email: '', website: '', emailThread: '',
  // Auto-set to today and never manually editable (see the read-only Initiated Date field in
  // the modal) — mirrors how the public /submit-event flow already stamps it server-side.
  initiatedDate: todayStr(), eventStartDate: '', eventStartTime: '', eventEndDate: '', eventEndTime: '',
  venueAddress: '', googleLocationLink: '', description: '', eventType: '', ticketCurrency: '', ticketPrice: '',
  speakers: [], posterUrl: '', bannerUrl: '', bannerStartDate: '', socialMediaPosts: '', socialCreatives: [],
  partnershipStatus: '', partnershipType: '',
  lastUpdatedDate: '', comment: '', listing: '', listingLink: '', source: 'Manually added',
  region: '', siteStatus: 'draft', slug: '',
});

const SITE_STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#6B7280' },
  upcoming: { label: 'Published', color: '#1E9E64' },
  completed: { label: 'Completed', color: '#2563C7' },
  cancelled: { label: 'Cancelled', color: '#C22B44' },
};

const STATUS_ORDER = [...PARTNERSHIP_STATUS_OPTIONS] as string[];
// Trimmed-down status list for just the KPI cards row — drops "Expired" (its own card
// double-counted against the date-derived isExpired badge that used to sit per-row and was
// confusing; "Expired" is still filterable via the "All Statuses" dropdown below — it's kept
// accurate by a server-side sweep, see PartnershipEventsRepository.markPastPartnershipsAsExpired,
// not something the admin ever needs to set manually).
const STATUS_FILTER_ORDER = STATUS_ORDER.filter((s) => s !== 'Expired');
// The Add/Edit modal's own status editor (the one place status can actually be changed — the
// table just displays it read-only) only offers the active deal-pipeline statuses — Draft,
// Cancelled and Expired are set some other way (Draft is driven by the Website Listing Status
// field, not this dropdown — see classifyStatus; Cancelled comes from classifyStatus's own
// "cancel" fuzzy-match on stored text; Expired is the automatic server sweep above), not picked
// from this dropdown. An event already holding one of those (or any other legacy value) still
// shows and keeps it via the "(legacy)" fallback option below.
const STATUS_EDIT_ORDER = ['Initiated', 'Partnership Done', 'Only Listing', 'Ticketing'];
// Excluded from the default "All Statuses" table view — these need a deliberate, manual look,
// not a permanent fixture cluttering the everyday list.
const DEFAULT_HIDDEN_STATUSES = ['Unmapped', 'Expired'];
const STATUS_COLOR_HEX: Record<string, string> = {
  Draft: '#9333EA', Initiated: '#7C3FE0', 'Partnership Done': '#1E9E64', 'Only Listing': '#0E7C8B',
  Ticketing: '#2563C7', Cancelled: '#C22B44', Expired: '#3F4552', Unmapped: '#9CA3AF',
};
const TYPE_COLOR_HEX: Record<string, string> = { 'In-person': '#0D9488', Cohort: '#7C3FE0', 'Online (virtual)': '#D97706' };
// Domestic (India) vs international at-a-glance in the Country column — light blue for India,
// amber for everywhere else. Non-geographic values (Cohort, Online, blank) aren't really
// "international" either way, so they're left uncolored rather than guessed at.
const DOMESTIC_COUNTRY_COLOR = '#2E86DE';
const INTERNATIONAL_COUNTRY_COLOR = '#D97706';
function countryPillColor(country: string | undefined | null): string | null {
  const c = country?.trim().toLowerCase();
  if (!c) return null;
  if (c === 'india') return DOMESTIC_COUNTRY_COLOR;
  if (c === 'cohort' || c === 'online') return null;
  return INTERNATIONAL_COUNTRY_COLOR;
}

/* ============================================================
   DERIVED FIELDS (mirrors the original standalone tool)
   ============================================================ */
interface Derived {
  statusBucket: string;
  isExpired: boolean;
  /** Not just "!isExpired" — an event that's actually listed (a real published website Event
   * is linked) counts as Upcoming regardless of the tracker's own dates, matching the same rule
   * the server-side auto-expiry sweep uses (see markPastPartnershipsAsExpired). */
  isUpcoming: boolean;
  dateOrderSuspect: boolean;
  daysInStatus: number | null;
  listingResolved: string;
  partnershipTypeResolved: string;
}

function startOfToday(): number {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t.getTime();
}
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function parseYmd(s: string): number | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d.getTime();
}
function daysBetween(a: number, b: number): number {
  return Math.floor((a - b) / (1000 * 60 * 60 * 24));
}
/**
 * `siteStatus` is the linked website Event's own publish status ('draft'/'upcoming'/'completed'),
 * i.e. what the Add/Edit modal's "Website Listing Status *" field controls — pass
 * `e.linkedEvent?.status` (undefined when there's no linked website Event at all yet).
 *
 * "Draft" is bucketed purely from this — NOT from a blank/unset Partnership Status — since
 * whether an event is actually live on the public site is ground truth, while the Partnership
 * Status dropdown is just the internal CRM deal-stage (Initiated/Partnership Done/Only
 * Listing/Ticketing) and was never meant to double as an on/off switch for site-publish state.
 * Draft takes priority over those in-progress CRM stages (an unpublished event showing as e.g.
 * "Only Listing" is misleading), but NOT over the terminal Cancelled/Expired outcomes, which are
 * deliberate admin decisions/date-based facts that hold regardless of publish state.
 *
 * `isDateExpired` (the event's own end/start date vs today, computed in computeDerived) is
 * checked directly here too, not just the raw CRM text already saying "expir" — the automatic
 * DB sweep that rewrites that text (markPastPartnershipsAsExpired) only ever touches rows with
 * no linked website Event at all (`event_id IS NULL`), so a past-dated event that IS linked but
 * still sitting unpublished (siteStatus 'draft') never got its text updated and kept falling into
 * the Draft bucket above by date alone — a real event stuck in Draft forever, past its own date.
 * Checking the date live here means it's correct on every load regardless of that sweep's scope,
 * and self-heals going forward: the moment any event's date passes, it moves to Expired even
 * while still in Draft, instead of only Cancelled and text-already-marked-Expired doing so.
 */
function classifyStatus(raw: string, siteStatus?: string, isDateExpired?: boolean): string {
  const s = (raw || '').toLowerCase().trim();
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('expir') || isDateExpired) return 'Expired';
  if (!siteStatus || siteStatus === 'draft') return 'Draft';
  if (!s) return 'Unmapped';
  if (STATUS_ORDER.includes(raw)) return raw;
  // Catches bare "listed" too (a lot of real historical data uses that exact word), not just
  // "only listed"/"listed only" — anything mentioning "listed" at all means this bucket.
  if (s.includes('listed') || s.includes('listing') || s.includes('no partnership')) return 'Only Listing';
  if (s.includes('ticket')) return 'Ticketing';
  if (s.includes('done') || s.includes('confirm') || s.includes('complete') || s.includes('executed')) return 'Partnership Done';
  if (s.includes('initiat')) return 'Initiated';
  if (s.includes('draft')) return 'Draft';
  // Legacy "In Progress" / "On Hold" / "Dropped" text (retired concepts) also lands here — the
  // admin reclassifies these manually, they're not auto-migrated to a new bucket.
  return 'Unmapped';
}
/** Maps old freeform partnership_status text (from before STATUS_EDIT_ORDER existed — e.g. bulk
 * CSV imports) to its closest modern equivalent, so opening an old event for edit pre-selects a
 * real, editable option instead of showing a locked "(legacy)" placeholder with no obvious next
 * step. Only covers exact, unambiguous synonyms actually seen in real data (Confirmed, In
 * Progress, listed) — genuinely unrecognized text is left as-is (still shows as legacy) rather
 * than guessed at. Saving without touching this field also quietly cleans up the stored text to
 * the modern equivalent, gradually retiring the old free text with no separate migration needed. */
function normalizeStatusForEdit(raw: string): string {
  if (!raw || STATUS_EDIT_ORDER.includes(raw) || (PARTNERSHIP_STATUS_OPTIONS as readonly string[]).includes(raw)) return raw;
  const s = raw.toLowerCase().trim();
  if (s.includes('confirm') || s.includes('done') || s.includes('complete') || s.includes('executed')) return 'Partnership Done';
  if (s.includes('listed') || s.includes('listing')) return 'Only Listing';
  if (s.includes('progress') || s.includes('initiat')) return 'Initiated';
  if (s.includes('ticket')) return 'Ticketing';
  return raw;
}
function normalizeListing(rawListing: string, rawLink: string, statusBucket: string): string {
  const hasLink = !!(rawLink || '').trim();
  const l = (rawListing || '').toLowerCase().trim();
  if (statusBucket === 'Cancelled') return 'No';
  if ((statusBucket === 'Partnership Done' || statusBucket === 'Only Listing') && hasLink) return 'Yes';
  if (l.includes('process')) return 'In process';
  if (l === 'no' && !hasLink) return 'No';
  return 'Pending';
}
/** The tracker's own claim that an event is "listed" (status = Partnership Done or Only
 * Listing) — see isLiveListed for whether that claim is actually true on the live site. */
function isListedStatus(statusBucket: string): boolean {
  return statusBucket === 'Partnership Done' || statusBucket === 'Only Listing';
}
/** Actually live on the public site right now — a real linked Event that isn't sitting in
 * Draft. The "Listed" KPI card compares this against isListedStatus's count and warns when
 * they disagree (an event claims Partnership Done/Only Listed but has no live page, or vice
 * versa) instead of silently trusting the tracker's own status field. */
function isLiveListed(e: PartnershipEvent, statusBucket: string): boolean {
  return isListedStatus(statusBucket) && !!e.linkedEvent && e.linkedEvent.status !== 'draft';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Event Description is rich-text HTML now (RichTextEditor), not plain text — length checks
// need the visible character count, not raw markup, or an empty "<p></p>" doc would read as
// non-empty and a short-but-heavily-formatted description would read as artificially long.
function stripHtml(html: string): string {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// The Website field should only ever hold the event/organiser's own site — never our own coverage link.
const WEBSITE_EXCLUDE_DOMAINS = ['startupnews.fyi'];
function cleanWebsite(url: string): string {
  const v = (url || '').trim();
  if (!v) return '';
  const low = v.toLowerCase();
  return WEBSITE_EXCLUDE_DOMAINS.some((d) => low.includes(d)) ? '' : v;
}

// Splits a stored "+91 9876543210"-style contact string back into the country-code select +
// digits the Contact No. field edits — same shape the /submit-event PhoneField itself keeps.
// Anything that doesn't start with a known/plausible "+<digits>" code is treated as a bare
// number under the default +91, so legacy plain-digit values still show up in the number box.
function parseContact(contact: string): { code: string; codeCustom: string; number: string } {
  const trimmed = (contact || '').trim();
  const m = trimmed.match(/^(\+\d{1,4})[\s-]*(.*)$/);
  if (m) {
    const code = m[1];
    const isKnown = COUNTRY_CODE_OPTIONS.some((c) => c.code === code);
    return isKnown
      ? { code, codeCustom: '', number: m[2].replace(/\D/g, '') }
      : { code: 'other', codeCustom: code, number: m[2].replace(/\D/g, '') };
  }
  return { code: '+91', codeCustom: '', number: trimmed.replace(/\D/g, '') };
}
function combineContact(code: string, codeCustom: string, number: string): string {
  if (!number.trim()) return '';
  const effectiveCode = code === 'other' ? (codeCustom.trim() || 'other') : code;
  return `${effectiveCode} ${number}`.trim();
}

// A best-effort guess only, used when both City and Country are blank on import.
const KNOWN_CITIES: Record<string, string> = {
  delhi: 'India', 'new delhi': 'India', mumbai: 'India', bengaluru: 'India', bangalore: 'India',
  hyderabad: 'India', chennai: 'India', pune: 'India', kolkata: 'India', ahmedabad: 'India',
  jaipur: 'India', noida: 'India', gurugram: 'India', gurgaon: 'India', chandigarh: 'India',
  goa: 'India', kochi: 'India', cochin: 'India', indore: 'India', lucknow: 'India', surat: 'India',
  nagpur: 'India', bhopal: 'India', coimbatore: 'India', vadodara: 'India', visakhapatnam: 'India',
  dubai: 'UAE', 'abu dhabi': 'UAE', singapore: 'Singapore', london: 'UK', 'new york': 'USA',
  'san francisco': 'USA', dublin: 'Ireland', berlin: 'Germany', paris: 'France', tokyo: 'Japan',
};
const KNOWN_COUNTRIES = ['india', 'usa', 'united states', 'uk', 'united kingdom', 'uae', 'singapore', 'germany', 'france', 'japan', 'ireland', 'canada', 'australia'];
function inferLocationFromName(name: string): { city: string; country: string } {
  const n = (name || '').toLowerCase();
  for (const city in KNOWN_CITIES) {
    if (new RegExp('\\b' + city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(n)) {
      return { city: city.replace(/\b\w/g, (c) => c.toUpperCase()), country: KNOWN_CITIES[city] };
    }
  }
  for (const c of KNOWN_COUNTRIES) {
    if (new RegExp('\\b' + c + '\\b').test(n)) {
      return { city: '', country: c.replace(/\b\w/g, (ch) => ch.toUpperCase()) };
    }
  }
  return { city: '', country: '' };
}
function computeDerived(e: PartnershipEvent): Derived {
  const today = startOfToday();
  const startMs = parseYmd(e.eventStartDate);
  const explicitEndMs = parseYmd(e.eventEndDate);
  const effectiveEndMs = explicitEndMs ?? startMs;
  const refMs = effectiveEndMs ?? startMs;
  const isExpired = refMs !== null ? refMs < today : false;
  const statusBucket = classifyStatus(e.partnershipStatus, e.linkedEvent?.status, isExpired);
  const isUpcoming = !isExpired || !!e.linkedEvent;
  const dateOrderSuspect = !!(startMs !== null && explicitEndMs !== null && explicitEndMs < startMs);
  // Total days from Initiated Date to the event's end date (falling back to start date if no
  // end date is set) — not days-since-last-update, and not open-ended against "today".
  const initiatedMs = parseYmd(e.initiatedDate);
  const daysInStatus = (initiatedMs !== null && effectiveEndMs !== null) ? daysBetween(effectiveEndMs, initiatedMs) : null;
  const partnershipTypeResolved = e.partnershipType;
  const listingResolved = normalizeListing(e.listing, e.listingLink, statusBucket);
  return { statusBucket, isExpired, isUpcoming, dateOrderSuspect, daysInStatus, listingResolved, partnershipTypeResolved };
}

/* ============================================================
   EXCEL IMPORT (header auto-mapping, multi-file / multi-sheet)
   ============================================================ */
const FIELD_ALIASES: Record<string, string[]> = {
  eventName: ['nameoftheevent', 'nameofevent', 'eventname', 'eventtitle', 'titleoftheevent'],
  city: ['city'],
  country: ['country'],
  organiser: ['organisercompanyname', 'organizercompanyname', 'organisername', 'companyname', 'organiser', 'organizer'],
  poc: ['pocname', 'poc'],
  contact: ['contactno', 'contactnumber', 'phone', 'mobileno', 'mobile'],
  email: ['emailid', 'email'],
  website: ['websitelink', 'website'],
  emailThread: ['emailthread', 'emaillink', 'gmaillink', 'maillink'],
  initiatedDate: ['initiateddate', 'initiationdate', 'dateinitiated'],
  eventStartDate: ['eventstartdate', 'startdate', 'eventdate', 'dateofevent'],
  eventEndDate: ['eventenddate', 'enddate'],
  partnershipStatus: ['partnershipstatus', 'status'],
  partnershipType: ['partnershiptypedomesticorinternational', 'partnershiptype', 'domesticorinternational'],
  lastUpdatedDate: ['lastupdateddate', 'lastupdated'],
  comment: ['comment', 'comments', 'remarks'],
  listing: ['listingyesinprocessno', 'listing'],
  listingLink: ['listinglinkifyes', 'listinglink'],
};
function normKey(s: unknown): string {
  return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
}
function buildHeaderMap(headers: string[]): Record<string, string> {
  const normToOrig: Record<string, string> = {};
  headers.forEach((h) => { normToOrig[normKey(h)] = h; });
  const used = new Set<string>();
  const map: Record<string, string> = {};
  for (const field in FIELD_ALIASES) {
    for (const alias of FIELD_ALIASES[field]) {
      const orig = normToOrig[alias];
      if (orig !== undefined && !used.has(orig)) { map[field] = orig; used.add(orig); break; }
    }
  }
  for (const field in FIELD_ALIASES) {
    if (map[field]) continue;
    const hit = headers.find((h) => {
      if (used.has(h)) return false;
      const nh = normKey(h);
      return FIELD_ALIASES[field].some((a) => a.length >= 4 && (nh.includes(a) || a.includes(nh)));
    });
    if (hit) { map[field] = hit; used.add(hit); }
  }
  return map;
}
function excelDateToYmd(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    try {
      const d = XLSX.SSF.parse_date_code(v);
      if (d) return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    } catch { /* fall through */ }
    return '';
  }
  const s = String(v).trim();
  if (!s) return '';
  const token = s.match(/\d{1,4}[/\-.]\d{1,2}[/\-.]\d{1,4}/);
  const use = token ? token[0] : s;
  const parts = use.split(/[/\-.]/);
  if (parts.length !== 3) {
    const d = new Date(use);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }
  const [p1, p2, p3] = parts.map((p) => parseInt(p, 10));
  if (parts[0].length === 4) return `${p1}-${String(p2).padStart(2, '0')}-${String(p3).padStart(2, '0')}`;
  let y = p3;
  if (y < 100) y += 2000;
  if (!p1 || !p2 || p2 > 12) return '';
  return `${y}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
}
interface ImportStats {
  unparseableDates: number;
  locationsGuessed: number;
}
function rowToDraft(row: Record<string, unknown>, map: Record<string, string>, source: string, stats: ImportStats): EventDraft | null {
  const get = (f: string) => (map[f] !== undefined ? row[map[f]] : '');
  const eventName = String(get('eventName') || '').trim();
  if (!eventName) return null;
  const draft = emptyDraft();
  draft.eventName = eventName;
  draft.source = source;
  const textFields = ['city', 'country', 'organiser', 'poc', 'contact', 'email', 'website', 'emailThread', 'partnershipStatus', 'partnershipType', 'comment', 'listing', 'listingLink'] as const;
  for (const f of textFields) draft[f] = String(get(f) || '').trim();
  draft.website = cleanWebsite(draft.website);

  const dateFields = ['initiatedDate', 'eventStartDate', 'eventEndDate', 'lastUpdatedDate'] as const;
  for (const f of dateFields) {
    const raw = get(f);
    const rawText = raw === null || raw === undefined ? '' : String(raw).trim();
    draft[f] = excelDateToYmd(raw);
    if (rawText && !draft[f]) stats.unparseableDates++;
  }

  if (!draft.city && !draft.country) {
    const guess = inferLocationFromName(eventName);
    if (guess.city || guess.country) {
      draft.city = guess.city;
      draft.country = guess.country;
      stats.locationsGuessed++;
    }
  }
  return draft;
}
function readSheetRows(ws: XLSX.WorkSheet): { rows: Record<string, unknown>[]; headers: string[] } {
  const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: '' });
  if (!aoa.length) return { rows: [], headers: [] };
  const headers = (aoa[0] as unknown[]).map((h) => String(h).trim());
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < aoa.length; i++) {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, ci) => { if (h !== '') obj[h] = (aoa[i] as unknown[])[ci]; });
    if (Object.values(obj).some((v) => String(v).trim() !== '')) rows.push(obj);
  }
  return { rows, headers };
}

function processWorkbookIntoDrafts(
  wb: XLSX.WorkBook,
  labelFor: (sheetName: string) => string,
  allDrafts: EventDraft[],
  stats: ImportStats,
  sheetsRead: { name: string; rows: number }[],
  sheetsSkipped: { name: string; reason: string }[]
): number {
  let dropped = 0;
  for (const sheetName of wb.SheetNames) {
    const label = labelFor(sheetName);
    const { rows, headers } = readSheetRows(wb.Sheets[sheetName]);
    if (!rows.length) {
      sheetsSkipped.push({ name: label, reason: 'Empty, or only a header row with no data below it.' });
      continue;
    }
    const map = buildHeaderMap(headers);
    const headerPreview = headers.filter((h) => h.trim()).join(' | ') || '(blank header row)';
    if (map.eventName === undefined && map.partnershipStatus === undefined) {
      sheetsSkipped.push({ name: label, reason: `No column recognisable as "Name of the event" or "Partnership Status". Headers found: ${headerPreview}` });
      continue;
    }
    if (map.eventName === undefined) {
      sheetsSkipped.push({ name: label, reason: `Found a Partnership Status column, but no "Name of the event" column. Headers found: ${headerPreview}` });
      continue;
    }
    if (map.partnershipStatus === undefined) {
      sheetsSkipped.push({ name: label, reason: `Found a "Name of the event" column, but no Partnership Status column. Headers found: ${headerPreview}` });
      continue;
    }
    let rowsRead = 0;
    for (const row of rows) {
      const d = rowToDraft(row, map, sheetName, stats);
      if (!d) { dropped++; continue; }
      allDrafts.push(d);
      rowsRead++;
    }
    sheetsRead.push({ name: label, rows: rowsRead });
  }
  return dropped;
}

// Loading one tab directly from a public Google Sheet — reads via Google's gviz CSV export
// (works for sheets shared as "Anyone with the link can view"), one tab (gid) per link.
function extractSheetIdAndGid(url: string): { id: string; gid: string } | null {
  const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;
  const gidMatch = url.match(/[#&]gid=([0-9]+)/);
  return { id: idMatch[1], gid: gidMatch ? gidMatch[1] : '0' };
}

// Columns beyond the "standard" 18 — the richer lead-detail fields (venue, description,
// ticketing, speakers, poster/banner, social content) captured via the Add/Edit modal.
// Export-only: these aren't part of the import header-mapping (STANDARD_HEADERS/FIELD_ALIASES).
const EXPORT_EXTRA_HEADERS = [
  'Event Start Time', 'Event End Time', 'Venue Address', 'Google Location Link', 'Event Description',
  'Event Type', 'Ticket Currency', 'Ticket Starts From', 'Key Speakers/Guests',
  'Event Poster Link', 'Event Banner Link', 'Banner Start Date', 'Social Media Post Content', 'Social Media Creative Link',
  'Website Region', 'Website Listing Status', 'Website Event Link',
];
function speakersExportText(list: Speaker[]): string {
  if (!list || !list.length) return '';
  return list.map((sp) => [sp.name, sp.designation, sp.company, sp.others].filter(Boolean).join(', ')).join(' | ');
}
function creativesExportText(list: SocialCreative[]): string {
  if (!list || !list.length) return '';
  return list.map((item) => `${SOCIAL_CREATIVE_PLATFORM_LABELS[item.platform] || item.platform}: ${item.image}`).join(' | ');
}
function downloadEventsExcel(list: PartnershipEvent[], filename: string) {
  const allHeaders = [...STANDARD_HEADERS, ...EXPORT_EXTRA_HEADERS];
  const rows = list.map((e) => ({
    ...partnershipEventToExportRow(e),
    'Event Start Time': e.eventStartTime || '',
    'Event End Time': e.eventEndTime || '',
    'Venue Address': e.venueAddress || '',
    'Google Location Link': e.googleLocationLink || '',
    'Event Description': e.description || '',
    'Event Type': e.eventType || '',
    'Ticket Currency': e.ticketCurrency || '',
    'Ticket Starts From': e.ticketPrice || '',
    'Key Speakers/Guests': speakersExportText(e.speakers),
    'Event Poster Link': e.posterUrl || '',
    'Event Banner Link': e.bannerUrl || '',
    'Banner Start Date': e.bannerStartDate || '',
    'Social Media Post Content': e.socialMediaPosts || '',
    'Social Media Creative Link': creativesExportText(e.socialCreatives),
    'Website Region': e.linkedEvent?.location || '',
    'Website Listing Status': e.linkedEvent ? (SITE_STATUS_BADGE[e.linkedEvent.status]?.label || e.linkedEvent.status) : 'Not listed yet',
    'Website Event Link': e.linkedEvent ? `/startup-events/${e.linkedEvent.slug}` : '',
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { header: allHeaders });
  ws['!cols'] = allHeaders.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Events');
  XLSX.writeFile(wb, filename);
}

/* ============================================================
   SMALL HELPERS
   ============================================================ */
function fmtDisplay(ymd: string): string {
  if (!ymd) return '—';
  const d = new Date(ymd + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
// Split day+month from year — the table's date columns show these on two lines (year on its
// own smaller line below) instead of one long "23 Aug 2026" string, so the column can stay narrow.
function fmtMonthDay(ymd: string): string {
  if (!ymd) return '—';
  const d = new Date(ymd + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
function fmtYear(ymd: string): string {
  if (!ymd) return '';
  const d = new Date(ymd + 'T00:00:00');
  return isNaN(d.getTime()) ? '' : String(d.getFullYear());
}
// "14:30" -> "2:30 PM". Blank input means no time was set — callers just skip rendering
// anything rather than showing an empty/placeholder line under the date.
function fmtTime(hhmm: string): string {
  if (!hhmm) return '';
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return '';
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr || '00'} ${period}`;
}
function monthKey(ymd: string): string {
  return ymd.slice(0, 7);
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}
// DB timestamps come back as "YYYY-MM-DD HH:MM:SS" (no "T", no offset — see dateStrings/timezone
// config in shared/database/connection.ts), which some browsers won't parse as-is.
function parseDbDatetime(s: string): number | null {
  if (!s) return null;
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d.getTime();
}
function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/* ============================================================
   DAILY REPORT — activity log, WhatsApp send, 5pm bell reminder
   (mirrors the original standalone tool; "Your Name" comes from the
   real logged-in admin session instead of a browser-only name prompt)
   ============================================================ */
// Replace with the team's dedicated WhatsApp number for daily reports —
// country code + number, digits only, no "+" or spaces (e.g. India: '91XXXXXXXXXX').
const DAILY_REPORT_WHATSAPP_NUMBER = '919625952588';

const ACTIVITY_KEY = 'pt_activity_log';
const BELL_DISMISSED_KEY = 'pt_bell_dismissed_date';
const BELL_LAST_RING_KEY = 'pt_bell_last_ring';
const BELL_SNOOZE_MS = 15 * 60 * 1000;
const BELL_RINGTONE_URL = 'https://assets.mixkit.co/active_storage/sfx/1356/1356.wav';

// "Live" = not expired. "Partner" events are the subset actually in the partnership
// pipeline — Cancelled and Only Listing events don't count as a partner event.
const PARTNER_PIPELINE_STATUSES = ['Initiated', 'Partnership Done', 'Ticketing'];

interface ActivityEntry { ts: number; type: string; eventName: string; actor: string; detail: string }

// Renders "Name (n)" counts sorted busiest-first, e.g. "Priya (3), John (1)" — used for the
// created-by/updated-by breakdown lines in the WhatsApp report text.
function personCounts<T>(list: T[], getPerson: (item: T) => string): string {
  const counts = new Map<string, number>();
  list.forEach((item) => {
    const p = getPerson(item) || 'Unknown';
    counts.set(p, (counts.get(p) || 0) + 1);
  });
  if (!counts.size) return 'None';
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => `${name} (${count})`).join(', ');
}

function dayStamp(d?: Date): string {
  const x = d || new Date();
  return `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`;
}
function loadActivityLog(): ActivityEntry[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function api<T = unknown>(url: string, init?: RequestInit): Promise<{ success: boolean; data?: T; error?: string; warning?: string }> {
  try {
    const res = await fetch(url, { ...init, headers: { ...getAuthHeaders(), ...(init?.headers || {}) } });
    return await res.json();
  } catch (err) {
    return { success: false, error: `Request failed: ${err instanceof Error ? err.message : 'network error'}. If this page was open before a recent update, try reloading it.` };
  }
}

/* ============================================================
   PAGE
   ============================================================ */

/** Region/Country dropdown options: the static country list, always including the
 * currently-selected value so editing an older event never silently blanks its region out. */
function buildRegionOptions(currentValue: string): string[] {
  const set = new Set<string>(COUNTRY_NAMES);
  if (currentValue) set.add(currentValue);
  return [...set].sort((a, b) => a.localeCompare(b));
}

export default function PartnershipTrackerPage() {
  const [events, setEvents] = useState<PartnershipEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; kind: 'success' | 'error' } | null>(null);

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [listingFilter, setListingFilter] = useState('all');
  const [cardFilter, setCardFilter] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string | null>(null);
  const [chartsExpanded, setChartsExpanded] = useState(false);

  // Defaults to soonest-first by event date ("current to future") rather than alphabetical.
  const [sortKey, setSortKey] = useState<string | null>('eventStartDate');
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [modalOpen, setModalOpen] = useState(false);
  useEscapeKey(() => setModalOpen(false), modalOpen);
  const [mainTab, setMainTab] = useState<'tracker' | 'events'>('tracker');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EventDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  // Which social-creative platform panels are expanded in the Add/Edit modal — reset per open.
  const [openCreativePlatforms, setOpenCreativePlatforms] = useState<Set<string>>(new Set());
  // "Others" manual-entry mode for the Region/Country and City fields — reset per open.
  const [regionOther, setRegionOther] = useState(false);
  const [cityOther, setCityOther] = useState(false);
  // Slug auto-follows Event Name (like the public /submit-event form's title->slug behavior)
  // until the admin edits it directly, or until editing a record that already has a live
  // linked-event slug worth preserving — reset per open, see openAddModal/openEditModal.
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  // Split country-code + digits UI state for the Contact No. field (mirrors the public
  // /submit-event PhoneField) — combined into the single draft.contact string on every change,
  // so draft.contact stays the one source of truth saveModal() actually submits.
  const [phoneCode, setPhoneCode] = useState('+91');
  const [phoneCodeCustom, setPhoneCodeCustom] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  // Only close an overlay on backdrop click if the mousedown ALSO started on the backdrop —
  // otherwise selecting/copying text inside the modal and releasing the mouse past its edge
  // (a normal text-selection drag) was misread as a backdrop click and closed the modal.
  const modalMouseDownOnBackdrop = useRef(false);
  const dailyReportMouseDownOnBackdrop = useRef(false);

  const [busy, setBusy] = useState(false);
  interface ImportLogEntry {
    imported: number; updated: number; dropped: number; unparseableDates: number; locationsGuessed: number;
    sheetsRead: { name: string; rows: number }[];
    sheetsSkipped: { name: string; reason: string }[];
  }
  const [importLog, setImportLog] = useState<ImportLogEntry[]>([]);
  const [importPanelOpen, setImportPanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importPanelRef = useRef<HTMLDivElement>(null);

  const [sheetLinkOpen, setSheetLinkOpen] = useState(false);
  const [sheetLinkValue, setSheetLinkValue] = useState('');
  const [sheetLinkLoading, setSheetLinkLoading] = useState(false);
  const sheetLinkRef = useRef<HTMLDivElement>(null);

  const [, setActivityLog] = useState<ActivityEntry[]>([]);
  const [dailyReportOpen, setDailyReportOpen] = useState(false);
  useEscapeKey(() => setDailyReportOpen(false), dailyReportOpen);
  const [reportText, setReportText] = useState('');
  const [reportError, setReportError] = useState('');
  const [activityPersonFilter, setActivityPersonFilter] = useState('all');
  const [bellDue, setBellDue] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  interface ImportProgress { label: string; current: number; total: number }
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

  function showToast(msg: string, kind: 'success' | 'error' = 'success') {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 2800);
  }

  function logActivity(type: string, eventName: string, detail?: string) {
    const entry: ActivityEntry = {
      ts: Date.now(), type, eventName: eventName || '(untitled event)',
      actor: getAdminUser()?.name || getAdminUser()?.email || 'Unnamed', detail: detail || '',
    };
    setActivityLog((prev) => {
      const next = [...prev, entry];
      try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }

  function playBellSound() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play()?.catch((err) => console.warn('Bell sound could not play:', err));
  }
  function dismissBellForToday() {
    localStorage.setItem(BELL_DISMISSED_KEY, dayStamp());
    localStorage.removeItem(BELL_LAST_RING_KEY);
    setBellDue(false);
  }
  // Once the report is due (past 5pm and not dismissed today), keep re-ringing every 15
  // minutes — a snooze reminder — instead of ringing once and going quiet, so it nags
  // until the report actually gets sent.
  function checkBell() {
    const now = new Date();
    const dismissedToday = localStorage.getItem(BELL_DISMISSED_KEY) === dayStamp();
    const due = now.getHours() >= 17 && !dismissedToday;
    setBellDue(due);
    if (due) {
      const lastRing = Number(localStorage.getItem(BELL_LAST_RING_KEY) || 0);
      if (now.getTime() - lastRing >= BELL_SNOOZE_MS) {
        playBellSound();
        localStorage.setItem(BELL_LAST_RING_KEY, String(now.getTime()));
      }
    }
  }

  function buildDailyReportText(): string {
    const today = startOfToday();
    const totalLiveEvents = events.filter((e) => !derivedById.get(e.id)!.isExpired).length;
    const totalLivePartnerEvents = events.filter((e) => !derivedById.get(e.id)!.isExpired && PARTNER_PIPELINE_STATUSES.includes(derivedById.get(e.id)!.statusBucket)).length;
    const newPartnershipsInitiatedToday = events.filter((e) => parseYmd(e.initiatedDate) === today).length;
    const partnershipsDoneToday = events.filter((e) => derivedById.get(e.id)!.statusBucket === 'Partnership Done' && parseYmd(e.lastUpdatedDate) === today).length;
    const inProgressCount = events.filter((e) => derivedById.get(e.id)!.statusBucket === 'In Progress').length;

    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const who = getAdminUser()?.name || getAdminUser()?.email || 'Team Member';

    return [
      `*Partnership Tracker — Daily Report*`,
      `Date: ${dateStr}`,
      `Submitted By: ${who}`,
      '',
      `📢 Total Live Events: ${totalLiveEvents}`,
      `🤝 Total Live Partner Events: ${totalLivePartnerEvents}`,
      `🆕 New Partnerships Initiated Today: ${newPartnershipsInitiatedToday}`,
      `✅ Total Partnerships Done Today: ${partnershipsDoneToday}`,
      `🔄 In Progress: ${inProgressCount}`,
      '',
      `👤 Created Today by: ${personCounts(todayActivity.created, (x) => x.event.createdBy)}`,
      `✏️ Updated Today by: ${personCounts(todayActivity.updated, (x) => x.event.updatedBy)}`,
      '',
      `📝 Additional Comments:`,
      `(Add Any Notes Here Before Sending)`,
    ].join('\n');
  }
  function openDailyReportModal() {
    setReportText(buildDailyReportText());
    setReportError('');
    setActivityPersonFilter('all');
    setDailyReportOpen(true);
  }
  function sendReportOnWhatsApp() {
    if (DAILY_REPORT_WHATSAPP_NUMBER.includes('X')) {
      setReportError('No report number set yet — ask an admin to fill in DAILY_REPORT_WHATSAPP_NUMBER in the file.');
      return;
    }
    const url = `https://wa.me/${DAILY_REPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(reportText)}`;
    window.open(url, '_blank');
    dismissBellForToday();
    setDailyReportOpen(false);
  }

  async function loadEvents() {
    const res = await api<PartnershipEvent[]>('/api/admin/partnership-events?limit=50000');
    if (res.success && res.data) setEvents(res.data);
    else showToast(res.error || 'Failed to load events', 'error');
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadEvents();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!importPanelOpen) return;
    const handler = (e: MouseEvent) => {
      if (!importPanelRef.current?.contains(e.target as Node)) setImportPanelOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [importPanelOpen]);

  useEffect(() => {
    if (!sheetLinkOpen) return;
    const handler = (e: MouseEvent) => {
      if (!sheetLinkRef.current?.contains(e.target as Node)) setSheetLinkOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [sheetLinkOpen]);

  useEffect(() => {
    setActivityLog(loadActivityLog());
    checkBell();
    const id = setInterval(checkBell, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const derivedById = useMemo(() => {
    const map = new Map<number, Derived>();
    events.forEach((e) => map.set(e.id, computeDerived(e)));
    return map;
  }, [events]);

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    // "Listed" is Partnership Done + Only Listed — but only the ones actually live on the
    // site right now (listedLive). listedClaimed tracks the tracker's own status-based count
    // of the same two buckets, so the KPI card can flag when the two disagree (an event says
    // Partnership Done/Only Listed but has no live page yet, or the reverse).
    let listedLive = 0, listedClaimed = 0;
    events.forEach((e) => {
      const d = derivedById.get(e.id)!;
      byStatus[d.statusBucket] = (byStatus[d.statusBucket] || 0) + 1;
      if (isListedStatus(d.statusBucket)) listedClaimed++;
      if (isLiveListed(e, d.statusBucket)) listedLive++;
    });
    return { byStatus, listed: listedLive, listedClaimed, total: events.length };
  }, [events, derivedById]);

  // Who created/updated what today, with exact datetime — feeds the Daily Report's
  // filterable "today's activity" breakdown. An event just-created shares the same
  // created_at/updated_at, so it's excluded from "updated" to avoid double-counting.
  const todayActivity = useMemo(() => {
    const start = startOfToday();
    const end = start + 24 * 60 * 60 * 1000;
    const created: { event: PartnershipEvent; at: number }[] = [];
    const updated: { event: PartnershipEvent; at: number }[] = [];
    events.forEach((e) => {
      const cAt = parseDbDatetime(e.createdAt);
      const uAt = parseDbDatetime(e.updatedAt);
      if (cAt !== null && cAt >= start && cAt < end) created.push({ event: e, at: cAt });
      if (uAt !== null && uAt >= start && uAt < end && uAt !== cAt) updated.push({ event: e, at: uAt });
    });
    created.sort((a, b) => b.at - a.at);
    updated.sort((a, b) => b.at - a.at);
    return { created, updated };
  }, [events]);

  const activityPeople = useMemo(() => {
    const set = new Set<string>();
    todayActivity.created.forEach((x) => x.event.createdBy && set.add(x.event.createdBy));
    todayActivity.updated.forEach((x) => x.event.updatedBy && set.add(x.event.updatedBy));
    return [...set].sort();
  }, [todayActivity]);

  const filtered = useMemo(() => {
    let list = events.slice();
    if (monthFilter) list = list.filter((e) => e.eventStartDate && monthKey(e.eventStartDate) === monthFilter);
    if (cardFilter === 'Listed') list = list.filter((e) => isListedStatus(derivedById.get(e.id)!.statusBucket));
    else if (cardFilter) list = list.filter((e) => derivedById.get(e.id)!.statusBucket === cardFilter);

    const q = deferredSearch.trim().toLowerCase();
    if (q) list = list.filter((e) => e.eventName.toLowerCase().includes(q) || e.organiser.toLowerCase().includes(q) || e.poc.toLowerCase().includes(q));

    // The default "all" view excludes Unmapped/Expired so they don't clutter the everyday list —
    // Expired is still explicitly selectable from this same dropdown for a deliberate manual
    // check; Unmapped isn't offered there at all (not a real status, just "couldn't classify").
    if (statusFilter === 'all') list = list.filter((e) => !DEFAULT_HIDDEN_STATUSES.includes(derivedById.get(e.id)!.statusBucket));
    else if (statusFilter === 'Listed') list = list.filter((e) => isListedStatus(derivedById.get(e.id)!.statusBucket));
    else list = list.filter((e) => derivedById.get(e.id)!.statusBucket === statusFilter);
    if (typeFilter !== 'all') list = list.filter((e) => derivedById.get(e.id)!.partnershipTypeResolved === typeFilter);
    if (listingFilter !== 'all') list = list.filter((e) => derivedById.get(e.id)!.statusBucket === listingFilter);

    if (sortKey) {
      list.sort((a, b) => {
        let av: string | number = '', bv: string | number = '';
        if (sortKey === 'daysInStatus') {
          av = derivedById.get(a.id)!.daysInStatus ?? -Infinity;
          bv = derivedById.get(b.id)!.daysInStatus ?? -Infinity;
        } else {
          av = (a as unknown as Record<string, string>)[sortKey] || '';
          bv = (b as unknown as Record<string, string>)[sortKey] || '';
          if (typeof av === 'string') av = av.toLowerCase();
          if (typeof bv === 'string') bv = bv.toLowerCase();
        }
        if (av < bv) return -1 * sortDir;
        if (av > bv) return 1 * sortDir;
        return 0;
      });
    }
    return list;
  }, [events, derivedById, monthFilter, cardFilter, deferredSearch, statusFilter, typeFilter, listingFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const pageList = filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);

  const CHART_STATUSES = [...STATUS_ORDER, 'Unmapped'];
  const momData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    events.forEach((e) => {
      if (!e.eventStartDate) return;
      const key = monthKey(e.eventStartDate);
      const bucket = derivedById.get(e.id)?.statusBucket || 'Unmapped';
      if (!map[key]) map[key] = {};
      map[key][bucket] = (map[key][bucket] || 0) + 1;
    });
    const keys = Object.keys(map).sort().slice(-12);
    const totals = keys.map((k) => Object.values(map[k]).reduce((a, b) => a + b, 0));
    const max = Math.max(1, ...totals);
    return { keys, map, max };
  }, [events, derivedById]);

  const YOY_PALETTE = ['#2563C7', '#1E9E64', '#B9790A', '#C22B44', '#7C3FE0', '#0E7C8B'];
  const yoyData = useMemo(() => {
    const grid: Record<number, number[]> = {};
    events.forEach((e) => {
      if (!e.eventStartDate) return;
      const d = new Date(e.eventStartDate + 'T00:00:00');
      if (isNaN(d.getTime())) return;
      const y = d.getFullYear(), m = d.getMonth();
      if (!grid[y]) grid[y] = new Array(12).fill(0);
      grid[y][m]++;
    });
    const years = Object.keys(grid).map(Number).sort((a, b) => a - b);
    const max = Math.max(1, ...years.flatMap((y) => grid[y]));
    return { years, grid, max };
  }, [events]);

  function resetToPage1() { setPage(1); }
  function clearFilters() {
    setSearch(''); setStatusFilter('all'); setTypeFilter('all'); setListingFilter('all');
    setCardFilter(null); setMonthFilter(null); setSortKey('eventStartDate'); setSortDir(1); setPage(1);
  }
  function setCard(bucket: string | null) { setCardFilter(bucket); setMonthFilter(null); setPage(1); }
  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(1); }
    setPage(1);
  }

  /* ---------------- CRUD ---------------- */
  function openAddModal() {
    setEditingId(null);
    setDraft(emptyDraft());
    setModalError('');
    setOpenCreativePlatforms(new Set());
    setRegionOther(false);
    setCityOther(false);
    setSlugManuallyEdited(false);
    setPhoneCode('+91');
    setPhoneCodeCustom('');
    setPhoneNumber('');
    setPhoneError('');
    setModalOpen(true);
  }
  function openEditModal(e: PartnershipEvent) {
    setEditingId(e.id);
    const { id: _id, eventId: _eventId, linkedEvent, createdAt: _createdAt, updatedAt: _updatedAt, createdBy: _createdBy, updatedBy: _updatedBy, ...rest } = e;
    void _id; void _eventId; void _createdAt; void _updatedAt; void _createdBy; void _updatedBy;
    // Best-effort recovery of Region/Country for events created before this record had a
    // reliable place to store it — several real sources may each hold a piece of the answer:
    //  1. `e.country` — the partnership record's own stored value, kept in sync on every save
    //     (see saveModal's `country: effectiveDraft.region` mirror). Most authoritative when set.
    //  2. `linkedEvent.country` — the linked website Event's own (newer) country column, set by
    //     syncLinkedEvent on save; populated for anything saved since that column existed.
    //  3. `linkedEvent.location` itself, if it's directly a recognised country/region name — for
    //     entries with no separate city (UAE, Singapore, Cohort, Online), syncLinkedEvent stores
    //     the region directly as `location` (`location = city || region`).
    //  4. Reverse-lookup `linkedEvent.location` as a CITY against COUNTRY_CITY_DATA — covers
    //     older records where only a city survived (e.g. "Dubai" → "UAE", "Mumbai" → "India").
    // Previously this used `linkedEvent.location` alone, which is normally a CITY, not a country
    // — showing e.g. "Delhi" in both the Region/Country and City fields for older events instead
    // of "India", while every one of the sources above sat unused.
    const regionValue =
      e.country
      || linkedEvent?.country
      || (linkedEvent?.location && COUNTRY_NAMES.includes(linkedEvent.location) ? linkedEvent.location : '')
      || (linkedEvent?.location ? countryForCity(linkedEvent.location) : null)
      || '';
    setDraft({
      ...rest,
      region: regionValue,
      partnershipType: rest.partnershipType,
      partnershipStatus: normalizeStatusForEdit(rest.partnershipStatus),
      // Old events (33 of 62 real rows — mostly bulk-imported before `initiated_date` was
      // captured, e.g. one actually created back in December) have this genuinely blank, showing
      // as an empty "Initiated date" when reopened for edit. Defaulting it to today HERE (only
      // when reopening an existing event, never in the Add-event reset — see emptyDraft(), which
      // already stamps a fresh event with today's date at creation time and works fine) gives the
      // admin a real value instead of blank.
      initiatedDate: rest.initiatedDate || todayStr(),
      // Events created directly on the Events tab (never through this tracker) often have a
      // partnership_events row with these left blank while the real data already lives on the
      // linked public Event — pull it over whenever the tracker's own field is empty, same
      // "prefer our own value, fall back to the linked Event" pattern as Region/Country above.
      // Deliberately never overrides a value that's already set here, even if it looks stale next
      // to the live site — an admin may have deliberately changed it and not yet republished.
      description: rest.description || linkedEvent?.description || '',
      eventStartDate: rest.eventStartDate || linkedEvent?.eventDate || todayStr(),
      eventStartTime: rest.eventStartTime || linkedEvent?.eventTime || '',
      website: rest.website || linkedEvent?.externalUrl || '',
      // "Completed" is automatic, never a dropdown option — reopening a published-then-auto-completed
      // event should still show/resave as "Published", not silently reset to Draft.
      siteStatus: linkedEvent?.status === 'completed' ? 'upcoming' : (linkedEvent?.status || 'draft'),
      slug: linkedEvent?.slug || '',
    });
    setModalError('');
    // Auto-expand any platform that already has images, so editing an event doesn't hide its own data.
    setOpenCreativePlatforms(new Set(SOCIAL_CREATIVE_PLATFORMS.filter((p) => e.socialCreatives.some((c) => c.platform === p))));
    setRegionOther(!!regionValue && !COUNTRY_NAMES.includes(regionValue));
    // A record with an already-live slug keeps it fixed (renaming the event shouldn't silently
    // break its existing URL); a not-yet-listed record still auto-follows Event Name edits.
    setSlugManuallyEdited(!!linkedEvent?.slug);
    const cities = citiesForCountry(regionValue);
    setCityOther(!!e.city && !!cities && !cities.includes(e.city));
    const parsedPhone = parseContact(e.contact);
    setPhoneCode(parsedPhone.code);
    setPhoneCodeCustom(parsedPhone.codeCustom);
    setPhoneNumber(parsedPhone.number);
    setPhoneError('');
    setModalOpen(true);
  }
  async function saveModal() {
    const closed = classifyStatus(draft.partnershipStatus) === 'Cancelled';
    const effectiveDraft = closed ? { ...draft, listing: 'No', listingLink: '' } : draft;
    if (closed && (draft.listing !== 'No' || draft.listingLink.trim())) {
      setDraft((d) => ({ ...d, listing: 'No', listingLink: '' }));
    }
    if (!effectiveDraft.eventName.trim()) { setModalError('Event name is required.'); return; }
    const publishRequiredMsg = (field: string) =>
      `${field} is required to Publish or Cancel this on the website — fill it in, or leave Website Listing Status as Draft for now.`;
    if (draft.siteStatus !== 'draft') {
      // Poster is only required (with its exact 1260×630 size enforced client-side by
      // ImageUpload, see the `required` prop below) once the admin is actually publishing —
      // a Draft can be saved without one while the rest of the listing is still being prepared.
      if (!draft.posterUrl.trim()) { setModalError(publishRequiredMsg('Event poster')); return; }
      if (!draft.region.trim()) { setModalError(publishRequiredMsg('Region/Country')); return; }
      if (!draft.eventStartDate.trim()) { setModalError(publishRequiredMsg('Event Start Date')); return; }
      if (!draft.venueAddress.trim()) { setModalError(publishRequiredMsg('Complete Address')); return; }
      if (!draft.googleLocationLink.trim()) { setModalError(publishRequiredMsg('Google Location (Maps link)')); return; }
    }
    // The banner image itself stays optional; a go-live date is mandatory as soon as one is
    // added, so nothing can reach the homepage carousel without an explicit start date.
    if (draft.bannerUrl.trim() && !draft.bannerStartDate.trim()) {
      setModalError('Banner Start Date is required once a homepage banner image is added — pick the date the banner should start showing (or remove the banner image).');
      return;
    }
    const missingSpeakerIdx = draft.speakers.findIndex((sp) => !sp.name.trim());
    if (missingSpeakerIdx !== -1) {
      setModalError(`Speaker/guest #${missingSpeakerIdx + 1}: Name is required (or remove that row).`);
      return;
    }
    const emailVal = draft.email.trim();
    if (emailVal && !EMAIL_RE.test(emailVal)) {
      setModalError('Email ID looks invalid — enter a valid address (e.g. name@example.com).');
      return;
    }
    if (phoneNumber.trim()) {
      if (phoneCode === 'other' && !CUSTOM_CODE_RE.test(phoneCodeCustom.trim())) {
        setModalError('Contact No.: enter a valid country code (e.g. +49).');
        return;
      }
      if (!phoneRule.pattern.test(phoneNumber.trim())) {
        setModalError(`Contact No.: ${phoneRule.message}`);
        return;
      }
    }
    const descVal = stripHtml(draft.description);
    if (draft.siteStatus !== 'draft' && !descVal) {
      setModalError(publishRequiredMsg('Event Description'));
      return;
    }
    if (descVal && descVal.length < EVENT_DESCRIPTION_MIN_LENGTH) {
      setModalError(`Event Description needs at least ${EVENT_DESCRIPTION_MIN_LENGTH} characters (currently ${descVal.length}).`);
      return;
    }
    const key = dedupKey(draft);
    const clashesWithOther = key !== null && events.some((x) => x.id !== editingId && dedupKey(x) === key);
    if (clashesWithOther) {
      setModalError('An event with this exact name + city + country + start date already exists — not saved.');
      return;
    }
    setSaving(true);
    setModalError('');
    // Country field was removed from the form (point 3) — Region/Country now covers it,
    // so mirror the selection into `country` for the existing dedup/exports/table columns.
    // lastUpdatedDate is stamped here rather than editable in the form — mirrors initiatedDate.
    const payload = {
      ...effectiveDraft,
      country: effectiveDraft.region,
      slug: slugify(effectiveDraft.slug),
      website: cleanWebsite(effectiveDraft.website),
      socialCreatives: effectiveDraft.socialCreatives.filter((c) => c.image.trim()),
      lastUpdatedDate: todayStr(),
    };
    try {
      const res = editingId
        ? await api(`/api/admin/partnership-events/${editingId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await api('/api/admin/partnership-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.success) {
        if (res.warning) {
          showToast(res.warning, 'error');
        } else {
          showToast(editingId ? 'Event updated.' : 'Event added.');
        }
        logActivity(editingId ? 'edited' : 'added', draft.eventName);
        setModalOpen(false);
        await loadEvents();
      } else {
        setModalError(res.error || 'Save failed.');
      }
    } catch (err) {
      setModalError(`Save failed: ${err instanceof Error ? err.message : 'network error'}. If this page was open before a recent update, try reloading it.`);
    } finally {
      setSaving(false);
    }
  }
  async function deleteEvent(id: number, name: string) {
    const linked = events.find((e) => e.id === id)?.linkedEvent;
    const warning = linked
      ? ` Its linked website event ("${SITE_STATUS_BADGE[linked.status]?.label || linked.status}") will NOT be deleted automatically — go to the Events tab if you also want to remove or unpublish it.`
      : '';
    if (!confirm(`Delete "${name}"? This cannot be undone.${warning}`)) return;
    const res = await api(`/api/admin/partnership-events/${id}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Event deleted.');
      logActivity('deleted', name);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } else {
      showToast(res.error || 'Delete failed.', 'error');
    }
  }
  async function runBulkDelete() {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} selected event(s)? This cannot be undone.`)) return;
    setBusy(true);
    const res = await api('/api/admin/partnership-events/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selectedIds], action: 'delete' }),
    });
    setBusy(false);
    if (res.success) {
      showToast(`${selectedIds.size} event(s) deleted.`);
      logActivity('deleted', `${selectedIds.size} events (bulk)`);
      setSelectedIds(new Set());
      await loadEvents();
    } else {
      showToast(res.error || 'Bulk delete failed.', 'error');
    }
  }

  /* ---------------- Import ---------------- */
  const IMPORT_BATCH_SIZE = 300;

  async function finalizeImport(
    allDrafts: EventDraft[],
    stats: ImportStats,
    sheetsRead: { name: string; rows: number }[],
    sheetsSkipped: { name: string; reason: string }[],
    dropped: number,
    emptyMessage: string
  ) {
    if (!allDrafts.length) {
      setBusy(false);
      setImportProgress(null);
      setImportLog((prev) => [{ imported: 0, updated: 0, dropped, unparseableDates: stats.unparseableDates, locationsGuessed: stats.locationsGuessed, sheetsRead, sheetsSkipped }, ...prev]);
      setImportPanelOpen(true);
      showToast(emptyMessage, 'error');
      return;
    }

    const totalRows = allDrafts.length;
    let imported = 0;
    let updated = 0;
    let serverDropped = 0;
    let uploadFailed = false;

    for (let offset = 0; offset < totalRows; offset += IMPORT_BATCH_SIZE) {
      const batch = allDrafts.slice(offset, offset + IMPORT_BATCH_SIZE);
      setImportProgress({ label: `Uploading events — ${offset} of ${totalRows}…`, current: offset, total: totalRows });
      try {
        const res = await api<{ imported: number; updated: number; dropped: number }>('/api/admin/partnership-events/import', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: batch }),
        });
        if (res.success && res.data) {
          imported += res.data.imported;
          updated += res.data.updated;
          serverDropped += res.data.dropped;
        } else {
          uploadFailed = true;
          showToast(res.error || 'Import failed partway through.', 'error');
          break;
        }
      } catch (err) {
        uploadFailed = true;
        showToast(`Import failed partway through: ${err instanceof Error ? err.message : 'network error'}`, 'error');
        break;
      }
    }
    setBusy(false);
    setImportProgress(null);
    setImportLog((prev) => [{
      imported,
      updated,
      dropped: serverDropped + dropped,
      unparseableDates: stats.unparseableDates,
      locationsGuessed: stats.locationsGuessed,
      sheetsRead, sheetsSkipped,
    }, ...prev]);
    setImportPanelOpen(true);
    if (!uploadFailed) showToast(`Imported ${imported} event(s)${updated ? `, updated ${updated} duplicate(s)` : ''}.`);
    await loadEvents();
  }

  async function handleImportFiles(fileList: FileList) {
    setBusy(true);
    const files = Array.from(fileList);
    setImportProgress({ label: files.length > 1 ? `Reading file 1 of ${files.length}…` : `Reading ${files[0].name}…`, current: 0, total: files.length });

    const allDrafts: EventDraft[] = [];
    const stats: ImportStats = { unparseableDates: 0, locationsGuessed: 0 };
    const sheetsRead: { name: string; rows: number }[] = [];
    const sheetsSkipped: { name: string; reason: string }[] = [];
    let dropped = 0;

    for (let fi = 0; fi < files.length; fi++) {
      const file = files[fi];
      setImportProgress({ label: files.length > 1 ? `Reading file ${fi + 1} of ${files.length} — ${file.name}` : `Reading ${file.name}…`, current: fi, total: files.length });
      try {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array', cellDates: true });
        dropped += processWorkbookIntoDrafts(wb, (sheetName) => (fileList.length > 1 ? `${file.name} — ${sheetName}` : sheetName), allDrafts, stats, sheetsRead, sheetsSkipped);
      } catch (err) {
        sheetsSkipped.push({ name: file.name, reason: `Could not read this file: ${err instanceof Error ? err.message : 'unknown error'}` });
      }
    }

    await finalizeImport(allDrafts, stats, sheetsRead, sheetsSkipped, dropped, 'No importable rows found in the selected file(s).');
  }

  async function loadFromSheetLink() {
    const parsed = extractSheetIdAndGid(sheetLinkValue.trim());
    if (!parsed) {
      showToast("Couldn't find a sheet ID in that link — paste the full Google Sheets URL.", 'error');
      return;
    }
    setBusy(true);
    setSheetLinkLoading(true);
    setImportProgress({ label: 'Fetching that tab…', current: 0, total: 1 });
    const csvUrl = `https://docs.google.com/spreadsheets/d/${parsed.id}/gviz/tq?tqx=out:csv&gid=${parsed.gid}`;
    try {
      const res = await fetch(csvUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const csvText = await res.text();
      if (/^\s*<(!DOCTYPE|html)/i.test(csvText)) throw new Error('Got a login/HTML page back — this sheet is probably not public.');
      const wb = XLSX.read(csvText, { type: 'string', cellDates: true });
      const rawSheetName = wb.SheetNames[0];
      const label = `Google Sheet (gid ${parsed.gid})`;
      wb.Sheets[label] = wb.Sheets[rawSheetName];
      wb.SheetNames = [label];

      const allDrafts: EventDraft[] = [];
      const stats: ImportStats = { unparseableDates: 0, locationsGuessed: 0 };
      const sheetsRead: { name: string; rows: number }[] = [];
      const sheetsSkipped: { name: string; reason: string }[] = [];
      const dropped = processWorkbookIntoDrafts(wb, (sn) => sn, allDrafts, stats, sheetsRead, sheetsSkipped);
      await finalizeImport(allDrafts, stats, sheetsRead, sheetsSkipped, dropped, 'No importable rows found in that sheet tab.');
      setSheetLinkValue('');
      setSheetLinkOpen(false);
    } catch (err) {
      setBusy(false);
      setImportProgress(null);
      showToast(`Couldn't load that tab (${err instanceof Error ? err.message : 'unknown error'}). Make sure it's shared as "Anyone with the link can view".`, 'error');
    } finally {
      setSheetLinkLoading(false);
    }
  }

  const activityCreatedFiltered = todayActivity.created.filter((x) => activityPersonFilter === 'all' || x.event.createdBy === activityPersonFilter);
  const activityUpdatedFiltered = todayActivity.updated.filter((x) => activityPersonFilter === 'all' || x.event.updatedBy === activityPersonFilter);

  const regionOptions = buildRegionOptions(draft.region);
  const citiesForSelectedCountry = citiesForCountry(draft.region);
  const effectivePhoneCode = phoneCode === 'other' ? (phoneCodeCustom.trim() || 'other') : phoneCode;
  const phoneRule = PHONE_RULES[effectivePhoneCode] || PHONE_RULES.other;
  // Draft = nothing but the name + the two core images need to be filled in yet. The moment
  // Website Listing Status leaves Draft (Published/Cancelled), the fields a real public event
  // page actually needs become required — mirrors saveModal()'s own validation exactly.
  const requiredToPublish = draft.siteStatus !== 'draft';

  /* ---------------- Render ---------------- */
  return (
    <AdminErrorBoundary>
      <div className={`pt-wrap ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
        <div className="pt-header">
          <div>
            <div className="pt-title">Partnership Tracker</div>
            <div className="pt-subtitle">Events, sponsorships and coverage partnerships in one place.</div>
          </div>
          <div className="pt-header-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => { if (e.target.files?.length) handleImportFiles(e.target.files); e.target.value = ''; }}
            />
            {importLog.length > 0 && (
              <div className="pt-popover-wrap" ref={importPanelRef}>
                <button className="btn btn-sm" onClick={() => setImportPanelOpen((o) => !o)}>ℹ Import details</button>
                {importPanelOpen && (
                  <div className="pt-popover-panel">
                    {importLog.map((log, i) => (
                      <div className="pt-import-entry" key={i}>
                        <div>
                          Imported <strong>{log.imported}</strong> new event(s)
                          {log.updated ? <> · updated <strong>{log.updated}</strong> existing duplicate(s) (matched by name + city + country + start date)</> : null}
                          {log.dropped ? <> · ignored {log.dropped} row(s) with no event name</> : null}
                          {log.locationsGuessed ? <> · <span className="pt-warn">guessed city/country for {log.locationsGuessed} row(s)</span> from the event name — please verify</> : null}
                          {log.unparseableDates ? <> · <span className="pt-warn">{log.unparseableDates} date value(s) couldn&apos;t be read</span> and were left blank</> : null}
                        </div>
                        {log.sheetsRead.map((r) => (
                          <div key={r.name} className="pt-import-line">✓ <strong>{r.name}</strong> — {r.rows} row(s)</div>
                        ))}
                        {log.sheetsSkipped.map((s) => (
                          <div key={s.name} className="pt-import-line pt-warn">✕ <strong>{s.name}</strong> — {s.reason}</div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="pt-popover-wrap" ref={sheetLinkRef}>
              <button className="btn btn-sm" onClick={() => setSheetLinkOpen((o) => !o)}>🔗 Load from link</button>
              {sheetLinkOpen && (
                <div className="pt-popover-panel pt-sheetlink-panel">
                  <input
                    type="text"
                    placeholder="Paste a Google Sheet link…"
                    value={sheetLinkValue}
                    onChange={(e) => setSheetLinkValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && sheetLinkValue.trim() && !sheetLinkLoading) loadFromSheetLink(); }}
                    style={{ width: '100%', marginBottom: 8 }}
                  />
                  <button className="btn btn-sm btn-accent" style={{ width: '100%' }} disabled={sheetLinkLoading || !sheetLinkValue.trim()} onClick={loadFromSheetLink}>
                    {sheetLinkLoading ? 'Loading…' : 'Load this tab'}
                  </button>
                  <div className="pt-link-note">
                    Sheet must be shared as &quot;Anyone with the link can view.&quot; Open the specific tab first so the link includes its <span className="pt-mono">#gid=</span> — paste again for each additional tab.
                  </div>
                </div>
              )}
            </div>
            <button className="btn" disabled={busy} onClick={() => fileInputRef.current?.click()}>
              {busy ? (<span className="pt-btn-loading"><svg className="pt-spinner" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path></svg>Uploading…</span>) : 'Upload / merge Excel'}
            </button>
            <button className="btn btn-green" onClick={() => downloadEventsExcel(filtered, `partnership-tracker-${new Date().toISOString().slice(0, 10)}.xlsx`)}>Download Excel</button>
            <button className="btn btn-accent" onClick={openAddModal}>+ Add event</button>
            <button className="btn btn-sm" onClick={openDailyReportModal}>📋 Daily Report</button>
            <button className="btn btn-sm pt-bell-btn" title="Daily report reminder" onClick={openDailyReportModal}>
              🔔{bellDue && <span className="pt-bell-dot" />}
            </button>
            <button className="btn btn-sm" title="Preview the reminder ringtone" onClick={playBellSound}>🔊</button>
            <audio ref={audioRef} preload="auto" src={BELL_RINGTONE_URL} style={{ display: 'none' }} />
          </div>
        </div>

        <div className="pt-main-tabs">
          <button className={mainTab === 'tracker' ? 'active' : ''} onClick={() => setMainTab('tracker')}>Partnership Tracker</button>
          <button className={mainTab === 'events' ? 'active' : ''} onClick={() => setMainTab('events')}>Events, Regions &amp; Banners</button>
        </div>

        {mainTab === 'events' && <EventsManagementTabs />}

        {mainTab === 'tracker' && (loading ? (
          <div className="pt-loading">Loading…</div>
        ) : (
          <>
            <div className="pt-cards">
              <div className={`pt-card pt-card-all ${cardFilter === null ? 'active' : ''}`} style={{ ['--dot' as string]: '#71798A' }} onClick={() => setCard(null)}>
                <div className="pt-card-label"><span className="pt-dot" />All events</div>
                <div className="pt-card-count">{counts.total}</div>
              </div>
              {STATUS_FILTER_ORDER.map((s) => {
                const isAlertCard = (s === 'Initiated' || s === 'Draft') && (counts.byStatus[s] || 0) > 0;
                return (
                  <div
                    key={s}
                    className={`pt-card ${cardFilter === s ? 'active' : ''} ${isAlertCard ? 'pt-card-blink' : ''}`}
                    style={{ ['--dot' as string]: isAlertCard ? '#C22B44' : STATUS_COLOR_HEX[s] }}
                    onClick={() => setCard(s)}
                  >
                    <div className="pt-card-label"><span className="pt-dot" />{s}</div>
                    <div className="pt-card-count">{counts.byStatus[s] || 0}</div>
                  </div>
                );
              })}
              <div
                className={`pt-card ${cardFilter === 'Listed' ? 'active' : ''}`}
                style={{ ['--dot' as string]: '#7C3FE0' }}
                onClick={() => setCard('Listed')}
                title={counts.listed === counts.listedClaimed ? undefined : `${counts.listed} of these ${counts.listed === 1 ? 'is' : 'are'} actually live on the site right now — the rest are marked Partnership Done / Only Listed but have no live page yet (missing or still-Draft listing).`}
              >
                <div className="pt-card-label">
                  <span className="pt-dot" />Listed
                </div>
                {/* Total count of Partnership Done + Only Listing status, regardless of whether
                    the linked website page is actually live yet — see isListedStatus. The
                    stricter "actually live right now" count (isLiveListed) is shown as a small
                    note below instead of gating the headline number, which is what made this
                    card read as "very low" before — most Partnership Done/Only Listed events
                    don't have a published (non-Draft) linked Event yet. */}
                <div className="pt-card-count">{counts.listedClaimed}</div>
                {counts.listed !== counts.listedClaimed && (
                  <div className="pt-card-warn-text">{counts.listed} live on site now</div>
                )}
              </div>
            </div>

            {(momData.keys.length > 0 || yoyData.years.length > 0) && (
              <div className="pt-chart-toggle" onClick={() => setChartsExpanded((v) => !v)}>
                <span>📊 Graphs — month on month &amp; year on year</span>
                <span className="pt-chart-toggle-arrow">{chartsExpanded ? '▾' : '▸'}</span>
              </div>
            )}

            {chartsExpanded && (
              <div className="pt-charts-grid">
                {momData.keys.length > 0 && (
                  <div className="pt-chart-box">
                    <div className="pt-chart-title">Month on month</div>
                    <div className="pt-chart-sub">Events by start date, last 12 months, stacked by status · click a segment to filter the table</div>
                    <div className="pt-chart-bars">
                      {momData.keys.map((k) => (
                        <div key={k} className="pt-chart-col">
                          <div className="pt-chart-bar-track">
                            {CHART_STATUSES.map((s) => {
                              const count = momData.map[k]?.[s] || 0;
                              if (!count) return null;
                              const active = monthFilter === k && cardFilter === s;
                              return (
                                <div
                                  key={s}
                                  className="pt-chart-seg"
                                  style={{ height: `${(count / momData.max) * 100}%`, background: STATUS_COLOR_HEX[s], opacity: monthFilter && !active ? 0.5 : 1 }}
                                  title={`${s}: ${count}`}
                                  onClick={() => {
                                    const same = monthFilter === k && cardFilter === s;
                                    setMonthFilter(same ? null : k);
                                    setCardFilter(same ? null : s);
                                    setPage(1);
                                  }}
                                />
                              );
                            })}
                          </div>
                          <div className="pt-chart-label">{monthLabel(k)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-chart-legend">
                      {CHART_STATUSES.map((s) => (
                        <span key={s} className="pt-legend-item"><span className="pt-legend-dot" style={{ background: STATUS_COLOR_HEX[s] }} />{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {yoyData.years.length > 0 && (
                  <div className="pt-chart-box">
                    <div className="pt-chart-title">Year on year</div>
                    <div className="pt-chart-sub">Same month, across years · click a point to filter the table</div>
                    <svg viewBox="0 0 360 130" className="pt-yoy-svg" preserveAspectRatio="none">
                      {yoyData.years.map((y, yi) => {
                        const color = YOY_PALETTE[yi % YOY_PALETTE.length];
                        const points = yoyData.grid[y].map((c, mi) => {
                          const x = (mi / 11) * 340 + 10;
                          const yy = 110 - (c / yoyData.max) * 100;
                          return `${x},${yy}`;
                        }).join(' ');
                        return (
                          <g key={y}>
                            <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
                            {yoyData.grid[y].map((c, mi) => {
                              const x = (mi / 11) * 340 + 10;
                              const yy = 110 - (c / yoyData.max) * 100;
                              const key = `${y}-${String(mi + 1).padStart(2, '0')}`;
                              const active = monthFilter === key;
                              return (
                                <circle
                                  key={mi} cx={x} cy={yy} r={active ? 4 : 2.5} fill={color} className="pt-yoy-point"
                                  onClick={() => { setMonthFilter(monthFilter === key ? null : key); setCardFilter(null); setPage(1); }}
                                >
                                  <title>{`${y} · ${c} event(s)`}</title>
                                </circle>
                              );
                            })}
                          </g>
                        );
                      })}
                    </svg>
                    <div className="pt-chart-legend">
                      {yoyData.years.map((y, yi) => (
                        <span key={y} className="pt-legend-item"><span className="pt-legend-dot" style={{ background: YOY_PALETTE[yi % YOY_PALETTE.length] }} />{y}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-toolbar">
              <div className="pt-search-wrap">
                <input placeholder="Search event, organiser, POC…" value={search} onChange={(e) => { setSearch(e.target.value); resetToPage1(); }} />
              </div>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); resetToPage1(); }}>
                <option value="all">Event Statuses</option>
                <option value="Listed">Listed</option>
                <option value="Draft">Draft</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Expired">Expired</option>
              </select>
              <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); resetToPage1(); }}>
                <option value="all">All Events</option>
                {PARTNERSHIP_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={listingFilter} onChange={(e) => { setListingFilter(e.target.value); resetToPage1(); }}>
                <option value="all">Partnership Statuses</option>
                <option value="Initiated">Initiated</option>
                <option value="Partnership Done">Partnership Done</option>
                <option value="Only Listing">Only Listing</option>
                <option value="Ticketing">Ticketing</option>
              </select>
              <select value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); resetToPage1(); }}>
                {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n} / page</option>)}
              </select>
              <span className="pt-clear" onClick={clearFilters}>Clear filters</span>
              {monthFilter && (
                <span className="pt-month-chip">
                  Showing: <strong>{monthLabel(monthFilter)}</strong>
                  <span className="pt-chip-x" onClick={() => setMonthFilter(null)}>✕</span>
                </span>
              )}
              <span className="pt-count-note">{filtered.length.toLocaleString()} of {events.length.toLocaleString()} events</span>
            </div>

            {selectedIds.size > 0 && (
              <div className="pt-bulk-bar">
                <span className="pt-bulk-count">{selectedIds.size} selected</span>
                <button className="btn btn-sm btn-danger" disabled={busy} onClick={runBulkDelete}>Delete selected</button>
                <span className="pt-bulk-link" onClick={() => setSelectedIds(new Set())}>Clear selection</span>
              </div>
            )}

            <div className="pt-tbl-wrap">
              <div className="pt-tbl-scroll">
                <table>
                  <thead>
                    <tr>
                      <th className="pt-col-chk">
                        <input
                          type="checkbox"
                          checked={pageList.length > 0 && pageList.every((e) => selectedIds.has(e.id))}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            pageList.forEach((ev) => { if (e.target.checked) next.add(ev.id); else next.delete(ev.id); });
                            setSelectedIds(next);
                          }}
                        />
                      </th>
                      <th className="pt-sticky" onClick={() => toggleSort('eventName')}>Event{sortKey === 'eventName' && <span className="pt-sort-arrow">{sortDir === 1 ? ' ▲' : ' ▼'}</span>}</th>
                      <th onClick={() => toggleSort('city')}>City{sortKey === 'city' && <span className="pt-sort-arrow">{sortDir === 1 ? ' ▲' : ' ▼'}</span>}</th>
                      <th onClick={() => toggleSort('country')}>Country{sortKey === 'country' && <span className="pt-sort-arrow">{sortDir === 1 ? ' ▲' : ' ▼'}</span>}</th>
                      <th onClick={() => toggleSort('eventStartDate')}>Start date{sortKey === 'eventStartDate' && <span className="pt-sort-arrow">{sortDir === 1 ? ' ▲' : ' ▼'}</span>}</th>
                      <th onClick={() => toggleSort('eventEndDate')}>End date{sortKey === 'eventEndDate' && <span className="pt-sort-arrow">{sortDir === 1 ? ' ▲' : ' ▼'}</span>}</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>View</th>
                      <th>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageList.length === 0 ? (
                      <tr><td colSpan={10} className="pt-empty">No events match these filters.</td></tr>
                    ) : pageList.map((e) => {
                      const d = derivedById.get(e.id)!;
                      const statusColor = STATUS_COLOR_HEX[d.statusBucket] || '#9CA3AF';
                      const typeColor = TYPE_COLOR_HEX[d.partnershipTypeResolved] || '#9CA3AF';
                      const startTime = fmtTime(e.eventStartTime);
                      const endTime = fmtTime(e.eventEndTime);
                      return (
                        <tr key={e.id} className={`pt-row-clickable ${selectedIds.has(e.id) ? 'pt-row-selected' : ''}`} onClick={() => openEditModal(e)}>
                          <td className="pt-col-chk" onClick={(ev) => ev.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(e.id)}
                              onChange={(ev) => {
                                const next = new Set(selectedIds);
                                if (ev.target.checked) next.add(e.id); else next.delete(e.id);
                                setSelectedIds(next);
                              }}
                            />
                          </td>
                          <td className="pt-sticky">
                            <div className="pt-ev-title">{e.eventName}</div>
                          </td>
                          <td className="pt-col-city">{e.city || <span className="pt-muted">—</span>}</td>
                          <td className="pt-col-country">
                            {e.country ? (
                              (() => {
                                const countryColor = countryPillColor(e.country);
                                return countryColor
                                  ? <span className="pt-pill" style={{ color: countryColor, borderColor: countryColor, background: `${countryColor}1A` }}>{e.country}</span>
                                  : e.country;
                              })()
                            ) : <span className="pt-muted">—</span>}
                          </td>
                          <td className="pt-mono pt-col-date">
                            {fmtMonthDay(e.eventStartDate)}
                            <div className="pt-cell-sub">{fmtYear(e.eventStartDate)}{startTime ? ` · ${startTime}` : ''}</div>
                          </td>
                          <td className="pt-mono pt-col-date">
                            {fmtMonthDay(e.eventEndDate)}
                            <div className="pt-cell-sub">{fmtYear(e.eventEndDate)}{endTime ? ` · ${endTime}` : ''}</div>
                            {d.dateOrderSuspect && <span className="pt-badge" style={{ color: '#C22B44' }} title="End date is before start date">⚠ order</span>}
                          </td>
                          <td className="pt-col-type">
                            {d.partnershipTypeResolved
                              ? <span className="pt-pill" style={{ color: typeColor, borderColor: typeColor, background: `${typeColor}1A` }}>{d.partnershipTypeResolved}</span>
                              : <span className="pt-muted">—</span>}
                          </td>
                          <td className="pt-col-status">
                            <span className="pt-pill" style={{ color: statusColor, borderColor: statusColor, background: `${statusColor}1A` }}>{d.statusBucket}</span>
                          </td>
                          <td className="pt-col-view" onClick={(ev) => ev.stopPropagation()}>
                            {e.linkedEvent ? (
                              <a href={`/startup-events/${e.linkedEvent.slug}`} target="_blank" rel="noopener noreferrer" className="pt-view-btn">View</a>
                            ) : (
                              <span className="pt-muted" title="Not listed on the site yet">—</span>
                            )}
                          </td>
                          <td className="pt-col-comment" title={e.comment}>{e.comment || <span className="pt-muted">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtered.length > 0 && (
                <div className="pt-pagination">
                  <span className="pt-page-info">Page {clampedPage} of {totalPages}</span>
                  <button disabled={clampedPage <= 1} onClick={() => setPage(1)}>« First</button>
                  <button disabled={clampedPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Prev</button>
                  <button disabled={clampedPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next ›</button>
                  <button disabled={clampedPage >= totalPages} onClick={() => setPage(totalPages)}>Last »</button>
                </div>
              )}
            </div>
          </>
        ))}

        {/* Import progress modal */}
        {importProgress && (
          <div className="pt-overlay open">
            <div className="pt-progress-modal">
              <div className="pt-progress-title">Uploading Excel…</div>
              <div className="pt-progress-label">{importProgress.label}</div>
              <div className="pt-progress-track">
                <div
                  className="pt-progress-fill"
                  style={{ width: `${importProgress.total ? Math.min(100, (importProgress.current / importProgress.total) * 100) : 0}%` }}
                />
              </div>
              <div className="pt-progress-pct">
                {importProgress.total ? Math.min(100, Math.round((importProgress.current / importProgress.total) * 100)) : 0}%
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit modal */}
        <div
          className={`pt-overlay ${modalOpen ? 'open' : ''}`}
          onMouseDown={(e) => { modalMouseDownOnBackdrop.current = e.target === e.currentTarget; }}
          onClick={(e) => { if (e.target === e.currentTarget && modalMouseDownOnBackdrop.current) setModalOpen(false); }}
        >
          <div className="pt-modal">
            <div className="pt-modal-header">
              <h2>{editingId ? 'Edit event' : 'Add event'}</h2>
              <button className="pt-modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="pt-modal-body">
              <div className="pt-form-grid pt-form-grid-3">
                <div className="pt-fg">
                  <label>Partnership Status</label>
                  <select
                    value={draft.partnershipStatus}
                    onChange={(e) => {
                      const nextStatus = e.target.value;
                      const closed = classifyStatus(nextStatus) === 'Cancelled';
                      setDraft({ ...draft, partnershipStatus: nextStatus, ...(closed ? { listing: 'No', listingLink: '' } : {}) });
                    }}
                  >
                    <option value="">—</option>
                    {draft.partnershipStatus && !STATUS_EDIT_ORDER.includes(draft.partnershipStatus) && (
                      <option value={draft.partnershipStatus} disabled>
                        {draft.partnershipStatus}
                        {/* Cancelled/Expired are legitimate, recognised terminal states — just not
                            manually re-pickable from this dropdown (see STATUS_EDIT_ORDER's own
                            comment) — so they're shown plainly. Only genuinely unrecognised text
                            that normalizeStatusForEdit couldn't map gets the "(legacy)" callout. */}
                        {(PARTNERSHIP_STATUS_OPTIONS as readonly string[]).includes(draft.partnershipStatus) ? '' : ' (legacy)'}
                      </option>
                    )}
                    {STATUS_EDIT_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="pt-fg">
                  <label>Event Type</label>
                  <select value={draft.partnershipType} onChange={(e) => setDraft({ ...draft, partnershipType: e.target.value })}>
                    <option value="">—</option>
                    {draft.partnershipType && !(PARTNERSHIP_TYPE_OPTIONS as readonly string[]).includes(draft.partnershipType) && (
                      <option value={draft.partnershipType} disabled>{draft.partnershipType} — old value, please pick one below</option>
                    )}
                    {PARTNERSHIP_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="pt-fg"><label>Initiated date</label><div className="pt-readonly-field">{fmtDisplay(draft.initiatedDate)}</div></div>
              </div>

              <div className="pt-section-title">1. Event basics</div>
              <div className="pt-form-grid">
                <div className="pt-fg pt-full">
                  <label>Name of the event *</label>
                  <input
                    placeholder="e.g. Startup Mixer | Mumbai | 14 Mar 2026"
                    value={draft.eventName}
                    onChange={(e) => {
                      const eventName = e.target.value;
                      setDraft((d) => ({ ...d, eventName, slug: slugManuallyEdited ? d.slug : slugify(eventName) }));
                    }}
                  />
                  <div className="pt-hint">Format: Event Name | City | Date</div>
                </div>
                <div className="pt-fg pt-full">
                  <label>Slug (website URL)</label>
                  <input
                    placeholder="auto-generated-from-event-name"
                    value={draft.slug}
                    onChange={(e) => { setSlugManuallyEdited(true); setDraft({ ...draft, slug: e.target.value }); }}
                  />
                  <div className="pt-hint">Auto-fills from the event name — edit only if this event is already listed and you don&apos;t want to change its live URL.</div>
                </div>
                <div className="pt-fg">
                  <label>Region/Country (for website listing){requiredToPublish && ' *'}</label>
                  {regionOther ? (
                    <>
                      <input
                        placeholder="Enter region/country"
                        value={draft.region}
                        onChange={(e) => setDraft({ ...draft, region: e.target.value })}
                      />
                      <div className="pt-hint"><span className="pt-add-line" onClick={() => { setRegionOther(false); setCityOther(false); setDraft({ ...draft, region: '', city: '' }); }}>← Choose from list</span></div>
                    </>
                  ) : (
                    <>
                      <select
                        value={draft.region}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '__other__') {
                            setRegionOther(true);
                            setCityOther(false);
                            setDraft({ ...draft, region: '', city: '' });
                            return;
                          }
                          setCityOther(false);
                          setDraft({ ...draft, region: value, city: '' });
                        }}
                      >
                        <option value="">Select region/country</option>
                        {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
                        <option value="__other__">Others…</option>
                      </select>
                      <div className="pt-hint">Not listed? Pick &quot;Others…&quot; and type it in.</div>
                    </>
                  )}
                </div>
                <div className="pt-fg">
                  <label>City</label>
                  {citiesForSelectedCountry ? (
                    cityOther ? (
                      <>
                        <input placeholder="Enter city" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
                        <div className="pt-hint"><span className="pt-add-line" onClick={() => { setCityOther(false); setDraft({ ...draft, city: '' }); }}>← Choose from list</span></div>
                      </>
                    ) : (
                      <select
                        value={draft.city}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '__other__') { setCityOther(true); setDraft({ ...draft, city: '' }); return; }
                          setDraft({ ...draft, city: value });
                        }}
                      >
                        <option value="">Select city</option>
                        {citiesForSelectedCountry.map((c) => <option key={c} value={c}>{c}</option>)}
                        <option value="__other__">Others…</option>
                      </select>
                    )
                  ) : (
                    <input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
                  )}
                </div>
                <div className="pt-fg"><label>Organiser/Company Name</label><input value={draft.organiser} onChange={(e) => setDraft({ ...draft, organiser: e.target.value })} /></div>
                <div className="pt-fg">
                  <label>POC - Name</label>
                  <input
                    value={draft.poc}
                    onChange={(e) => {
                      const poc = e.target.value;
                      // Organiser autopicks the POC value until the admin edits Organiser themselves.
                      setDraft((d) => ({ ...d, poc, organiser: (!d.organiser.trim() || d.organiser === d.poc) ? poc : d.organiser }));
                    }}
                  />
                </div>
                <div className="pt-fg">
                  <label>Contact No.</label>
                  <div className="pt-phone-row">
                    <select
                      value={phoneCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        setPhoneCode(code);
                        setDraft((d) => ({ ...d, contact: combineContact(code, phoneCodeCustom, phoneNumber) }));
                        setPhoneError('');
                      }}
                    >
                      {COUNTRY_CODE_OPTIONS.map((c) => (
                        <option key={c.code} value={c.code}>{c.code === 'other' ? '🌐 Other' : `${c.emoji} ${c.code}`}</option>
                      ))}
                    </select>
                    {phoneCode === 'other' && (
                      <input
                        type="text"
                        placeholder="+xxx"
                        value={phoneCodeCustom}
                        onChange={(e) => {
                          const codeCustom = e.target.value;
                          setPhoneCodeCustom(codeCustom);
                          setDraft((d) => ({ ...d, contact: combineContact(phoneCode, codeCustom, phoneNumber) }));
                        }}
                        style={{ width: 70, flex: '0 0 70px' }}
                      />
                    )}
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={phoneRule.maxLen}
                      placeholder="e.g. 98765 43210"
                      value={phoneNumber}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, phoneRule.maxLen);
                        setPhoneNumber(digits);
                        setDraft((d) => ({ ...d, contact: combineContact(phoneCode, phoneCodeCustom, digits) }));
                        setPhoneError('');
                      }}
                      onKeyDown={(e) => {
                        const isDigit = /^[0-9]$/.test(e.key);
                        const isControlKey = e.key.length > 1 || e.ctrlKey || e.metaKey || e.altKey;
                        if (!isDigit && !isControlKey) { e.preventDefault(); return; }
                        const hasSelection = e.currentTarget.selectionStart !== e.currentTarget.selectionEnd;
                        if (isDigit && !hasSelection && phoneNumber.length >= phoneRule.maxLen) e.preventDefault();
                      }}
                      onBlur={() => {
                        if (!phoneNumber.trim()) { setPhoneError(''); return; }
                        setPhoneError(phoneRule.pattern.test(phoneNumber.trim()) ? '' : phoneRule.message);
                      }}
                      style={{ flex: 1 }}
                    />
                  </div>
                  {phoneError && <div className="pt-hint pt-hint-warn">{phoneError}</div>}
                </div>
                <div className="pt-fg"><label>Email ID</label><input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value.replace(/\s/g, '') })} /></div>
                <div className="pt-fg">
                  <label>Email Thread</label>
                  <input placeholder="https://mail.google.com/mail/u/0/#inbox/…" value={draft.emailThread} onChange={(e) => setDraft({ ...draft, emailThread: e.target.value })} />
                  <div className="pt-hint">Paste the direct Gmail thread link for this conversation.</div>
                </div>
                <div className="pt-fg"><label>Registration Link</label><input value={draft.website} onChange={(e) => setDraft({ ...draft, website: e.target.value })} /></div>
              </div>

              <div className="pt-section-title">2. Event start &amp; end date/time</div>
              <div className="pt-form-grid">
                <div className="pt-fg"><label>Event Start Date{requiredToPublish && ' *'}</label><input type="date" value={draft.eventStartDate} onChange={(e) => setDraft({ ...draft, eventStartDate: e.target.value })} /></div>
                <div className="pt-fg"><label>Event Start Time</label><input type="time" value={draft.eventStartTime} onChange={(e) => setDraft({ ...draft, eventStartTime: e.target.value })} /></div>
                <div className="pt-fg"><label>Event End Date</label><input type="date" value={draft.eventEndDate} onChange={(e) => setDraft({ ...draft, eventEndDate: e.target.value })} /></div>
                <div className="pt-fg"><label>Event End Time</label><input type="time" value={draft.eventEndTime} onChange={(e) => setDraft({ ...draft, eventEndTime: e.target.value })} /></div>
                <div className="pt-fg"><label>Last Updated Date</label><div className="pt-readonly-field">{draft.lastUpdatedDate ? fmtDisplay(draft.lastUpdatedDate) : '—'}</div></div>
              </div>

              <div className="pt-section-title">3. Venue{requiredToPublish && ' *'}</div>
              <div className="pt-form-grid">
                <div className="pt-fg pt-full"><label>Complete Address{requiredToPublish && ' *'}</label><textarea value={draft.venueAddress} onChange={(e) => setDraft({ ...draft, venueAddress: e.target.value })} /></div>
                <div className="pt-fg pt-full"><label>Google Location (Maps link){requiredToPublish && ' *'}</label><input value={draft.googleLocationLink} onChange={(e) => setDraft({ ...draft, googleLocationLink: e.target.value })} placeholder="https://maps.google.com/…" /></div>
              </div>

              <div className="pt-section-title">4. Event description{requiredToPublish && ' *'}</div>
              <div className="pt-form-grid">
                <div className="pt-fg pt-full">
                  <RichTextEditor
                    value={draft.description}
                    onChange={(description) => setDraft({ ...draft, description })}
                    placeholder="Event description (formatting supported)..."
                    minHeight={200}
                  />
                  <div className={`pt-hint ${stripHtml(draft.description).length > 0 && stripHtml(draft.description).length < EVENT_DESCRIPTION_MIN_LENGTH ? 'pt-hint-warn' : ''}`}>
                    {stripHtml(draft.description).length} / {EVENT_DESCRIPTION_MIN_LENGTH} characters minimum
                  </div>
                </div>
              </div>

              <div className="pt-section-title">6. Key speakers / guests</div>
              {draft.speakers.map((sp, i) => (
                <div className="pt-speaker-row" key={i}>
                  <input placeholder="Name *" value={sp.name} onChange={(e) => { const next = [...draft.speakers]; next[i] = { ...next[i], name: e.target.value }; setDraft({ ...draft, speakers: next }); }} />
                  <input placeholder="Designation" value={sp.designation} onChange={(e) => { const next = [...draft.speakers]; next[i] = { ...next[i], designation: e.target.value }; setDraft({ ...draft, speakers: next }); }} />
                  <input placeholder="Company" value={sp.company} onChange={(e) => { const next = [...draft.speakers]; next[i] = { ...next[i], company: e.target.value }; setDraft({ ...draft, speakers: next }); }} />
                  <input placeholder="Others" value={sp.others} onChange={(e) => { const next = [...draft.speakers]; next[i] = { ...next[i], others: e.target.value }; setDraft({ ...draft, speakers: next }); }} />
                  <button type="button" className="pt-rm" onClick={() => setDraft({ ...draft, speakers: draft.speakers.filter((_, idx) => idx !== i) })}>✕</button>
                </div>
              ))}
              <span className="pt-add-line" onClick={() => setDraft({ ...draft, speakers: [...draft.speakers, emptySpeaker()] })}>+ Add speaker/guest</span>

              <div className="pt-section-title" style={{ marginTop: 18 }}>7. Event poster (event page listing){requiredToPublish && ' *'}</div>
              <div className="pt-hint" style={{ marginBottom: 6 }}>{POSTER_SPEC}</div>
              <ImageUpload value={draft.posterUrl} onChange={(url) => setDraft({ ...draft, posterUrl: url })} label="Event poster" required={requiredToPublish} exactDimensions={IMAGE_SPECS.cover} />

              <div className="pt-section-title">8. Event banner (homepage)</div>
              <div className="pt-hint" style={{ marginBottom: 6 }}>{BANNER_SPEC} Optional — but once a banner is added, the start date below decides when it appears on the homepage.</div>
              <ImageUpload value={draft.bannerUrl} onChange={(url) => setDraft({ ...draft, bannerUrl: url })} label="Homepage banner" exactDimensions={IMAGE_SPECS.banner} />
              <div className="pt-form-grid" style={{ marginTop: 10 }}>
                <div className="pt-fg">
                  <label>Banner Start Date{draft.bannerUrl.trim() && ' *'}</label>
                  <input
                    type="date"
                    value={draft.bannerStartDate}
                    onChange={(e) => setDraft({ ...draft, bannerStartDate: e.target.value })}
                  />
                  <span className="pt-hint">
                    {/* Scheduled, not immediate — the banner row is created on save but stays hidden
                        until this date (see PartnershipEventsService.syncHomepageBanner). */}
                    The banner starts showing on the homepage on this date — not before. It comes down
                    automatically after the event&apos;s last day.
                  </span>
                </div>
              </div>

              <div className="pt-section-title">9. Social media posts</div>
              <div className="pt-hint" style={{ marginBottom: 6 }}>Suggested content only — we&apos;ll recreate and finalise this to match our page before publishing.</div>
              <div className="pt-form-grid">
                <div className="pt-fg pt-full"><textarea rows={4} value={draft.socialMediaPosts} onChange={(e) => setDraft({ ...draft, socialMediaPosts: e.target.value })} /></div>
              </div>

              <div className="pt-section-title">10. Social media creatives</div>
              <div className="pt-hint" style={{ marginBottom: 6 }}>{SOCIAL_CREATIVE_SPEC} Pick a platform below, then add as many images as you like for it.</div>
              <div className="pt-platform-toggle-row">
                {SOCIAL_CREATIVE_PLATFORMS.map((p) => (
                  <button
                    key={p} type="button"
                    className={`pt-platform-toggle-btn ${openCreativePlatforms.has(p) ? 'open' : ''}`}
                    onClick={() => setOpenCreativePlatforms((prev) => { const next = new Set(prev); if (next.has(p)) next.delete(p); else next.add(p); return next; })}
                  >{SOCIAL_CREATIVE_PLATFORM_LABELS[p]}</button>
                ))}
              </div>
              {[...SOCIAL_CREATIVE_PLATFORMS.filter((p) => openCreativePlatforms.has(p)), ...(draft.socialCreatives.some((c) => c.platform === 'other') ? ['other'] : [])].map((platform) => (
                <div className="pt-creative-platform-block" key={platform}>
                  <div className="pt-creative-platform-label">
                    <span>{SOCIAL_CREATIVE_PLATFORM_LABELS[platform] || platform}</span>
                    {platform === 'other' && (
                      <button type="button" className="pt-remove-social-btn" onClick={() => setDraft({ ...draft, socialCreatives: draft.socialCreatives.filter((c) => c.platform !== 'other') })}>Clear</button>
                    )}
                  </div>
                  {draft.socialCreatives.map((c, i) => c.platform !== platform ? null : (
                    <div className="pt-speaker-row" key={i}>
                      <div style={{ flex: 1 }}>
                        <ImageUpload value={c.image} onChange={(v) => { const next = [...draft.socialCreatives]; next[i] = { ...next[i], image: v }; setDraft({ ...draft, socialCreatives: next }); }} label={`${SOCIAL_CREATIVE_PLATFORM_LABELS[platform] || platform} image`} exactDimensions={IMAGE_SPECS.social} />
                      </div>
                      <button type="button" className="pt-rm" onClick={() => setDraft({ ...draft, socialCreatives: draft.socialCreatives.filter((_, idx) => idx !== i) })}>✕</button>
                    </div>
                  ))}
                  {platform !== 'other' && (
                    <span className="pt-add-line" onClick={() => setDraft({ ...draft, socialCreatives: [...draft.socialCreatives, { platform, image: '' }] })}>+ Add image</span>
                  )}
                </div>
              ))}

              <div className="pt-section-title" style={{ marginTop: 18 }}>Partnership tracking</div>
              <div className="pt-form-grid">
                <div className="pt-fg pt-full"><label>Internal comment</label><textarea value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} /></div>
                <div className="pt-fg pt-full">
                  <label>Website Listing Status *</label>
                  <select value={draft.siteStatus} onChange={(e) => setDraft({ ...draft, siteStatus: e.target.value as EventDraft['siteStatus'] })}>
                    {SITE_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              {modalError && <div className="pt-modal-error">{modalError}</div>}
            </div>
            <div className="pt-modal-footer">
              {editingId && (
                <button
                  className="btn btn-danger"
                  style={{ marginRight: 'auto' }}
                  onClick={() => { setModalOpen(false); deleteEvent(editingId, draft.eventName); }}
                >
                  Delete event
                </button>
              )}
              <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-accent" disabled={saving} onClick={saveModal}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add event'}</button>
            </div>
          </div>
        </div>

        {/* Daily report modal */}
        <div
          className={`pt-overlay ${dailyReportOpen ? 'open' : ''}`}
          onMouseDown={(e) => { dailyReportMouseDownOnBackdrop.current = e.target === e.currentTarget; }}
          onClick={(e) => { if (e.target === e.currentTarget && dailyReportMouseDownOnBackdrop.current) setDailyReportOpen(false); }}
        >
          <div className="pt-modal" style={{ width: 560 }}>
            <div className="pt-modal-header">
              <h2>Daily Report</h2>
              <button className="pt-modal-close" onClick={() => setDailyReportOpen(false)}>✕</button>
            </div>
            <div className="pt-modal-body">
              <div className="pt-form-grid">
                <div className="pt-fg pt-full">
                  <label>Your Name</label>
                  <div className="pt-readonly-field">{getAdminUser()?.name || getAdminUser()?.email || 'Not signed in'}</div>
                </div>
                <div className="pt-fg pt-full">
                  <label>Preview — edit freely before sending</label>
                  <textarea rows={12} value={reportText} onChange={(e) => setReportText(e.target.value)} />
                </div>
              </div>

              <div className="pt-section-title">Today&apos;s activity</div>
              <div className="pt-form-grid">
                <div className="pt-fg pt-full">
                  <label>Filter by team member</label>
                  <select value={activityPersonFilter} onChange={(e) => setActivityPersonFilter(e.target.value)}>
                    <option value="all">All team members</option>
                    {activityPeople.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="pt-activity-grid">
                <div className="pt-activity-col">
                  <div className="pt-activity-col-title">Created today ({activityCreatedFiltered.length})</div>
                  {activityCreatedFiltered.length === 0 ? (
                    <div className="pt-muted">None</div>
                  ) : activityCreatedFiltered.map(({ event, at }) => (
                    <div key={event.id} className="pt-activity-row">
                      <span className="pt-activity-name">{event.eventName}</span>
                      <span className="pt-activity-meta">{event.createdBy || 'Unknown'} · {fmtDateTime(at)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-activity-col">
                  <div className="pt-activity-col-title">Updated today ({activityUpdatedFiltered.length})</div>
                  {activityUpdatedFiltered.length === 0 ? (
                    <div className="pt-muted">None</div>
                  ) : activityUpdatedFiltered.map(({ event, at }) => (
                    <div key={event.id} className="pt-activity-row">
                      <span className="pt-activity-name">{event.eventName}</span>
                      <span className="pt-activity-meta">{event.updatedBy || 'Unknown'} · {fmtDateTime(at)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {reportError && <div className="pt-modal-error">{reportError}</div>}
            </div>
            <div className="pt-modal-footer">
              <span style={{ fontSize: 11.5, color: 'var(--faint)', marginRight: 'auto' }}>Sends via WhatsApp to the team&apos;s daily-report number</span>
              <button className="btn btn-accent" onClick={sendReportOnWhatsApp}>Send on WhatsApp</button>
            </div>
          </div>
        </div>

        {toast && <div className={`pt-toast ${toast.kind}`}>{toast.msg}</div>}
      </div>

      <style jsx global>{`
        .pt-wrap {
          --bg: #F5F6F8; --surface: #FFFFFF; --surface-2: #EEF0F3; --border: #DCE0E6;
          --text: #1B1F26; --muted: #5B6472; --faint: #71798A; --accent: #2563C7;
          font-family: var(--font-pt-body), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px; color: var(--text);
        }
        .pt-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-bottom: 16px; }
        .pt-title { font-family: var(--font-pt-display), sans-serif; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.3px; }
        .pt-subtitle { font-size: 12.5px; color: var(--muted); margin-top: 4px; }
        .pt-header-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .pt-loading { padding: 40px; text-align: center; color: var(--muted); }
        .pt-btn-loading { display: inline-flex; align-items: center; gap: 6px; }
        .pt-spinner { animation: pt-spin 1s linear infinite; }
        @keyframes pt-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .btn { height: 36px; padding: 0 14px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--text); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
        .btn:hover { background: var(--surface-2); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-accent { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
        .btn-green { background: #1E9E64; border-color: #1E9E64; color: #fff; font-weight: 600; }
        .btn-danger { color: #C22B44; border-color: #C22B44; }
        .btn-danger:hover { background: rgba(194,43,68,0.08); }
        .btn-sm { height: 30px; padding: 0 10px; font-size: 12px; }
        .pt-bell-btn { position: relative; }
        .pt-bell-dot { position: absolute; top: 2px; right: 4px; width: 8px; height: 8px; border-radius: 50%; background: #C22B44; animation: pt-bellpulse 1.3s infinite; }
        @keyframes pt-bellpulse { 0% { box-shadow: 0 0 0 0 rgba(194,43,68,.65); } 70% { box-shadow: 0 0 0 8px rgba(194,43,68,0); } 100% { box-shadow: 0 0 0 0 rgba(194,43,68,0); } }

        .pt-popover-wrap { position: relative; }
        .pt-popover-panel {
          position: absolute; top: calc(100% + 6px); left: 0; z-index: 30;
          background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
          padding: 14px 16px; width: 440px; max-width: 90vw; max-height: 60vh; overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,.14);
          font-size: 12.5px; color: var(--muted); line-height: 1.5;
        }
        .pt-import-entry { padding: 8px 0; border-bottom: 1px solid var(--border); }
        .pt-import-entry:last-child { border-bottom: none; }
        .pt-import-line { padding: 3px 0; }
        .pt-warn { color: #B9790A; }
        .pt-sheetlink-panel { width: 340px; }
        .pt-sheetlink-panel input[type=text] { height: 34px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text); font-size: 13px; outline: none; }
        .pt-link-note { font-size: 11px; color: var(--faint); line-height: 1.5; margin-top: 8px; }

        .pt-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-bottom: 18px; }
        .pt-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 13px 15px; cursor: pointer; transition: border-color .15s, transform .15s; }
        .pt-card:hover { border-color: var(--faint); transform: translateY(-1px); }
        .pt-card.active { border-color: var(--dot); box-shadow: 0 0 0 1px var(--dot) inset; }
        .pt-card-all { background: linear-gradient(135deg, var(--surface), var(--surface-2)); }
        .pt-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--dot); display: inline-block; margin-right: 6px; }
        .pt-card-label { font-size: 11.5px; color: var(--muted); display: flex; align-items: center; }
        .pt-card-count { font-family: var(--font-pt-display), sans-serif; font-size: 24px; font-weight: 700; margin-top: 5px; }
        .pt-card-warn-icon { margin-left: 5px; color: #C22B44; font-size: 11px; }
        .pt-card-warn-text { margin-top: 4px; font-size: 10px; color: #C22B44; font-weight: 600; }
        .pt-card-blink { border-color: #C22B44; animation: pt-card-blink-anim 1.2s ease-in-out infinite; }
        .pt-card-blink .pt-card-count { color: #C22B44; }
        @keyframes pt-card-blink-anim {
          0%, 100% { box-shadow: 0 0 0 1px #C22B44 inset; background: var(--surface); }
          50% { box-shadow: 0 0 0 1px #C22B44 inset; background: rgba(194, 43, 68, 0.12); }
        }

        .pt-chart-toggle { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 13px 16px; margin-bottom: 14px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 500; transition: border-color .15s; }
        .pt-chart-toggle:hover { border-color: var(--faint); }
        .pt-chart-toggle-arrow { color: var(--muted); }
        .pt-charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
        @media (max-width: 900px) { .pt-charts-grid { grid-template-columns: 1fr; } }
        .pt-chart-box { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; }
        .pt-chart-title { font-family: var(--font-pt-display), sans-serif; font-size: 13px; font-weight: 600; }
        .pt-chart-sub { color: var(--muted); font-size: 11.5px; margin-bottom: 12px; }
        .pt-chart-bars { display: flex; align-items: flex-end; gap: 6px; height: 140px; }
        .pt-chart-col { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; }
        .pt-chart-bar-track { flex: 1; width: 100%; display: flex; flex-direction: column-reverse; align-items: stretch; }
        .pt-chart-seg { width: 100%; cursor: pointer; transition: opacity .15s; }
        .pt-chart-seg:first-child { border-radius: 4px 4px 0 0; }
        .pt-chart-label { font-size: 10px; color: var(--muted); margin-top: 6px; white-space: nowrap; }
        .pt-chart-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
        .pt-legend-item { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; color: var(--muted); }
        .pt-legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
        .pt-yoy-svg { width: 100%; height: 140px; }
        .pt-yoy-point { cursor: pointer; }

        .pt-toolbar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 14px; }
        .pt-main-tabs { display: flex; gap: 0; border-bottom: 2px solid var(--border); margin-bottom: 18px; }
        .pt-main-tabs button { padding: 10px 18px; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -2px; font-weight: 500; color: var(--muted); cursor: pointer; font-size: 13.5px; font-family: inherit; }
        .pt-main-tabs button.active { font-weight: 700; color: var(--accent); border-bottom-color: var(--accent); }
        .pt-main-tabs button:hover:not(.active) { color: var(--text); }
        .pt-search-wrap input { width: 240px; height: 36px; padding: 0 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; outline: none; }
        .pt-wrap select { height: 36px; padding: 0 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 12.5px; outline: none; cursor: pointer; }
        .pt-clear { color: var(--muted); font-size: 12.5px; cursor: pointer; text-decoration: underline; }
        .pt-count-note { color: var(--muted); font-size: 12.5px; margin-left: auto; white-space: nowrap; }
        .pt-month-chip { display: inline-flex; align-items: center; gap: 6px; background: var(--accent); color: #fff; padding: 4px 10px; border-radius: 20px; font-size: 12px; }
        .pt-chip-x { cursor: pointer; }

        .pt-bulk-bar { display: flex; align-items: center; gap: 10px; background: rgba(37,99,199,0.08); border: 1px solid rgba(37,99,199,0.28); border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; }
        .pt-bulk-count { font-size: 12px; font-weight: 700; color: var(--accent); }
        .pt-bulk-link { font-size: 11px; color: var(--accent); cursor: pointer; font-weight: 600; margin-left: auto; }

        .pt-tbl-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
        .pt-tbl-scroll { overflow: auto; max-height: 65vh; }
        .pt-wrap table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 760px; }
        .pt-wrap thead th { text-align: left; padding: 11px 14px; color: var(--muted); font-weight: 500; font-size: 11.5px; text-transform: uppercase; letter-spacing: .4px; border-bottom: 1px solid var(--border); background: var(--surface-2); cursor: pointer; white-space: nowrap; position: sticky; top: 0; z-index: 3; }
        .pt-sort-arrow { color: var(--accent); }
        .pt-col-chk { width: 38px; cursor: default !important; }
        .pt-sticky { position: sticky; left: 0; background: var(--surface); z-index: 2; box-shadow: 1px 0 0 var(--border); }
        thead .pt-sticky { z-index: 4; background: var(--surface-2); }
        .pt-wrap tbody tr { border-bottom: 1px solid var(--border); }
        .pt-wrap tbody tr:last-child { border-bottom: none; }
        .pt-wrap tbody tr:hover td { background: var(--surface-2); }
        .pt-row-clickable { cursor: pointer; }
        .pt-row-selected td { background: rgba(37,99,199,0.08) !important; }
        .pt-wrap td { padding: 10px 14px; vertical-align: middle; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        /* Narrower per-column caps (Event keeps the shared 220px above) so more columns fit in
           view without horizontal scroll — max-width + ellipsis, not a hard width, so nothing
           actually collapses or overlaps, it just truncates gracefully like Event/Comment already did. */
        .pt-col-city { max-width: 100px; }
        .pt-col-country { max-width: 110px; }
        .pt-col-date { max-width: 90px; }
        .pt-col-type { max-width: 120px; }
        .pt-col-status { max-width: 130px; }
        .pt-col-view { max-width: 70px; text-align: center; }
        .pt-col-comment { max-width: 150px; }
        .pt-view-btn {
          display: inline-flex; align-items: center; justify-content: center; border-radius: 20px;
          font-size: 11.5px; font-weight: 600; padding: 3px 12px; border: 1px solid var(--accent);
          color: var(--accent); text-decoration: none; white-space: nowrap;
        }
        .pt-view-btn:hover { background: var(--accent); color: #fff; }
        /* Event name wraps onto a second line instead of the single-line ellipsis every other
           column uses — long titles were getting cut off after just a few words. */
        .pt-wrap td.pt-sticky { white-space: normal; overflow: visible; text-overflow: clip; }
        .pt-ev-title { font-weight: 600; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.35; }
        .pt-cell-sub { color: var(--faint); font-size: 11px; margin-top: 2px; }
        .pt-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; border: 1px solid currentColor; padding: 2px 7px; border-radius: 20px; margin-left: 6px; white-space: nowrap; }
        .pt-mono { font-family: var(--font-pt-mono), ui-monospace, monospace; font-size: 12px; }
        .pt-muted { color: var(--faint); }
        .pt-link { color: var(--accent); }
        .pt-pill { display: inline-flex; align-items: center; border-radius: 20px; font-size: 11.5px; font-weight: 600; padding: 3px 10px; border: 1px solid currentColor; white-space: nowrap; }
        .pt-empty { padding: 44px; text-align: center; color: var(--muted); }

        .pt-pagination { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 12px 14px; border-top: 1px solid var(--border); font-size: 12.5px; color: var(--muted); }
        .pt-page-info { margin-right: auto; }
        .pt-pagination button { height: 30px; padding: 0 12px; border-radius: 7px; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--text); }
        .pt-pagination button:disabled { opacity: .4; cursor: default; }

        .pt-overlay { display: none; position: fixed; inset: 0; background: rgba(16,26,43,0.45); z-index: 1000; align-items: center; justify-content: center; padding: 20px; }
        .pt-overlay.open { display: flex; }
        .pt-modal { background: var(--surface); border-radius: 14px; width: 80vw; max-width: 1400px; max-height: 90vh; overflow-y: auto; box-shadow: 0 24px 48px rgba(16,26,43,0.25); }
        @media (max-width: 900px) { .pt-modal { width: 96vw; } }
        .pt-modal-header { padding: 20px 24px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; background: var(--surface); z-index: 1; }
        .pt-modal-header h2 { font-size: 16px; margin: 0; }
        .pt-modal-close { background: none; border: none; color: var(--muted); font-size: 18px; cursor: pointer; }
        .pt-modal-body { padding: 20px 24px; }
        .pt-section-title { font-size: 12px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: .4px; margin: 18px 0 10px; }
        .pt-section-title:first-child { margin-top: 0; }
        .pt-hint { font-size: 11px; color: var(--faint); }
        .pt-hint-warn { color: #B9790A; }
        .pt-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 14px; }
        .pt-form-grid-3 { grid-template-columns: 1fr 1fr 1fr; }
        @media (max-width: 700px) { .pt-form-grid-3 { grid-template-columns: 1fr; } }
        .pt-fg { display: flex; flex-direction: column; gap: 5px; }
        .pt-fg.pt-full { grid-column: 1/-1; }
        .pt-fg label { font-size: 11px; color: var(--muted); }
        .pt-fg input, .pt-fg select, .pt-fg textarea { min-height: 36px; padding: 0 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 13px; outline: none; font-family: inherit; }
        .pt-phone-row { display: flex; gap: 6px; }
        .pt-phone-row select { flex: 0 0 88px; width: 88px; padding: 0 6px; }
        .pt-fg textarea { min-height: 64px; padding: 10px 12px; resize: vertical; width: 100%; }
        .pt-speaker-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: flex-start; }
        .pt-speaker-row input { flex: 1; height: 36px; padding: 0 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; font-size: 13px; color: var(--text); }
        .pt-speaker-row .pt-rm { width: 34px; height: 36px; flex: 0 0 34px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; color: var(--muted); font-size: 14px; }
        .pt-add-line { font-size: 11px; color: var(--accent); cursor: pointer; font-weight: 600; display: inline-block; margin-top: 2px; }
        .pt-platform-toggle-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
        .pt-platform-toggle-btn { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 7px 13px; border-radius: 20px; font-size: 12.5px; font-family: inherit; cursor: pointer; }
        .pt-platform-toggle-btn:hover { border-color: var(--faint); }
        .pt-platform-toggle-btn.open { border-color: var(--accent); color: var(--accent); background: var(--surface-2); font-weight: 600; }
        .pt-creative-platform-block { border: 1px solid var(--border); border-radius: 8px; padding: 12px; background: var(--surface-2); margin-bottom: 10px; }
        .pt-creative-platform-label { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
        .pt-remove-social-btn { background: none; border: none; color: var(--muted); font-size: 11.5px; font-weight: 600; cursor: pointer; padding: 0; }
        .pt-remove-social-btn:hover { color: #C22B44; }
        .pt-modal-error { color: #C22B44; font-size: 12px; margin-top: 10px; }
        .pt-readonly-field { background: var(--surface-2); border: 1px solid var(--border); color: var(--text); padding: 8px 12px; border-radius: 8px; font-size: 13px; }
        .pt-activity-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 4px; }
        @media (max-width: 640px) { .pt-activity-grid { grid-template-columns: 1fr; } }
        .pt-activity-col { background: var(--surface-2); border: 1px solid var(--border); border-radius: 8px; padding: 10px 12px; max-height: 180px; overflow-y: auto; }
        .pt-activity-col-title { font-size: 11px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .3px; margin-bottom: 8px; }
        .pt-activity-row { display: flex; flex-direction: column; gap: 1px; padding: 5px 0; border-bottom: 1px solid var(--border); font-size: 12.5px; }
        .pt-activity-row:last-child { border-bottom: none; }
        .pt-activity-name { font-weight: 600; }
        .pt-activity-meta { color: var(--faint); font-size: 11px; }
        .pt-modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; align-items: center; }

        .pt-progress-modal { background: var(--surface); border-radius: 14px; width: 420px; max-width: 100%; padding: 24px; box-shadow: 0 24px 48px rgba(16,26,43,0.25); }
        .pt-progress-title { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
        .pt-progress-label { font-size: 12.5px; color: var(--muted); margin-bottom: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pt-progress-track { height: 8px; border-radius: 4px; background: var(--border); overflow: hidden; }
        .pt-progress-fill { height: 100%; background: var(--accent); transition: width 0.2s ease; }
        .pt-progress-pct { margin-top: 8px; font-size: 12px; color: var(--muted); text-align: right; }

        .pt-toast { position: fixed; bottom: 24px; right: 24px; background: var(--text); color: #fff; padding: 10px 18px; border-radius: 8px; font-size: 13px; z-index: 2000; box-shadow: 0 8px 24px rgba(16,26,43,0.25); }
        .pt-toast.success { background: #1E9E64; }
        .pt-toast.error { background: #C22B44; }

        @media (max-width: 980px) {
          .pt-search-wrap input { width: 160px; }
        }
      `}</style>
    </AdminErrorBoundary>
  );
}
