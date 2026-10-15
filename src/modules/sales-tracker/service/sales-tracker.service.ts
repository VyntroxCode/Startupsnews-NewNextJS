import { SalesTrackerRepository } from '../repository/sales-tracker.repository';
import { MANUAL_LEAD_TYPES, SalesLead } from '../domain/types';
import { entityToLead } from '../utils/sales-tracker.utils';
import { type LeadImportDefaults, type LeadImportRaw, parseLeadImportRow } from '../utils/import-columns';
import { type AssignableEmployee, type DepartmentOption, SALES_LEAD_STATUS_LABELS, statusFromSalesLead } from '@/modules/lead-assignments/domain/types';
import { LeadAssignmentsRepository } from '@/modules/lead-assignments/repository/lead-assignments.repository';
import { LeadAssignmentsService } from '@/modules/lead-assignments/service/lead-assignments.service';
import { LeadFollowUpsRepository } from '@/modules/lead-followups/repository/lead-followups.repository';
import { FOLLOW_UP_NOTE_MAX_LENGTH, STATUS_CHANGE_FIELD } from '@/modules/lead-followups/domain/types';
import { salesLeadChanges } from '@/modules/lead-followups/service/lead-changes';
import { isIsoDay, statusNeedsFollowUpDate } from '@/modules/lead-followups/domain/follow-up-date';

/** Bad input from an employee's Add / Edit lead window (→ 400, with the message to show). */
export class EmployeeLeadValidationError extends Error {}
/** The lead doesn't exist or the caller didn't create it (→ 404 — same answer for both). */
export class EmployeeLeadNotFoundError extends Error {}

/** The employee who is adding or editing a lead from My Leads: their HR login. */
export interface LeadAuthor {
  id: number;
  name: string;
}

/** The only lead fields an employee's window may set, with the longest value each column takes.
 * Everything else on the row (event details, budget, the visitor's text, who created it, the
 * creation date) is left exactly as stored. */
const EMPLOYEE_TEXT_FIELDS: [key: keyof SalesLead & string, max: number][] = [
  ['name', 255],
  ['company', 255],
  ['contact', 50],
  ['email', 255],
  ['country', 255],
  ['city', 255],
  ['source', 255],
  ['otherType', 255],
];

/** A new lead's row before the employee's fields are laid over it. */
function blankLead(id: string, date: string): SalesLead {
  return {
    id, date, name: '', company: '', contact: '', email: '', country: '', city: '', source: '',
    type: MANUAL_LEAD_TYPES[0], otherType: '', query: '', assignedTo: '', status: SALES_LEAD_STATUS_LABELS[0],
    nextFollowUpDate: '', lastConnectDate: '', lastCallDiscussion: '',
    eventTitle: '', eventSlug: '', eventDate: '', eventTime: '', externalUrl: '', posterUrl: '', description: '',
    budgetRange: '', campaignGoal: '', tellUsMore: '',
  };
}

/** Lays the fields an employee may set over `base`, checked. Fields the request leaves out keep
 * `base`'s value. */
function applyEmployeeFields(base: SalesLead, body: Record<string, unknown>): SalesLead {
  const lead: SalesLead = { ...base };
  const text = lead as unknown as Record<string, string>;
  for (const [key, max] of EMPLOYEE_TEXT_FIELDS) {
    if (typeof body[key] !== 'string') continue;
    const value = (body[key] as string).trim();
    if (value.length > max) throw new EmployeeLeadValidationError('One of the fields is too long. Please shorten it and save again.');
    text[key] = value;
  }
  if (!lead.name) throw new EmployeeLeadValidationError('Name is required.');
  if (typeof body.type === 'string') {
    if (!(MANUAL_LEAD_TYPES as readonly string[]).includes(body.type)) throw new EmployeeLeadValidationError('Please pick a type of lead from the list.');
    lead.type = body.type;
  }
  if (lead.type !== 'Others') lead.otherType = '';
  if (typeof body.status === 'string') {
    if (!SALES_LEAD_STATUS_LABELS.includes(body.status)) throw new EmployeeLeadValidationError('Please pick a status from the list.');
    lead.status = body.status;
  }
  if (typeof body.nextFollowUpDate === 'string') lead.nextFollowUpDate = body.nextFollowUpDate;
  if (statusNeedsFollowUpDate(statusFromSalesLead(lead.status))) {
    if (!lead.nextFollowUpDate) throw new EmployeeLeadValidationError('Please pick the next follow-up date.');
    if (!isIsoDay(lead.nextFollowUpDate)) throw new EmployeeLeadValidationError('Please pick a valid next follow-up date.');
  } else if (lead.nextFollowUpDate && !isIsoDay(lead.nextFollowUpDate)) {
    lead.nextFollowUpDate = base.nextFollowUpDate;
  }
  return lead;
}

