import { getDbConnection, query, queryOne } from '@/shared/database/connection';
import { type AssignmentStatus, ensCodeFor, type LeadSource, SALES_LEAD_STATUS_LABELS, ASSIGNMENT_STATUS_OPTIONS } from '@/modules/lead-assignments/domain/types';
import { ADMIN_FOLLOW_UP_CREDENTIAL_ID, type LeadChange, type LeadFollowUpEntity, type LeadFollowUpReplyEntity, type UnreadLeadReplyEntity } from '../domain/types';

/** Reads of the reply tables go through this: if they aren't there yet (code deployed before
 * scripts/migrations/add-sales-lead-followup-replies.sql was run), the lead windows and My Leads
 * keep working with no replies instead of failing outright. Writing a reply is NOT guarded. */
async function ifReplyTables<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (e) {
    if ((e as { code?: string })?.code !== 'ER_NO_SUCH_TABLE') throw e;
    console.warn('The lead reply tables are missing — run scripts/migrations/add-sales-lead-followup-replies.sql');
    return fallback;
  }
}

/** Table: sales_lead_followups (scripts/migrations/add-sales-lead-followups.sql). A follow-up also
 * sets the lead's one shared status — sales_leads.status (as its label) or
 * ens_travel_enquiries.lead_status (as its code); see ASSIGNMENT_STATUS_OPTIONS. */
export class LeadFollowUpsRepository {
  async findForLead(source: LeadSource, leadId: string): Promise<LeadFollowUpEntity[]> {
    return query<LeadFollowUpEntity>(
      `SELECT id, lead_source, lead_id, credential_id, author_name, status, note, next_follow_up_date, changes, created_at
         FROM sales_lead_followups
        WHERE lead_source = ? AND lead_id = ?
        ORDER BY created_at DESC, id DESC`,
      [source, leadId]
    );
  }

  /** An admin's status update on a lead (the status they set and what they wrote), kept in the same
   * log as the employees' follow-ups so the lead has one history. It does not change the lead's
   * status — the caller has already saved that. `nextFollowUpDate` is the admin's own date on the
   * lead at that moment ('' = none), kept with the entry as history. `changes` is what the save
   * changed on the lead (old → new); `note` may be '' when the entry is only that. `created_at` is
   * left to the database. */
  async addAdminUpdate(
    source: LeadSource,
    leadId: string,
    authorName: string,
    status: AssignmentStatus,
    note: string,
    nextFollowUpDate = '',
    changes: LeadChange[] = []
  ): Promise<void> {
    await query(
      'INSERT INTO sales_lead_followups (lead_source, lead_id, credential_id, author_name, status, note, next_follow_up_date, changes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [source, leadId, ADMIN_FOLLOW_UP_CREDENTIAL_ID, authorName, status, note, nextFollowUpDate || null, changes.length ? JSON.stringify(changes) : null]
    );
  }

  /** Records `changes` an admin made to the lead as part of the save they are in the middle of.
   * The lead window saves the lead first and its assignment second, as two requests; so that one
   * Save reads as ONE history entry, these changes are added to the entry the same admin wrote on
   * this lead in the last few seconds, if there is one — otherwise they get an entry of their own. */
  async appendAdminChanges(source: LeadSource, leadId: string, authorName: string, status: AssignmentStatus, changes: LeadChange[]): Promise<void> {
    if (!changes.length) return;
    const recent = await queryOne<{ id: number; changes: string | null }>(
      `SELECT id, changes FROM sales_lead_followups
        WHERE lead_source = ? AND lead_id = ? AND credential_id = ${ADMIN_FOLLOW_UP_CREDENTIAL_ID} AND author_name = ?
          AND created_at >= NOW() - INTERVAL 15 SECOND
        ORDER BY id DESC LIMIT 1`,
      [source, leadId, authorName]
    );
    if (!recent) return this.addAdminUpdate(source, leadId, authorName, status, '', '', changes);
    let existing: LeadChange[] = [];
    try { existing = recent.changes ? (JSON.parse(recent.changes) as LeadChange[]) : []; } catch { existing = []; }
    await query('UPDATE sales_lead_followups SET changes = ? WHERE id = ?', [JSON.stringify([...existing, ...changes]), recent.id]);
  }

  /** Every reply on the lead, oldest first (sales_lead_followup_replies). */
  async findRepliesForLead(source: LeadSource, leadId: string): Promise<LeadFollowUpReplyEntity[]> {
    return ifReplyTables(() => query<LeadFollowUpReplyEntity>(
      `SELECT id, followup_id, credential_id, author_name, message, created_at
         FROM sales_lead_followup_replies
        WHERE lead_source = ? AND lead_id = ?
        ORDER BY id ASC`,
      [source, leadId]
    ), []);
  }

