/**
 * The Sales Tracker bulk import's column set — one definition shared by the admin's Import leads
 * window (header detection, template, preview, duplicate tag) and the import route, which parses
 * every row again before anything is stored. Pure TS (no server imports) so the browser can use it.
 *
 * Rules agreed for the import (2026-10-15):
 * - Date, Name, Company, Phone, Email and Country are required. A file without one of those
 *   columns is refused as a whole; a row with one of them empty is skipped and reported.
 * - Type of lead outside MANUAL_LEAD_TYPES is stored as Others with the sheet's text as otherType;
 *   a blank one gets the window's default type.
 * - Status blank → Pending; an open lead (Pending / Follow Up) without a Next follow-up date gets
 *   the window's default date.
 * - There is no assignment column: imported leads arrive unassigned and are assigned from the lead
 *   window like any other lead.
 */

import { normalizeDate, normalizeHeader } from '@/modules/funding-deals/utils/columns';
import { SALES_LEAD_STATUS_LABELS, statusFromSalesLead } from '@/modules/lead-assignments/domain/types';
import { isIsoDay, statusNeedsFollowUpDate } from '@/modules/lead-followups/domain/follow-up-date';
import { MANUAL_LEAD_TYPES, type SalesLead } from '../domain/types';

export type LeadImportKey =
  | 'date' | 'name' | 'company' | 'contact' | 'email' | 'country' | 'city' | 'source'
  | 'type' | 'query' | 'status' | 'nextFollowUpDate' | 'lastCallDiscussion';

export interface LeadImportColumn {
  key: LeadImportKey;
  /** Header used in the template. */
  header: string;
  required?: boolean;
  /** Lower-cased, punctuation-stripped header spellings accepted on upload (see normalizeHeader). */
  aliases: string[];
  /** Longest value the column takes. */
  max: number;
  example: string;
}

export const LEAD_IMPORT_COLUMNS: LeadImportColumn[] = [
  { key: 'date', header: 'Date', required: true, aliases: ['date', 'lead date', 'created date', 'created on'], max: 10, example: '2026-10-15' },
  { key: 'name', header: 'Name', required: true, aliases: ['name', 'full name', 'contact name', 'person name', 'lead name'], max: 255, example: 'Rahul Sharma' },
  { key: 'company', header: 'Company', required: true, aliases: ['company', 'company name', 'startup', 'startup name', 'organisation', 'organization', 'brand'], max: 255, example: 'Acme Tech' },
  { key: 'contact', header: 'Phone', required: true, aliases: ['phone', 'phone number', 'contact', 'contact number', 'mobile', 'mobile number', 'whatsapp', 'whatsapp number'], max: 50, example: '+91 9876543210' },
  { key: 'email', header: 'Email', required: true, aliases: ['email', 'email id', 'email address', 'e mail', 'mail'], max: 255, example: 'rahul@acme.com' },
  { key: 'country', header: 'Country', required: true, aliases: ['country'], max: 255, example: 'India' },
  { key: 'city', header: 'City', aliases: ['city', 'location'], max: 255, example: 'Bengaluru' },
  { key: 'source', header: 'Source', aliases: ['source', 'lead source', 'source of lead', 'channel'], max: 255, example: 'LinkedIn' },
  { key: 'type', header: 'Type of lead', aliases: ['type of lead', 'lead type', 'type'], max: 255, example: 'Social Media' },
  { key: 'query', header: 'Query', aliases: ['query', 'requirement', 'requirements', 'enquiry', 'inquiry', 'message'], max: 5000, example: 'Wants a featured article' },
  { key: 'status', header: 'Status', aliases: ['status', 'lead status', 'current status'], max: 50, example: 'Pending' },
  { key: 'nextFollowUpDate', header: 'Next follow-up date', aliases: ['next follow up date', 'next follow up', 'follow up date', 'followup date'], max: 10, example: '2026-10-20' },
  { key: 'lastCallDiscussion', header: 'Last call discussion', aliases: ['last call discussion', 'call discussion', 'discussion', 'notes', 'remarks', 'comments'], max: 5000, example: 'Asked for pricing, call back Monday' },
];

export const LEAD_IMPORT_REQUIRED = LEAD_IMPORT_COLUMNS.filter((c) => c.required);

/** Most rows one import may carry. */
export const MAX_LEAD_IMPORT_ROWS = 1000;

/** One spreadsheet row, keyed by column, values as the sheet holds them. */
export type LeadImportRaw = Partial<Record<LeadImportKey, unknown>>;

/** The lead fields an import writes. */
export type ImportedLeadFields = Pick<SalesLead,
  'date' | 'name' | 'company' | 'contact' | 'email' | 'country' | 'city' | 'source'
  | 'type' | 'otherType' | 'query' | 'status' | 'nextFollowUpDate' | 'lastCallDiscussion'>;