/** An employee's lead must always have somebody on it. */
function requireAssignees(body: Record<string, unknown>): void {
  if (!Array.isArray(body.assignees) || body.assignees.length === 0) {
    throw new EmployeeLeadValidationError('Please assign this lead to at least one person.');
  }
}

function noteOf(body: Record<string, unknown>): string {
  return typeof body.note === 'string' ? body.note.trim().slice(0, FOLLOW_UP_NOTE_MAX_LENGTH) : '';
}

export class SalesTrackerService {
  private assignments = new LeadAssignmentsService(new LeadAssignmentsRepository());

  constructor(private repository: SalesTrackerRepository) {}

  async getAllLeads(): Promise<SalesLead[]> {
    const rows = await this.repository.findAllLeads();
    return rows.map(entityToLead);
  }

  async saveLead(lead: SalesLead): Promise<SalesLead> {
    if (!lead.id) throw new Error('Lead id is required');
    if (!lead.name || !lead.name.trim()) throw new Error('Name is required');
    const saved = await this.repository.upsertLead(lead);
    return entityToLead(saved);
  }

  /** A save from the Sales Tracker lead window. Besides storing the lead, it adds ONE entry to the
   * lead's history (sales_lead_followups, as an admin update — the same mechanism an Expand North
   * Star lead uses, see EnsTravelEnquiriesService.update) whenever the save changed anything or
   * carried a Conversation result (`adminNote`, which is not a column of the lead): the note, plus
   * every changed field as old value → new value (see lead-changes.ts). A brand-new lead has
   * nothing to compare with, so creating it only logs a note if one was written. Logged after the
   * save; if it fails the edit still stands.
   *
   * The admin's Next follow-up date is compulsory here while the lead is open (Pending / Follow
   * Up), for every lead type. saveLead itself doesn't ask for one: a lead mirrored in from a public
   * page arrives without a date and gets it on this first admin save. */
  async saveLeadByAdmin(body: SalesLead & { adminNote?: unknown }, adminName: string): Promise<SalesLead> {
    const { adminNote, ...lead } = body;
    if (statusNeedsFollowUpDate(statusFromSalesLead(lead.status))) {
      if (!lead.nextFollowUpDate) throw new Error('Next follow-up date is required');
      if (!isIsoDay(lead.nextFollowUpDate)) throw new Error('Next follow-up date is not a valid date');
    }
    const existing = lead.id ? await this.repository.findLeadById(lead.id) : null;
    const before = existing ? entityToLead(existing) : null;
    // Who created the lead is the server's to say, never the request's: a lead this admin is adding
    // gets their name. (On an existing lead the repository leaves both columns as stored.)
    const saved = await this.saveLead({ ...lead, createdByCredentialId: null, createdByName: adminName || 'Admin' });
    // On a lead an employee created, the lead's own date is also that employee's date on it (see
    // LeadFollowUpsRepository.add): keep the copy on their assignment row, if any, the same.
    if (before && saved.createdByCredentialId && saved.nextFollowUpDate !== before.nextFollowUpDate) {
      await this.repository.syncAssigneeFollowUpDate(saved.id, saved.createdByCredentialId, saved.nextFollowUpDate);
    }
    const note = typeof adminNote === 'string' ? adminNote.trim().slice(0, FOLLOW_UP_NOTE_MAX_LENGTH) : '';
    const changes = before ? salesLeadChanges(before, saved) : [];
    if (note || changes.length) {
      const status = statusFromSalesLead(saved.status);
      // The date rides along only when the entry is about the conversation or the date itself.
      const dated = note || changes.some((c) => c.field === STATUS_CHANGE_FIELD || c.field === 'Next follow-up date');
      try {
        await new LeadFollowUpsRepository().addAdminUpdate(
          'lead', saved.id, adminName || 'Admin', status, note,
          dated && statusNeedsFollowUpDate(status) ? saved.nextFollowUpDate : '',
          changes
        );
      } catch (error) {
        console.error('Could not log the admin update on sales lead', saved.id, error);
      }
    }
    return saved;
  }

