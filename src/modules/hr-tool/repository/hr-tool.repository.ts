import { getDbConnection, query, queryOne } from '@/shared/database/connection';
import { findAllRows, replaceAllRows, parseJsonColumn, SqlParam } from './shared';
import {
  HrTeam, HrHoliday, HrEmployee, HrDocRef, HrOnboarding, HrAttendanceRecord, HrAttendanceOverride, HrPunch,
  HrRegularization, HrLeaveRequest, HrExpense, HrTicket, HrComplianceTask, HrPayrollRun, HrPayrollEntry, HrTemplate,
  HrRules, HrAuditLogEntry, HrCompanyProfile,
} from '../domain/types';
import { HrKycDocuments, mergeKycDocuments } from '../domain/kyc';

interface NameRow { name: string; }
interface HolidayRow { holiday_date: string; name: string; }
interface CompanyProfileRow { company_name: string; cin: string; registered_state: string; }

interface EmployeeRow {
  id: string; credential_id: number | null; name: string; email: string | null; phone: string | null; designation: string | null; team: string | null; manager: string | null;
  status: string; doj: string | null; sys_role: string; ctc: number;
  leave_balance: unknown; documents: unknown; documents_deadline: string | null; kyc_documents: unknown; signed_docs: unknown; ctc_split_override: unknown; probation_extended_by: number | null;
}
interface OnboardingRow {
  id: string; name: string; personal_email: string | null; designation: string | null; team: string | null; ctc: number;
  stage: string; offer_sent_date: string | null; signed_date: string | null; upload_deadline: string | null;
  employee_id: string | null; agreement_stage: string; docs: unknown; assets: unknown;
}
interface AttendanceRow { emp: string; attendance_date: string; status: string; in_time: string | null; in_minutes: number | null; out_minutes: number | null; out_time: string | null; }
interface OverrideRow { emp: string; override_date: string; status: string; }
interface PunchRow { emp: string; punch_date: string; in_time: string | null; in_minutes: number | null; out_minutes: number | null; out_time: string | null; }
interface ApprovalRow { id: string; emp: string; stage: string; status: string; rm_remarks: string | null; hr_remarks: string | null; }
interface RegularizationRow extends ApprovalRow { reg_date: string; punch_type: string; reason: string | null; requested_time: string | null; }
interface LeaveRow extends ApprovalRow { type: string; from_date: string; to_date: string; remarks: string | null; }
interface ExpenseRow extends ApprovalRow { category: string | null; amount: number; }
interface TicketRow { id: string; emp: string; category: string | null; status: string; note: string | null; }
interface ComplianceRow { task: string; due_date: string | null; status: string; }
interface PayrollRow { month: string; status: string; run_at: string | null; run_by: string | null; }
interface PayrollEntryRow {
  month: string; emp: string; working_days: number; total_days: number; present_days: number; absent_days: number;
  week_off_days: number; leave_days: number; short_leave_days: number; short_leave_carry_out: number;
  half_day_days: number; lop_days: number; monthly_gross: number; tds: number; net_pay: number;
}
interface RulesRow {
  working_days_pattern: string; shift_start_time: string; shift_end_time: string; shift_grace_minutes: number;
  half_day_threshold_hours: number; regularization_window_days: number; regularization_override: number;
  regularization_monthly_quota: number; short_leave_max_hours: number; short_leave_monthly_quota: number;
  half_day_min_worked_hours: number; short_leave_min_worked_hours: number; full_day_min_worked_hours: number;
  salary_period_from: number; salary_period_to: string; ctc_basic_pct: number; ctc_hra_pct: number; ctc_allowances_pct: number;
  ctc_convenience_type: string; ctc_convenience_value: number;
  leave_types: unknown; two_level_approval_leave: number; two_level_approval_attendance: number; two_level_approval_expense: number;
  late_mark_penalty: number; geo_fencing: number; selfie_checkin: number; pf_esi: number; optional_holiday_choice: number; asset_checklist: number;
}
interface AuditRow { ts: string; who: string; change_text: string; }

/** Tables whose rows belong to one employee and are keyed by their `emp` (name) column —
 * everything that has to go when that employee's record is deleted. */
const EMPLOYEE_NAME_KEYED_TABLES = [
  'hr_attendance', 'hr_attendance_overrides', 'hr_punch_log', 'hr_regularizations',
  'hr_leave_requests', 'hr_expenses', 'hr_tickets', 'hr_payroll_entries',
] as const;

