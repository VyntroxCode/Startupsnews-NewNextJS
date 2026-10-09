import { assignmentStatusLabel, statusFromEns, statusFromSalesLead, type LeadAssignment } from '@/modules/lead-assignments/domain/types';
import { participationLabel } from '@/modules/ens-travel-enquiries/domain/participation';
import { foundUsText, referredByLabel } from '@/modules/ens-travel-enquiries/domain/sources';
import { COUNTRY_CODE_OPTIONS } from '@/components/ui/constants/phone';
import type { LeadFormData } from '@/components/lead-forms/shared/types';
import { isFollowUpDue, worstFollowUpDue } from '@/modules/lead-followups/domain/follow-up-date';
import { ENS_ENQUIRY_TYPE_LABEL, isOpenStatusLabel } from './constants';
import type { SalesLead, UnifiedLeadRow } from './types';

const KNOWN_CODES = COUNTRY_CODE_OPTIONS.map((c) => c.code).filter((c) => c !== 'other');

/** A stored contact number ("+91 9876543210") back into the three inputs PhoneField edits, for the
 * lead windows. A code outside the dropdown's list reopens under "Other" with the code in the
 * free-text box, exactly as it was typed. A number saved without the space ("+919876543210") is
 * matched against the listed codes, longest first; one with no "+" at all opens under +91 with
 * every digit kept in the number box. */
export function splitPhone(phone: string): Pick<LeadFormData, 'phoneCode' | 'phoneCodeCustom' | 'phoneNumber'> {
  const value = phone.trim();
  const m = value.match(/^(\+\d{1,4})\s+(.*)$/);
  if (m) {
    const digits = m[2].replace(/\D/g, '');
    return KNOWN_CODES.includes(m[1])
      ? { phoneCode: m[1], phoneCodeCustom: '', phoneNumber: digits }
      : { phoneCode: 'other', phoneCodeCustom: m[1], phoneNumber: digits };
  }
  if (value.startsWith('+')) {
    const all = value.replace(/\D/g, '');
    const code = KNOWN_CODES
      .filter((c) => all.startsWith(c.replace(/\D/g, '')))
      .sort((x, y) => y.length - x.length)[0];
    if (code) return { phoneCode: code, phoneCodeCustom: '', phoneNumber: all.slice(code.replace(/\D/g, '').length) };
  }
  return { phoneCode: '+91', phoneCodeCustom: '', phoneNumber: value.replace(/\D/g, '') };
}

export function todayStr(): string { return new Date().toISOString().slice(0, 10); }