  /** Whether the history entry exists and belongs to this lead. */
  async followUpBelongsToLead(followUpId: number, source: LeadSource, leadId: string): Promise<boolean> {
    const row = await queryOne<{ id: number }>(
      'SELECT id FROM sales_lead_followups WHERE id = ? AND lead_source = ? AND lead_id = ?',
      [followUpId, source, leadId]
    );
    return !!row;
  }

  /** `credentialId` ADMIN_FOLLOW_UP_CREDENTIAL_ID = an admin. `created_at` is left to the database. */
  async addReply(followUpId: number, source: LeadSource, leadId: string, credentialId: number, authorName: string, message: string): Promise<void> {
    await query(
      'INSERT INTO sales_lead_followup_replies (followup_id, lead_source, lead_id, credential_id, author_name, message) VALUES (?, ?, ?, ?, ?, ?)',
      [followUpId, source, leadId, credentialId, authorName, message]
    );
  }

  /** The highest reply id this person had seen on the lead (0 = none). */
  async findLastSeenReplyId(source: LeadSource, leadId: string, credentialId: number): Promise<number> {
    const row = await ifReplyTables(() => queryOne<{ n: number }>(
      'SELECT last_seen_reply_id AS n FROM sales_lead_reply_seen WHERE lead_source = ? AND lead_id = ? AND credential_id = ?',
      [source, leadId, credentialId]
    ), null);
    return Number(row?.n ?? 0);
  }

  /** Moves the person's seen mark on the lead up to `replyId` (never down). */
  async markRepliesSeen(source: LeadSource, leadId: string, credentialId: number, replyId: number): Promise<void> {
    await query(
      `INSERT INTO sales_lead_reply_seen (lead_source, lead_id, credential_id, last_seen_reply_id) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE last_seen_reply_id = GREATEST(last_seen_reply_id, VALUES(last_seen_reply_id))`,
      [source, leadId, credentialId, replyId]
    );
  }

  /** Admin replies this person hasn't seen, newest first — only on leads they are still assigned
   * to, and only replies written since they were put on the lead. */
  async findUnreadRepliesForEmployee(credentialId: number): Promise<UnreadLeadReplyEntity[]> {
    return ifReplyTables(() => query<UnreadLeadReplyEntity>(
      `SELECT r.id AS reply_id, r.lead_source, r.lead_id, r.author_name, r.created_at,
              COALESCE(l.name, e.name) AS lead_name
         FROM sales_lead_followup_replies r
         JOIN sales_lead_assignments a
           ON a.lead_source = r.lead_source AND a.lead_id = r.lead_id AND a.credential_id = ?
         LEFT JOIN sales_lead_reply_seen s
           ON s.lead_source = r.lead_source AND s.lead_id = r.lead_id AND s.credential_id = a.credential_id
         LEFT JOIN sales_leads l ON a.lead_source = 'lead' AND l.id = a.lead_id
         LEFT JOIN ens_travel_enquiries e ON a.lead_source = 'ens' AND e.id = a.lead_id
        WHERE r.credential_id = ${ADMIN_FOLLOW_UP_CREDENTIAL_ID}
          AND r.id > COALESCE(s.last_seen_reply_id, 0)
          AND r.created_at >= a.assigned_at
        ORDER BY r.id DESC`,
      [credentialId]
    ), []);
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
  ): Promise<{ status: string; assigned_at: string; assigned_by: string | null; next_follow_up_date: string | null } | null> {
    return queryOne<{ status: string; assigned_at: string; assigned_by: string | null; next_follow_up_date: string | null }>(
      'SELECT status, assigned_at, assigned_by, next_follow_up_date FROM sales_lead_assignments WHERE lead_source = ? AND lead_id = ? AND credential_id = ?',
      [source, leadId, credentialId]
    );
  }

  /** Saves the follow-up, sets the lead's shared status to the one picked and makes
   * `nextFollowUpDate` this person's own next follow-up date on the lead ('' clears it — the
   * follow-up closed the lead), in one transaction.
   * The row lock on the assignment stops a Sales Tracker save removing them mid-way; if they were
   * removed just before, nothing is written and false is returned. `created_at` is left to the
   * database — the date is never taken from the request. */
  async add(
    source: LeadSource,
    leadId: string,
    credentialId: number,
    authorName: string,
    status: AssignmentStatus,
    note: string,
    nextFollowUpDate: string
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
        'INSERT INTO sales_lead_followups (lead_source, lead_id, credential_id, author_name, status, note, next_follow_up_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [source, leadId, credentialId, authorName, status, note, nextFollowUpDate || null]
      );
      await connection.query(
        'UPDATE sales_lead_assignments SET next_follow_up_date = ? WHERE lead_source = ? AND lead_id = ? AND credential_id = ?',
        [nextFollowUpDate || null, source, leadId, credentialId]
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
