import { getDbConnection, query, queryOne } from '@/shared/database/connection';
import { findAllRows, replaceAllRows, parseJsonColumn, SqlParam } from './shared';
import {
  HrTeam, HrHoliday, HrEmployee, HrDocRef, HrOnboarding, HrAttendanceRecord, HrAttendanceOverride, HrPunch, HrPunchGeo,
  HrRegularization, HrLeaveRequest, HrExpense, HrTicket, HrComplianceTask, HrPayrollRun, HrPayrollEntry, HrTemplate,
  HrRules, HrAuditLogEntry, HrCompanyProfile, HrDocumentUploadRequest, HrEmployeeRef, normalizeLeaveTypes,
} from '../domain/types';
import { HrKycDocuments, mergeKycDocuments } from '../domain/kyc';

interface NameRow { name: string; }
interface TeamRow { name: string; manager: string | null; manager_id?: string | null; }
interface HolidayRow { holiday_date: string; name: string; }
interface CompanyProfileRow { company_name: string; cin: string; registered_state: string; }

interface EmployeeRow {
  id: string; credential_id: number | null; name: string; email: string | null; phone: string | null; designation: string | null; team: string | null;
  manager: string | null; manager_id?: string | null;
  status: string; doj: string | null; sys_role: string; ctc: number;
  leave_balance: unknown; documents: unknown; documents_deadline: string | null; kyc_documents: unknown; signed_docs: unknown; ctc_split_override: unknown; probation_extended_by: number | null;
}
interface OnboardingRow {
  id: string; name: string; personal_email: string | null; designation: string | null; team: string | null; ctc: number;
  stage: string; offer_sent_date: string | null; signed_date: string | null; upload_deadline: string | null;
  employee_id: string | null; agreement_stage: string; docs: unknown; assets: unknown;
}
/** DECIMAL columns come back from mariadb as strings — always go through Number() (see geoFromRow). */
type DecimalCell = string | number | null | undefined;
interface GeoColumns {
  in_lat: DecimalCell; in_lng: DecimalCell; in_accuracy_m: DecimalCell; in_distance_m: DecimalCell;
  out_lat: DecimalCell; out_lng: DecimalCell; out_accuracy_m: DecimalCell; out_distance_m: DecimalCell;
}
/** Every employee-owned row carries `employee_id` (hr_employees.id) — the key everything is
 * matched on — plus `emp`, a snapshot of the employee's name kept only for display. */
interface EmployeeOwned { employee_id: string | null; emp: string; }
interface AttendanceRow extends GeoColumns, EmployeeOwned { attendance_date: string; status: string; in_time: string | null; in_minutes: number | null; out_minutes: number | null; out_time: string | null; }
interface OverrideRow extends EmployeeOwned { override_date: string; status: string; }
interface PunchRow extends GeoColumns, EmployeeOwned { punch_date: string; in_time: string | null; in_minutes: number | null; out_minutes: number | null; out_time: string | null; }
interface ApprovalRow extends EmployeeOwned { id: string; stage: string; status: string; rm_remarks: string | null; hr_remarks: string | null; }
interface RegularizationRow extends ApprovalRow { reg_date: string; punch_type: string; reason: string | null; requested_time: string | null; }
interface LeaveRow extends ApprovalRow { type: string; from_date: string; to_date: string; remarks: string | null; }
interface ExpenseRow extends ApprovalRow { category: string | null; amount: number; }
interface TicketRow extends EmployeeOwned { id: string; category: string | null; status: string; note: string | null; }
interface ComplianceRow { task: string; due_date: string | null; status: string; }
interface PayrollRow { month: string; status: string; run_at: string | null; run_by: string | null; }
interface PayrollEntryRow extends EmployeeOwned {
  month: string; working_days: number; total_days: number; present_days: number; absent_days: number;
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
  geo_fence_lat?: string | number | null; geo_fence_lng?: string | number | null; geo_fence_radius_m?: number | null;
}

/** Office point + radius seeded by add-hr-geofence.sql; also the fallback if that migration
 * hasn't run yet (SELECT * then simply omits the columns). StartupNews.fyi, Jhandewalan. */
const DEFAULT_GEO_FENCE = { lat: 28.644533, lng: 77.2003635, radiusM: 50 } as const;

const decimalOrNull = (v: DecimalCell): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
/** Null when no fix was stored for that punch (pre-geofencing rows, geofencing off, regularized days). */
function geoFromRow(lat: DecimalCell, lng: DecimalCell, accuracy: DecimalCell, distance: DecimalCell): HrPunchGeo | null {
  const latN = decimalOrNull(lat);
  const lngN = decimalOrNull(lng);
  if (latN === null && lngN === null) return null;
  return { lat: latN, lng: lngN, accuracyM: decimalOrNull(accuracy), distanceM: decimalOrNull(distance) };
}
function geoParams(g: HrPunchGeo | null | undefined): [SqlParam, SqlParam, SqlParam, SqlParam] {
  if (!g) return [null, null, null, null];
  return [g.lat ?? null, g.lng ?? null, g.accuracyM ?? null, g.distanceM ?? null];
}
interface AuditRow { ts: string; who: string; change_text: string; }