  /** The admin's bulk import (Sales Tracker › Import leads). Every row is parsed again here with the
   * same rules the window previewed (parseLeadImportRow), so a hand-made request can't store what
   * the window would have refused. Good rows become new leads — never an update of an existing one —
   * created by the admin and unassigned; each gets one history entry naming the file. Rows are
   * stored one by one, so a failure part-way keeps the leads already stored and reports the rest.
   * `rowNumbers[i]` is the spreadsheet row of `rows[i]`, used in the report. */
  async importLeads(
    rows: LeadImportRaw[],
    rowNumbers: number[],
    defaults: LeadImportDefaults,
    fileName: string,
    adminName: string
  ): Promise<{ leads: SalesLead[]; invalid: { row: number; reason: string }[] }> {
    const leads: SalesLead[] = [];
    const invalid: { row: number; reason: string }[] = [];
    const author = adminName || 'Admin';
    const stamp = Date.now();
    for (let i = 0; i < rows.length; i++) {
      const row = rowNumbers[i] || i + 2;
      const { fields, error } = parseLeadImportRow(rows[i], defaults);
      if (error) { invalid.push({ row, reason: error }); continue; }
      // The row index keeps ids unique within one import (they're all made in the same millisecond).
      const id = `lead_${stamp}_${i}_${Math.random().toString(36).slice(2, 6)}`;
      try {
        const saved = await this.saveLead({ ...blankLead(id, fields.date), ...fields, createdByCredentialId: null, createdByName: author });
        leads.push(saved);
        const status = statusFromSalesLead(saved.status);
        try {
          await new LeadFollowUpsRepository().addAdminUpdate(
            'lead', saved.id, author, status, `Imported from ${fileName}`,
            statusNeedsFollowUpDate(status) ? saved.nextFollowUpDate : ''
          );
        } catch (logError) {
          console.error('Could not log the import on sales lead', saved.id, logError);
        }
      } catch (saveError) {
        console.error('Could not import sales lead row', row, saveError);
        invalid.push({ row, reason: 'Could not be saved — try this row again' });
      }
    }
    return { leads, invalid };
  }

  async deleteLead(id: string): Promise<void> {
    await this.repository.deleteLead(id);
  }

  /** What an employee's Add / Edit lead window needs to offer: the people and departments a lead
   * can be assigned to — the same lists the admin Sales Tracker offers. */
  async getAssignmentOptions(): Promise<{ employees: AssignableEmployee[]; departments: DepartmentOption[] }> {
    const employees = await this.assignments.getAssignableEmployees();
    return { employees, departments: await this.assignments.getDepartments(employees) };
  }

