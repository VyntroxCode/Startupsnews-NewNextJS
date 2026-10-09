import { getDbConnection, query, queryOne } from '@/shared/database/connection';
import type { LeadAssigneeEntity, LeadDepartmentEntity, LeadSource } from '../domain/types';

/** An active HR login that isn't linked to an exited Directory record. A login with no Directory
 * record at all still counts: HR creates the login first. Uses the alias `c` for
 * hr_employee_credentials. */
const ASSIGNABLE_WHERE = `c.is_active = 1
  AND NOT EXISTS (SELECT 1 FROM hr_employees e WHERE e.credential_id = c.id AND e.status = 'exited')`;

/** Assignee rows with the employee's current name/code and whether they're still assignable. */
const ASSIGNEE_SELECT = `SELECT a.lead_source, a.lead_id, a.credential_id, a.via_department, a.status, a.next_follow_up_date, a.assigned_by, a.assigned_at,
       c.name AS employee_name, c.employee_code,
       CASE WHEN c.id IS NOT NULL AND ${ASSIGNABLE_WHERE} THEN 1 ELSE 0 END AS is_active
  FROM sales_lead_assignments a
  LEFT JOIN hr_employee_credentials c ON c.id = a.credential_id`;

function placeholders(n: number): string {
  return Array.from({ length: n }, () => '?').join(', ');
}

export interface AssignableEmployeeRow {
  id: number;
  employee_code: string;
  name: string;
  designation: string | null;
  department: string | null;
}

export interface AssignedLeadRow {
  lead_source: string;
  lead_id: string;
  page: string | null;
  lead_date: string | null;
  name: string | null;
  company: string | null;
  contact: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  query_text: string | null;
  status: string | null;
  assigned_at: string;
  assigned_by: string | null;
  followup_count: number;
  last_followup_at: string | null;
  next_follow_up_date: string | null;
}

/** Follow-up count + latest date for the outer row's lead (alias `a`), from sales_lead_followups
 * (scripts/migrations/add-sales-lead-followups.sql). Only the employees' follow-ups: an admin's
 * status update (credential_id 0, ADMIN_FOLLOW_UP_CREDENTIAL_ID) is in the same table but must not
 * make a lead read as "followed up" in My Leads. */
const FOLLOWUP_COLUMNS = `(SELECT COUNT(*) FROM sales_lead_followups f WHERE f.lead_source = a.lead_source AND f.lead_id = a.lead_id AND f.credential_id <> 0) AS followup_count,
              (SELECT MAX(f.created_at) FROM sales_lead_followups f WHERE f.lead_source = a.lead_source AND f.lead_id = a.lead_id AND f.credential_id <> 0) AS last_followup_at`;

/** Tables: sales_lead_assignments + sales_lead_departments
 * (scripts/migrations/add-sales-lead-assignments.sql). Reads employee names, codes and teams from
 * hr_employee_credentials / hr_employees, never the password columns. */
export class LeadAssignmentsRepository {
  /** Every assignable employee with their department: the team on their (non-exited) Directory
   * record, or NULL when they have none. */
  async findAssignableEmployees(): Promise<AssignableEmployeeRow[]> {
    return query<AssignableEmployeeRow>(
      `SELECT c.id, c.employee_code, c.name, c.designation,
              (SELECT NULLIF(TRIM(e.team), '') FROM hr_employees e
                WHERE e.credential_id = c.id AND e.status <> 'exited'
                ORDER BY e.created_at ASC LIMIT 1) AS department
         FROM hr_employee_credentials c
        WHERE ${ASSIGNABLE_WHERE}
        ORDER BY c.name ASC`
    );
  }

  /** Per department, how many current Directory members have no HR login (so can't be assigned). */
  async countWithoutLoginByDepartment(): Promise<{ department: string; n: number }[]> {
    return query<{ department: string; n: number }>(
      `SELECT TRIM(team) AS department, COUNT(*) AS n
         FROM hr_employees
        WHERE credential_id IS NULL AND status <> 'exited' AND TRIM(COALESCE(team, '')) <> ''
        GROUP BY TRIM(team)`
    );
  }