/** Tables whose rows belong to one employee. Keyed by `employee_id` (hr_employees.id); `emp` is
 * only a name snapshot for display. See scripts/migrations/hr-link-records-by-employee-id.sql. */
const EMPLOYEE_RECORD_TABLES = [
  'hr_attendance', 'hr_attendance_overrides', 'hr_punch_log', 'hr_regularizations',
  'hr_leave_requests', 'hr_expenses', 'hr_tickets', 'hr_payroll_entries', 'hr_document_upload_requests',
] as const;

/** Names that belong to exactly one employee — the only names ever trusted to resolve a legacy
 * row (one written before employee_id existed) to a person. A shared name is never guessed at. */
const UNIQUE_EMPLOYEE_NAMES = '(SELECT name, MIN(id) AS id FROM hr_employees GROUP BY name HAVING COUNT(*) = 1)';

const employeeIdOf = (r: EmployeeOwned): string => r.employee_id || '';

function mapRegularizationRow(r: RegularizationRow): HrRegularization {
  return {
    id: r.id, employeeId: employeeIdOf(r), emp: r.emp, date: r.reg_date, punchType: (r.punch_type as HrRegularization['punchType']) || 'in',
    reason: r.reason || '', requestedTime: r.requested_time || null, stage: r.stage, status: r.status,
    rmRemarks: r.rm_remarks || '', hrRemarks: r.hr_remarks || '',
  };
}
function mapLeaveRow(r: LeaveRow): HrLeaveRequest {
  return {
    id: r.id, employeeId: employeeIdOf(r), emp: r.emp, type: r.type, from: r.from_date, to: r.to_date, remarks: r.remarks || '',
    stage: r.stage, status: r.status, rmRemarks: r.rm_remarks || '', hrRemarks: r.hr_remarks || '',
  };
}

export class HrToolRepository {
  /* ---------------------------------------------------------
     Legacy-row safety net
  --------------------------------------------------------- */
  private static lastBackfillAt = 0;
  private static backfillInFlight: Promise<void> | null = null;

  /**
   * Attaches `employee_id` to any employee-owned row that doesn't have one yet, by matching its
   * `emp` name against names that belong to exactly ONE employee (a shared name is left alone
   * rather than guessed). Also fills `manager_id` the same way. Needed only for rows written by an
   * older build that doesn't know the column; cheap, throttled to once a minute per process, and
   * a no-op once everything is linked. Never throws — a failure here must not take the HR tool down.
   */
  async backfillMissingEmployeeIds(): Promise<void> {
    if (HrToolRepository.backfillInFlight) return HrToolRepository.backfillInFlight;
    if (Date.now() - HrToolRepository.lastBackfillAt < 60_000) return;
    HrToolRepository.lastBackfillAt = Date.now();
    HrToolRepository.backfillInFlight = (async () => {
      try {
        for (const table of EMPLOYEE_RECORD_TABLES) {
          await query(`UPDATE ${table} t JOIN ${UNIQUE_EMPLOYEE_NAMES} e ON e.name = t.emp SET t.employee_id = e.id WHERE t.employee_id IS NULL`, []);
        }
        for (const table of ['hr_employees', 'hr_teams']) {
          await query(`UPDATE ${table} t JOIN ${UNIQUE_EMPLOYEE_NAMES} e ON e.name = t.manager SET t.manager_id = e.id WHERE t.manager_id IS NULL AND t.manager IS NOT NULL`, []);
        }
      } catch (e) {
        console.warn('HR employee_id backfill skipped:', e instanceof Error ? e.message : e);
      } finally {
        HrToolRepository.backfillInFlight = null;
      }
    })();
    return HrToolRepository.backfillInFlight;
  }