  /** A lead added from My Leads by an employee (or an Event / Publisher Admin through their HR
   * login). Body: the lead fields of EMPLOYEE_TEXT_FIELDS + `type`, `status`, `nextFollowUpDate`,
   * the assignment (`departments`, `assignees` — at least one person, under the same department
   * rules as an admin's assignment) and an optional `note` (the window's Conversation result).
   *
   * The id and the creation date are the server's, so a request can neither overwrite an existing
   * lead nor backdate one. The lead is stored with the employee as its creator, which is what lets
   * them open and edit it later whether or not they put themselves on it. If the assignment is
   * refused the lead is removed again, so a failed save leaves nothing behind. Returns the lead's id. */
  async createByEmployee(body: Record<string, unknown>, author: LeadAuthor): Promise<string> {
    requireAssignees(body);
    const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    // The lead's day on the Indian clock, like the DB's own timestamps.
    const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const lead = applyEmployeeFields(blankLead(id, today), body);
    const saved = await this.saveLead({ ...lead, createdByCredentialId: author.id, createdByName: author.name || 'Employee' });
    // Before the assignment, so "Assigned to" is folded into the same history entry (appendAdminChanges).
    const note = noteOf(body);
    if (note) await this.logEmployeeEntry(saved, author, note, []);
    try {
      const assignment = await this.assignments.setForLead(
        { source: 'lead', leadId: saved.id, departments: body.departments, assignees: body.assignees },
        author.name || 'Employee',
        author.id
      );
      if (!assignment.assignees.length) throw new EmployeeLeadValidationError('Please assign this lead to at least one person.');
    } catch (error) {
      // deleteLead also drops the entry just logged and anything the assignment stored.
      await this.repository.deleteLead(saved.id);
      throw error;
    }
    return saved.id;
  }

  /** An edit, from My Leads, of a lead the employee created — the only leads an employee may edit.
   * Same body as createByEmployee; fields left out keep their stored value. Everything the save
   * changed goes into the lead's history as old value → new value under the employee's name, with
   * the note if one was written — the same entry an admin's save writes (see saveLeadByAdmin). The
   * entry counts as a follow-up only when it carries a note. Employees cannot delete a lead. */
  async updateByEmployee(leadId: string, body: Record<string, unknown>, author: LeadAuthor): Promise<void> {
    const existing = await this.repository.findLeadById(leadId);
    if (!existing || existing.created_by_credential_id == null || Number(existing.created_by_credential_id) !== author.id) {
      throw new EmployeeLeadNotFoundError('Lead not found.');
    }
    requireAssignees(body);
    const before = entityToLead(existing);
    const saved = await this.saveLead(applyEmployeeFields(before, body));
    // Their own date on the lead is the lead's own (see LeadFollowUpsRepository.add): keep the copy
    // on their assignment row, if they are on the lead, the same, so the admin sees one date for them.
    if (saved.nextFollowUpDate !== before.nextFollowUpDate) {
      await this.repository.syncAssigneeFollowUpDate(saved.id, author.id, saved.nextFollowUpDate);
    }
    const note = noteOf(body);
    const changes = salesLeadChanges(before, saved);
    if (note || changes.length) await this.logEmployeeEntry(saved, author, note, changes);
    // After the lead's own entry, so the assignment's changes are folded into it (appendAdminChanges).
    await this.assignments.setForLead(
      { source: 'lead', leadId: saved.id, departments: body.departments, assignees: body.assignees },
      author.name || 'Employee',
      author.id
    );
  }

  /** The history entry for an employee's save of their own lead. A failure is logged and never
   * fails the save, like the admin's. */
  private async logEmployeeEntry(saved: SalesLead, author: LeadAuthor, note: string, changes: ReturnType<typeof salesLeadChanges>): Promise<void> {
    const status = statusFromSalesLead(saved.status);
    const dated = note || changes.some((c) => c.field === STATUS_CHANGE_FIELD || c.field === 'Next follow-up date');
    try {
      await new LeadFollowUpsRepository().addEntry(
        'lead', saved.id, author.id, author.name || 'Employee', status, note,
        dated && statusNeedsFollowUpDate(status) ? saved.nextFollowUpDate : '',
        changes
      );
    } catch (error) {
      console.error('Could not log the employee update on sales lead', saved.id, error);
    }
  }
}
