import { SalesTrackerRepository } from '../repository/sales-tracker.repository';
import { SalesLead } from '../domain/types';
import { entityToLead } from '../utils/sales-tracker.utils';
import { statusFromSalesLead } from '@/modules/lead-assignments/domain/types';
import { LeadFollowUpsRepository } from '@/modules/lead-followups/repository/lead-followups.repository';
import { FOLLOW_UP_NOTE_MAX_LENGTH, STATUS_CHANGE_FIELD } from '@/modules/lead-followups/domain/types';
import { salesLeadChanges } from '@/modules/lead-followups/service/lead-changes';
import { isIsoDay, statusNeedsFollowUpDate } from '@/modules/lead-followups/domain/follow-up-date';

export class SalesTrackerService {
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
    const saved = await this.saveLead(lead);
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

  async deleteLead(id: string): Promise<void> {
    await this.repository.deleteLead(id);
  }
}
