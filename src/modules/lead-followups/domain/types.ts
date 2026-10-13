/** What an assigned employee logs against a Sales Tracker lead from My Leads, and the read-only
 * view of that lead they open to do it (table: sales_lead_followups, see
 * scripts/migrations/add-sales-lead-followups.sql).
 *
 * Plain data with no server imports: My Leads (employee panel + /admin/my-leads) and the admin
 * Sales Tracker's Follow-ups panel both import this file directly. */

import type { Assignee, AssignmentStatus, LeadAssignment, LeadSource } from '@/modules/lead-assignments/domain/types';
import type { SalesLead } from '@/modules/sales-tracker/domain/types';

/** Longest follow-up message accepted. */
export const FOLLOW_UP_NOTE_MAX_LENGTH = 2000;

/** One follow-up. `createdAt` is set by the database when it is saved — the UI never sends a date. */
/** `credential_id` of a sales_lead_followups row written by an admin from the Sales Tracker (a
 * status change / conversation result on the lead) rather than by an assigned employee. No HR
 * login has id 0, and the column has no foreign key. */
export const ADMIN_FOLLOW_UP_CREDENTIAL_ID = 0;

/** One changed field of a lead, as an admin's save recorded it: the field's label as the lead
 * window shows it, and its value before and after ('' = was / became empty). */
export interface LeadChange {
  field: string;
  from: string;
  to: string;
}

/** The field label a status change is recorded under (see LeadChange). */
export const STATUS_CHANGE_FIELD = 'Status';

/** What an admin's history entry is: a status update (it changed the status or carries a
 * conversation result) or a plain edit of the lead (only other fields changed). */
export function adminEntryKind(entry: { note: string; changes: LeadChange[] }): 'admin-update' | 'edit' {
  const statusChanged = entry.changes.some((c) => c.field === STATUS_CHANGE_FIELD);
  return entry.changes.length > 0 && !statusChanged && !entry.note ? 'edit' : 'admin-update';
}

/** Whether a history entry is a follow-up logged by an employee: written by one, with a message.
 * An employee's entry with no message is only the record of an edit they made to a lead they
 * created (its `changes`), and an admin's entry is never one. The SQL counts in lead-assignments
 * (IS_EMPLOYEE_FOLLOW_UP in its repository) use the same rule: credential_id <> 0 AND note <> ''. */
export function isEmployeeFollowUp(entry: { byAdmin: boolean; note: string }): boolean {
  return !entry.byAdmin && !!entry.note;
}

/** What any history entry is, whoever wrote it: an employee's follow-up, an admin's status update,
 * or a plain edit of the lead (by an admin, or by the employee who created it). */
export function entryKind(entry: { byAdmin: boolean; note: string; changes: LeadChange[] }): 'follow-up' | 'admin-update' | 'edit' {
  if (entry.byAdmin) return adminEntryKind(entry);
  return isEmployeeFollowUp(entry) ? 'follow-up' : 'edit';
}

export interface LeadFollowUp {
  id: number;
  /** ADMIN_FOLLOW_UP_CREDENTIAL_ID for an admin's status update. */
  credentialId: number;
  /** Written by an admin from the Sales Tracker, not by an assigned employee. */
  byAdmin: boolean;
  authorName: string;
  /** The status the employee set together with this follow-up. */
  status: AssignmentStatus;
  note: string;
  /** The next follow-up date its author set with this entry (YYYY-MM-DD); '' when none was set —
   * an entry from before the date existed, or one that closed the lead. */
  nextFollowUpDate: string;
  /** What the save changed on the lead, old value → new value — detail fields, status, the next
   * follow-up date, departments and assigned people. Written by an admin's save, or by the save of
   * the employee who created the lead. Empty for a follow-up logged from the lead drawer and for
   * entries from before edits were recorded. `note` may be '' when this is all the entry is. */
  changes: LeadChange[];
  createdAt: string;
  /** True when the reader wrote it (My Leads shows "You"). Always false for the admin view. */
  mine: boolean;
  /** The conversation under this entry, oldest first. */
  replies: LeadFollowUpReply[];
}

/** Longest reply accepted. */
export const FOLLOW_UP_REPLY_MAX_LENGTH = 2000;

/** One reply under an entry of the lead's history (table: sales_lead_followup_replies, see
 * scripts/migrations/add-sales-lead-followup-replies.sql). Admins write them from the Sales Tracker
 * lead window, anyone assigned to the lead from My Leads; everyone on the lead reads them. Never
 * edited or deleted. `createdAt` is the database's. */
export interface LeadFollowUpReply {
  id: number;
  followUpId: number;
  /** Written by an admin from the Sales Tracker. */
  byAdmin: boolean;
  authorName: string;
  message: string;
  createdAt: string;
  /** True when the reader wrote it. Always false for the admin view. */
  mine: boolean;
  /** Employee view: an admin's reply the reader hadn't seen before this load. Always false for the admin. */
  unread: boolean;
}

/** One admin reply the reader hasn't seen yet, for the new-reply pop-up. */
export interface UnreadLeadReply {
  replyId: number;
  source: LeadSource;
  leadId: string;
  leadName: string;
  authorName: string;
  createdAt: string;
}

/** The reader's unseen admin replies on leads they are assigned to, newest first. */
export interface UnreadLeadReplies {
  count: number;
  items: UnreadLeadReply[];
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
  /** The reader's own next follow-up date on this lead (YYYY-MM-DD); '' until they set one. */
  nextFollowUpDate: string;
  /** '' / '' when the reader is not one of the assigned people (they created the lead). */
  assignedAt: string;
  assignedBy: string;
  /** The reader is one of the assigned people. */
  assigned: boolean;
  /** The reader added this lead from My Leads. They may open it, follow up and edit it whether or
   * not they are also assigned. */
  createdByMe: boolean;
  /** Who added the lead: an employee's or admin's name; '' for a website lead or an older lead. */
  createdByName: string;
  /** Only for the lead's creator: the lead row and its stored departments and people, which the
   * edit window starts from. null for everyone else — they cannot edit the lead. */
  editable: { lead: SalesLead; assignment: LeadAssignment } | null;
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
  next_follow_up_date: string | null;
  /** JSON array of LeadChange, or NULL. */
  changes: string | null;
  created_at: string | Date;
}

export interface LeadFollowUpReplyEntity {
  id: number;
  followup_id: number;
  credential_id: number;
  author_name: string;
  message: string;
  created_at: string | Date;
}

export interface UnreadLeadReplyEntity {
  reply_id: number;
  lead_source: string;
  lead_id: string;
  author_name: string;
  created_at: string | Date;
  lead_name: string | null;
}
