import { LeadAssignmentsRepository } from '@/modules/lead-assignments/repository/lead-assignments.repository';
import { LeadAssignmentsService } from '@/modules/lead-assignments/service/lead-assignments.service';
import {
  ASSIGNMENT_STATUS_OPTIONS,
  ASSIGNMENT_STATUS_PENDING,
  type AssignmentStatus,
  isLeadSource,
  isPickableAssignmentStatus,
  type LeadSource,
  statusFromEns,
  statusFromSalesLead,
} from '@/modules/lead-assignments/domain/types';
import { LeadFollowUpsRepository } from '../repository/lead-followups.repository';
import {
  ADMIN_FOLLOW_UP_CREDENTIAL_ID,
  FOLLOW_UP_NOTE_MAX_LENGTH,
  FOLLOW_UP_REPLY_MAX_LENGTH,
  type LeadChange,
  type LeadDetail,
  type LeadFollowUp,
  type LeadFollowUpEntity,
  type LeadFollowUpReply,
  type LeadFollowUpReplyEntity,
  type LeadFollowUpsView,
  type UnreadLeadReplies,
} from '../domain/types';
import { isIsoDay, statusNeedsFollowUpDate } from '../domain/follow-up-date';
import { buildLeadSubmission } from './lead-details';

/** Bad input (→ 400). */
export class LeadFollowUpValidationError extends Error {}
/** The lead doesn't exist, or the caller isn't assigned to it (→ 404 — same answer for both, so an
 * employee can't probe for leads that aren't theirs). */
export class LeadFollowUpNotFoundError extends Error {}

/** Follow-up statuses from before the four shared statuses (2026-09-29), for rows that
 * scripts/migrations/unify-sales-lead-status.sql hasn't translated yet — the same mapping it uses. */
const LEGACY_FOLLOW_UP_STATUSES: Record<string, AssignmentStatus> = {
  contacted: 'follow-up',
  interested: 'follow-up',
  closed: 'confirmed',
};

function toStatus(value: string): AssignmentStatus {
  return ASSIGNMENT_STATUS_OPTIONS.find((o) => o.value === value)?.value ?? LEGACY_FOLLOW_UP_STATUSES[value] ?? ASSIGNMENT_STATUS_PENDING;
}

/** Replies grouped by the history entry they sit under, oldest first. `readerId` null = the admin;
 * a number = that employee, for whom `lastSeenId` (the highest reply id they had seen) decides
 * which admin replies are `unread`. */
function groupReplies(replies: LeadFollowUpReplyEntity[], readerId: number | null, lastSeenId: number): Map<number, LeadFollowUpReply[]> {
  const out = new Map<number, LeadFollowUpReply[]>();
  for (const r of replies) {
    const followUpId = Number(r.followup_id);
    const byAdmin = Number(r.credential_id) === ADMIN_FOLLOW_UP_CREDENTIAL_ID;
    const list = out.get(followUpId) ?? [];
    list.push({
      id: Number(r.id),
      followUpId,
      byAdmin,
      authorName: r.author_name || '',
      message: r.message || '',
      createdAt: String(r.created_at),
      mine: readerId !== null && Number(r.credential_id) === readerId,
      unread: readerId !== null && byAdmin && Number(r.id) > lastSeenId,
    });
    out.set(followUpId, list);
  }
  return out;
}

/** sales_lead_followups.changes (a JSON array, or NULL) → the list. Anything unreadable = none. */
function parseChanges(raw: string | null): LeadChange[] {
  if (!raw) return [];
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list
      .filter((c): c is LeadChange => !!c && typeof c.field === 'string')
      .map((c) => ({ field: c.field, from: String(c.from ?? ''), to: String(c.to ?? '') }));
  } catch {
    return [];
  }
}