function mapRegularizationRow(r: RegularizationRow): HrRegularization {
  return {
    id: r.id, emp: r.emp, date: r.reg_date, punchType: (r.punch_type as HrRegularization['punchType']) || 'in',
    reason: r.reason || '', requestedTime: r.requested_time || null, stage: r.stage, status: r.status,
    rmRemarks: r.rm_remarks || '', hrRemarks: r.hr_remarks || '',
  };
}

export class HrToolRepository {
  // --- Org structure ---
  async findTeams(): Promise<HrTeam[]> {
    const rows = await findAllRows<HrTeam>('hr_teams', 'name ASC');
    return rows.map((r) => ({ name: r.name, manager: r.manager }));
  }
  async replaceTeams(teams: HrTeam[]): Promise<void> {
    await replaceAllRows('hr_teams', ['name', 'manager'], teams, (t) => [t.name, t.manager || null]);
  }

  async findNameList(table: string): Promise<string[]> {
    const rows = await findAllRows<NameRow>(table, 'name ASC');
    return rows.map((r) => r.name);
  }
  async replaceNameList(table: string, names: string[]): Promise<void> {
    await replaceAllRows(table, ['name'], names, (name) => [name]);
  }

  async findHolidays(): Promise<HrHoliday[]> {
    const rows = await findAllRows<HolidayRow>('hr_holidays', 'holiday_date ASC');
    return rows.map((r) => ({ date: r.holiday_date, name: r.name }));
  }
  async replaceHolidays(holidays: HrHoliday[]): Promise<void> {
    await replaceAllRows('hr_holidays', ['holiday_date', 'name'], holidays, (h) => [h.date, h.name]);
  }

  // --- Employees ---
  private employeeFromRow(r: EmployeeRow): HrEmployee {
    return {
      id: r.id, credentialId: r.credential_id, name: r.name, email: r.email || '', phone: r.phone, designation: r.designation || '', team: r.team || '',
      manager: r.manager, status: r.status, doj: r.doj || '', sysRole: r.sys_role, ctc: r.ctc,
      leaveBalance: parseJsonColumn(r.leave_balance, {}), documents: parseJsonColumn(r.documents, []),
      documentsDeadline: r.documents_deadline,
      kycDocuments: mergeKycDocuments(parseJsonColumn<Partial<HrKycDocuments> | null>(r.kyc_documents, null)),
      signedDocs: parseJsonColumn(r.signed_docs, []), ctcSplitOverride: parseJsonColumn(r.ctc_split_override, null),
      probationExtendedBy: r.probation_extended_by,
    };
  }
  async findEmployees(): Promise<HrEmployee[]> {
    const rows = await findAllRows<EmployeeRow>('hr_employees', 'created_at ASC');
    return rows.map((r) => this.employeeFromRow(r));
  }
  async replaceEmployees(employees: HrEmployee[]): Promise<void> {
    await replaceAllRows(
      'hr_employees',
      ['id', 'credential_id', 'name', 'email', 'phone', 'designation', 'team', 'manager', 'status', 'doj', 'sys_role', 'ctc', 'leave_balance', 'documents', 'documents_deadline', 'kyc_documents', 'signed_docs', 'ctc_split_override', 'probation_extended_by'],
      employees,
      (e) => [
        e.id, e.credentialId ?? null, e.name, e.email || null, e.phone || null, e.designation || null, e.team || null, e.manager || null, e.status, e.doj || null,
        e.sysRole, e.ctc, JSON.stringify(e.leaveBalance || {}), JSON.stringify(e.documents || []), e.documentsDeadline || null, JSON.stringify(mergeKycDocuments(e.kycDocuments)), JSON.stringify(e.signedDocs || []),
        e.ctcSplitOverride ? JSON.stringify(e.ctcSplitOverride) : null, e.probationExtendedBy ?? null,
      ]
    );
  }
  /** Resolves an employee row for an isolated credential session (plain employee, or Publisher/Event
   * Admin linked via panel_admins) — matches by credential_id first, falling back to name for older
   * rows created before that link existed. Same dual-lookup Directory.tsx already does client-side. */
  async findEmployeeByCredential(credentialId: number, name: string): Promise<HrEmployee | null> {
    const byId = await queryOne<EmployeeRow>('SELECT * FROM hr_employees WHERE credential_id = ?', [credentialId]);
    if (byId) return this.employeeFromRow(byId);
    const byName = await queryOne<EmployeeRow>('SELECT * FROM hr_employees WHERE name = ?', [name]);
    return byName ? this.employeeFromRow(byName) : null;
  }
  /** Single-row write, safe for an isolated employee/Publisher/Event Admin session to call
   * directly — unlike replaceEmployees' whole-table replace, it never touches any other employee's row. */
  async updateEmployeeDocuments(employeeId: string, documents: HrDocRef[]): Promise<void> {
    await query('UPDATE hr_employees SET documents = ? WHERE id = ?', [JSON.stringify(documents), employeeId]);
  }
  /** Same single-row-write safety as updateEmployeeDocuments, for the separate KYC checklist. */
  async updateEmployeeKyc(employeeId: string, kycDocuments: HrKycDocuments): Promise<void> {
    await query('UPDATE hr_employees SET kyc_documents = ? WHERE id = ?', [JSON.stringify(kycDocuments), employeeId]);
  }

