import { getDbConnection, query, queryOne } from '@/shared/database/connection';
import { parseJsonColumn } from '@/modules/hr-tool/repository/shared';
import {
  DEFAULT_OFFBOARDING_SETTINGS, LWD_CHOICES, NOTICE_DAYS, type LwdChoice,
  type ClearanceCategory, type ClearanceStatus, type OffboardingAccessMode, type OffboardingCase, type OffboardingClearanceItem,
  type OffboardingExitType, type OffboardingFnf, type OffboardingInitiator, type OffboardingLetters, type OffboardingSettings,
  type OffboardingStatus, type TerminationMode,
} from '../domain/types';

interface OffboardingRow {
  id: number; employee_id: string; credential_id: number | null; emp: string; exit_type: string; initiated_by: string; status: string;
  resignation_date: string; reason_category: string | null; reason_text: string | null; requested_lwd: string | null;
  notice_days: number; notice_waived_days: number; approved_lwd: string | null; termination_mode: string | null; access_mode: string;
  personal_email: string | null; handover_notes: string | null; rehire_eligible: number | null;
  decided_by: string | null; decided_at: string | null; decision_note: string | null; fnf: unknown; letters: unknown;
  created_at: string; updated_at: string;
  /** add-hr-offboarding-lwd-choice.sql — undefined until that migration runs. */
  lwd_choice?: string | null; agreed_lwd?: string | null;
}
interface ClearanceRow {
  id: number; offboarding_id: number; category: string; item: string; status: string; note: string | null;
  deduction_amount: number; done_by: string | null; done_at: string | null;
}
interface SettingsRow {
  notice_days_probation: number; notice_days_confirmed: number; checklist: unknown; encashable_leave_types: unknown;
}

