/** What an assigned employee logs against a Sales Tracker lead from My Leads, and the read-only
 * view of that lead they open to do it (table: sales_lead_followups, see
 * scripts/migrations/add-sales-lead-followups.sql).
 *
 * Plain data with no server imports: My Leads (employee panel + /admin/my-leads) and the admin
 * Sales Tracker's Follow-ups panel both import this file directly. */

import type { Assignee, AssignmentStatus, LeadSource } from '@/modules/lead-assignments/domain/types';

/** Longest follow-up message accepted. */
export const FOLLOW_UP_NOTE_MAX_LENGTH = 2000;

/** One follow-up. `createdAt` is set by the database when it is saved — the UI never sends a date. */
export interface LeadFollowUp {
  id: number;
  credentialId: number;
  authorName: string;
  /** The status the employee set together with this follow-up. */
  status: AssignmentStatus;
  note: string;
  createdAt: string;
  /** True when the reader wrote it (My Leads shows "You"). Always false for the admin view. */
  mine: boolean;
}

/** How a detail value is shown: plain text, multi-line text, or as a link / image. */
export type LeadDetailFieldKind = 'text' | 'long' | 'email' | 'phone' | 'url' | 'image' | 'list';

export interface LeadDetailField {
  label: string;
  /** Empty = not provided; shown as "Not provided". For `list`, lines are separated by "\n". */
  value: string;
  kind: LeadDetailFieldKind;
}

export interface LeadDetailSection {
  title: string;
  fields: LeadDetailField[];
}

/** Everything a visitor submitted on the lead's page, grouped for display. Read-only everywhere. */
export interface LeadSubmission {
  /** The page key (sales_leads.type, or "Expand North Star Enquiry"), as AssignedLead.page. */
  page: string;
  /** Where the details came from: the page's own submission record, or — for a lead added by hand
   * (or a page lead whose original record is gone) — the Sales Tracker's copy. */
  origin: 'submission' | 'tracker';
  /** When it arrived: the submission's timestamp, or the tracker's arrival date. */
  submittedAt: string;
  name: string;
  contact: string;
  email: string;
  sections: LeadDetailSection[];
}

/** One lead as the assigned employee opens it on My Leads. */
export interface LeadDetail {
  source: LeadSource;
  leadId: string;
  submission: LeadSubmission;
  /** Everyone on the lead. */
  assignees: Assignee[];
  /** Newest first. */
  followUps: LeadFollowUp[];
  /** The lead's one shared status (the admin sees and edits the same value). */
  leadStatus: AssignmentStatus;
  assignedAt: string;
  assignedBy: string;
}

/** Follow-ups for the admin lead window: the people on the lead, plus the log. */
export interface LeadFollowUpsView {
  assignees: Assignee[];
  followUps: LeadFollowUp[];
}

export interface LeadFollowUpEntity {
  id: number;
  lead_source: string;
  lead_id: string;
  credential_id: number;
  author_name: string;
  status: string;
  note: string;
  created_at: string | Date;
}
