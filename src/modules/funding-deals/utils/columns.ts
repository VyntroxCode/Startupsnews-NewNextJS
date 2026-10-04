/**
 * The funding-deals column set — one definition shared by the admin Excel upload (header
 * auto-detection), the sample template, the admin/reader .xlsx exports and the import route's
 * row normalisation. Pure TS (no server imports) so client components can use it too.
 */

import type { FundingDeal, FundingDealInput } from '../domain/types';

export type FundingColumnKey = keyof FundingDealInput;

export interface FundingColumn {
  key: FundingColumnKey;
  /** Header used in the template and exports. */
  header: string;
  required?: boolean;
  /** Lower-cased, punctuation-stripped header spellings accepted on upload. */
  aliases: string[];
  example: string;
}

export const FUNDING_COLUMNS: FundingColumn[] = [
  { key: 'date', header: 'Date', required: true, aliases: ['date', 'deal date', 'funding date', 'announced date', 'announcement date', 'round date'], example: '2026-03-12' },
  { key: 'startupName', header: 'Startup Name', required: true, aliases: ['startup name', 'startup', 'company', 'company name', 'name', 'organisation', 'organization'], example: 'Yulu' },
  { key: 'sector', header: 'Sector', aliases: ['sector', 'industry', 'vertical', 'category'], example: 'Clean Tech' },
  { key: 'businessModel', header: 'Business Model', aliases: ['business model', 'model', 'b2b b2c'], example: 'B2C' },
  { key: 'roundStage', header: 'Round Stage', aliases: ['round stage', 'stage', 'round', 'round type', 'funding stage', 'series'], example: 'Series C' },
  { key: 'amountRaw', header: 'Round Size', aliases: ['round size', 'amount', 'amount raised', 'funding amount', 'amount usd', 'amount in usd', 'size', 'funding', 'raised'], example: '$93 Mn' },
  { key: 'city', header: 'City', aliases: ['city', 'hq city', 'location', 'headquarters', 'hq'], example: 'Bengaluru' },
  { key: 'country', header: 'Country', aliases: ['country', 'hq country', 'nation'], example: 'India' },
  { key: 'leadInvestor', header: 'Lead Investor', aliases: ['lead investor', 'lead', 'lead investors', 'led by'], example: 'GEF Capital' },
  { key: 'investors', header: 'Investors', aliases: ['investors', 'all investors', 'investor', 'participating investors', 'other investors'], example: 'GEF Capital, Magna, Rocketship' },
  { key: 'sourceUrl', header: 'Source URL', aliases: ['source url', 'source', 'url', 'link', 'news link', 'article'], example: 'https://startupnews.fyi/...' },
];

export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Header row → column key per index (null for unrecognised columns). */
export function mapHeaders(headerRow: unknown[]): (FundingColumnKey | null)[] {
  const used = new Set<FundingColumnKey>();
  return headerRow.map((cell) => {
    const h = normalizeHeader(cell);
    if (!h) return null;
    const col = FUNDING_COLUMNS.find((c) => !used.has(c.key) && c.aliases.includes(h));
    if (!col) return null;
    used.add(col.key);
    return col.key;
  });
}