/** The window's batch defaults for the cells a row may leave empty. */
export interface LeadImportDefaults {
  type: string;
  nextFollowUpDate: string;
}

/** Header row → column key per index (null for a column the import doesn't use). */
export function mapLeadHeaders(headerRow: unknown[]): (LeadImportKey | null)[] {
  const used = new Set<LeadImportKey>();
  return headerRow.map((cell) => {
    const h = normalizeHeader(cell);
    if (!h) return null;
    const col = LEAD_IMPORT_COLUMNS.find((c) => !used.has(c.key) && c.aliases.includes(h));
    if (!col) return null;
    used.add(col.key);
    return col.key;
  });
}

/** Index of the header row among the first 15 rows: the one that names the most import columns
 * (at least two, so a data row isn't mistaken for it). -1 when none does. */
export function findLeadHeaderRow(rows: unknown[][]): number {
  let best = -1;
  let bestCount = 1;
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const count = mapLeadHeaders(rows[i] ?? []).filter(Boolean).length;
    if (count > bestCount) { best = i; bestCount = count; }
  }
  return best;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cellText(value: unknown): string {
  return String(value ?? '').replace(/[ \t]+/g, ' ').trim();
}

/** A raw row → the lead fields to store, or the reason it can't be imported. */
export function parseLeadImportRow(raw: LeadImportRaw, defaults: LeadImportDefaults): { fields: ImportedLeadFields; error: string | null } {
  const text = Object.fromEntries(LEAD_IMPORT_COLUMNS.map((c) => [c.key, cellText(raw[c.key])])) as Record<LeadImportKey, string>;
  const problems: string[] = [];

  const missing = LEAD_IMPORT_REQUIRED.filter((c) => !text[c.key]).map((c) => c.header);
  if (missing.length) problems.push(`Missing ${missing.join(', ')}`);
  const tooLong = LEAD_IMPORT_COLUMNS.filter((c) => c.key !== 'date' && c.key !== 'nextFollowUpDate' && text[c.key].length > c.max);
  if (tooLong.length) problems.push(`Too long: ${tooLong.map((c) => c.header).join(', ')}`);

  const date = text.date ? normalizeDate(raw.date) ?? '' : '';
  if (text.date && !date) problems.push('Date is not a date we can read (use YYYY-MM-DD)');
  if (text.email && !EMAIL.test(text.email)) problems.push('Email is not a valid email address');

  const status = text.status ? SALES_LEAD_STATUS_LABELS.find((s) => s.toLowerCase() === text.status.toLowerCase()) : SALES_LEAD_STATUS_LABELS[0];
  if (!status) problems.push(`Status must be one of ${SALES_LEAD_STATUS_LABELS.join(', ')}`);

  let nextFollowUpDate = text.nextFollowUpDate ? normalizeDate(raw.nextFollowUpDate) ?? '' : '';
  if (text.nextFollowUpDate && !nextFollowUpDate) problems.push('Next follow-up date is not a date we can read (use YYYY-MM-DD)');
  else if (!nextFollowUpDate && status && statusNeedsFollowUpDate(statusFromSalesLead(status))) {
    if (isIsoDay(defaults.nextFollowUpDate)) nextFollowUpDate = defaults.nextFollowUpDate;
    else problems.push('No next follow-up date (pick a default date above)');
  }

  // A type from the list is stored as it is; anything else is Others with the sheet's words.
  const typeText = text.type || defaults.type;
  const listed = MANUAL_LEAD_TYPES.find((t) => t.toLowerCase() === typeText.toLowerCase());
  const type = listed ?? 'Others';
  const otherType = listed ? '' : typeText.slice(0, 255);

  return {
    fields: {
      date, name: text.name, company: text.company, contact: text.contact, email: text.email,
      country: text.country, city: text.city, source: text.source, type, otherType, query: text.query,
      status: status ?? SALES_LEAD_STATUS_LABELS[0], nextFollowUpDate, lastCallDiscussion: text.lastCallDiscussion,
    },
    error: problems.length ? problems.join(' · ') : null,
  };
}

function fp(value: string | null | undefined): string {
  return (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Every imported field of a lead in one string: two leads with the same fingerprint are the same
 * lead in every column the import fills — the only case the import window tags as "Already exists"
 * (a matching email or phone with any other detail different imports as a normal lead). */
export function leadImportFingerprint(lead: ImportedLeadFields): string {
  return [
    lead.date.slice(0, 10), lead.name, lead.company, lead.contact, lead.email, lead.country, lead.city, lead.source,
    lead.type, lead.type === 'Others' ? lead.otherType : '', lead.query, lead.status, lead.nextFollowUpDate.slice(0, 10), lead.lastCallDiscussion,
  ].map(fp).join('\u0001');
}