  // --- Org structure ---
  async findTeams(): Promise<HrTeam[]> {
    const rows = await findAllRows<TeamRow>('hr_teams', 'name ASC');
    return rows.map((r) => ({ name: r.name, manager: r.manager, managerId: r.manager_id ?? null }));
  }
  /** `managerId` is authoritative; `manager` is stored as the display name of that employee. */
  async replaceTeams(teams: HrTeam[]): Promise<void> {
    const employees = await findAllRows<EmployeeRow>('hr_employees');
    const nameById = new Map(employees.map((e) => [e.id, e.name]));
    await replaceAllRows('hr_teams', ['name', 'manager', 'manager_id'], teams, (t) => {
      const managerId = t.managerId && nameById.has(t.managerId) ? t.managerId : null;
      return [t.name, managerId ? nameById.get(managerId)! : (t.manager || null), managerId];
    });
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
      manager: r.manager, managerId: r.manager_id ?? null, status: r.status, doj: r.doj || '', sysRole: r.sys_role, ctc: r.ctc,
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
  async findEmployeeById(id: string): Promise<HrEmployee | null> {
    const row = await queryOne<EmployeeRow>('SELECT * FROM hr_employees WHERE id = ?', [id]);
    return row ? this.employeeFromRow(row) : null;
  }

  /**
   * A rename only has to refresh the NAME SNAPSHOTS — every record is linked by employee_id, so
   * nothing can be orphaned by it. Done in one transaction so the snapshots never disagree:
   * the `emp` column on every employee-owned table, the display name on teams this person
   * manages, and the name on their Employee ID login. (Reports' `manager` display names are
   * refreshed by replaceEmployees itself, since it rewrites that table.)
   */
  private async cascadeEmployeeRename(renames: { id: string; to: string; credentialId: number | null }[]): Promise<void> {
    const pool = await getDbConnection();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      // Runs only AFTER hr_employees is saved, and re-syncs every snapshot from it rather than just
      // this save's renames — so a save that failed part-way, or one made by an older build, heals
      // on the next save instead of leaving records showing an old name.
      for (const table of EMPLOYEE_RECORD_TABLES) {
        await connection.query(`UPDATE ${table} t JOIN hr_employees e ON e.id = t.employee_id SET t.emp = e.name WHERE t.emp <> e.name`);
      }
      await connection.query('UPDATE hr_teams t JOIN hr_employees e ON e.id = t.manager_id SET t.manager = e.name WHERE NOT (t.manager <=> e.name)');
      // The login's name follows only an actual Directory rename, so a name set on the login
      // itself (Edit Employee ID) isn't overwritten by an unrelated save.
      for (const { to, credentialId } of renames) {
        if (credentialId != null) {
          await connection.query('UPDATE hr_employee_credentials SET name = ? WHERE id = ?', [to, credentialId]);
        }
      }
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  }

  async replaceEmployees(employees: HrEmployee[]): Promise<void> {
    // A trailing or doubled space would make two spellings of one name, so normalise. Names are
    // display only now — records link by id — so two employees MAY share a name.
    const normalised = employees.map((e) => ({ ...e, name: (e.name || '').trim().replace(/\s+/g, ' ') }));
    if (normalised.some((e) => !e.name)) throw new Error('An employee name cannot be blank.');

    // managerId is authoritative and `manager` is always stored as that employee's CURRENT name,
    // so a manager's rename reaches everyone reporting to them automatically. A row that only has
    // a manager name (created before manager_id existed, or by a caller that sent just the name)
    // is resolved from the name when it belongs to exactly one other employee.
    const nameById = new Map(normalised.map((e) => [e.id, e.name]));
    const idsByName = new Map<string, string[]>();
    for (const e of normalised) idsByName.set(e.name, [...(idsByName.get(e.name) || []), e.id]);
    const withManagers = normalised.map((e) => {
      let managerId = e.managerId && e.managerId !== e.id && nameById.has(e.managerId) ? e.managerId : null;
      if (!managerId && e.manager && !e.managerId) {
        const ids = idsByName.get(e.manager.trim());
        if (ids?.length === 1 && ids[0] !== e.id) managerId = ids[0];
      }
      return { ...e, managerId, manager: managerId ? nameById.get(managerId)! : (e.manager?.trim() || null) };
    });

    const existing = await findAllRows<EmployeeRow>('hr_employees', 'created_at ASC');
    const previousName = new Map(existing.map((r) => [r.id, r.name]));
    const renames = withManagers
      .filter((e) => previousName.has(e.id) && previousName.get(e.id) !== e.name)
      .map((e) => ({ id: e.id, to: e.name, credentialId: e.credentialId ?? null }));

    await replaceAllRows(
      'hr_employees',
      ['id', 'credential_id', 'name', 'email', 'phone', 'designation', 'team', 'manager', 'manager_id', 'status', 'doj', 'sys_role', 'ctc', 'leave_balance', 'documents', 'documents_deadline', 'kyc_documents', 'signed_docs', 'ctc_split_override', 'probation_extended_by'],
      withManagers,
      (e) => [
        e.id, e.credentialId ?? null, e.name, e.email || null, e.phone || null, e.designation || null, e.team || null, e.manager || null, e.managerId || null, e.status, e.doj || null,
        e.sysRole, e.ctc, JSON.stringify(e.leaveBalance || {}), JSON.stringify(e.documents || []), e.documentsDeadline || null, JSON.stringify(mergeKycDocuments(e.kycDocuments)), JSON.stringify(e.signedDocs || []),
        e.ctcSplitOverride ? JSON.stringify(e.ctcSplitOverride) : null, e.probationExtendedBy ?? null,
      ]
    );
    // Only once the new names are saved — if the save above fails, nothing else has changed.
    await this.cascadeEmployeeRename(renames);
  }
  /** Resolves the Directory record behind an Employee ID login (plain employee, or Publisher/Event
   * Admin linked via panel_admins). Matches credential_id. Falls back to the name ONLY for an
   * unlinked row whose name belongs to nobody else — with shared names allowed, anything looser
   * could hand one person another person's records. */
  async findEmployeeByCredential(credentialId: number, name: string): Promise<HrEmployee | null> {
    const byId = await queryOne<EmployeeRow>('SELECT * FROM hr_employees WHERE credential_id = ?', [credentialId]);
    if (byId) return this.employeeFromRow(byId);
    const byName = await query<EmployeeRow>('SELECT * FROM hr_employees WHERE name = ?', [name]);
    return byName.length === 1 && byName[0].credential_id == null ? this.employeeFromRow(byName[0]) : null;
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

  /** Hard-deletes one employee and every record of theirs, in a single transaction so a failure
   * part-way through leaves nothing half-removed. Records go by employee_id; a legacy row with
   * no employee_id is removed by name only when that name belongs to nobody else. Their Employee
   * ID credential goes too — left behind, Directory's orphan auto-heal would recreate the row.
   * Returns null when the id no longer exists. */
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
      const counted = await connection.query('SELECT COUNT(*) AS cnt FROM hr_employees WHERE name = ?', [row.name]);
      const uniqueName = Number((Array.isArray(counted) ? counted[0] : counted)?.cnt) === 1;

      for (const table of EMPLOYEE_RECORD_TABLES) {
        await connection.query(`DELETE FROM ${table} WHERE employee_id = ?`, [employeeId]);
        if (uniqueName) await connection.query(`DELETE FROM ${table} WHERE employee_id IS NULL AND emp = ?`, [row.name]);
      }
      // Anyone who reported to them, and any team they managed, would otherwise point at nobody.
      for (const table of ['hr_teams', 'hr_employees']) {
        await connection.query(`UPDATE ${table} SET manager = NULL, manager_id = NULL WHERE manager_id = ?`, [employeeId]);
        if (uniqueName) await connection.query(`UPDATE ${table} SET manager = NULL WHERE manager_id IS NULL AND manager = ?`, [row.name]);
      }
      await connection.query('DELETE FROM hr_onboarding WHERE employee_id = ?', [employeeId]);
      await connection.query('DELETE FROM hr_employees WHERE id = ?', [employeeId]);
      if (row.credential_id != null) {
        await connection.query('DELETE FROM hr_employee_credentials WHERE id = ?', [row.credential_id]);
      } else if (uniqueName) {
        // Only a login that no other Directory record is linked to.
        await connection.query(
          'DELETE FROM hr_employee_credentials WHERE name = ? AND id NOT IN (SELECT credential_id FROM hr_employees WHERE credential_id IS NOT NULL)',
          [row.name]
        );
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
  private mapAttendanceRow(r: AttendanceRow): HrAttendanceRecord {
    return {
      employeeId: employeeIdOf(r), emp: r.emp, date: r.attendance_date, status: r.status, inTime: r.in_time || '—', outTime: r.out_time || '—',
      inMinutes: r.in_minutes, outMinutes: r.out_minutes,
      inGeo: geoFromRow(r.in_lat, r.in_lng, r.in_accuracy_m, r.in_distance_m),
      outGeo: geoFromRow(r.out_lat, r.out_lng, r.out_accuracy_m, r.out_distance_m),
    };
  }
  private mapPunchRow(r: PunchRow): HrPunch {
    return {
      employeeId: employeeIdOf(r), emp: r.emp, date: r.punch_date, inTime: r.in_time, inMinutes: r.in_minutes, outTime: r.out_time, outMinutes: r.out_minutes,
      inGeo: geoFromRow(r.in_lat, r.in_lng, r.in_accuracy_m, r.in_distance_m),
      outGeo: geoFromRow(r.out_lat, r.out_lng, r.out_accuracy_m, r.out_distance_m),
    };
  }
  async findAttendance(): Promise<HrAttendanceRecord[]> {
    const rows = await findAllRows<AttendanceRow>('hr_attendance', 'attendance_date ASC');
    return rows.map((r) => this.mapAttendanceRow(r));
  }
  /** One employee's attendance within a date range (inclusive) — powers the attendance calendar and payroll. */
  async findAttendanceForEmployeeInRange(employeeId: string, fromDate: string, toDate: string): Promise<HrAttendanceRecord[]> {
    const rows = await query<AttendanceRow>(
      'SELECT * FROM hr_attendance WHERE employee_id = ? AND attendance_date BETWEEN ? AND ? ORDER BY attendance_date ASC',
      [employeeId, fromDate, toDate]
    );
    return rows.map((r) => this.mapAttendanceRow(r));
  }
  /** Overwrites EVERY column, geo included — callers must pass through any existing inGeo/outGeo
   * they don't intend to change (punchEmployee and decideRegularization both do). */
  async upsertAttendance(rec: HrAttendanceRecord): Promise<void> {
    await query(
      `INSERT INTO hr_attendance (employee_id, emp, attendance_date, status, in_time, in_minutes, out_minutes, out_time,
         in_lat, in_lng, in_accuracy_m, in_distance_m, out_lat, out_lng, out_accuracy_m, out_distance_m)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE employee_id = VALUES(employee_id), emp = VALUES(emp),
         status = VALUES(status), in_time = VALUES(in_time), in_minutes = VALUES(in_minutes), out_minutes = VALUES(out_minutes), out_time = VALUES(out_time),
         in_lat = VALUES(in_lat), in_lng = VALUES(in_lng), in_accuracy_m = VALUES(in_accuracy_m), in_distance_m = VALUES(in_distance_m),
         out_lat = VALUES(out_lat), out_lng = VALUES(out_lng), out_accuracy_m = VALUES(out_accuracy_m), out_distance_m = VALUES(out_distance_m)`,
      [
        rec.employeeId, rec.emp, rec.date, rec.status, rec.inTime || null, rec.inMinutes ?? null, rec.outMinutes ?? null, rec.outTime || null,
        ...geoParams(rec.inGeo), ...geoParams(rec.outGeo),
      ]
    );
  }

  async findAttendanceOverrides(): Promise<HrAttendanceOverride[]> {
    const rows = await findAllRows<OverrideRow>('hr_attendance_overrides');
    return rows.map((r) => ({ employeeId: employeeIdOf(r), emp: r.emp, date: r.override_date, status: r.status }));
  }
  async upsertAttendanceOverride(o: HrAttendanceOverride): Promise<void> {
    await query(
      `INSERT INTO hr_attendance_overrides (employee_id, emp, override_date, status) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status), employee_id = VALUES(employee_id), emp = VALUES(emp)`,
      [o.employeeId, o.emp, o.date, o.status]
    );
  }

  async findPunchLog(): Promise<HrPunch[]> {
    const rows = await findAllRows<PunchRow>('hr_punch_log');
    return rows.map((r) => this.mapPunchRow(r));
  }
  /** The single punch-log row for one employee — may be stale (a previous day's punch) if they haven't punched today. */
  async findPunchByEmployeeId(employeeId: string): Promise<HrPunch | null> {
    const row = await queryOne<PunchRow>('SELECT * FROM hr_punch_log WHERE employee_id = ?', [employeeId]);
    if (!row) return null;
    return this.mapPunchRow(row);
  }
  /** Overwrites EVERY column, geo included — see upsertAttendance. */
  async upsertPunch(p: HrPunch): Promise<void> {
    await query(
      `INSERT INTO hr_punch_log (employee_id, emp, punch_date, in_time, in_minutes, out_minutes, out_time,
         in_lat, in_lng, in_accuracy_m, in_distance_m, out_lat, out_lng, out_accuracy_m, out_distance_m)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE employee_id = VALUES(employee_id), emp = VALUES(emp),
         punch_date = VALUES(punch_date), in_time = VALUES(in_time), in_minutes = VALUES(in_minutes), out_minutes = VALUES(out_minutes), out_time = VALUES(out_time),
         in_lat = VALUES(in_lat), in_lng = VALUES(in_lng), in_accuracy_m = VALUES(in_accuracy_m), in_distance_m = VALUES(in_distance_m),
         out_lat = VALUES(out_lat), out_lng = VALUES(out_lng), out_accuracy_m = VALUES(out_accuracy_m), out_distance_m = VALUES(out_distance_m)`,
      [p.employeeId, p.emp, p.date, p.inTime, p.inMinutes, p.outMinutes, p.outTime, ...geoParams(p.inGeo), ...geoParams(p.outGeo)]
    );
  }

  // --- Approvals: regularizations, leave requests, expenses ---
  async findRegularizations(): Promise<HrRegularization[]> {
    const rows = await findAllRows<RegularizationRow>('hr_regularizations', 'created_at DESC');
    return rows.map(mapRegularizationRow);
  }
  async replaceRegularizations(items: HrRegularization[]): Promise<void> {
    await replaceAllRows(
      'hr_regularizations', ['id', 'employee_id', 'emp', 'reg_date', 'punch_type', 'reason', 'requested_time', 'stage', 'status', 'rm_remarks', 'hr_remarks'], items,
      (r) => [r.id, r.employeeId || null, r.emp, r.date, r.punchType, r.reason || null, r.requestedTime || null, r.stage, r.status, r.rmRemarks || null, r.hrRemarks || null]
    );
  }
  /** One employee's own regularization requests — used by the isolated Publisher/Event Admin
   * and plain-employee attendance surfaces, which must never see other employees' requests. */
  async findRegularizationsForEmployee(employeeId: string): Promise<HrRegularization[]> {
    const rows = await query<RegularizationRow>('SELECT * FROM hr_regularizations WHERE employee_id = ? ORDER BY created_at DESC', [employeeId]);
    return rows.map(mapRegularizationRow);
  }
  /** A punch type is only ever regularized once per date — 'in' and 'out' are independent, so a
   * date with both regularized has two rows here, looked up separately by type. */
  async findRegularizationByEmployeeDateAndType(employeeId: string, date: string, punchType: HrRegularization['punchType']): Promise<HrRegularization | null> {
    const row = await queryOne<RegularizationRow>('SELECT * FROM hr_regularizations WHERE employee_id = ? AND reg_date = ? AND punch_type = ?', [employeeId, date, punchType]);
    return row ? mapRegularizationRow(row) : null;
  }
  /** Single-row insert, safe for an isolated employee session to call directly. */
  async insertRegularization(reg: HrRegularization): Promise<void> {
    await query(
      'INSERT INTO hr_regularizations (id, employee_id, emp, reg_date, punch_type, reason, requested_time, stage, status, rm_remarks, hr_remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [reg.id, reg.employeeId, reg.emp, reg.date, reg.punchType, reg.reason || null, reg.requestedTime || null, reg.stage, reg.status, reg.rmRemarks || null, reg.hrRemarks || null]
    );
  }
  /** Single-row update by id — used to finalize one regularization's approve/reject decision. */
  async updateRegularization(reg: HrRegularization): Promise<void> {
    await query(
      'UPDATE hr_regularizations SET stage = ?, status = ?, rm_remarks = ?, hr_remarks = ? WHERE id = ?',
      [reg.stage, reg.status, reg.rmRemarks || null, reg.hrRemarks || null, reg.id]
    );
  }
  async countRegularizationsForEmployeeInRange(employeeId: string, fromDate: string, toDate: string): Promise<number> {
    const rows = await query<{ cnt: number }>(
      'SELECT COUNT(*) AS cnt FROM hr_regularizations WHERE employee_id = ? AND reg_date BETWEEN ? AND ?',
      [employeeId, fromDate, toDate]
    );
    return Number(rows[0]?.cnt || 0);
  }

  async findLeaveRequests(): Promise<HrLeaveRequest[]> {
    const rows = await findAllRows<LeaveRow>('hr_leave_requests', 'created_at DESC');
    return rows.map(mapLeaveRow);
  }
  /** One employee's leave requests overlapping a date range — used by payroll. Interval-overlap
   * test (from_date <= toDate AND to_date >= fromDate), not a single-column BETWEEN. */
  async findLeaveRequestsForEmployeeInRange(employeeId: string, fromDate: string, toDate: string): Promise<HrLeaveRequest[]> {
    const rows = await query<LeaveRow>(
      'SELECT * FROM hr_leave_requests WHERE employee_id = ? AND from_date <= ? AND to_date >= ?',
      [employeeId, toDate, fromDate]
    );
    return rows.map(mapLeaveRow);
  }
  async replaceLeaveRequests(items: HrLeaveRequest[]): Promise<void> {
    await replaceAllRows(
      'hr_leave_requests', ['id', 'employee_id', 'emp', 'type', 'from_date', 'to_date', 'remarks', 'stage', 'status', 'rm_remarks', 'hr_remarks'], items,
      (l) => [l.id, l.employeeId || null, l.emp, l.type, l.from, l.to, l.remarks || null, l.stage, l.status, l.rmRemarks || null, l.hrRemarks || null]
    );
  }
  /** One employee's own leave requests — for the isolated employee-facing leave surfaces. */
  async findLeaveRequestsForEmployee(employeeId: string): Promise<HrLeaveRequest[]> {
    const rows = await query<LeaveRow>('SELECT * FROM hr_leave_requests WHERE employee_id = ? ORDER BY created_at DESC', [employeeId]);
    return rows.map(mapLeaveRow);
  }
  /** Any not-yet-rejected request of this employee's that overlaps the given range — blocks a
   * duplicate/overlapping submission. A rejected request doesn't count. */
  async findOverlappingLeaveRequestForEmployee(employeeId: string, fromDate: string, toDate: string): Promise<HrLeaveRequest | null> {
    const row = await queryOne<LeaveRow>(
      "SELECT * FROM hr_leave_requests WHERE employee_id = ? AND status != 'rejected' AND from_date <= ? AND to_date >= ?",
      [employeeId, toDate, fromDate]
    );
    return row ? mapLeaveRow(row) : null;
  }
  /** Single-row insert, safe for an isolated employee session to call directly. */
  async insertLeaveRequest(req: HrLeaveRequest): Promise<void> {
    await query(
      'INSERT INTO hr_leave_requests (id, employee_id, emp, type, from_date, to_date, remarks, stage, status, rm_remarks, hr_remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.id, req.employeeId, req.emp, req.type, req.from, req.to, req.remarks || null, req.stage, req.status, req.rmRemarks || null, req.hrRemarks || null]
    );
  }

  async findExpenses(): Promise<HrExpense[]> {
    const rows = await findAllRows<ExpenseRow>('hr_expenses', 'created_at DESC');
    return rows.map((r) => ({ id: r.id, employeeId: employeeIdOf(r), emp: r.emp, category: r.category || '', amount: r.amount, stage: r.stage, status: r.status, rmRemarks: r.rm_remarks || '', hrRemarks: r.hr_remarks || '' }));
  }
  async replaceExpenses(items: HrExpense[]): Promise<void> {
    await replaceAllRows(
      'hr_expenses', ['id', 'employee_id', 'emp', 'category', 'amount', 'stage', 'status', 'rm_remarks', 'hr_remarks'], items,
      (x) => [x.id, x.employeeId || null, x.emp, x.category || null, x.amount, x.stage, x.status, x.rmRemarks || null, x.hrRemarks || null]
    );
  }

  // --- Tickets ---
  async findTickets(): Promise<HrTicket[]> {
    const rows = await findAllRows<TicketRow>('hr_tickets', 'created_at DESC');
    return rows.map((r) => ({ id: r.id, employeeId: employeeIdOf(r), emp: r.emp, category: r.category || '', status: r.status, note: r.note || '' }));
  }
  async replaceTickets(items: HrTicket[]): Promise<void> {
    await replaceAllRows('hr_tickets', ['id', 'employee_id', 'emp', 'category', 'status', 'note'], items, (t) => [t.id, t.employeeId || null, t.emp, t.category || null, t.status, t.note || null]);
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
      employeeId: employeeIdOf(r), emp: r.emp, totalDays: r.total_days, weekOffDays: r.week_off_days, workingDays: r.working_days,
      presentDays: r.present_days, leaveDays: r.leave_days, absentDays: r.absent_days,
      shortLeaveDays: r.short_leave_days, shortLeaveCarryOut: r.short_leave_carry_out, halfDayDays: r.half_day_days,
      lopDays: Number(r.lop_days), monthlyGross: r.monthly_gross, tds: r.tds, netPay: r.net_pay,
    }));
  }
  async upsertPayrollEntry(month: string, entry: HrPayrollEntry): Promise<void> {
    await query(
      `INSERT INTO hr_payroll_entries (
        month, employee_id, emp, working_days, total_days, present_days, absent_days, week_off_days, leave_days,
        short_leave_days, short_leave_carry_out, half_day_days, lop_days, monthly_gross, tds, net_pay
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE employee_id = VALUES(employee_id), emp = VALUES(emp),
        working_days = VALUES(working_days), total_days = VALUES(total_days),
        present_days = VALUES(present_days), absent_days = VALUES(absent_days), week_off_days = VALUES(week_off_days),
        leave_days = VALUES(leave_days), short_leave_days = VALUES(short_leave_days), short_leave_carry_out = VALUES(short_leave_carry_out),
        half_day_days = VALUES(half_day_days), lop_days = VALUES(lop_days), monthly_gross = VALUES(monthly_gross),
        tds = VALUES(tds), net_pay = VALUES(net_pay), computed_at = CURRENT_TIMESTAMP`,
      [
        month, entry.employeeId, entry.emp, entry.workingDays, entry.totalDays, entry.presentDays, entry.absentDays, entry.weekOffDays,
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
      leaveTypes: normalizeLeaveTypes(parseJsonColumn(r.leave_types, {})),
      twoLevelApproval: { leave: !!r.two_level_approval_leave, attendance: !!r.two_level_approval_attendance, expense: !!r.two_level_approval_expense },
      lateMarkPenalty: !!r.late_mark_penalty, geoFencing: !!r.geo_fencing, selfieCheckin: !!r.selfie_checkin,
      geoFenceLat: decimalOrNull(r.geo_fence_lat) ?? DEFAULT_GEO_FENCE.lat,
      geoFenceLng: decimalOrNull(r.geo_fence_lng) ?? DEFAULT_GEO_FENCE.lng,
      geoFenceRadiusM: decimalOrNull(r.geo_fence_radius_m) ?? DEFAULT_GEO_FENCE.radiusM,
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
      rules.geoFenceLat, rules.geoFenceLng, Math.round(rules.geoFenceRadiusM),
    ];
    await query(
      `INSERT INTO hr_rules (id, working_days_pattern, shift_start_time, shift_end_time, shift_grace_minutes, half_day_threshold_hours,
        regularization_window_days, regularization_override, regularization_monthly_quota, short_leave_max_hours, short_leave_monthly_quota,
        half_day_min_worked_hours, short_leave_min_worked_hours, full_day_min_worked_hours,
        salary_period_from, salary_period_to, ctc_basic_pct, ctc_hra_pct, ctc_convenience_type, ctc_convenience_value,
        leave_types, two_level_approval_leave, two_level_approval_attendance, two_level_approval_expense, late_mark_penalty, geo_fencing,
        selfie_checkin, pf_esi, optional_holiday_choice, asset_checklist, geo_fence_lat, geo_fence_lng, geo_fence_radius_m)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        pf_esi = VALUES(pf_esi), optional_holiday_choice = VALUES(optional_holiday_choice), asset_checklist = VALUES(asset_checklist),
        geo_fence_lat = VALUES(geo_fence_lat), geo_fence_lng = VALUES(geo_fence_lng), geo_fence_radius_m = VALUES(geo_fence_radius_m)`,
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
    await query(
      `UPDATE hr_teams SET manager = NULL, manager_id = NULL
        WHERE (manager_id IS NOT NULL AND manager_id NOT IN (SELECT id FROM hr_employees))
           OR (manager_id IS NULL AND manager NOT IN (SELECT name FROM hr_employees))`,
      []
    );
  }

  /* ---------------------------------------------------------
     Document-upload permission requests (see the 5-day window)
  --------------------------------------------------------- */
  private mapDocRequest(r: Record<string, unknown>): HrDocumentUploadRequest {
    const asIso = (v: unknown) => (v instanceof Date ? v.toISOString() : (v as string | null));
    return {
      id: Number(r.id), employeeId: r.employee_id ? String(r.employee_id) : '', emp: String(r.emp), reason: String(r.reason),
      status: r.status as HrDocumentUploadRequest['status'],
      requestedAt: asIso(r.requested_at) || '',
      decidedBy: (r.decided_by as string | null) ?? null,
      decidedAt: asIso(r.decided_at),
      remarks: (r.remarks as string | null) ?? null,
      grantedUntil: r.granted_until instanceof Date
        ? r.granted_until.toISOString().slice(0, 10)
        : ((r.granted_until as string | null) ?? null),
    };
  }

  async findDocumentUploadRequests(): Promise<HrDocumentUploadRequest[]> {
    const rows = await query<Record<string, unknown>>(
      'SELECT * FROM hr_document_upload_requests ORDER BY (status = \'pending\') DESC, requested_at DESC', []
    );
    return rows.map((r) => this.mapDocRequest(r));
  }

  async findPendingDocumentUploadRequest(employeeId: string): Promise<HrDocumentUploadRequest | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM hr_document_upload_requests WHERE employee_id = ? AND status = \'pending\' ORDER BY requested_at DESC LIMIT 1', [employeeId]
    );
    return row ? this.mapDocRequest(row) : null;
  }

  async insertDocumentUploadRequest(employee: HrEmployeeRef, reason: string): Promise<void> {
    await query('INSERT INTO hr_document_upload_requests (employee_id, emp, reason) VALUES (?, ?, ?)', [employee.id, employee.name, reason]);
  }

  async findDocumentUploadRequestById(id: number): Promise<HrDocumentUploadRequest | null> {
    const row = await queryOne<Record<string, unknown>>('SELECT * FROM hr_document_upload_requests WHERE id = ?', [id]);
    return row ? this.mapDocRequest(row) : null;
  }

  async decideDocumentUploadRequest(
    id: number, status: 'approved' | 'rejected', decidedBy: string, remarks: string, grantedUntil: string | null
  ): Promise<void> {
    await query(
      `UPDATE hr_document_upload_requests
         SET status = ?, decided_by = ?, decided_at = NOW(), remarks = ?, granted_until = ?
       WHERE id = ? AND status = 'pending'`,
      [status, decidedBy, remarks || null, grantedUntil, id]
    );
  }

  async setDocumentsDeadline(employeeId: string, deadline: string): Promise<void> {
    await query('UPDATE hr_employees SET documents_deadline = ? WHERE id = ?', [deadline, employeeId]);
  }
}