  async leadExists(source: LeadSource, leadId: string): Promise<boolean> {
    const table = source === 'lead' ? 'sales_leads' : 'ens_travel_enquiries';
    const row = await queryOne<{ id: string }>(`SELECT id FROM ${table} WHERE id = ?`, [leadId]);
    return !!row;
  }

  async findAllAssignees(): Promise<LeadAssigneeEntity[]> {
    return query<LeadAssigneeEntity>(`${ASSIGNEE_SELECT} ORDER BY a.assigned_at ASC`);
  }

  async findAllDepartments(): Promise<LeadDepartmentEntity[]> {
    return query<LeadDepartmentEntity>('SELECT lead_source, lead_id, department FROM sales_lead_departments ORDER BY added_at ASC, department ASC');
  }

  async findAssigneesForLead(source: LeadSource, leadId: string): Promise<LeadAssigneeEntity[]> {
    return query<LeadAssigneeEntity>(`${ASSIGNEE_SELECT} WHERE a.lead_source = ? AND a.lead_id = ? ORDER BY a.assigned_at ASC`, [source, leadId]);
  }

  async findDepartmentsForLead(source: LeadSource, leadId: string): Promise<LeadDepartmentEntity[]> {
    return query<LeadDepartmentEntity>(
      'SELECT lead_source, lead_id, department FROM sales_lead_departments WHERE lead_source = ? AND lead_id = ? ORDER BY added_at ASC, department ASC',
      [source, leadId]
    );
  }

  /** Makes the lead's stored departments and people exactly these, in one transaction.
   * People and departments already on the lead keep their own row — a person keeps their status,
   * assigned_at and assigned_by; only the department they came through is updated. New people start
   * at `newStatus`; anyone not in the list is removed. */
  async replaceForLead(
    source: LeadSource,
    leadId: string,
    departments: string[],
    assignees: { credentialId: number; viaDepartment: string | null }[],
    newStatus: string,
    by: string
  ): Promise<void> {
    const pool = await getDbConnection();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const keepIds = assignees.map((a) => a.credentialId);
      await connection.query(
        `DELETE FROM sales_lead_assignments WHERE lead_source = ? AND lead_id = ?${keepIds.length ? ` AND credential_id NOT IN (${placeholders(keepIds.length)})` : ''}`,
        [source, leadId, ...keepIds]
      );
      for (const a of assignees) {
        await connection.query(
          `INSERT INTO sales_lead_assignments (lead_source, lead_id, credential_id, via_department, status, assigned_by)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE via_department = VALUES(via_department)`,
          [source, leadId, a.credentialId, a.viaDepartment, newStatus, by || null]
        );
      }

      await connection.query(
        `DELETE FROM sales_lead_departments WHERE lead_source = ? AND lead_id = ?${departments.length ? ` AND department NOT IN (${placeholders(departments.length)})` : ''}`,
        [source, leadId, ...departments]
      );
      for (const d of departments) {
        await connection.query(
          'INSERT IGNORE INTO sales_lead_departments (lead_source, lead_id, department, added_by) VALUES (?, ?, ?, ?)',
          [source, leadId, d, by || null]
        );
      }

      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }

  /** How many leads (per source) are still assigned to this login — offboarding's handover check. */
  async countForCredential(credentialId: number): Promise<{ lead_source: string; n: number }[]> {
    return query<{ lead_source: string; n: number }>(
      'SELECT lead_source, COUNT(*) AS n FROM sales_lead_assignments WHERE credential_id = ? GROUP BY lead_source',
      [credentialId]
    );
  }