export function csvCell(v: unknown): string {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function downloadBlob(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Dynamically loads a CDN script exactly once — used for the Excel/PDF export libraries,
 * which aren't npm dependencies on this page. */
export function loadScriptOnce(src: string, isAlreadyLoaded: () => boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isAlreadyLoaded()) return resolve();
    const existing = document.querySelector(`script[data-dyn-src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load ' + src)));
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.dataset.dynSrc = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + src));
    document.head.appendChild(s);
  });
}

/** The row's status as one of the four shared labels. An Expand North Star enquiry keeps its own
 * codes in lead_status, so it's converted; a sales lead stores the label, and anything outside the
 * four (empty, or a pre-2026-09-29 status) reads as Pending — so every row lands in exactly one. */
export function statusLabelOf(row: UnifiedLeadRow): string {
  return assignmentStatusLabel(row._source === 'ens' ? statusFromEns(row.leadStatus) : statusFromSalesLead(row.status));
}

/** Whether the row is of lead type `value` ('' = any) — a TYPES / PAGE_LEAD_TYPES label for a sales
 * lead, ENS_ENQUIRY_TYPE_LABEL for an Expand North Star enquiry. The All leads type filters and the
 * Leads overview counts both use it, so a count always equals the rows its click shows. */
export function matchesType(row: UnifiedLeadRow, value: string): boolean {
  if (!value) return true;
  return row._source === 'ens' ? value === ENS_ENQUIRY_TYPE_LABEL : row.type === value;
}

/** One person's next follow-up date on a lead: the admin's (the lead's own column) or an assigned
 * employee's (their sales_lead_assignments row). */
export interface FollowUpDateEntry { who: string; date: string; byAdmin: boolean }

/** Every next follow-up date set on the row, the admin's first — or none at all once the lead is
 * closed (Confirmed / Not Interested), when no date counts any more. */
export function followUpDatesOf(row: UnifiedLeadRow, assignment: LeadAssignment | undefined): FollowUpDateEntry[] {
  if (!isOpenStatusLabel(statusLabelOf(row))) return [];
  const entries: FollowUpDateEntry[] = [];
  if (row.nextFollowUpDate) entries.push({ who: 'Admin', date: row.nextFollowUpDate, byAdmin: true });
  for (const p of assignment?.assignees ?? []) {
    if (p.nextFollowUpDate) entries.push({ who: p.employeeName || 'Former employee', date: p.nextFollowUpDate, byAdmin: false });
  }
  return entries;
}

/** The dates that put the row in "Today's Follow up": due today or overdue, whoever set them. The
 * Leads overview tile and the All leads filter both use it, so the tile's number equals the rows its click shows. */
export function dueFollowUpsOf(row: UnifiedLeadRow, assignment: LeadAssignment | undefined, today: string): FollowUpDateEntry[] {
  return followUpDatesOf(row, assignment).filter((e) => isFollowUpDue(e.date, today));
}

/** The row's one follow-up tag: 'overdue' when anybody's date on it has passed, else 'today' when
 * one is due today, else null. A lead with both counts once, as overdue — so the tile's Today and
 * Overdue numbers add up to the rows its click shows. */
export function followUpTagOf(row: UnifiedLeadRow, assignment: LeadAssignment | undefined, today: string): 'today' | 'overdue' | null {
  return worstFollowUpDue(followUpDatesOf(row, assignment).map((e) => e.date), today);
}

/** `assignment`: the lead's stored departments and people, if any. */
/** One row of the CSV / Excel / PDF export, for either kind of row the All leads table shows — a
 * sales_leads row or an Expand North Star enquiry — with ONE column set, so the file has exactly the
 * rows (and order) the table shows. Columns a row's source doesn't have stay blank: event columns
 * are Sponsor an Event only; Budget Range / Campaign Goal are Advertise With Us only; Participation /
 * Referred By / How They Found Us are Expand North Star only. An enquiry's conversation note goes under "Last Call Discussion".
 * "Next Follow-up" is the admin's own date; "Employee Follow-up Dates" lists each assigned person's. */
export function leadExportRow(row: UnifiedLeadRow, assignment: LeadAssignment | undefined): Record<string, string> {
  const people = (assignment?.assignees ?? []).map((p) => p.employeeName || 'Former employee').join(', ');
  const departments = (assignment?.departments ?? []).join(', ');
  const followUps = assignment?.followUpCount ? String(assignment.followUpCount) : '';
  const employeeDates = (assignment?.assignees ?? [])
    .filter((p) => p.nextFollowUpDate)
    .map((p) => `${p.employeeName || 'Former employee'}: ${p.nextFollowUpDate}`)
    .join(', ');
  if (row._source === 'ens') {
    return {
      Date: row.createdAt.slice(0, 10), Name: row.name || '', Company: '', Contact: row.contact || '',
      Email: row.email || '', Country: row.country || '', City: row.city || '', Source: 'Expand North Star',
      Type: ENS_ENQUIRY_TYPE_LABEL, Query: row.requirement || '',
      'Assigned To': people, Departments: departments,
      'Current Status': assignmentStatusLabel(statusFromEns(row.leadStatus)), 'Follow-ups': followUps,
      'Next Follow-up': row.nextFollowUpDate || '', 'Employee Follow-up Dates': employeeDates, 'Last Call Discussion': row.conversationNote || '',
      Participation: participationLabel(row.participation), 'Referred By': row.referredBy ? referredByLabel(row.referredBy) : '',
      'How They Found Us': foundUsText(row.foundUs, row.foundUsDetail),
      'Event Title': '', 'Event Date': '', 'Event Time': '', 'External URL': '', 'Poster': '', 'Event Description': '',
      'Budget Range': '', 'Campaign Goal': '', 'Tell Us More': '',
    };
  }
  const l = row;
  const typeLabel = l.type === 'Others' && l.otherType ? `Others: ${l.otherType}` : (l.type || '');
  return {
    Date: l.date || '', Name: l.name || '', Company: l.company || '', Contact: l.contact || '',
    Email: l.email || '', Country: l.country || '', City: l.city || '', Source: l.source || '', Type: typeLabel, Query: l.query || '',
    'Assigned To': people, Departments: departments,
    'Current Status': l.status || '', 'Follow-ups': followUps, 'Next Follow-up': l.nextFollowUpDate || '',
    'Employee Follow-up Dates': employeeDates, 'Last Call Discussion': l.lastCallDiscussion || '',
    Participation: '', 'Referred By': '', 'How They Found Us': '',
    'Event Title': l.eventTitle || '', 'Event Date': l.eventDate || '', 'Event Time': l.eventTime || '',
    'External URL': l.externalUrl || '', 'Poster': l.posterUrl || '', 'Event Description': l.description || '',
    'Budget Range': l.budgetRange || '', 'Campaign Goal': l.campaignGoal || '', 'Tell Us More': l.tellUsMore || '',
  };
}

export function emptyLead(): SalesLead {
  return {
    id: '', date: todayStr(), name: '', company: '', contact: '', email: '', country: '', city: '', source: '',
    type: 'Social Media', otherType: '', query: '', assignedTo: '', status: 'Pending',
    nextFollowUpDate: '', lastConnectDate: '', lastCallDiscussion: '',
    eventTitle: '', eventSlug: '', eventDate: '', eventTime: '', externalUrl: '', posterUrl: '', description: '',
    budgetRange: '', campaignGoal: '', tellUsMore: '',
  };
}