function caseFromRow(r: OffboardingRow): OffboardingCase {
  return {
    id: Number(r.id), employeeId: r.employee_id, credentialId: r.credential_id == null ? null : Number(r.credential_id), emp: r.emp,
    exitType: r.exit_type as OffboardingExitType, initiatedBy: r.initiated_by as OffboardingInitiator, status: r.status as OffboardingStatus,
    resignationDate: r.resignation_date, reasonCategory: r.reason_category, reasonText: r.reason_text, requestedLwd: r.requested_lwd,
    noticeDays: Number(r.notice_days) || 0, noticeWaivedDays: Number(r.notice_waived_days) || 0, approvedLwd: r.approved_lwd,
    lwdChoice: (LWD_CHOICES as readonly string[]).includes(r.lwd_choice || '') ? (r.lwd_choice as LwdChoice) : null,
    agreedLwd: r.agreed_lwd ?? null,
    terminationMode: (r.termination_mode as TerminationMode | null) ?? null,
    accessMode: r.access_mode === 'blocked' ? 'blocked' : 'alumni',
    personalEmail: r.personal_email, handoverNotes: r.handover_notes,
    rehireEligible: r.rehire_eligible == null ? null : !!r.rehire_eligible,
    decidedBy: r.decided_by, decidedAt: r.decided_at, decisionNote: r.decision_note,
    fnf: parseJsonColumn<OffboardingFnf | null>(r.fnf, null),
    letters: parseJsonColumn<OffboardingLetters | null>(r.letters, null),
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

function clearanceFromRow(r: ClearanceRow): OffboardingClearanceItem {
  return {
    id: Number(r.id), offboardingId: Number(r.offboarding_id), category: r.category as ClearanceCategory, item: r.item,
    status: r.status as ClearanceStatus, note: r.note, deductionAmount: Number(r.deduction_amount) || 0,
    doneBy: r.done_by, doneAt: r.done_at,
  };
}

/** Thrown by insert() when the employee already has an open exit (uniq_open_case, phase-2 migration). */
export class OpenCaseExistsError extends Error {}

function isDuplicateKey(e: unknown, key?: string): boolean {
  const err = e as { code?: string; errno?: number; sqlMessage?: string; message?: string } | null;
  const dup = err?.code === 'ER_DUP_ENTRY' || err?.errno === 1062;
  return dup && (!key || String(err?.sqlMessage || err?.message || '').includes(key));
}

/** mariadb's query() result for UPDATE/DELETE, as the shared query() helper wraps it. */
function affectedRows(result: unknown): number {
  const first = Array.isArray(result) ? result[0] : result;
  return Number((first as { affectedRows?: number | bigint } | undefined)?.affectedRows ?? 0);
}

export interface NewOffboardingCase {
  employeeId: string; credentialId: number | null; emp: string; exitType: OffboardingExitType; initiatedBy: OffboardingInitiator;
  status: OffboardingStatus; resignationDate: string; reasonCategory: string | null; reasonText: string | null;
  requestedLwd: string | null; noticeDays: number; noticeWaivedDays: number; approvedLwd: string | null;
  terminationMode: TerminationMode | null; accessMode: OffboardingAccessMode; personalEmail: string | null; handoverNotes: string | null;
  decidedBy: string | null; decidedAt: string | null; decisionNote: string | null;
}

/** Columns a service may patch through updateCase — keyed by the domain field name. */
const PATCHABLE: Record<string, string> = {
  status: 'status', noticeDays: 'notice_days', noticeWaivedDays: 'notice_waived_days', approvedLwd: 'approved_lwd',
  accessMode: 'access_mode', personalEmail: 'personal_email', handoverNotes: 'handover_notes', rehireEligible: 'rehire_eligible',
  decidedBy: 'decided_by', decidedAt: 'decided_at', decisionNote: 'decision_note', terminationMode: 'termination_mode',
  fnf: 'fnf', letters: 'letters', lwdChoice: 'lwd_choice', agreedLwd: 'agreed_lwd',
};
export type OffboardingPatch = Partial<Pick<OffboardingCase,
  'status' | 'noticeDays' | 'noticeWaivedDays' | 'approvedLwd' | 'accessMode' | 'personalEmail' | 'handoverNotes' | 'rehireEligible' |
  'decidedBy' | 'decidedAt' | 'decisionNote' | 'terminationMode' | 'fnf' | 'letters' | 'lwdChoice' | 'agreedLwd'>>;

export class HrOffboardingRepository {
  async findAll(): Promise<OffboardingCase[]> {
    const rows = await query<OffboardingRow>('SELECT * FROM hr_offboarding ORDER BY id DESC');
    return rows.map(caseFromRow);
  }

  async findById(id: number): Promise<OffboardingCase | null> {
    const row = await queryOne<OffboardingRow>('SELECT * FROM hr_offboarding WHERE id = ?', [id]);
    return row ? caseFromRow(row) : null;
  }

  async findForEmployee(employeeId: string): Promise<OffboardingCase[]> {
    const rows = await query<OffboardingRow>('SELECT * FROM hr_offboarding WHERE employee_id = ? ORDER BY id DESC', [employeeId]);
    return rows.map(caseFromRow);
  }

  /** The case that decides a login's access — the newest accepted/exited/completed one. */
  async findDecidedForCredential(credentialId: number): Promise<OffboardingCase | null> {
    const row = await queryOne<OffboardingRow>(
      `SELECT * FROM hr_offboarding WHERE credential_id = ? AND status IN ('accepted', 'exited', 'completed') ORDER BY id DESC LIMIT 1`,
      [credentialId]
    );
    return row ? caseFromRow(row) : null;
  }

  /** Accepted cases whose LWD is already behind us — what applyDueExits moves to `exited`. */
  async findDueExits(today: string): Promise<OffboardingCase[]> {
    const rows = await query<OffboardingRow>(
      `SELECT * FROM hr_offboarding WHERE status = 'accepted' AND approved_lwd IS NOT NULL AND approved_lwd < ?`,
      [today]
    );
    return rows.map(caseFromRow);
  }

  async insert(c: NewOffboardingCase): Promise<OffboardingCase> {
    const pool = await getDbConnection();
    const connection = await pool.getConnection();
    try {
      const result = (await connection.query(
        `INSERT INTO hr_offboarding (employee_id, credential_id, emp, exit_type, initiated_by, status, resignation_date, reason_category,
          reason_text, requested_lwd, notice_days, notice_waived_days, approved_lwd, termination_mode, access_mode, personal_email,
          handover_notes, decided_by, decided_at, decision_note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          c.employeeId, c.credentialId, c.emp, c.exitType, c.initiatedBy, c.status, c.resignationDate, c.reasonCategory,
          c.reasonText, c.requestedLwd, c.noticeDays, c.noticeWaivedDays, c.approvedLwd, c.terminationMode, c.accessMode, c.personalEmail,
          c.handoverNotes, c.decidedBy, c.decidedAt, c.decisionNote,
        ]
      ).catch((e: unknown) => {
        if (isDuplicateKey(e, 'uniq_open_case')) throw new OpenCaseExistsError('An exit is already in progress for this employee.');
        throw e;
      })) as { insertId?: number | bigint };
      const insertId = Number(result.insertId);
      if (!insertId) throw new Error('Failed to get insert ID for new offboarding case');
      const created = await this.findById(insertId);
      if (!created) throw new Error('Offboarding case created but could not be reloaded');
      return created;
    } finally {
      connection.release();
    }
  }

  private buildSet(patch: OffboardingPatch): { sets: string[]; params: (string | number | null)[] } {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    for (const [key, value] of Object.entries(patch)) {
      const column = PATCHABLE[key];
      if (!column || value === undefined) continue;
      sets.push(`${column} = ?`);
      if (key === 'fnf' || key === 'letters') params.push(value == null ? null : JSON.stringify(value));
      else if (typeof value === 'boolean') params.push(value ? 1 : 0);
      else params.push(value as string | number | null);
    }
    return { sets, params };
  }

  /** Unconditional patch — only for fields that don't change the case's state (notes, access, flags). */
  async updateCase(id: number, patch: OffboardingPatch): Promise<void> {
    const { sets, params } = this.buildSet(patch);
    if (!sets.length) return;
    params.push(id);
    await query(`UPDATE hr_offboarding SET ${sets.join(', ')} WHERE id = ?`, params);
  }

  /**
   * Compare-and-set for every state change: applies `patch` only while the case is still in one of
   * `from` (and, with `lwdNotBefore`, its LWD hasn't passed). Returns false when someone else got
   * there first — a double-click, a second HR tab, or the employee withdrawing at the same moment —
   * so the caller reports a conflict instead of overwriting. Also returns false when a reopened
   * case would break uniq_open_case (the employee already has another open exit).
   */
  async transition(id: number, from: readonly OffboardingStatus[], patch: OffboardingPatch, lwdNotBefore?: string): Promise<boolean> {
    const { sets, params } = this.buildSet(patch);
    if (!sets.length) return false;
    const where = [`id = ?`, `status IN (${from.map(() => '?').join(', ')})`];
    const whereParams: (string | number)[] = [id, ...from];
    if (lwdNotBefore) { where.push('approved_lwd >= ?'); whereParams.push(lwdNotBefore); }
    try {
      const result = await query(`UPDATE hr_offboarding SET ${sets.join(', ')} WHERE ${where.join(' AND ')}`, [...params, ...whereParams]);
      return affectedRows(result) > 0;
    } catch (e) {
      if (isDuplicateKey(e, 'uniq_open_case')) return false;
      throw e;
    }
  }

  /** Writes the Full & Final only if the stored one is still at `expectedVersion` (0 = none yet) and
   * the case is still `exited`. False = someone else saved first (or the case moved on). */
  async updateFnf(id: number, expectedVersion: number, fnf: OffboardingFnf): Promise<boolean> {
    const result = await query(
      `UPDATE hr_offboarding SET fnf = ?
        WHERE id = ? AND status = 'exited' AND COALESCE(CAST(JSON_VALUE(fnf, '$.version') AS UNSIGNED), 0) = ?`,
      [JSON.stringify(fnf), id, expectedVersion]
    );
    return affectedRows(result) > 0;
  }

  async findEmployeeCode(credentialId: number): Promise<string | null> {
    const row = await queryOne<{ employee_code: string }>('SELECT employee_code FROM hr_employee_credentials WHERE id = ?', [credentialId]);
    return row?.employee_code ?? null;
  }

  async setPriorEmployeeStatus(id: number, status: string | null): Promise<void> {
    await query('UPDATE hr_offboarding SET prior_employee_status = ? WHERE id = ?', [status, id]);
  }
  async findPriorEmployeeStatus(id: number): Promise<string | null> {
    const row = await queryOne<{ prior_employee_status: string | null }>('SELECT prior_employee_status FROM hr_offboarding WHERE id = ?', [id]);
    return row?.prior_employee_status ?? null;
  }
  async findEmployeeStatus(employeeId: string): Promise<string | null> {
    const row = await queryOne<{ status: string }>('SELECT status FROM hr_employees WHERE id = ?', [employeeId]);
    return row?.status ?? null;
  }

  /** Re-applies 'exited' to anyone whose exit has taken effect. The Directory saves hr_employees
   * as a whole list from the browser, so a tab loaded before the exit can write 'active' back —
   * and payroll skips leavers by that status. Idempotent. */
  async resyncExitedEmployeeStatuses(): Promise<void> {
    await query(
      `UPDATE hr_employees e JOIN hr_offboarding o ON o.employee_id = e.id
       SET e.status = 'exited' WHERE o.status IN ('exited', 'completed') AND e.status <> 'exited'`,
      []
    );
  }

  /** Single-row writes only — never through the Directory's whole-table employees save. */
  async setEmployeeStatus(employeeId: string, status: string): Promise<void> {
    await query('UPDATE hr_employees SET status = ? WHERE id = ?', [status, employeeId]);
  }

  /** The Publisher/Event Admin account an Employee ID login is linked to, if any. */
  async findLinkedPanelAdminId(credentialId: number): Promise<number | null> {
    const row = await queryOne<{ linked_panel_admin_id: number | null }>(
      'SELECT linked_panel_admin_id FROM hr_employee_credentials WHERE id = ?', [credentialId]
    );
    return row?.linked_panel_admin_id == null ? null : Number(row.linked_panel_admin_id);
  }

  async deactivatePanelAdmin(panelAdminId: number): Promise<void> {
    await query('UPDATE panel_admins SET is_active = 0 WHERE id = ?', [panelAdminId]);
  }
  async reactivatePanelAdmin(panelAdminId: number): Promise<void> {
    await query('UPDATE panel_admins SET is_active = 1 WHERE id = ?', [panelAdminId]);
  }

  // --- Clearance checklist ---
  async findClearance(offboardingId: number): Promise<OffboardingClearanceItem[]> {
    const rows = await query<ClearanceRow>('SELECT * FROM hr_offboarding_clearance WHERE offboarding_id = ? ORDER BY id ASC', [offboardingId]);
    return rows.map(clearanceFromRow);
  }
  async findAllClearance(): Promise<OffboardingClearanceItem[]> {
    const rows = await query<ClearanceRow>('SELECT * FROM hr_offboarding_clearance ORDER BY offboarding_id ASC, id ASC');
    return rows.map(clearanceFromRow);
  }
  async findClearanceItem(offboardingId: number, itemId: number): Promise<OffboardingClearanceItem | null> {
    const row = await queryOne<ClearanceRow>('SELECT * FROM hr_offboarding_clearance WHERE id = ? AND offboarding_id = ?', [itemId, offboardingId]);
    return row ? clearanceFromRow(row) : null;
  }

  /** One multi-row INSERT IGNORE: all-or-nothing, and re-running it (a retry, two accepts racing)
   * can't duplicate items because of uniq_case_item. */
  async insertClearanceItems(offboardingId: number, items: { category: ClearanceCategory; item: string }[]): Promise<void> {
    if (!items.length) return;
    await query(
      `INSERT IGNORE INTO hr_offboarding_clearance (offboarding_id, category, item) VALUES ${items.map(() => '(?, ?, ?)').join(', ')}`,
      items.flatMap((i) => [offboardingId, i.category, i.item])
    );
  }

  /** Adds one custom item; false when that item already exists on the case. */
  async addClearanceItem(offboardingId: number, category: ClearanceCategory, item: string): Promise<boolean> {
    const result = await query('INSERT IGNORE INTO hr_offboarding_clearance (offboarding_id, category, item) VALUES (?, ?, ?)', [offboardingId, category, item]);
    return affectedRows(result) > 0;
  }

  /** Scoped by offboarding_id too, so an item id from another case can never be touched. */
  async updateClearanceItem(
    offboardingId: number, itemId: number,
    patch: { status: ClearanceStatus; note: string | null; deductionAmount: number; doneBy: string | null; doneAt: string | null },
  ): Promise<boolean> {
    const result = await query(
      `UPDATE hr_offboarding_clearance SET status = ?, note = ?, deduction_amount = ?, done_by = ?, done_at = ?
        WHERE id = ? AND offboarding_id = ?`,
      [patch.status, patch.note, patch.deductionAmount, patch.doneBy, patch.doneAt, itemId, offboardingId]
    );
    return affectedRows(result) > 0;
  }

  async deleteClearanceItem(offboardingId: number, itemId: number): Promise<boolean> {
    const result = await query('DELETE FROM hr_offboarding_clearance WHERE id = ? AND offboarding_id = ?', [itemId, offboardingId]);
    return affectedRows(result) > 0;
  }

  /** System ticks (panel access switched off, leads handed over): marks still-pending items of a
   * category whose text contains `keyword` (case-insensitive). Never overrides a human decision. */
  async autoTickClearance(offboardingId: number, category: ClearanceCategory, keyword: string, status: ClearanceStatus, note: string, by: string, at: string): Promise<void> {
    await query(
      `UPDATE hr_offboarding_clearance SET status = ?, note = ?, done_by = ?, done_at = ?
        WHERE offboarding_id = ? AND category = ? AND status = 'pending' AND LOWER(item) LIKE ?`,
      [status, note, by, at, offboardingId, category, `%${keyword.toLowerCase()}%`]
    );
  }

  // --- Settings (singleton row, id = 1) ---
  async findSettings(): Promise<OffboardingSettings> {
    const r = await queryOne<SettingsRow>('SELECT * FROM hr_offboarding_settings WHERE id = 1');
    if (!r) return DEFAULT_OFFBOARDING_SETTINGS;
    const checklist = parseJsonColumn<Partial<OffboardingSettings['checklist']> | null>(r.checklist, null);
    return {
      checklist: { ...DEFAULT_OFFBOARDING_SETTINGS.checklist, ...(checklist || {}) },
      encashableLeaveTypes: parseJsonColumn<string[]>(r.encashable_leave_types, DEFAULT_OFFBOARDING_SETTINGS.encashableLeaveTypes),
    };
  }
  async saveSettings(s: OffboardingSettings, actor: string | null): Promise<void> {
    await query(
      `INSERT INTO hr_offboarding_settings (id, notice_days_probation, notice_days_confirmed, checklist, encashable_leave_types, updated_by)
       VALUES (1, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE notice_days_probation = VALUES(notice_days_probation), notice_days_confirmed = VALUES(notice_days_confirmed),
        checklist = VALUES(checklist), encashable_leave_types = VALUES(encashable_leave_types), updated_by = VALUES(updated_by)`,
      // The notice columns are no longer read (NOTICE_DAYS is fixed); kept in step for anyone looking at the table.
      [NOTICE_DAYS, NOTICE_DAYS, JSON.stringify(s.checklist), JSON.stringify(s.encashableLeaveTypes), actor]
    );
  }
}
