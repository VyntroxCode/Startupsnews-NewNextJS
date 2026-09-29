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
  FOLLOW_UP_NOTE_MAX_LENGTH,
  type LeadDetail,
  type LeadFollowUp,
  type LeadFollowUpEntity,
  type LeadFollowUpsView,
} from '../domain/types';
import { buildLeadSubmission } from './lead-details';

/** Bad input (→ 400). */
export class LeadFollowUpValidationError extends Error {}
/** The lead doesn't exist, or the caller isn't assigned to it (→ 404 — same answer for both, so an
 * employee can't probe for leads that aren't theirs). */
export class LeadFollowUpNotFoundError extends Error {}

function toStatus(value: string): AssignmentStatus {
  return ASSIGNMENT_STATUS_OPTIONS.find((o) => o.value === value)?.value ?? ASSIGNMENT_STATUS_PENDING;
}

function toFollowUp(e: LeadFollowUpEntity, readerId: number | null): LeadFollowUp {
  return {
    id: Number(e.id),
    credentialId: Number(e.credential_id),
    authorName: e.author_name || '',
    status: toStatus(e.status),
    note: e.note || '',
    createdAt: String(e.created_at),
    mine: readerId !== null && Number(e.credential_id) === readerId,
  };
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
   * the lead and the whole follow-up log. */
  async getDetailForEmployee(rawSource: unknown, leadId: string, credentialId: number): Promise<LeadDetail> {
    const source = parseSource(rawSource);
    const assignment = await this.repository.findAssignment(source, leadId, credentialId);
    if (!assignment) throw new LeadFollowUpNotFoundError('Lead not found.');
    const [submission, team, followUps, statusRaw] = await Promise.all([
      buildLeadSubmission(source, leadId),
      this.assignments.getForLead(source, leadId),
      this.repository.findForLead(source, leadId),
      this.repository.findLeadStatusRaw(source, leadId),
    ]);
    if (!submission || statusRaw === undefined) throw new LeadFollowUpNotFoundError('Lead not found.');
    return {
      source,
      leadId,
      submission,
      assignees: team.assignees,
      followUps: followUps.map((f) => toFollowUp(f, credentialId)),
      leadStatus: source === 'lead' ? statusFromSalesLead(statusRaw) : statusFromEns(statusRaw),
      assignedAt: String(assignment.assigned_at),
      assignedBy: assignment.assigned_by || '',
    };
  }

  /** Adds a follow-up with the status the employee picked — which becomes the lead's shared status,
   * seen by the admin too — stamped with the current time by the database, and returns the
   * refreshed lead view. */
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
    const saved = await this.repository.add(source, leadId, credential.id, credential.name || 'Employee', body.status, note);
    if (!saved) throw new LeadFollowUpNotFoundError('Lead not found.');
    return this.getDetailForEmployee(source, leadId, credential.id);
  }

  /** For the admin lead window. */
  async getForAdmin(rawSource: unknown, leadId: string): Promise<LeadFollowUpsView> {
    const source = parseSource(rawSource);
    const [team, followUps] = await Promise.all([this.assignments.getForLead(source, leadId), this.repository.findForLead(source, leadId)]);
    return { assignees: team.assignees, followUps: followUps.map((f) => toFollowUp(f, null)) };
  }
}