  /**
   * Offboarding handover: takes every lead off `fromCredentialId`, in one transaction.
   * - `to` null → the leaver is simply removed from each lead.
   * - otherwise, on a lead the new person is already on, the leaver's row is just removed (merged);
   *   on every other lead the row moves to them as a fresh assignment (status reset, the leaver's
   *   own next follow-up date cleared, assigned now, by `by`) through `to.department`, which is added to that lead's departments — the same
   *   "new people come through a picked department" rule setForLead enforces.
   * Row locks (FOR UPDATE) keep a Sales Tracker save of the same lead from interleaving.
   */
  async handOverAll(
    fromCredentialId: number,
    to: { credentialId: number; department: string } | null,
    newStatus: string,
    by: string
  ): Promise<{ moved: number; merged: number; removed: number }> {
    const pool = await getDbConnection();
    const connection = await pool.getConnection();
    const counts = { moved: 0, merged: 0, removed: 0 };
    try {
      await connection.beginTransaction();
      const rows = (await connection.query(
        'SELECT lead_source, lead_id FROM sales_lead_assignments WHERE credential_id = ? FOR UPDATE',
        [fromCredentialId]
      )) as { lead_source: string; lead_id: string }[];

      for (const r of rows) {
        if (!to) {
          await connection.query('DELETE FROM sales_lead_assignments WHERE lead_source = ? AND lead_id = ? AND credential_id = ?', [r.lead_source, r.lead_id, fromCredentialId]);
          counts.removed++;
          continue;
        }
        const existing = (await connection.query(
          'SELECT 1 FROM sales_lead_assignments WHERE lead_source = ? AND lead_id = ? AND credential_id = ? FOR UPDATE',
          [r.lead_source, r.lead_id, to.credentialId]
        )) as unknown[];
        if (existing.length) {
          await connection.query('DELETE FROM sales_lead_assignments WHERE lead_source = ? AND lead_id = ? AND credential_id = ?', [r.lead_source, r.lead_id, fromCredentialId]);
          counts.merged++;
          continue;
        }
        await connection.query(
          `UPDATE sales_lead_assignments SET credential_id = ?, via_department = ?, status = ?, next_follow_up_date = NULL, assigned_by = ?, assigned_at = CURRENT_TIMESTAMP
            WHERE lead_source = ? AND lead_id = ? AND credential_id = ?`,
          [to.credentialId, to.department, newStatus, by || null, r.lead_source, r.lead_id, fromCredentialId]
        );
        await connection.query(
          'INSERT IGNORE INTO sales_lead_departments (lead_source, lead_id, department, added_by) VALUES (?, ?, ?, ?)',
          [r.lead_source, r.lead_id, to.department, by || null]
        );
        counts.moved++;
      }

      await connection.commit();
      return counts;
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }

  /** Follow-ups per lead, for the admin Sales Tracker's Assigned cell. Only what the assignees
   * logged: an admin's status update or edit entry (credential_id 0) is in the same table but is
   * not a follow-up — the same rule as FOLLOWUP_COLUMNS. */
  async countFollowUpsByLead(): Promise<{ lead_source: string; lead_id: string; n: number }[]> {
    return query<{ lead_source: string; lead_id: string; n: number }>(
      'SELECT lead_source, lead_id, COUNT(*) AS n FROM sales_lead_followups WHERE credential_id <> 0 GROUP BY lead_source, lead_id'
    );
  }

  /** Every lead assigned to this employee, from both sources, newest assignment first.
   * `next_follow_up_date` is this employee's own date on the lead. `status` is
   * the LEAD's shared status, raw (sales_leads label / ens code) — the service converts it. The inner
   * joins drop an assignment whose lead has since been deleted. */
  async findForEmployee(credentialId: number): Promise<AssignedLeadRow[]> {
    return query<AssignedLeadRow>(
      `SELECT a.lead_source, a.lead_id, l.type AS page, l.lead_date, l.name, l.company, l.contact, l.email,
              l.city, l.country, l.query_text, l.status, a.assigned_at, a.assigned_by, a.next_follow_up_date,
              ${FOLLOWUP_COLUMNS}
         FROM sales_lead_assignments a
         JOIN sales_leads l ON a.lead_source = 'lead' AND l.id = a.lead_id
        WHERE a.credential_id = ?
       UNION ALL
       SELECT a.lead_source, a.lead_id, 'Expand North Star Enquiry' AS page, DATE(e.created_at) AS lead_date,
              e.name, NULL AS company, e.contact, e.email, e.city, e.country, e.requirement AS query_text,
              e.lead_status AS status, a.assigned_at, a.assigned_by, a.next_follow_up_date,
              ${FOLLOWUP_COLUMNS}
         FROM sales_lead_assignments a
         JOIN ens_travel_enquiries e ON a.lead_source = 'ens' AND e.id = a.lead_id
        WHERE a.credential_id = ?
        ORDER BY assigned_at DESC`,
      [credentialId, credentialId]
    );
  }
}