  /** Hard-deletes one employee and every record keyed to them, in a single transaction so a
   * failure part-way through leaves nothing half-removed. Their Employee ID credential goes
   * too: leaving it behind makes Directory's orphan auto-heal recreate the Directory row
   * moments after it was deleted, which is why "Remove employee" used to look like it did
   * nothing at all. The credential is matched credential_id-first, name-second — the same
   * resolution Directory itself uses. Returns null when the id no longer exists. */
  async deleteEmployeeCascade(employeeId: string): Promise<{ name: string; credentialId: number | null } | null> {
    const pool = await getDbConnection();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const found = await connection.query('SELECT name, credential_id FROM hr_employees WHERE id = ?', [employeeId]);
      const row = (Array.isArray(found) ? found[0] : found) as { name: string; credential_id: number | null } | undefined;
      if (!row) {
        await connection.rollback();
        return null;
      }

      // Attendance/approvals/payroll rows all key off the employee's name, not their id.
      for (const table of EMPLOYEE_NAME_KEYED_TABLES) {
        await connection.query(`DELETE FROM ${table} WHERE emp = ?`, [row.name]);
      }
      // Anyone who reported to them, and any team they managed, would otherwise point at a
      // name that no longer exists.
      await connection.query('UPDATE hr_teams SET manager = NULL WHERE manager = ?', [row.name]);
      await connection.query('UPDATE hr_employees SET manager = NULL WHERE manager = ?', [row.name]);
      await connection.query('DELETE FROM hr_onboarding WHERE employee_id = ?', [employeeId]);
      await connection.query('DELETE FROM hr_employees WHERE id = ?', [employeeId]);
      if (row.credential_id != null) {
        await connection.query('DELETE FROM hr_employee_credentials WHERE id = ?', [row.credential_id]);
      } else {
        await connection.query('DELETE FROM hr_employee_credentials WHERE name = ?', [row.name]);
      }
      await connection.commit();
      return { name: row.name, credentialId: row.credential_id };
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }

  // --- Onboarding ---
  private onboardingFromRow(r: OnboardingRow): HrOnboarding {
    return {
      id: r.id, name: r.name, personalEmail: r.personal_email || '', designation: r.designation || '', team: r.team || '',
      ctc: r.ctc, stage: r.stage, offerSentDate: r.offer_sent_date, signedDate: r.signed_date, uploadDeadline: r.upload_deadline,
      employeeId: r.employee_id, agreementStage: r.agreement_stage, docs: parseJsonColumn(r.docs, []),
      assets: parseJsonColumn(r.assets, null),
    };
  }
  async findOnboarding(): Promise<HrOnboarding[]> {
    const rows = await findAllRows<OnboardingRow>('hr_onboarding', 'created_at ASC');
    return rows.map((r) => this.onboardingFromRow(r));
  }
  async replaceOnboarding(items: HrOnboarding[]): Promise<void> {
    await replaceAllRows(
      'hr_onboarding',
      ['id', 'name', 'personal_email', 'designation', 'team', 'ctc', 'stage', 'offer_sent_date', 'signed_date', 'upload_deadline', 'employee_id', 'agreement_stage', 'docs', 'assets'],
      items,
      (o) => [
        o.id, o.name, o.personalEmail || null, o.designation || null, o.team || null, o.ctc, o.stage,
        o.offerSentDate || null, o.signedDate || null, o.uploadDeadline || null, o.employeeId || null, o.agreementStage,
        JSON.stringify(o.docs || []), o.assets ? JSON.stringify(o.assets) : null,
      ]
    );
  }