/** Index of the header row in the first 15 rows: the first row that maps both required columns. */
export function findHeaderRow(rows: unknown[][]): number {
  const limit = Math.min(rows.length, 15);
  for (let i = 0; i < limit; i++) {
    const keys = mapHeaders(rows[i] ?? []);
    if (keys.includes('date') && keys.includes('startupName')) return i;
  }
  return -1;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function isoFromParts(y: number, m: number, d: number): string | null {
  if (!y || !m || !d || m > 12 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Any date the upload may contain → YYYY-MM-DD, or null.
 * Accepts a JS Date, an Excel serial number, ISO "2026-03-12", "12/03/2026" (day first — Indian
 * convention), "12 Mar 2026", "Mar 12, 2026" and "Mar 2026" (first of the month).
 */
export function normalizeDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return isoFromParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  if (typeof value === 'number') {
    // Excel serial date (days since 1899-12-30).
    if (value < 20000 || value > 80000) return null;
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return isoFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const text = String(value).trim();
  if (/^\d{5}(\.\d+)?$/.test(text)) return normalizeDate(Number(text));

  let m = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return isoFromParts(+m[1], +m[2], +m[3]);

  m = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return isoFromParts(y, +m[2], +m[1]);
  }

  const lower = text.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ');
  m = lower.match(/^(\d{1,2})(?:st|nd|rd|th)? ([a-z]{3})[a-z]* (\d{4})$/);
  if (m && MONTHS.includes(m[2])) return isoFromParts(+m[3], MONTHS.indexOf(m[2]) + 1, +m[1]);
  m = lower.match(/^([a-z]{3})[a-z]* (\d{1,2})(?:st|nd|rd|th)? (\d{4})$/);
  if (m && MONTHS.includes(m[1])) return isoFromParts(+m[3], MONTHS.indexOf(m[1]) + 1, +m[2]);
  m = lower.match(/^([a-z]{3})[a-z]*[ -](\d{4})$/);
  if (m && MONTHS.includes(m[1])) return isoFromParts(+m[2], MONTHS.indexOf(m[1]) + 1, 1);

  return null;
}

function clean(value: unknown, max: number): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Tidy an input (manual entry, edit or upload row). Date is normalised; '' means "not given". */
export function normalizeDealInput(input: Partial<Record<FundingColumnKey, unknown>>): FundingDealInput & { date: string } {
  const investors = clean(input.investors, 4000)
    .split(/[,;|\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lead = clean(input.leadInvestor, 255);
  // Readers see the source as a link — only plain http(s) URLs are kept (never javascript: etc.).
  const source = clean(input.sourceUrl, 1000);
  // Lead investor always appears in the investor list, so investor search/aggregates count them.
  if (lead && !investors.some((i) => i.toLowerCase() === lead.toLowerCase())) investors.unshift(lead);
  return {
    date: normalizeDate(input.date) ?? '',
    startupName: clean(input.startupName, 255),
    sector: clean(input.sector, 150),
    businessModel: clean(input.businessModel, 50),
    roundStage: clean(input.roundStage, 100),
    amountRaw: clean(input.amountRaw, 100),
    city: clean(input.city, 150),
    country: clean(input.country, 100),
    leadInvestor: lead || investors[0] || '',
    investors: investors.join(', '),
    sourceUrl: /^https?:\/\/[^\s]+$/i.test(source) ? source : '',
  };
}

/** Why a row can't be saved, or null when it can. */
export function validateDealInput(input: FundingDealInput): string | null {
  if (!input.startupName) return 'Startup name is missing';
  if (!input.date) return 'Date is missing or not a recognised date';
  if (input.date > new Date(Date.now() + 86400000).toISOString().slice(0, 10)) return 'Date is in the future';
  return null;
}

/** date|startup|stage — one deal per startup per stage per day. */
export function buildDedupeKey(input: Pick<FundingDealInput, 'date' | 'startupName' | 'roundStage'>): string {
  const norm = (s?: string) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return `${input.date}|${norm(input.startupName)}|${norm(input.roundStage)}`.slice(0, 400);
}

/** One export/template row with the template headers. */
export function dealToExportRow(deal: FundingDeal): Record<string, string | number> {
  return {
    Date: deal.date,
    'Startup Name': deal.startupName,
    Sector: deal.sector,
    'Business Model': deal.businessModel,
    'Round Stage': deal.roundStage,
    'Round Size': deal.amountRaw,
    'Amount (USD Mn)': deal.amount ?? '',
    City: deal.city,
    Country: deal.country,
    'Lead Investor': deal.leadInvestor,
    Investors: deal.investors,
    'Source URL': deal.sourceUrl,
  };
}