function toFollowUp(e: LeadFollowUpEntity, readerId: number | null, replies: Map<number, LeadFollowUpReply[]>): LeadFollowUp {
  return {
    id: Number(e.id),
    credentialId: Number(e.credential_id),
    byAdmin: Number(e.credential_id) === ADMIN_FOLLOW_UP_CREDENTIAL_ID,
    authorName: e.author_name || '',
    status: toStatus(e.status),
    note: e.note || '',
    nextFollowUpDate: e.next_follow_up_date ? String(e.next_follow_up_date).slice(0, 10) : '',
    changes: parseChanges(e.changes),
    createdAt: String(e.created_at),
    mine: readerId !== null && Number(e.credential_id) === readerId,
    replies: replies.get(Number(e.id)) ?? [],
  };
}

/** `{ followUpId, message }` of a reply request, checked. */
function parseReply(body: Record<string, unknown>): { followUpId: number; message: string } {
  const followUpId = Number(body.followUpId);
  if (!Number.isInteger(followUpId) || followUpId <= 0) throw new LeadFollowUpValidationError('Pick the entry you are replying to.');
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) throw new LeadFollowUpValidationError('Please write the reply.');
  if (message.length > FOLLOW_UP_REPLY_MAX_LENGTH) {
    throw new LeadFollowUpValidationError(`The reply can be at most ${FOLLOW_UP_REPLY_MAX_LENGTH} characters.`);
  }
  return { followUpId, message };
}

function parseSource(value: unknown): LeadSource {
  if (!isLeadSource(value)) throw new LeadFollowUpNotFoundError('Lead not found.');
  return value;
}

/** Follow-ups on Sales Tracker leads. Employees (and Event / Publisher Admins, through their linked
 * HR login) read and add them from My Leads, only on leads they are assigned to; the admin Sales
 * Tracker reads them. Nobody edits or deletes a follow-up, and nothing here changes the lead's own
 * details. */
export class LeadFollowUpsService {
  private assignments = new LeadAssignmentsService(new LeadAssignmentsRepository());

  constructor(private repository: LeadFollowUpsRepository) {}

  /** The read-only lead view for an assigned employee: what the visitor submitted, who else is on
   * the lead and the whole follow-up log with its replies. Loading it is what counts as seeing
   * the admin's replies: this response still marks them `unread`, the next one won't. */
  async getDetailForEmployee(rawSource: unknown, leadId: string, credentialId: number): Promise<LeadDetail> {
    const source = parseSource(rawSource);
    const assignment = await this.repository.findAssignment(source, leadId, credentialId);
    if (!assignment) throw new LeadFollowUpNotFoundError('Lead not found.');
    const [submission, team, followUps, replies, lastSeenId, statusRaw] = await Promise.all([
      buildLeadSubmission(source, leadId),
      this.assignments.getForLead(source, leadId),
      this.repository.findForLead(source, leadId),
      this.repository.findRepliesForLead(source, leadId),
      this.repository.findLastSeenReplyId(source, leadId, credentialId),
      this.repository.findLeadStatusRaw(source, leadId),
    ]);
    if (!submission || statusRaw === undefined) throw new LeadFollowUpNotFoundError('Lead not found.');
    const newestReplyId = replies.length ? Number(replies[replies.length - 1].id) : 0;
    if (newestReplyId > lastSeenId) await this.repository.markRepliesSeen(source, leadId, credentialId, newestReplyId);
    const grouped = groupReplies(replies, credentialId, lastSeenId);
    return {
      source,
      leadId,
      submission,
      assignees: team.assignees,
      followUps: followUps.map((f) => toFollowUp(f, credentialId, grouped)),
      leadStatus: source === 'lead' ? statusFromSalesLead(statusRaw) : statusFromEns(statusRaw),
      nextFollowUpDate: assignment.next_follow_up_date ? String(assignment.next_follow_up_date).slice(0, 10) : '',
      assignedAt: String(assignment.assigned_at),
      assignedBy: assignment.assigned_by || '',
    };
  }