  // --- Attendance ---
  async findAttendance(): Promise<HrAttendanceRecord[]> {
    const rows = await findAllRows<AttendanceRow>('hr_attendance', 'attendance_date ASC');
    return rows.map((r) => ({ emp: r.emp, date: r.attendance_date, status: r.status, inTime: r.in_time || '—', outTime: r.out_time || '—', inMinutes: r.in_minutes, outMinutes: r.out_minutes }));
  }
  /** One employee's attendance within a date range (inclusive) — powers the employee attendance calendar's month view. */
  async findAttendanceForEmployeeInRange(emp: string, fromDate: string, toDate: string): Promise<HrAttendanceRecord[]> {
    const rows = await query<AttendanceRow>(
      'SELECT * FROM hr_attendance WHERE emp = ? AND attendance_date BETWEEN ? AND ? ORDER BY attendance_date ASC',
      [emp, fromDate, toDate]
    );
    return rows.map((r) => ({ emp: r.emp, date: r.attendance_date, status: r.status, inTime: r.in_time || '—', outTime: r.out_time || '—', inMinutes: r.in_minutes, outMinutes: r.out_minutes }));
  }
  async upsertAttendance(rec: HrAttendanceRecord): Promise<void> {
    await query(
      `INSERT INTO hr_attendance (emp, attendance_date, status, in_time, in_minutes, out_minutes, out_time) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), in_time = VALUES(in_time), in_minutes = VALUES(in_minutes), out_minutes = VALUES(out_minutes), out_time = VALUES(out_time)`,
      [rec.emp, rec.date, rec.status, rec.inTime || null, rec.inMinutes ?? null, rec.outMinutes ?? null, rec.outTime || null]
    );
  }

