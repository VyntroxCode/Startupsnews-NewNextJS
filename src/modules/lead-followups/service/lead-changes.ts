import type { SalesLead } from '@/modules/sales-tracker/domain/types';
import type { EnsTravelEnquiry } from '@/modules/ens-travel-enquiries/domain/types';
import { participationLabel } from '@/modules/ens-travel-enquiries/domain/participation';
import { foundUsText, referredByLabel } from '@/modules/ens-travel-enquiries/domain/sources';
import { type LeadAssignment, assignmentStatusLabel, statusFromEns, statusFromSalesLead } from '@/modules/lead-assignments/domain/types';
import { formatFollowUpDay } from '../domain/follow-up-date';
import { type LeadChange, STATUS_CHANGE_FIELD } from '../domain/types';

/** What an admin's save changed on a lead, for the lead's history (sales_lead_followups.changes):
 * one LeadChange per field whose stored value differs before and after the save, labelled the way
 * the lead window labels the field and with values the way it shows them (status and dropdown
 * values as their labels, dates as "12 Oct 2026"). Compared on the stored rows, not on what the
 * browser sent, so a field the server refuses to change is never reported as changed. */

type Reader<T> = [label: string, value: (row: T) => string];

function diff<T>(before: T, after: T, readers: Reader<T>[]): LeadChange[] {
  const changes: LeadChange[] = [];
  for (const [field, value] of readers) {
    const from = (value(before) || '').trim();
    const to = (value(after) || '').trim();
    if (from !== to) changes.push({ field, from, to });
  }
  return changes;
}

/** In lead-window order. Left out on purpose: the Lead Creation Date and "Tell us more" (the server
 * never changes them), the query text and Last connect date (no longer in the window). */
const SALES_LEAD_FIELDS: Reader<SalesLead>[] = [
  ['Name', (l) => l.name],
  ['Company name', (l) => l.company],
  ['Contact no.', (l) => l.contact],
  ['Email ID', (l) => l.email],
  ['Country', (l) => l.country],
  ['City', (l) => l.city],
  ['Source of lead', (l) => l.source],
  ['Type of lead', (l) => (l.type === 'Others' && l.otherType ? `Others: ${l.otherType}` : l.type)],
  [STATUS_CHANGE_FIELD, (l) => assignmentStatusLabel(statusFromSalesLead(l.status))],
  ['Next follow-up date', (l) => formatFollowUpDay(l.nextFollowUpDate)],
  ['Last call discussion', (l) => l.lastCallDiscussion],
  ['Budget range', (l) => l.budgetRange],
  ['Campaign goal', (l) => l.campaignGoal],
  ['Event title', (l) => l.eventTitle],
  ['Event URL / slug', (l) => l.eventSlug],
  ['Event date', (l) => formatFollowUpDay(l.eventDate)],
  ['Event time', (l) => l.eventTime],
  ['External URL', (l) => l.externalUrl],
  ['Poster URL', (l) => l.posterUrl],
  ['Event description', (l) => l.description],
];

export function salesLeadChanges(before: SalesLead, after: SalesLead): LeadChange[] {
  return diff(before, after, SALES_LEAD_FIELDS);
}

/** The conversation result is left out: it is the entry's own text, not a field change. */
const ENS_FIELDS: Reader<EnsTravelEnquiry>[] = [
  ['Name', (e) => e.name],
  ['Contact no.', (e) => e.contact],
  ['Email ID', (e) => e.email],
  ['Country', (e) => e.country],
  ['City', (e) => e.city],
  ['Participating as', (e) => participationLabel(e.participation)],
  ['Requirement', (e) => e.requirement],
  ['Referred by', (e) => (e.referredBy ? referredByLabel(e.referredBy) : '')],
  ['How they found us', (e) => foundUsText(e.foundUs, e.foundUsDetail)],
  [STATUS_CHANGE_FIELD, (e) => assignmentStatusLabel(statusFromEns(e.leadStatus))],
  ['Next follow-up date', (e) => formatFollowUpDay(e.nextFollowUpDate)],
];

export function ensEnquiryChanges(before: EnsTravelEnquiry, after: EnsTravelEnquiry): LeadChange[] {
  return diff(before, after, ENS_FIELDS);
}

/** Departments and people as the whole list before → after, A–Z, so adding or removing someone
 * reads the same way as any other field. */
export function assignmentChanges(before: LeadAssignment, after: LeadAssignment): LeadChange[] {
  const people = (a: LeadAssignment) => a.assignees.map((p) => p.employeeName || 'Former employee').sort().join(', ');
  const departments = (a: LeadAssignment) => [...a.departments].sort().join(', ');
  return diff(before, after, [
    ['Departments', departments],
    ['Assigned to', people],
  ]);
}