  /** Adds a follow-up with the status the employee picked — which becomes the lead's shared status,
   * seen by the admin too — stamped with the current time by the database, and returns the
   * refreshed lead view. While the picked status leaves the lead open (Pending / Follow Up) a next
   * follow-up date is compulsory and becomes this employee's own date on the lead; a status that
   * closes the lead takes none and clears theirs. */
  async addForEmployee(
    rawSource: unknown,
    leadId: string,
    credential: { id: number; name: string },
    body: Record<string, unknown>
  ): Promise<LeadDetail> {
    const source = parseSource(rawSource);
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    if (!note) throw new LeadFollowUpValidationError('Please write the follow-up message.');
    if (note.length > FOLLOW_UP_NOTE_MAX_LENGTH) {
      throw new LeadFollowUpValidationError(`The follow-up message can be at most ${FOLLOW_UP_NOTE_MAX_LENGTH} characters.`);
    }
    if (!isPickableAssignmentStatus(body.status)) throw new LeadFollowUpValidationError('Please pick a status.');
    let nextFollowUpDate = '';
    if (statusNeedsFollowUpDate(body.status)) {
      if (!body.nextFollowUpDate) throw new LeadFollowUpValidationError('Please pick the next follow-up date.');
      if (!isIsoDay(body.nextFollowUpDate)) throw new LeadFollowUpValidationError('Please pick a valid next follow-up date.');
      nextFollowUpDate = body.nextFollowUpDate;
    }
    const saved = await this.repository.add(source, leadId, credential.id, credential.name || 'Employee', body.status, note, nextFollowUpDate);
    if (!saved) throw new LeadFollowUpNotFoundError('Lead not found.');
    return this.getDetailForEmployee(source, leadId, credential.id);
  }

  /** A reply from someone assigned to the lead, under any entry of its history. Returns the
   * refreshed lead view. */
  async addReplyForEmployee(
    rawSource: unknown,
    leadId: string,
    credential: { id: number; name: string },
    body: Record<string, unknown>
  ): Promise<LeadDetail> {
    const source = parseSource(rawSource);
    const { followUpId, message } = parseReply(body);
    if (!(await this.repository.findAssignment(source, leadId, credential.id))) throw new LeadFollowUpNotFoundError('Lead not found.');
    if (!(await this.repository.followUpBelongsToLead(followUpId, source, leadId))) {
      throw new LeadFollowUpValidationError('That entry is no longer on this lead. Reopen the lead and try again.');
    }
    await this.repository.addReply(followUpId, source, leadId, credential.id, credential.name || 'Employee', message);
    return this.getDetailForEmployee(source, leadId, credential.id);
  }

  /** For the admin lead window. */
  async getForAdmin(rawSource: unknown, leadId: string): Promise<LeadFollowUpsView> {
    const source = parseSource(rawSource);
    const [team, followUps, replies] = await Promise.all([
      this.assignments.getForLead(source, leadId),
      this.repository.findForLead(source, leadId),
      this.repository.findRepliesForLead(source, leadId),
    ]);
    const grouped = groupReplies(replies, null, 0);
    return { assignees: team.assignees, followUps: followUps.map((f) => toFollowUp(f, null, grouped)) };
  }

  /** An admin's reply under any entry of a lead's history, from the Sales Tracker lead window.
   * Returns the refreshed history. */
  async addReplyForAdmin(body: Record<string, unknown>, authorName: string): Promise<LeadFollowUpsView> {
    const source = parseSource(body.source);
    const leadId = typeof body.leadId === 'string' ? body.leadId : '';
    const { followUpId, message } = parseReply(body);
    if (!(await this.repository.followUpBelongsToLead(followUpId, source, leadId))) throw new LeadFollowUpNotFoundError('Lead not found.');
    await this.repository.addReply(followUpId, source, leadId, ADMIN_FOLLOW_UP_CREDENTIAL_ID, authorName || 'Admin', message);
    return this.getForAdmin(source, leadId);
  }

  /** The reader's unseen admin replies, for the new-reply pop-up. */
  async getUnreadRepliesForEmployee(credentialId: number): Promise<UnreadLeadReplies> {
    const rows = (await this.repository.findUnreadRepliesForEmployee(credentialId)).filter((r) => isLeadSource(r.lead_source));
    return {
      count: rows.length,
      items: rows.slice(0, 20).map((r) => ({
        replyId: Number(r.reply_id),
        source: r.lead_source as LeadSource,
        leadId: r.lead_id,
        leadName: r.lead_name || '',
        authorName: r.author_name || 'Admin',
        createdAt: String(r.created_at),
      })),
    };
  }
}