  async findAttendanceOverrides(): Promise<HrAttendanceOverride[]> {
    const rows = await findAllRows<OverrideRow>('hr_attendance_overrides');
    return rows.map((r) => ({ emp: r.emp, date: r.override_date, status: r.status }));
  }
  async upsertAttendanceOverride(o: HrAttendanceOverride): Promise<void> {
    await query(
      `INSERT INTO hr_attendance_overrides (emp, override_date, status) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [o.emp, o.date, o.status]
    );
  }

  async findPunchLog(): Promise<HrPunch[]> {
    const rows = await findAllRows<PunchRow>('hr_punch_log');
    return rows.map((r) => ({ emp: r.emp, date: r.punch_date, inTime: r.in_time, inMinutes: r.in_minutes, outTime: r.out_time, outMinutes: r.out_minutes }));
  }
  /** The single punch-log row for one employee (hr_punch_log is keyed only by emp) — may be stale (a previous day's punch) if they haven't punched today. */
  async findPunchByEmp(emp: string): Promise<HrPunch | null> {
    const row = await queryOne<PunchRow>('SELECT * FROM hr_punch_log WHERE emp = ?', [emp]);
    if (!row) return null;
    return { emp: row.emp, date: row.punch_date, inTime: row.in_time, inMinutes: row.in_minutes, outTime: row.out_time, outMinutes: row.out_minutes };
  }
  async upsertPunch(p: HrPunch): Promise<void> {
    await query(
      `INSERT INTO hr_punch_log (emp, punch_date, in_time, in_minutes, out_minutes, out_time) VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE punch_date = VALUES(punch_date), in_time = VALUES(in_time), in_minutes = VALUES(in_minutes), out_minutes = VALUES(out_minutes), out_time = VALUES(out_time)`,
      [p.emp, p.date, p.inTime, p.inMinutes, p.outMinutes, p.outTime]
    );
  }

  // --- Approvals: regularizations, leave requests, expenses ---
  async findRegularizations(): Promise<HrRegularization[]> {
    const rows = await findAllRows<RegularizationRow>('hr_regularizations', 'created_at DESC');
    return rows.map(mapRegularizationRow);
  }
  async replaceRegularizations(items: HrRegularization[]): Promise<void> {
    await replaceAllRows(
      'hr_regularizations', ['id', 'emp', 'reg_date', 'punch_type', 'reason', 'requested_time', 'stage', 'status', 'rm_remarks', 'hr_remarks'], items,
      (r) => [r.id, r.emp, r.date, r.punchType, r.reason || null, r.requestedTime || null, r.stage, r.status, r.rmRemarks || null, r.hrRemarks || null]
    );
  }
  /** One employee's own regularization requests — used by the isolated Publisher/Event Admin
   * and plain-employee attendance surfaces, which must never see other employees' requests
   * (unlike replaceRegularizations' whole-table replace, which is Founder-only). */
  async findRegularizationsForEmployee(emp: string): Promise<HrRegularization[]> {
    const rows = await query<RegularizationRow>('SELECT * FROM hr_regularizations WHERE emp = ? ORDER BY created_at DESC', [emp]);
    return rows.map(mapRegularizationRow);
  }
  /** A punch type is only ever regularized once per date — 'in' and 'out' are independent, so a
   * date with both regularized has two rows here, looked up separately by type. */
  async findRegularizationByEmpDateAndType(emp: string, date: string, punchType: HrRegularization['punchType']): Promise<HrRegularization | null> {
    const row = await queryOne<RegularizationRow>('SELECT * FROM hr_regularizations WHERE emp = ? AND reg_date = ? AND punch_type = ?', [emp, date, punchType]);
    return row ? mapRegularizationRow(row) : null;
  }
  /** Single-row insert, safe for an isolated employee session to call directly — unlike
   * replaceRegularizations, it never touches any other employee's rows. */
  async insertRegularization(reg: HrRegularization): Promise<void> {
    await query(
      'INSERT INTO hr_regularizations (id, emp, reg_date, punch_type, reason, requested_time, stage, status, rm_remarks, hr_remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [reg.id, reg.emp, reg.date, reg.punchType, reg.reason || null, reg.requestedTime || null, reg.stage, reg.status, reg.rmRemarks || null, reg.hrRemarks || null]
    );
  }
  async countRegularizationsForEmployeeInMonth(emp: string, fromDate: string, toDate: string): Promise<number> {
    const rows = await query<{ cnt: number }>(
      'SELECT COUNT(*) AS cnt FROM hr_regularizations WHERE emp = ? AND reg_date BETWEEN ? AND ?',
      [emp, fromDate, toDate]
    );
    return Number(rows[0]?.cnt || 0);
  }

  async findLeaveRequests(): Promise<HrLeaveRequest[]> {
    const rows = await findAllRows<LeaveRow>('hr_leave_requests', 'created_at DESC');
    return rows.map((r) => ({ id: r.id, emp: r.emp, type: r.type, from: r.from_date, to: r.to_date, remarks: r.remarks || '', stage: r.stage, status: r.status, rmRemarks: r.rm_remarks || '', hrRemarks: r.hr_remarks || '' }));
  }
  /** One employee's leave requests overlapping a date range — used by payroll to find approved
   * leave for a payroll period. Leave has two date columns, so this is an interval-overlap
   * test (from_date <= toDate AND to_date >= fromDate), not a simple single-column BETWEEN. */
  async findLeaveRequestsForEmployeeInRange(emp: string, fromDate: string, toDate: string): Promise<HrLeaveRequest[]> {
    const rows = await query<LeaveRow>(
      'SELECT * FROM hr_leave_requests WHERE emp = ? AND from_date <= ? AND to_date >= ?',
      [emp, toDate, fromDate]
    );
    return rows.map((r) => ({ id: r.id, emp: r.emp, type: r.type, from: r.from_date, to: r.to_date, remarks: r.remarks || '', stage: r.stage, status: r.status, rmRemarks: r.rm_remarks || '', hrRemarks: r.hr_remarks || '' }));
  }
  async replaceLeaveRequests(items: HrLeaveRequest[]): Promise<void> {
    await replaceAllRows(
      'hr_leave_requests', ['id', 'emp', 'type', 'from_date', 'to_date', 'remarks', 'stage', 'status', 'rm_remarks', 'hr_remarks'], items,
      (l) => [l.id, l.emp, l.type, l.from, l.to, l.remarks || null, l.stage, l.status, l.rmRemarks || null, l.hrRemarks || null]
    );
  }
  /** One employee's own leave requests — used by the isolated Publisher/Event Admin and
   * plain-employee leave surfaces, which must never see other employees' requests (unlike
   * replaceLeaveRequests' whole-table replace, which is Founder-only). */
  async findLeaveRequestsForEmployee(emp: string): Promise<HrLeaveRequest[]> {
    const rows = await query<LeaveRow>('SELECT * FROM hr_leave_requests WHERE emp = ? ORDER BY created_at DESC', [emp]);
    return rows.map((r) => ({ id: r.id, emp: r.emp, type: r.type, from: r.from_date, to: r.to_date, remarks: r.remarks || '', stage: r.stage, status: r.status, rmRemarks: r.rm_remarks || '', hrRemarks: r.hr_remarks || '' }));
  }
  /** Any not-yet-rejected request of this employee's that overlaps the given range — used to
   * block a duplicate/overlapping submission. A previously rejected request doesn't count, so
   * the same dates can be resubmitted after rejection. */
  async findOverlappingLeaveRequestForEmployee(emp: string, fromDate: string, toDate: string): Promise<HrLeaveRequest | null> {
    const row = await queryOne<LeaveRow>(
      "SELECT * FROM hr_leave_requests WHERE emp = ? AND status != 'rejected' AND from_date <= ? AND to_date >= ?",
      [emp, toDate, fromDate]
    );
    if (!row) return null;
    return { id: row.id, emp: row.emp, type: row.type, from: row.from_date, to: row.to_date, remarks: row.remarks || '', stage: row.stage, status: row.status, rmRemarks: row.rm_remarks || '', hrRemarks: row.hr_remarks || '' };
  }
  /** Single-row insert, safe for an isolated employee session to call directly — unlike
   * replaceLeaveRequests, it never touches any other employee's rows. */
  async insertLeaveRequest(req: HrLeaveRequest): Promise<void> {
    await query(
      'INSERT INTO hr_leave_requests (id, emp, type, from_date, to_date, remarks, stage, status, rm_remarks, hr_remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.id, req.emp, req.type, req.from, req.to, req.remarks || null, req.stage, req.status, req.rmRemarks || null, req.hrRemarks || null]
    );
  }

  async findExpenses(): Promise<HrExpense[]> {
    const rows = await findAllRows<ExpenseRow>('hr_expenses', 'created_at DESC');
    return rows.map((r) => ({ id: r.id, emp: r.emp, category: r.category || '', amount: r.amount, stage: r.stage, status: r.status, rmRemarks: r.rm_remarks || '', hrRemarks: r.hr_remarks || '' }));
  }
  async replaceExpenses(items: HrExpense[]): Promise<void> {
    await replaceAllRows(
      'hr_expenses', ['id', 'emp', 'category', 'amount', 'stage', 'status', 'rm_remarks', 'hr_remarks'], items,
      (x) => [x.id, x.emp, x.category || null, x.amount, x.stage, x.status, x.rmRemarks || null, x.hrRemarks || null]
    );
  }

  // --- Tickets ---
  async findTickets(): Promise<HrTicket[]> {
    const rows = await findAllRows<TicketRow>('hr_tickets', 'created_at DESC');
    return rows.map((r) => ({ id: r.id, emp: r.emp, category: r.category || '', status: r.status, note: r.note || '' }));
  }
  async replaceTickets(items: HrTicket[]): Promise<void> {
    await replaceAllRows('hr_tickets', ['id', 'emp', 'category', 'status', 'note'], items, (t) => [t.id, t.emp, t.category || null, t.status, t.note || null]);
  }

  // --- Compliance (read-only from the frontend's perspective) ---
  async findComplianceTasks(): Promise<HrComplianceTask[]> {
    const rows = await findAllRows<ComplianceRow>('hr_compliance_tasks', 'due_date ASC');
    return rows.map((r) => ({ task: r.task, due: r.due_date || '', status: r.status }));
  }

  // --- Payroll runs ---
  async findPayrollRuns(): Promise<HrPayrollRun[]> {
    const rows = await findAllRows<PayrollRow>('hr_payroll_runs');
    return rows.map((r) => ({ month: r.month, status: r.status, runAt: r.run_at, runBy: r.run_by }));
  }
  async upsertPayrollRun(run: HrPayrollRun): Promise<void> {
    await query(
      `INSERT INTO hr_payroll_runs (month, status, run_at, run_by) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), run_at = VALUES(run_at), run_by = VALUES(run_by)`,
      [run.month, run.status, run.runAt || null, run.runBy || null]
    );
  }

  // --- Payroll entries (per-employee-per-month computed payroll) ---
  async findPayrollEntriesForMonth(month: string): Promise<HrPayrollEntry[]> {
    const rows = await query<PayrollEntryRow>('SELECT * FROM hr_payroll_entries WHERE month = ? ORDER BY emp ASC', [month]);
    return rows.map((r) => ({
      emp: r.emp, totalDays: r.total_days, weekOffDays: r.week_off_days, workingDays: r.working_days,
      presentDays: r.present_days, leaveDays: r.leave_days, absentDays: r.absent_days,
      shortLeaveDays: r.short_leave_days, shortLeaveCarryOut: r.short_leave_carry_out, halfDayDays: r.half_day_days,
      lopDays: Number(r.lop_days), monthlyGross: r.monthly_gross, tds: r.tds, netPay: r.net_pay,
    }));
  }
  async upsertPayrollEntry(month: string, entry: HrPayrollEntry): Promise<void> {
    await query(
      `INSERT INTO hr_payroll_entries (
        month, emp, working_days, total_days, present_days, absent_days, week_off_days, leave_days,
        short_leave_days, short_leave_carry_out, half_day_days, lop_days, monthly_gross, tds, net_pay
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE working_days = VALUES(working_days), total_days = VALUES(total_days),
        present_days = VALUES(present_days), absent_days = VALUES(absent_days), week_off_days = VALUES(week_off_days),
        leave_days = VALUES(leave_days), short_leave_days = VALUES(short_leave_days), short_leave_carry_out = VALUES(short_leave_carry_out),
        half_day_days = VALUES(half_day_days), lop_days = VALUES(lop_days), monthly_gross = VALUES(monthly_gross),
        tds = VALUES(tds), net_pay = VALUES(net_pay), computed_at = CURRENT_TIMESTAMP`,
      [
        month, entry.emp, entry.workingDays, entry.totalDays, entry.presentDays, entry.absentDays, entry.weekOffDays,
        entry.leaveDays, entry.shortLeaveDays, entry.shortLeaveCarryOut, entry.halfDayDays, entry.lopDays,
        entry.monthlyGross, entry.tds, entry.netPay,
      ]
    );
  }

  // --- Templates ---
  async findTemplates(): Promise<HrTemplate[]> {
    return findAllRows<HrTemplate>('hr_templates', 'name ASC');
  }
  async upsertTemplate(name: string, content: string): Promise<void> {
    await query(
      `INSERT INTO hr_templates (name, content) VALUES (?, ?) ON DUPLICATE KEY UPDATE content = VALUES(content)`,
      [name, content]
    );
  }

  // --- Rules (singleton row, id = 1) ---
  async findRules(): Promise<HrRules | null> {
    const r = await queryOne<RulesRow>('SELECT * FROM hr_rules WHERE id = 1');
    if (!r) return null;
    return {
      workingDaysPattern: r.working_days_pattern, shiftStartTime: r.shift_start_time, shiftEndTime: r.shift_end_time,
      shiftGraceMinutes: r.shift_grace_minutes, halfDayThresholdHours: Number(r.half_day_threshold_hours),
      regularizationWindowDays: r.regularization_window_days, regularizationOverride: !!r.regularization_override,
      regularizationMonthlyQuota: r.regularization_monthly_quota, shortLeaveMaxHours: Number(r.short_leave_max_hours),
      shortLeaveMonthlyQuota: r.short_leave_monthly_quota,
      halfDayMinWorkedHours: Number(r.half_day_min_worked_hours), shortLeaveMinWorkedHours: Number(r.short_leave_min_worked_hours),
      fullDayMinWorkedHours: Number(r.full_day_min_worked_hours),
      salaryPeriodFrom: r.salary_period_from, salaryPeriodTo: r.salary_period_to,
      ctcSplit: {
        basicPct: Number(r.ctc_basic_pct), hraPctOfBasic: Number(r.ctc_hra_pct),
        convenienceType: r.ctc_convenience_type === 'percent' ? 'percent' : 'amount',
        convenienceValue: Number(r.ctc_convenience_value),
      },
      leaveTypes: parseJsonColumn(r.leave_types, {}),
      twoLevelApproval: { leave: !!r.two_level_approval_leave, attendance: !!r.two_level_approval_attendance, expense: !!r.two_level_approval_expense },
      lateMarkPenalty: !!r.late_mark_penalty, geoFencing: !!r.geo_fencing, selfieCheckin: !!r.selfie_checkin,
      pfEsi: !!r.pf_esi, optionalHolidayChoice: !!r.optional_holiday_choice, assetChecklist: !!r.asset_checklist,
    };
  }
  async saveRules(rules: HrRules): Promise<void> {
    const params: SqlParam[] = [
      rules.workingDaysPattern, rules.shiftStartTime, rules.shiftEndTime, rules.shiftGraceMinutes, rules.halfDayThresholdHours,
      rules.regularizationWindowDays, rules.regularizationOverride ? 1 : 0,
      rules.regularizationMonthlyQuota, rules.shortLeaveMaxHours, rules.shortLeaveMonthlyQuota,
      rules.halfDayMinWorkedHours, rules.shortLeaveMinWorkedHours, rules.fullDayMinWorkedHours,
      rules.salaryPeriodFrom, String(rules.salaryPeriodTo),
      rules.ctcSplit.basicPct, rules.ctcSplit.hraPctOfBasic, rules.ctcSplit.convenienceType, rules.ctcSplit.convenienceValue,
      JSON.stringify(rules.leaveTypes || {}),
      rules.twoLevelApproval.leave ? 1 : 0, rules.twoLevelApproval.attendance ? 1 : 0, rules.twoLevelApproval.expense ? 1 : 0,
      rules.lateMarkPenalty ? 1 : 0, rules.geoFencing ? 1 : 0, rules.selfieCheckin ? 1 : 0, rules.pfEsi ? 1 : 0,
      rules.optionalHolidayChoice ? 1 : 0, rules.assetChecklist ? 1 : 0,
    ];
    await query(
      `INSERT INTO hr_rules (id, working_days_pattern, shift_start_time, shift_end_time, shift_grace_minutes, half_day_threshold_hours,
        regularization_window_days, regularization_override, regularization_monthly_quota, short_leave_max_hours, short_leave_monthly_quota,
        half_day_min_worked_hours, short_leave_min_worked_hours, full_day_min_worked_hours,
        salary_period_from, salary_period_to, ctc_basic_pct, ctc_hra_pct, ctc_convenience_type, ctc_convenience_value,
        leave_types, two_level_approval_leave, two_level_approval_attendance, two_level_approval_expense, late_mark_penalty, geo_fencing,
        selfie_checkin, pf_esi, optional_holiday_choice, asset_checklist)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        working_days_pattern = VALUES(working_days_pattern), shift_start_time = VALUES(shift_start_time), shift_end_time = VALUES(shift_end_time),
        shift_grace_minutes = VALUES(shift_grace_minutes), half_day_threshold_hours = VALUES(half_day_threshold_hours),
        regularization_window_days = VALUES(regularization_window_days), regularization_override = VALUES(regularization_override),
        regularization_monthly_quota = VALUES(regularization_monthly_quota), short_leave_max_hours = VALUES(short_leave_max_hours),
        short_leave_monthly_quota = VALUES(short_leave_monthly_quota),
        half_day_min_worked_hours = VALUES(half_day_min_worked_hours), short_leave_min_worked_hours = VALUES(short_leave_min_worked_hours),
        full_day_min_worked_hours = VALUES(full_day_min_worked_hours),
        salary_period_from = VALUES(salary_period_from), salary_period_to = VALUES(salary_period_to),
        ctc_basic_pct = VALUES(ctc_basic_pct), ctc_hra_pct = VALUES(ctc_hra_pct),
        ctc_convenience_type = VALUES(ctc_convenience_type), ctc_convenience_value = VALUES(ctc_convenience_value),
        leave_types = VALUES(leave_types), two_level_approval_leave = VALUES(two_level_approval_leave),
        two_level_approval_attendance = VALUES(two_level_approval_attendance), two_level_approval_expense = VALUES(two_level_approval_expense),
        late_mark_penalty = VALUES(late_mark_penalty), geo_fencing = VALUES(geo_fencing), selfie_checkin = VALUES(selfie_checkin),
        pf_esi = VALUES(pf_esi), optional_holiday_choice = VALUES(optional_holiday_choice), asset_checklist = VALUES(asset_checklist)`,
      params
    );
  }

  // --- Company profile ---
  async findCompanyProfile(): Promise<HrCompanyProfile | null> {
    const r = await queryOne<CompanyProfileRow>('SELECT * FROM hr_company_profile WHERE id = 1');
    if (!r) return null;
    return { companyName: r.company_name, cin: r.cin, registeredState: r.registered_state };
  }
  async saveCompanyProfile(profile: HrCompanyProfile, actor?: string): Promise<void> {
    await query(
      `INSERT INTO hr_company_profile (id, company_name, cin, registered_state, updated_by) VALUES (1, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE company_name = VALUES(company_name), cin = VALUES(cin),
        registered_state = VALUES(registered_state), updated_by = VALUES(updated_by)`,
      [profile.companyName, profile.cin, profile.registeredState, actor || null]
    );
  }

  // --- Audit log ---
  async findAuditLog(limit = 200): Promise<HrAuditLogEntry[]> {
    const rows = await query<AuditRow>('SELECT * FROM hr_audit_log ORDER BY id DESC LIMIT ?', [limit]);
    return rows.map((r) => ({ ts: r.ts, who: r.who, change: r.change_text }));
  }
  async appendAuditLog(entry: HrAuditLogEntry): Promise<void> {
    await query('INSERT INTO hr_audit_log (ts, who, change_text) VALUES (?, ?, ?)', [entry.ts, entry.who, entry.change]);
  }

  // --- Full wipe for the sample-data-reset flow ---
  async resetSampleData(keepEmployeeId: string | null): Promise<void> {
    await query('DELETE FROM hr_onboarding', []);
    await query('DELETE FROM hr_attendance', []);
    await query('DELETE FROM hr_attendance_overrides', []);
    await query('DELETE FROM hr_punch_log', []);
    await query('DELETE FROM hr_regularizations', []);
    await query('DELETE FROM hr_leave_requests', []);
    await query('DELETE FROM hr_expenses', []);
    await query('DELETE FROM hr_tickets', []);
    if (keepEmployeeId) await query('DELETE FROM hr_employees WHERE id != ?', [keepEmployeeId]);
    else await query('DELETE FROM hr_employees', []);
    await query(`UPDATE hr_teams SET manager = NULL WHERE manager NOT IN (SELECT name FROM hr_employees)`, []);
  }
}
