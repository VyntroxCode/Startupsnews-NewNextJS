import { assignmentStatusLabel, statusFromEns, statusFromSalesLead, type LeadAssignment } from '@/modules/lead-assignments/domain/types';
import { participationLabel } from '@/modules/ens-travel-enquiries/domain/participation';
import { foundUsText, referredByLabel } from '@/modules/ens-travel-enquiries/domain/sources';
import { ENS_ENQUIRY_TYPE_LABEL } from './constants';
import type { SalesLead, UnifiedLeadRow } from './types';

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

/** `assignment`: the lead's stored departments and people, if any. */
/** One row of the CSV / Excel / PDF export, for either kind of row the All leads table shows — a
 * sales_leads row or an Expand North Star enquiry — with ONE column set, so the file has exactly the
 * rows (and order) the table shows. Columns a row's source doesn't have stay blank: event columns
 * are Sponsor an Event only; Participation / Referred By / How They Found Us are Expand North Star
 * only. An enquiry's conversation note goes under "Last Call Discussion". */
export function leadExportRow(row: UnifiedLeadRow, assignment: LeadAssignment | undefined): Record<string, string> {
  const people = (assignment?.assignees ?? []).map((p) => p.employeeName || 'Former employee').join(', ');
  const departments = (assignment?.departments ?? []).join(', ');
  const followUps = assignment?.followUpCount ? String(assignment.followUpCount) : '';
  if (row._source === 'ens') {
    return {
      Date: row.createdAt.slice(0, 10), Name: row.name || '', Company: '', Contact: row.contact || '',
      Email: row.email || '', Country: row.country || '', City: row.city || '', Source: 'Expand North Star',
      Type: ENS_ENQUIRY_TYPE_LABEL, Query: row.requirement || '',
      'Assigned To': people, Departments: departments,
      'Current Status': assignmentStatusLabel(statusFromEns(row.leadStatus)), 'Follow-ups': followUps,
      'Next Follow-up': '', 'Last Connect Date': '', 'Last Call Discussion': row.conversationNote || '',
      Participation: participationLabel(row.participation), 'Referred By': row.referredBy ? referredByLabel(row.referredBy) : '',
      'How They Found Us': foundUsText(row.foundUs, row.foundUsDetail),
      'Event Title': '', 'Event Date': '', 'Event Time': '', 'External URL': '', 'Poster': '', 'Event Description': '',
    };
  }
  const l = row;
  const typeLabel = l.type === 'Others' && l.otherType ? `Others: ${l.otherType}` : (l.type || '');
  return {
    Date: l.date || '', Name: l.name || '', Company: l.company || '', Contact: l.contact || '',
    Email: l.email || '', Country: l.country || '', City: l.city || '', Source: l.source || '', Type: typeLabel, Query: l.query || '',
    'Assigned To': people, Departments: departments,
    'Current Status': l.status || '', 'Follow-ups': followUps, 'Next Follow-up': l.nextFollowUpDate || '',
    'Last Connect Date': l.lastConnectDate || '', 'Last Call Discussion': l.lastCallDiscussion || '',
    Participation: '', 'Referred By': '', 'How They Found Us': '',
    'Event Title': l.eventTitle || '', 'Event Date': l.eventDate || '', 'Event Time': l.eventTime || '',
    'External URL': l.externalUrl || '', 'Poster': l.posterUrl || '', 'Event Description': l.description || '',
  };
}

export function emptyLead(): SalesLead {
  return {
    id: '', date: todayStr(), name: '', company: '', contact: '', email: '', country: '', city: '', source: '',
    type: 'Social Media', otherType: '', query: '', assignedTo: '', status: 'Pending',
    nextFollowUpDate: '', lastConnectDate: '', lastCallDiscussion: '',
    eventTitle: '', eventSlug: '', eventDate: '', eventTime: '', externalUrl: '', posterUrl: '', description: '',
  };
}
