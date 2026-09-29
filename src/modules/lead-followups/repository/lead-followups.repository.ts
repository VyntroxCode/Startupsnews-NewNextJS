import { getDbConnection, query, queryOne } from '@/shared/database/connection';
import { type AssignmentStatus, ensCodeFor, type LeadSource, SALES_LEAD_STATUS_LABELS, ASSIGNMENT_STATUS_OPTIONS } from '@/modules/lead-assignments/domain/types';
import type { LeadFollowUpEntity } from '../domain/types';

/** Table: sales_lead_followups (scripts/migrations/add-sales-lead-followups.sql). A follow-up also
 * sets the lead's one shared status — sales_leads.status (as its label) or
 * ens_travel_enquiries.lead_status (as its code); see ASSIGNMENT_STATUS_OPTIONS. */
export class LeadFollowUpsRepository {
  async findForLead(source: LeadSource, leadId: string): Promise<LeadFollowUpEntity[]> {
    return query<LeadFollowUpEntity>(
      `SELECT id, lead_source, lead_id, credential_id, author_name, status, note, created_at
         FROM sales_lead_followups
        WHERE lead_source = ? AND lead_id = ?
        ORDER BY created_at DESC, id DESC`,
      [source, leadId]
    );
  }

  /** The lead's stored status, raw: sales_leads.status (a label) or ens_travel_enquiries.lead_status
   * (a code / NULL). undefined when the lead doesn't exist. */
  async findLeadStatusRaw(source: LeadSource, leadId: string): Promise<string | null | undefined> {
    const row = source === 'lead'
      ? await queryOne<{ s: string | null }>('SELECT status AS s FROM sales_leads WHERE id = ?', [leadId])
      : await queryOne<{ s: string | null }>('SELECT lead_status AS s FROM ens_travel_enquiries WHERE id = ?', [leadId]);
    return row ? row.s : undefined;
  }

  /** The caller's assignment on the lead, or null when they aren't on it. */
  async findAssignment(
    source: LeadSource,
    leadId: string,
    credentialId: number
  ): Promise<{ status: string; assigned_at: string; assigned_by: string | null } | null> {
    return queryOne<{ status: string; assigned_at: string; assigned_by: string | null }>(
      'SELECT status, assigned_at, assigned_by FROM sales_lead_assignments WHERE lead_source = ? AND lead_id = ? AND credential_id = ?',
      [source, leadId, credentialId]
    );
  }

  /** Saves the follow-up and sets the lead's shared status to the one picked, in one transaction.
   * The row lock on the assignment stops a Sales Tracker save removing them mid-way; if they were
   * removed just before, nothing is written and false is returned. `created_at` is left to the
   * database — the date is never taken from the request. */
  async add(
    source: LeadSource,
    leadId: string,
    credentialId: number,
    authorName: string,
    status: AssignmentStatus,
    note: string
  ): Promise<boolean> {
    const pool = await getDbConnection();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const rows = (await connection.query(
        'SELECT 1 FROM sales_lead_assignments WHERE lead_source = ? AND lead_id = ? AND credential_id = ? FOR UPDATE',
        [source, leadId, credentialId]
      )) as unknown[];
      if (!rows.length) {
        await connection.rollback();
        return false;
      }
      await connection.query(
        'INSERT INTO sales_lead_followups (lead_source, lead_id, credential_id, author_name, status, note) VALUES (?, ?, ?, ?, ?, ?)',
        [source, leadId, credentialId, authorName, status, note]
      );
      if (source === 'lead') {
        const label = ASSIGNMENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? SALES_LEAD_STATUS_LABELS[0];
        await connection.query('UPDATE sales_leads SET status = ? WHERE id = ?', [label, leadId]);
      } else {
        // updated_at / updated_by on this table mean "last ADMIN edit" (shown as such in the Sales
        // Tracker), so an employee's status change leaves them alone.
        await connection.query('UPDATE ens_travel_enquiries SET lead_status = ? WHERE id = ?', [ensCodeFor(status), leadId]);
      }
      await connection.commit();
      return true;
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }
}
