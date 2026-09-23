import { HrToolRepository } from '../repository/hr-tool.repository';
import {
  HrBootstrap, HrTeam, HrHoliday, HrEmployee, HrDocRef, HrOnboarding, HrAttendanceRecord, HrAttendanceOverride, HrPunch, HrPunchGeo,
  HrRegularization, HrLeaveRequest, HrExpense, HrTicket, HrPayrollEntry, HrRules, HrAuditLogEntry, HrCompanyProfile,
  HrLeaveTypeConfig, HrEmployeeRef, WFH_LEAVE_TYPE,
} from '../domain/types';
import { todayStr, nowTimeStr, nowMinutesSinceMidnight, nowMysqlDatetime, payrollPeriodRange, eachDateInRange, isSunday, addDaysUTC, daysUntil } from '../utils/time';
import { latenessBucket, realDayHoursBucket, hhmmToMinutes, formatTime12h } from '../utils/lateness';
import { evaluateGeofence, GeofenceCode, PunchLocationInput } from '../utils/geofence';
import { computeLeaveBalances } from '../utils/leave-balance';
import { HrKycDocuments, getKycSlotDef, mergeKycDocuments, validateKycField, computeKycProgress } from '../domain/kyc';

export interface PayrollPreview {
  month: string;
  periodFrom: string;
  periodTo: string;
  periodEnded: boolean;
  canRun: boolean;
  entries: HrPayrollEntry[];
  /** Names of roster members (active Employee ID, employed during this period, not yet exited)
   * whose Directory record has no CTC set — Run Payroll refuses to proceed while this is
   * non-empty, since it would otherwise silently freeze a ₹0 payslip for them. */
  missingCtcEmployees: string[];
}

/** The real employee roster for payroll purposes — every active Employee ID issued via
 * Assigning IDs (hr_employee_credentials). Each one is matched to its Directory record by
 * `credentialId` (never by name — two people may share one). HrToolService stays decoupled from
 * the hr-credentials module (see getBootstrap's comment), so the caller (API route) builds this
 * list and passes it in, rather than HrToolService reaching into hr_employee_credentials itself. */
export interface PayrollRosterEntry { credentialId: number; name: string; doj: string; }

/** Shown when an Employee ID login has no Directory record to attach records to. */
export const NO_DIRECTORY_RECORD_ERROR =
  'No Directory record is linked to this Employee ID yet. Ask HR to open HR Management → Directory, which links it automatically.';

export type PunchErrorCode = 'ALREADY_PUNCHED' | GeofenceCode;

export interface PunchResult {
  ok: boolean;
  error?: string;
  /** Machine-readable reason on failure — GEOFENCE_* codes map to HTTP 403 in the routes, ALREADY_PUNCHED to 409. */
  code?: PunchErrorCode;
  today?: { inTime: string | null; outTime: string | null; inMinutes: number | null; outMinutes: number | null };
  note?: string;
  /** Present on success only when the geofence was actually enforced for this punch. */
  geo?: { distanceM: number; allowedM: number };
}

const DEFAULT_RULES: HrRules = {
  workingDaysPattern: 'Mon–Sat working, Sundays and public holidays off',
  shiftStartTime: '10:00',
  shiftEndTime: '18:35',
  shiftGraceMinutes: 15,
  halfDayThresholdHours: 5.5,
  regularizationWindowDays: 5,
  regularizationOverride: false,
  regularizationMonthlyQuota: 5,
  shortLeaveMaxHours: 1,
  shortLeaveMonthlyQuota: 2,
  halfDayMinWorkedHours: 4.5,
  shortLeaveMinWorkedHours: 7.5,
  fullDayMinWorkedHours: 8.25,
  salaryPeriodFrom: 26,
  salaryPeriodTo: '25',
  ctcSplit: { basicPct: 50, hraPctOfBasic: 50, convenienceType: 'amount', convenienceValue: 0 },
  leaveTypes: { Casual: { enabled: true, perMonth: 1 }, Sick: { enabled: false, perMonth: 0 }, Earned: { enabled: false, perMonth: 0 }, Maternity: { enabled: false, perMonth: 0 }, Paternity: { enabled: false, perMonth: 0 }, 'Comp-off': { enabled: false, perMonth: 0 } },
  twoLevelApproval: { leave: true, attendance: true, expense: true },
  lateMarkPenalty: false,
  geoFencing: false,
  // StartupNews.fyi office, Jhandewalan, New Delhi — same seed as add-hr-geofence.sql.
  geoFenceLat: 28.644533,
  geoFenceLng: 77.2003635,
  geoFenceRadiusM: 50,
  selfieCheckin: false,
  pfEsi: false,
  optionalHolidayChoice: true,
  assetChecklist: true,
};

// Same values that used to be hardcoded directly in Company.tsx — used only if the
// hr_company_profile row is somehow missing (e.g. migration not yet run), matching the
// DEFAULT_RULES fallback pattern above.
const DEFAULT_COMPANY_PROFILE: HrCompanyProfile = {
  companyName: 'DOTFYI Media Ventures Pvt. Ltd. (StartupNews.fyi)',
  cin: 'U22100DL2022PTC403240',
  registeredState: 'Delhi',
};

export class HrToolService {
  constructor(private repository: HrToolRepository) {}

  // employeeCredentials (hr_employee_credentials) lives in a separate module and is merged
  // in by the bootstrap route, not fetched here — keeps this service decoupled from hr-credentials.
  async getBootstrap(): Promise<Omit<HrBootstrap, 'employeeCredentials'>> {
    await this.repository.backfillMissingEmployeeIds();
    const [
      teams, designations, expenseCategories, requiredDocuments, holidays,
      employees, onboarding, attendance, attendanceOverrides, punchLog,
      regularizations, leaveRequests, expenses, tickets, compliance, payrollRuns, templates, rules, auditLog,
      companyProfile,
    ] = await Promise.all([
      this.repository.findTeams(),
      this.repository.findNameList('hr_designations'),
      this.repository.findNameList('hr_expense_categories'),
      this.repository.findNameList('hr_required_documents'),
      this.repository.findHolidays(),
      this.repository.findEmployees(),
      this.repository.findOnboarding(),
      this.repository.findAttendance(),
      this.repository.findAttendanceOverrides(),
      this.repository.findPunchLog(),
      this.repository.findRegularizations(),
      this.repository.findLeaveRequests(),
      this.repository.findExpenses(),
      this.repository.findTickets(),
      this.repository.findComplianceTasks(),
      this.repository.findPayrollRuns(),
      this.repository.findTemplates(),
      this.repository.findRules(),
      this.repository.findAuditLog(),
      this.repository.findCompanyProfile(),
    ]);

    return {
      teams,
      orgStructure: { designations, expenseCategories, requiredDocuments, holidays },
      employees,
      onboarding,
      attendance,
      attendanceOverrides,
      punchLog,
      regularizations,
      leaveRequests,
      expenses,
      tickets,
      compliance,
      payrollRuns,
      templates,
      rules: rules || DEFAULT_RULES,
      auditLog,
      companyProfile: companyProfile || DEFAULT_COMPANY_PROFILE,
    };
  }

  saveTeams(teams: HrTeam[]) { return this.repository.replaceTeams(teams); }
  saveDesignations(names: string[]) { return this.repository.replaceNameList('hr_designations', names); }
  getDesignations(): Promise<string[]> { return this.repository.findNameList('hr_designations'); }

  /** Just the non-sensitive policy numbers from hr_rules — safe to hand to roles that can't
   * reach the rest of hr_rules (Publisher/Event Admin, plain employees). Powers both the
   * shift/lateness display on the attendance widgets and the read-only employee-facing
   * "Rules & Policy" page. */
  async getPolicySummary(): Promise<{
    shiftStartTime: string; shiftEndTime: string; shiftGraceMinutes: number;
    regularizationWindowDays: number; regularizationMonthlyQuota: number;
    shortLeaveMaxHours: number; shortLeaveMonthlyQuota: number; halfDayThresholdHours: number;
    halfDayMinWorkedHours: number; shortLeaveMinWorkedHours: number; fullDayMinWorkedHours: number;
    leaveTypes: Record<string, HrLeaveTypeConfig>;
    /** Geofence on/off + radius only — the office coordinates themselves aren't needed by any
     * employee-facing surface (the browser sends its own position; the server does the math). */
    geoFencing: boolean; geoFenceRadiusM: number;
  }> {
    const rules = await this.repository.findRules();
    const source = rules || DEFAULT_RULES;
    return {
      shiftStartTime: source.shiftStartTime, shiftEndTime: source.shiftEndTime, shiftGraceMinutes: source.shiftGraceMinutes,
      regularizationWindowDays: source.regularizationWindowDays, regularizationMonthlyQuota: source.regularizationMonthlyQuota,
      shortLeaveMaxHours: source.shortLeaveMaxHours, shortLeaveMonthlyQuota: source.shortLeaveMonthlyQuota,
      halfDayThresholdHours: source.halfDayThresholdHours,
      halfDayMinWorkedHours: source.halfDayMinWorkedHours, shortLeaveMinWorkedHours: source.shortLeaveMinWorkedHours,
      fullDayMinWorkedHours: source.fullDayMinWorkedHours,
      leaveTypes: source.leaveTypes,
      geoFencing: source.geoFencing, geoFenceRadiusM: source.geoFenceRadiusM,
    };
  }
  /** Live-computed remaining balance per enabled leave type for one employee — see
   * computeLeaveBalances for the accrual rule. Nothing is stored/cached; this is recomputed
   * from doj + this year's approved leave requests on every call, so it's always correct
   * without needing a cron job to keep a counter in sync. */
  async getLeaveBalancesForEmployee(employeeId: string): Promise<Record<string, number>> {
    const [employee, rules, requests] = await Promise.all([
      this.repository.findEmployeeById(employeeId),
      this.repository.findRules(),
      this.repository.findLeaveRequestsForEmployee(employeeId),
    ]);
    const source = rules || DEFAULT_RULES;
    const holidays = await this.repository.findHolidays();
    return computeLeaveBalances(employee?.doj || '', source.leaveTypes, requests, todayStr(), holidays.map((h) => h.date));
  }
  getRegularizationsForEmployee(employeeId: string) { return this.repository.findRegularizationsForEmployee(employeeId); }
  countRegularizationsForEmployeeInRange(employeeId: string, fromDate: string, toDate: string) {
    return this.repository.countRegularizationsForEmployeeInRange(employeeId, fromDate, toDate);
  }

  /** Start and end of the payroll cycle containing `today` (26 → 25 by default). The quota and
   * the date limit both use this, so "N per cycle" means one thing in both places. */
  private payrollCycleRangeFor(from: number, today: Date): { from: string; to: string } {
    const start = this.payrollCycleStartFor(from, today);
    const end = new Date(start + 'T00:00:00');
    end.setMonth(end.getMonth() + 1);
    end.setDate(end.getDate() - 1);
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { from: start, to: iso(end) };
  }

  /** How much of their regularization allowance an employee has used in the CURRENT payroll
   * cycle, with the quota alongside it. Single source of truth: the enforcement below and the
   * figure shown on the employee's attendance page both come from here, so the number they see
   * can't disagree with the number that blocks them. */
  async getRegularizationUsage(employeeId: string): Promise<{ used: number; quota: number; from: string; to: string }> {
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const { from, to } = this.payrollCycleRangeFor(rules.salaryPeriodFrom, new Date());
    const used = await this.repository.countRegularizationsForEmployeeInRange(employeeId, from, to);
    return { used, quota: rules.regularizationMonthlyQuota, from, to };
  }

  /**
   * Employee-submitted regularization request, used by the isolated Publisher/Event Admin and
   * plain-employee attendance surfaces (the Founder's own submitRegularization in
   * views/Attendance.tsx is a separate, trusted, whole-array-replace path — this one is a
   * single scoped insert with full server-side validation, since the caller here isn't trusted
   * with the rest of the table). Punch-in and punch-out are regularized independently — a date
   * can carry up to two rows, one per punch type — each within the admin's configured
   * window/override and the shared monthly quota. A punch-in is only eligible once it's past
   * on-time (grace period or later — see latenessBucket); a punch-out is only eligible while
   * that day's punch-out is missing.
   */
  /** First day of the payroll cycle that today falls in (cycle runs `from`→`from-1` of the next
   * month, i.e. 26→25 by default). Used to bound how far back a regularization may reach. */
  private payrollCycleStartFor(from: number, today: Date): string {
    const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
    const start = d >= from ? new Date(y, m, from) : new Date(y, m - 1, from);
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  }

  async submitEmployeeRegularization(
    employee: HrEmployeeRef, date: string, reason: string, punchType: HrRegularization['punchType'], requestedTime: string
  ): Promise<{ ok: boolean; error?: string; created?: HrRegularization }> {
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) return { ok: false, error: 'A reason is required.' };
    const trimmedTime = (requestedTime || '').trim();
    if (!trimmedTime) return { ok: false, error: 'The time you are requesting is required.' };

    const existing = await this.repository.findRegularizationByEmployeeDateAndType(employee.id, date, punchType);
    if (existing) return { ok: false, error: `A ${punchType === 'in' ? 'punch-in' : 'punch-out'} regularization request already exists for this date.` };

    const rules = (await this.repository.findRules()) || DEFAULT_RULES;

    if (date > todayStr()) {
      return { ok: false, error: 'You can only regularize a date that has already arrived.' };
    }

    const [dayRecord] = await this.repository.findAttendanceForEmployeeInRange(employee.id, date, date);
    if (punchType === 'in') {
      // A missing punch-in (bucket === null) is precisely the case this exists for — someone
      // forgot to punch in and only punched out, so there is no arrival time to bucket. Only an
      // on-time punch-in has genuinely nothing to correct. The regularization window, the monthly
      // quota and RM/HR approval below all still apply, so this stays bounded.
      const bucket = latenessBucket(dayRecord?.inMinutes ?? null, rules);
      if (bucket === 'on-time') {
        return { ok: false, error: 'That punch-in was on time — there is nothing to regularize.' };
      }
    } else {
      const hasOut = !!dayRecord?.outTime && dayRecord.outTime !== '—';
      if (hasOut) {
        return { ok: false, error: 'A punch-out is already recorded for this date.' };
      }
    }

    // The window is the CURRENT PAYROLL CYCLE, not a rolling day count: anything from the cycle
    // start (the 26th) onward can still be corrected, and nothing before it can — payroll for
    // those days has already been run, so reopening them would change a figure that's been paid.
    const cycleStart = this.payrollCycleStartFor(rules.salaryPeriodFrom, new Date());
    if (date < cycleStart) {
      return { ok: false, error: `Only dates from the current payroll cycle (${cycleStart} onward) can be regularized — earlier cycles are already closed.` };
    }

    // Counted over the PAYROLL CYCLE, not the calendar month. A cycle straddles two calendar
    // months, so counting per month gave an employee a fresh allowance on the 1st while still
    // inside the same cycle — a quota of 5 actually permitted 10 per cycle.
    const { from, to } = this.payrollCycleRangeFor(rules.salaryPeriodFrom, new Date());
    const used = await this.repository.countRegularizationsForEmployeeInRange(employee.id, from, to);
    if (used >= rules.regularizationMonthlyQuota) {
      return { ok: false, error: `Regularization limit reached (${rules.regularizationMonthlyQuota} for the ${from} → ${to} payroll cycle).` };
    }

    // Approval is a single step now: HR Head when the module's toggle is on, Founder/admin when
    // it's off. The Reporting Manager stage is gone — it was the cause of requests stalling with
    // nobody able to act whenever an employee had no manager assigned.
    const stage = 'hr';
    // Returned so callers that keep their own copy of the list (the HR tool's client state) can
    // insert exactly the row that was written, instead of rebuilding an approximation of it.
    const created: HrRegularization = {
      id: 'R-' + Date.now() + '-' + punchType, employeeId: employee.id, emp: employee.name, date, punchType, reason: trimmedReason, requestedTime: trimmedTime,
      stage, status: 'pending', rmRemarks: '', hrRemarks: '',
    };
    await this.repository.insertRegularization(created);
    return { ok: true, created };
  }

  getLeaveRequestsForEmployee(employeeId: string) { return this.repository.findLeaveRequestsForEmployee(employeeId); }

  /** Whether `date` is covered by one of this employee's APPROVED Work From Home requests — such a
   * day is already a full shift in hr_attendance, so punchEmployee refuses to punch over it. */
  async isApprovedWfhDay(employeeId: string, date: string): Promise<boolean> {
    const reqs = await this.repository.findLeaveRequestsForEmployeeInRange(employeeId, date, date);
    return reqs.some((r) => r.type === WFH_LEAVE_TYPE && r.status === 'approved');
  }

  /**
   * Employee-submitted leave request, used by the isolated Publisher/Event Admin and
   * plain-employee leave surfaces (the Founder's own "+ Apply for leave" in views/Leave.tsx is
   * a separate, trusted, whole-array-replace path — this one is a single scoped insert with
   * full server-side validation, since the caller here isn't trusted with the rest of the
   * table). Only future dates are eligible — from tomorrow onward — since this is for planning
   * ahead, not for retroactively covering an already-happened absence (that's what
   * Regularization is for). Once approved, the date range is picked up by
   * computePayrollForMonth's approvedLeaveDates exactly like a Founder-created leave request —
   * no separate wiring needed, it's the same hr_leave_requests table.
   */
  async submitEmployeeLeaveRequest(
    employee: HrEmployeeRef, type: string, from: string, to: string, reason: string
  ): Promise<{ ok: boolean; error?: string }> {
    const trimmedType = (type || '').trim();
    if (!trimmedType) return { ok: false, error: 'A leave type is required.' };
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) return { ok: false, error: 'A reason is required.' };
    if (!from || !to) return { ok: false, error: 'From and to dates are required.' };
    if (to < from) return { ok: false, error: 'The end date cannot be before the start date.' };

    const tomorrow = addDaysUTC(todayStr(), 1);
    if (from < tomorrow) return { ok: false, error: 'Leave can only be applied for future dates, starting tomorrow.' };

    const overlapping = await this.repository.findOverlappingLeaveRequestForEmployee(employee.id, from, to);
    if (overlapping) return { ok: false, error: 'You already have a leave request covering part of this date range.' };

    // Single approval step for every module now (see Rules → Approval chain): HR Head when the
    // toggle is on, Founder/admin when it's off. Leaving this on 'rm' would strand leave requests
    // exactly the way attendance regularizations were stranded. No rules lookup needed for it.
    const stage = 'hr';
    await this.repository.insertLeaveRequest({
      id: 'L-' + Date.now(), employeeId: employee.id, emp: employee.name, type: trimmedType, from, to, remarks: trimmedReason,
      stage, status: 'pending', rmRemarks: '', hrRemarks: '',
    });
    return { ok: true };
  }

  /** Merges an employee's own hr_employees.documents against the admin-configured required-documents
   * list, for the isolated employee/Publisher/Event Admin document surfaces. progressPct counts a doc
   * toward completion once it's been submitted (pending or approved) — a rejected doc needs re-upload
   * before it counts again. */
  async getDocumentsForCredential(credentialId: number, name: string): Promise<{
    linked: boolean; employee?: { id: string; name: string }; requiredDocuments?: string[]; documents?: HrDocRef[]; progressPct?: number;
    documentsDeadline?: string | null; daysLeft?: number | null;
  }> {
    const [employee, requiredDocuments] = await Promise.all([
      this.repository.findEmployeeByCredential(credentialId, name),
      this.repository.findNameList('hr_required_documents'),
    ]);
    if (!employee) return { linked: false };

    const existing = employee.documents || [];
    const documents = requiredDocuments.map((docName) => existing.find((d) => d.name === docName) || { name: docName, status: 'not_uploaded' });
    const submittedCount = documents.filter((d) => d.status === 'pending' || d.status === 'approved').length;
    const progressPct = requiredDocuments.length ? Math.round((submittedCount / requiredDocuments.length) * 100) : 0;
    const daysLeft = employee.documentsDeadline ? daysUntil(employee.documentsDeadline) : null;

    return {
      linked: true, employee: { id: employee.id, name: employee.name }, requiredDocuments, documents, progressPct,
      documentsDeadline: employee.documentsDeadline || null, daysLeft,
    };
  }

  /** Records an uploaded file against one required-document checklist item. Rejects any doc name
   * not in the admin-configured list, so this stays a checklist rather than an open dumping ground. */
  async recordDocumentUpload(credentialId: number, name: string, docName: string, url: string): Promise<{ ok: boolean; error?: string }> {
    const [employee, requiredDocuments] = await Promise.all([
      this.repository.findEmployeeByCredential(credentialId, name),
      this.repository.findNameList('hr_required_documents'),
    ]);
    if (!employee) return { ok: false, error: 'No Directory record is linked to this login yet.' };
    if (!requiredDocuments.includes(docName)) return { ok: false, error: 'Not a recognised document type.' };
    // The upload window is now actually enforced — before this it was a label only, and an
    // employee could upload indefinitely past it. Reopening is via a permission request, which
    // on approval pushes documents_deadline forward (see decideDocumentUploadRequest).
    if (employee.documentsDeadline && todayStr() > employee.documentsDeadline) {
      return { ok: false, error: 'Your document upload window has closed. Request permission from HR to upload.' };
    }

    const existing = employee.documents || [];
    const uploadedAt = todayStr();
    const nextDoc: HrDocRef = { name: docName, status: 'pending', url, uploadedAt, remarks: null };
    const documents = existing.some((d) => d.name === docName)
      ? existing.map((d) => (d.name === docName ? nextDoc : d))
      : [...existing, nextDoc];

    await this.repository.updateEmployeeDocuments(employee.id, documents);
    return { ok: true };
  }

  /** How many days an approved permission request reopens the upload window for — the same
   * length as the original window, so a reopened window behaves exactly like the first one. */
  private static readonly DOCUMENT_REOPEN_DAYS = 5;

  /** Employee-facing view of their own window: whether uploading is currently allowed, and
   * whether they already have a request in flight (so the UI never offers to file a second). */
  async getDocumentWindowForCredential(credentialId: number, name: string): Promise<{
    linked: boolean; deadline?: string | null; closed?: boolean; pendingRequest?: boolean;
  }> {
    const employee = await this.repository.findEmployeeByCredential(credentialId, name);
    if (!employee) return { linked: false };
    const closed = !!employee.documentsDeadline && todayStr() > employee.documentsDeadline;
    const pending = closed ? await this.repository.findPendingDocumentUploadRequest(employee.id) : null;
    return { linked: true, deadline: employee.documentsDeadline || null, closed, pendingRequest: !!pending };
  }

  async requestDocumentUploadPermission(credentialId: number, name: string, reason: string): Promise<{ ok: boolean; error?: string }> {
    const trimmed = (reason || '').trim();
    if (!trimmed) return { ok: false, error: 'Please say why you need the window reopened.' };
    const employee = await this.repository.findEmployeeByCredential(credentialId, name);
    if (!employee) return { ok: false, error: 'No Directory record is linked to this login yet.' };
    if (!employee.documentsDeadline || todayStr() <= employee.documentsDeadline) {
      return { ok: false, error: 'Your upload window is still open — you can upload directly.' };
    }
    const existing = await this.repository.findPendingDocumentUploadRequest(employee.id);
    if (existing) return { ok: false, error: 'You already have a request awaiting HR review.' };
    await this.repository.insertDocumentUploadRequest({ id: employee.id, name: employee.name }, trimmed);
    return { ok: true };
  }

  listDocumentUploadRequests() { return this.repository.findDocumentUploadRequests(); }

  /** Approving pushes the employee's documents_deadline out by DOCUMENT_REOPEN_DAYS from today,
   * which is the whole mechanism — no extra per-employee flag to keep in sync with the window. */
  async decideDocumentUploadRequest(
    id: number, decision: 'approved' | 'rejected', decidedBy: string, remarks: string
  ): Promise<{ ok: boolean; error?: string; grantedUntil?: string | null }> {
    const req = await this.repository.findDocumentUploadRequestById(id);
    if (!req) return { ok: false, error: 'Request not found.' };
    if (req.status !== 'pending') return { ok: false, error: `This request was already ${req.status}.` };

    let grantedUntil: string | null = null;
    if (decision === 'approved') {
      const employees = await this.repository.findEmployees();
      // Linked by id. A request filed before employee_id existed resolves only through a name
      // nobody else shares.
      const sameName = employees.filter((e) => e.name === req.emp);
      const employee = req.employeeId
        ? employees.find((e) => e.id === req.employeeId)
        : (sameName.length === 1 ? sameName[0] : undefined);
      if (!employee) return { ok: false, error: 'That employee no longer has a Directory record.' };
      const d = new Date();
      d.setDate(d.getDate() + HrToolService.DOCUMENT_REOPEN_DAYS);
      grantedUntil = d.toISOString().slice(0, 10);
      await this.repository.setDocumentsDeadline(employee.id, grantedUntil);
    }
    await this.repository.decideDocumentUploadRequest(id, decision, decidedBy, remarks, grantedUntil);
    return { ok: true, grantedUntil };
  }

  /** The employee's own KYC & Personal Documents checklist (PAN, Aadhaar, bank, education,
   * experience — see domain/kyc.ts), merged against the fixed slot schema so a slot never
   * missing just because it was added to the checklist after this employee's row was created. */
  async getKycForCredential(credentialId: number, name: string): Promise<{
    linked: boolean; documents?: HrKycDocuments; progress?: { total: number; submitted: number; pct: number };
  }> {
    const employee = await this.repository.findEmployeeByCredential(credentialId, name);
    if (!employee) return { linked: false };
    const documents = mergeKycDocuments(employee.kycDocuments);
    return { linked: true, documents, progress: computeKycProgress(documents) };
  }

  /** Saves one KYC slot's file and/or text fields for the logged-in employee. Any provided field
   * value is validated against that slot's own pattern (e.g. PAN/Aadhaar format) regardless of
   * whether the slot is required — a malformed number is never accepted just because the slot is
   * optional. The slot only advances to 'pending' (ready for HR review) once it has a file AND
   * every one of its fields is present and valid; editing a previously-approved slot's data or
   * file bumps it back to 'pending' for re-review. */
  async saveKycSlot(
    credentialId: number, name: string, slotKey: string, input: { fields?: Record<string, string>; url?: string }
  ): Promise<{ ok: boolean; error?: string }> {
    const slotDef = getKycSlotDef(slotKey);
    if (!slotDef) return { ok: false, error: 'Not a recognised KYC document type.' };

    const employee = await this.repository.findEmployeeByCredential(credentialId, name);
    if (!employee) return { ok: false, error: 'No Directory record is linked to this login yet.' };

    const documents = mergeKycDocuments(employee.kycDocuments);
    const current = documents[slotKey];

    const nextFields = { ...current.fields };
    if (input.fields) {
      for (const fieldDef of slotDef.fields) {
        if (!(fieldDef.key in input.fields)) continue;
        const { value, error } = validateKycField(fieldDef, input.fields[fieldDef.key]);
        if (error) return { ok: false, error: `${fieldDef.label}: ${error}` };
        nextFields[fieldDef.key] = value;
      }
    }
    const nextUrl = input.url !== undefined ? input.url : current.url;
    const isComplete = !!nextUrl && slotDef.fields.every((f) => {
      const { value, error } = validateKycField(f, nextFields[f.key] || '');
      return !!value && !error;
    });

    documents[slotKey] = {
      status: isComplete ? 'pending' : 'not_uploaded',
      url: nextUrl,
      uploadedAt: nextUrl ? (current.uploadedAt && input.url === undefined ? current.uploadedAt : todayStr()) : null,
      remarks: isComplete ? null : current.remarks,
      fields: nextFields,
    };

    await this.repository.updateEmployeeKyc(employee.id, documents);
    return { ok: true };
  }

  saveExpenseCategories(names: string[]) { return this.repository.replaceNameList('hr_expense_categories', names); }
  saveRequiredDocuments(names: string[]) { return this.repository.replaceNameList('hr_required_documents', names); }
  saveHolidays(holidays: HrHoliday[]) { return this.repository.replaceHolidays(holidays); }
  /** The admin's Holiday calendar (Rules & Org Structure) — read access for callers outside the
   * native HR tool bootstrap, e.g. the Employee Panel's own attendance calendar. */
  getHolidays(): Promise<HrHoliday[]> { return this.repository.findHolidays(); }
  saveEmployees(employees: HrEmployee[]) { return this.repository.replaceEmployees(employees); }
  /** Removes an employee for good — record, Employee ID credential and all their attendance /
   * approval / payroll rows (see HrToolRepository.deleteEmployeeCascade). Returns false when
   * the employee was already gone. */
  async deleteEmployee(id: string): Promise<boolean> {
    return (await this.repository.deleteEmployeeCascade(id)) !== null;
  }
  saveOnboarding(items: HrOnboarding[]) { return this.repository.replaceOnboarding(items); }
  recordAttendance(rec: HrAttendanceRecord) { return this.repository.upsertAttendance(rec); }
  recordAttendanceOverride(o: HrAttendanceOverride) { return this.repository.upsertAttendanceOverride(o); }
  recordPunch(p: HrPunch) { return this.repository.upsertPunch(p); }
  getPunchByEmployee(employeeId: string) { return this.repository.findPunchByEmployeeId(employeeId); }
  getAttendanceForEmployeeInRange(employeeId: string, fromDate: string, toDate: string) { return this.repository.findAttendanceForEmployeeInRange(employeeId, fromDate, toDate); }

  /** Id + current name of one Directory record — for HR-tool routes that receive an employee id
   * and must write a record carrying both. Null when the id doesn't exist. */
  async findEmployeeRef(employeeId: string): Promise<HrEmployeeRef | null> {
    const employee = employeeId ? await this.repository.findEmployeeById(employeeId) : null;
    return employee ? { id: employee.id, name: employee.name } : null;
  }

  /** The Directory record behind an Employee ID login — what every self-service route (employee
   * portal, Publisher/Event Admin) must key records on, instead of the login's name. Null when the
   * login has no Directory record yet (see NO_DIRECTORY_RECORD_ERROR). */
  async resolveEmployeeForCredential(credentialId: number, name: string): Promise<HrEmployeeRef | null> {
    await this.repository.backfillMissingEmployeeIds();
    const employee = await this.repository.findEmployeeByCredential(credentialId, name);
    return employee ? { id: employee.id, name: employee.name } : null;
  }

  /**
   * Once-per-calendar-day punch in/out, shared by every punch-capable role (Publisher/Event
   * Admin, plain employees). The single place that enforces "can't punch twice today" so
   * every caller gets identical, real server-side enforcement instead of separate copies.
   */
  async punchEmployee(employee: HrEmployeeRef, type: 'in' | 'out', location?: PunchLocationInput | null): Promise<PunchResult> {
    const today = todayStr();
    const existing = await this.getPunchByEmployee(employee.id);
    const todaysPunch = existing?.date === today ? existing : null;

    // An approved Work From Home day is already recorded as a full shift (syncWfhAttendance) —
    // a real punch would overwrite it, so there's nothing to punch.
    if (await this.isApprovedWfhDay(employee.id, today)) {
      return { ok: false, error: 'Today is an approved Work From Home day — it is already marked as a full day.', code: 'ALREADY_PUNCHED' };
    }

    // Duplicate-punch check comes BEFORE the geofence so someone who already punched in today
    // gets "Already punched in" rather than a confusing location error.
    if (type === 'in' && todaysPunch?.inTime) {
      return { ok: false, error: 'Already punched in today.', code: 'ALREADY_PUNCHED' };
    }
    if (type === 'out' && todaysPunch?.outTime) {
      return { ok: false, error: 'Already punched out today.', code: 'ALREADY_PUNCHED' };
    }

    // Geofence (server-enforced; the client only supplies coordinates). When the rule is off the
    // supplied location is ignored entirely and nothing is stored — no GPS collection without a
    // policy that needs it.
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    let geo: HrPunchGeo | null = null;
    let geoResult: PunchResult['geo'];
    if (rules.geoFencing) {
      const reading = location ? { lat: location.lat, lng: location.lng, accuracyM: location.accuracy } : null;
      const verdict = evaluateGeofence(reading, { lat: rules.geoFenceLat, lng: rules.geoFenceLng, radiusM: rules.geoFenceRadiusM }, type);
      if (!verdict.ok) return { ok: false, error: verdict.message, code: verdict.code };
      geo = { lat: location!.lat, lng: location!.lng, accuracyM: location!.accuracy, distanceM: Math.round(verdict.distanceM * 10) / 10 };
      geoResult = { distanceM: verdict.distanceM, allowedM: verdict.allowedM };
    }

    let note: string | undefined;
    const time = nowTimeStr();

    if (type === 'in') {
      await this.recordPunch({
        employeeId: employee.id, emp: employee.name, date: today, inTime: time, inMinutes: nowMinutesSinceMidnight(),
        outTime: todaysPunch?.outTime || null, outMinutes: todaysPunch?.outMinutes ?? null,
        inGeo: geo, outGeo: todaysPunch?.outGeo ?? null,
      });
    } else {
      // Punch-out is always clickable, any time of day — no cutoff at shift end. Credited hours
      // still clamp to the shift window regardless of when it's actually clicked (see
      // creditedMinutes), so punching out at 22:00 is recorded as 22:00 but only ever pays out
      // up to shift end — the clock time isn't blocked, only what it's worth.
      if (!todaysPunch?.inTime) note = 'No punch-in recorded today.';
      await this.recordPunch({
        employeeId: employee.id, emp: employee.name, date: today, inTime: todaysPunch?.inTime || null,
        inMinutes: todaysPunch?.inMinutes ?? null, outTime: time, outMinutes: nowMinutesSinceMidnight(),
        inGeo: todaysPunch?.inGeo ?? null, outGeo: geo,
      });
    }

    const updated = await this.getPunchByEmployee(employee.id);
    await this.recordAttendance({
      employeeId: employee.id, emp: employee.name, date: today, status: 'Present',
      inTime: updated?.inTime || '—', outTime: updated?.outTime || '—',
      inMinutes: updated?.inMinutes ?? null, outMinutes: updated?.outMinutes ?? null,
      inGeo: updated?.inGeo ?? null, outGeo: updated?.outGeo ?? null,
    });

    return {
      ok: true,
      today: { inTime: updated?.inTime || null, outTime: updated?.outTime || null, inMinutes: updated?.inMinutes ?? null, outMinutes: updated?.outMinutes ?? null },
      note,
      geo: geoResult,
    };
  }
  saveRegularizations(items: HrRegularization[]) { return this.repository.replaceRegularizations(items); }

  /**
   * Finalizes one regularization request's approve/reject decision server-side — replacing the
   * old client-only path (compute the decision in the browser, PUT the whole regularizations
   * array). That path only ever flipped stage/status on the hr_regularizations row; NOTHING
   * updated the actual hr_attendance row the calendar and payroll read, so an approved
   * regularization had zero real effect — the employee stayed however their raw punch (or lack
   * of one) left them. Once a decision fully finalizes to 'approved' here, the regularized
   * in/out time is written into hr_attendance, preserving whichever punch ISN'T being
   * regularized (and never inventing it if it's still missing).
   */
  async decideRegularization(
    id: string, level: 'rm' | 'hr', decision: 'approved' | 'rejected', remarks: string
  ): Promise<{ ok: boolean; error?: string; updated?: HrRegularization }> {
    const all = await this.repository.findRegularizations();
    const reg = all.find((r) => r.id === id);
    if (!reg) return { ok: false, error: 'Regularization request not found.' };
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;

    let updated: HrRegularization;
    if (level === 'rm') {
      if (decision === 'rejected') {
        updated = { ...reg, rmRemarks: remarks, status: 'rejected', stage: 'done' };
      } else {
        const stage = rules.twoLevelApproval.attendance ? 'hr' : 'done';
        updated = { ...reg, rmRemarks: remarks, stage, status: stage === 'done' ? 'approved' : reg.status };
      }
    } else {
      updated = { ...reg, hrRemarks: remarks, status: decision, stage: 'done' };
    }
    await this.repository.updateRegularization(updated);

    if (updated.status === 'approved' && updated.stage === 'done' && updated.requestedTime) {
      const [dayRecord] = await this.repository.findAttendanceForEmployeeInRange(updated.employeeId, updated.date, updated.date);
      const minutes = hhmmToMinutes(updated.requestedTime);
      const timeLabel = formatTime12h(minutes);
      await this.repository.upsertAttendance({
        employeeId: updated.employeeId, emp: updated.emp, date: updated.date, status: 'Present',
        inTime: updated.punchType === 'in' ? timeLabel : (dayRecord?.inTime || '—'),
        inMinutes: updated.punchType === 'in' ? minutes : (dayRecord?.inMinutes ?? null),
        outTime: updated.punchType === 'out' ? timeLabel : (dayRecord?.outTime || '—'),
        outMinutes: updated.punchType === 'out' ? minutes : (dayRecord?.outMinutes ?? null),
        // upsertAttendance overwrites every column — carry the day's GPS audit through so an
        // approval doesn't silently NULL it. A regularized punch itself has no fix to record.
        inGeo: dayRecord?.inGeo ?? null, outGeo: dayRecord?.outGeo ?? null,
      });
    }

    return { ok: true, updated };
  }
  async saveLeaveRequests(items: HrLeaveRequest[]) {
    await this.repository.replaceLeaveRequests(items);
    await this.syncWfhAttendance(items);
  }

  /**
   * Work From Home: every working day (not Sunday / holiday) of an APPROVED WFH request is written
   * to hr_attendance as a full shift — punch-in at shift start, punch-out at shift end, status
   * 'WFH' — so the calendar, Today table and payroll all read it as a Full day with no special
   * casing. WFH rows no longer backed by an approved request (rejected or deleted after approval)
   * are removed. Idempotent: runs on every save of the leave list, which is how HR approves.
   */
  async syncWfhAttendance(items: HrLeaveRequest[]): Promise<void> {
    const [rulesRow, holidays, existing] = await Promise.all([
      this.repository.findRules(), this.repository.findHolidays(), this.repository.findWfhAttendanceDays(),
    ]);
    const rules = rulesRow || DEFAULT_RULES;
    const holidaySet = new Set(holidays.map((h) => h.date));
    const inM = hhmmToMinutes(rules.shiftStartTime);
    const outM = hhmmToMinutes(rules.shiftEndTime);
    const keep = new Set<string>();
    for (const r of items) {
      if (r.type !== WFH_LEAVE_TYPE || r.status !== 'approved' || !r.employeeId) continue;
      for (const date of eachDateInRange(r.from, r.to)) {
        if (isSunday(date) || holidaySet.has(date)) continue;
        keep.add(`${r.employeeId}|${date}`);
        await this.repository.upsertAttendance({
          employeeId: r.employeeId, emp: r.emp, date, status: 'WFH',
          inTime: formatTime12h(inM), inMinutes: inM, outTime: formatTime12h(outM), outMinutes: outM,
          inGeo: null, outGeo: null,
        });
      }
    }
    for (const d of existing) {
      if (!keep.has(`${d.employeeId}|${d.date}`)) await this.repository.deleteAttendanceDay(d.employeeId, d.date);
    }
  }
  saveExpenses(items: HrExpense[]) { return this.repository.replaceExpenses(items); }
  saveTickets(items: HrTicket[]) { return this.repository.replaceTickets(items); }
  saveTemplate(name: string, content: string) { return this.repository.upsertTemplate(name, content); }
  saveRules(rules: HrRules) { return this.repository.saveRules(rules); }
  saveCompanyProfile(profile: HrCompanyProfile, actor?: string) { return this.repository.saveCompanyProfile(profile, actor); }
  appendAuditLog(entry: HrAuditLogEntry) { return this.repository.appendAuditLog(entry); }

  /**
   * Computes (but does not persist) Net Pay for every real employee for a payroll month —
   * either a live preview of the current/an unrun month, or (via getPayrollForMonth) the same
   * shape rebuilt from the frozen hr_payroll_entries once a month has actually been run.
   *
   * Total Days − Present Days − Week Off − Leave Days = LOP Days (Absent Days is the same
   * number, shown as its own "did they come in" column). Present Days requires a full punch —
   * in AND out — that day; arrival time / hours worked no longer factor into pay (they still
   * drive the Attendance page's own Grace/Short Leave/Half Day display and regularization
   * eligibility, just not payroll). Week Off is Sundays + the admin's Holiday calendar. Leave
   * Days is approved leave.
   *
   * actual days = Total Days − LOP Days; paying days = actual days ÷ Total Days;
   * Gross = paying days × monthly salary (ctc ÷ 12) — the attendance-adjusted take-home before
   * TDS. TDS is entered by the admin per employee per run (see tdsByEmp), not a formula — Net
   * Pay = Gross − TDS. No PF/ESI deductions in V1.
   *
   * "Run Payroll" only unlocks once the period has fully ended (canRun = periodEnded) — no
   * early window, and no expiry once it has ended, so the admin can come back and recompute as
   * many times as they like. The Payroll page is responsible for pointing this at the right
   * cycle in the first place (see payrollCycleToRunKey — one cycle behind "today's" cycle, so
   * it flips to a freshly-ended cycle the instant the next one starts and stays there for that
   * cycle's full length). Because a runnable period has, by definition, already ended, every
   * one of its days has already happened — this function's own "don't judge days that haven't
   * happened yet" handling (evalTo/futureDays below) only matters for the rare direct call with
   * a still-in-progress month (e.g. an ad-hoc mid-cycle check), not for the normal Run Payroll path.
   *
   * `roster` (see PayrollRosterEntry) is the real Employee-ID roster. Each login is matched to its
   * Directory record by credential id, and from there EVERYTHING — CTC, joining date, attendance,
   * approved leave, short-leave carry-over and TDS — is looked up by that record's employee id,
   * never by name, so two employees with the same name are paid independently. A login with no
   * Directory record, or a record with no CTC, is listed in missingCtcEmployees (which blocks Run
   * Payroll) rather than being silently invisible.
   */
  async computePayrollForMonth(monthKey: string, roster: PayrollRosterEntry[], tdsByEmp?: Record<string, number>): Promise<PayrollPreview> {
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const { from, to } = payrollPeriodRange(monthKey, rules);
    const today = todayStr();
    const periodEnded = to <= today;
    const canRun = periodEnded;
    // Don't judge days that haven't happened yet when this runs early.
    const evalTo = to < today ? to : today;

    await this.repository.backfillMissingEmployeeIds();
    const [employees, holidays] = await Promise.all([
      this.repository.findEmployees(),
      this.repository.findHolidays(),
    ]);
    const holidaySet = new Set(holidays.map((h) => h.date));

    // Short-leave leftovers carried in from the cycle before. Only a COMPLETED run stores
    // entries, so a skipped cycle simply contributes 0 rather than reaching further back —
    // predictable, and an employee can always see which cycle a carried leftover came from.
    const [py, pm] = monthKey.split('-').map(Number);
    const prevKey = pm === 1 ? `${py - 1}-12` : `${py}-${String(pm - 1).padStart(2, '0')}`;
    const prevEntries = await this.repository.findPayrollEntriesForMonth(prevKey);
    const carryInByEmp = new Map(prevEntries.map((e) => [e.employeeId, Number(e.shortLeaveCarryOut) || 0]));
    const employeeByCredential = new Map(
      employees.filter((e) => e.credentialId != null).map((e) => [Number(e.credentialId), e])
    );
    const employeesByName = new Map<string, HrEmployee[]>();
    for (const e of employees) employeesByName.set(e.name, [...(employeesByName.get(e.name) || []), e]);
    // Linked record first. An older record with no credential link is used only when its name
    // belongs to nobody else — a shared name is never guessed at.
    const employeeForRoster = (r: PayrollRosterEntry): HrEmployee | undefined => {
      const linked = employeeByCredential.get(r.credentialId);
      if (linked) return linked;
      const sameName = employeesByName.get(r.name) || [];
      return sameName.length === 1 && sameName[0].credentialId == null ? sameName[0] : undefined;
    };

    const entries: HrPayrollEntry[] = [];
    const missingCtcEmployees: string[] = [];
    const paidEmployeeIds = new Set<string>();
    for (const r of roster) {
      const emp = employeeForRoster(r);
      if (!emp) {
        // A login with no Directory record has nothing to pay against; flag it (blocks Run Payroll)
        // unless it only starts after this cycle.
        if (!(r.doj && r.doj > to)) missingCtcEmployees.push(r.name);
        continue;
      }
      if (paidEmployeeIds.has(emp.id)) continue;
      paidEmployeeIds.add(emp.id);
      // Exited employees were skipped outright, so anyone who worked part of a cycle and then
      // left got NO payslip at all — the mirror of the mid-cycle joiner bug. They are now
      // skipped only if they have no attendance in this cycle, i.e. someone who left long ago
      // still doesn't clutter every future run, but a mid-cycle leaver is paid for the days
      // they actually worked (days after they left have no punches and fall into LOP).
      const isExited = emp?.status === 'exited';
      const ctc = emp?.ctc ?? 0;
      const doj = emp?.doj || r.doj;

      // Clip the period to their join date — and if they joined entirely after this period
      // ended, they weren't employed yet, so they get no entry at all (not a full-gross one).
      const clippedFrom = doj && doj > from ? doj : from;
      if (clippedFrom > to) continue;

      if (ctc <= 0) missingCtcEmployees.push(emp.name);

      const [attendance, leaves] = await Promise.all([
        this.repository.findAttendanceForEmployeeInRange(emp.id, clippedFrom, to),
        this.repository.findLeaveRequestsForEmployeeInRange(emp.id, clippedFrom, to),
      ]);
      if (isExited && attendance.length === 0) continue;
      const attendanceByDate = new Map(attendance.map((a) => [a.date, a]));

      const approvedLeaveDates = new Set<string>();
      for (const leave of leaves) {
        // A Work From Home day is not leave: syncWfhAttendance has already written it as a full
        // shift, so it's paid as a worked day and must not also use up the Casual allowance.
        if (leave.status !== 'approved' || leave.type === WFH_LEAVE_TYPE) continue;
        const leaveFrom = leave.from > clippedFrom ? leave.from : clippedFrom;
        const leaveTo = leave.to < to ? leave.to : to;
        if (leaveFrom > leaveTo) continue;
        for (const d of eachDateInRange(leaveFrom, leaveTo)) approvedLeaveDates.add(d);
      }

      // Present Days = a full punch (in AND out) that day — arrival time / hours worked no
      // longer factor into pay (they still drive the Attendance page's own Grace/Short
      // Leave/Half Day display and regularization eligibility, just not payroll anymore).
      // Week Off = Sundays + the admin's Holiday calendar. Leave Days = approved-leave days.
      // futureDays = working days that haven't happened yet this cycle (see evalTo below) —
      // never judged, so a live preview of an open cycle doesn't inflate LOP for days that
      // simply haven't occurred; always 0 once the cycle has fully ended.
      let weekOffDays = 0, presentDays = 0, leaveDays = 0, futureDays = 0;
      // Day-level outcomes now drive pay, not just "did both punches exist". workedValue is the
      // paid worth of the days actually worked: a full or short-leave day is worth 1, a half day
      // 0.5, an absent day 0.
      let shortLeaveDays = 0, halfDayDays = 0, workedValue = 0;
      // Days of the cycle before the employee joined (or after a leaver's last punch). They are
      // counted as absent so the payslip reconciles — previously the loop simply never visited
      // them, so a 15th-of-month joiner showed "Total Days 31" above columns summing to 11 with
      // nothing explaining the other 20.
      let notEmployedDays = 0;
      // The "Total Days" COLUMN is the full calendar cycle length (e.g. 31/30/28-29) regardless
      // of date of joining — a plain "how many days are in this month's cycle" figure. The pay
      // formula below still needs the DOJ-clipped day count (employedDays) so a mid-cycle joiner
      // isn't charged LOP for days before they were even employed — those two numbers are
      // deliberately different now, where they used to be the same (DOJ-clipped) value.
      const totalDaysInCycle = eachDateInRange(from, to).length;
      const employedDays = eachDateInRange(clippedFrom, to).length;
      // Walk the WHOLE cycle, not just the employed part, so every day of the period lands in
      // exactly one bucket. Note the order: pre-employment is tested before the week-off test, so
      // Sundays before someone joined are NOT credited as paid week-offs.
      for (const date of eachDateInRange(from, to)) {
        if (date < clippedFrom) { notEmployedDays++; continue; }
        if (isSunday(date) || holidaySet.has(date)) { weekOffDays++; continue; }
        if (date > evalTo) { futureDays++; continue; }
        const att = attendanceByDate.get(date);
        // A punch-in with no punch-out is a straight Absent — no auto-close, no benefit of the
        // doubt. Same shared function the attendance calendar and Today table use
        // (realDayHoursBucket), so a day reads the same way everywhere.
        const bucket = realDayHoursBucket(att?.inMinutes ?? null, att?.outMinutes ?? null, rules);
        if (bucket === null) {
          // Never punched in — approved leave covers the day, otherwise it is loss of pay.
          if (approvedLeaveDates.has(date)) leaveDays++;
          continue;
        }
        if (bucket === 'absent') continue; // came in but worked too little to count at all
        if (bucket === 'half-day') { halfDayDays++; workedValue += 0.5; }
        else if (bucket === 'short-leave') { shortLeaveDays++; workedValue += 1; }
        else workedValue += 1;
      }
      // Working days across the whole cycle, so present + absent reconciles against it.
      const workingDays = totalDaysInCycle - weekOffDays;

      // LOP Days = Employed Days − Present Days − Week Off − Leave Days (futureDays subtracted
      // too, purely so an open cycle's not-yet-happened days don't get counted as loss-of-pay;
      // it's always 0 once the cycle has ended, at which point this is exactly that formula).
      // Absent Days is the same whole-day count, shown as its own column for "did they come in"
      // status separately from the pay-impact number.
      // Paid leave is capped at the configured allowance (sum of perMonth across enabled leave
      // types — Casual 1/month by default). Approved leave beyond that is still granted time off,
      // but it is unpaid: it falls through into LOP below. Previously every approved day was paid
      // regardless of balance, so the allowance under Rules → Leave types had no effect on pay.
      const leaveAllowance = Object.values(rules.leaveTypes)
        .filter((c) => c.enabled)
        .reduce((n, c) => n + (Number(c.perMonth) || 0), 0);
      const paidLeaveDays = Math.min(leaveDays, leaveAllowance);

      // Every 3rd Short Leave costs half a day's pay, counting last cycle's leftover alongside
      // this cycle's. A leftover only survives when a conversion actually happened: fewer than
      // three in total is simply forgiven and resets to zero, so 2 one cycle and 2 the next cost
      // nothing, while 4 costs half a day and carries 1 forward. 6 → a full day (two halves),
      // 7 → a full day plus 1 carried.
      const carryInShortLeave = carryInByEmp.get(emp.id) || 0;
      const totalShortLeave = carryInShortLeave + shortLeaveDays;
      const shortLeaveHalfDays = totalShortLeave >= 3 ? Math.floor(totalShortLeave / 3) : 0;
      const shortLeaveCarryOut = totalShortLeave >= 3 ? totalShortLeave % 3 : 0;
      const paidWorkedValue = workedValue - shortLeaveHalfDays * 0.5;
      // Present Days is reported as the PAID WORTH of the days worked, not a headcount of days
      // attended. A half day contributed 1 to the old headcount but only 0.5 to pay, so the
      // payslip failed to add up — a real run showed present 2 + weekOff 3 + absent 26.5 = 31.5
      // against totalDays 31. Reporting the paid worth makes the row reconcile exactly, and
      // halfDayDays / shortLeaveDays still show how many days were docked and why.
      presentDays = Math.round(paidWorkedValue * 100) / 100;

      // Paid days = the worth of days actually worked + week-offs + paid leave (+ not-yet-arrived
      // days, so an open cycle's preview isn't inflated with LOP). Everything else is LOP, and it
      // can now be fractional — a half day is half a day of loss, not a whole one.
      // Only days actually worked, week-offs during employment, and paid leave are paid for.
      // Everything else in the cycle — real absence AND the not-employed days above — is LOP.
      const paidDays = paidWorkedValue + weekOffDays + paidLeaveDays + futureDays;
      const lopDays = Math.round((totalDaysInCycle - paidDays) * 100) / 100;
      const absentDays = lopDays;

      // actual days = employed days − LOP days; paying days = actual days ÷ employed days;
      // Gross = paying days × monthly salary (the attendance-adjusted take-home before TDS).
      // NOT pre-rounded. Rounding the monthly figure and then rounding again after applying the
      // attendance ratio rounded twice against the same number, so the error compounded instead
      // of cancelling — on a ₹35,000 CTC a full month came out ₹1 above a straight ctc/12, and
      // part-months drifted further. Only the final gross is rounded now.
      const monthlySalary = ctc / 12;
      const actualDays = paidDays;
      void employedDays; void notEmployedDays; // retained for clarity of the buckets above
      // Divided by the FULL cycle length, not by the days they happened to be employed. Dividing
      // by employedDays paid a mid-cycle joiner a WHOLE month: someone joining on the 20th of a
      // 26→25 cycle has employedDays = 6, and if present for all six the ratio was 6/6 = 1.0, so
      // monthlyGross came out at 100% of salary for six days of work. Against the full cycle the
      // same person earns 6/31 of a month — i.e. the days before they joined are unpaid, exactly
      // as if absent. Nothing changes for anyone employed the whole cycle, where the two
      // denominators are equal by definition.
      const payingDays = totalDaysInCycle > 0 ? actualDays / totalDaysInCycle : 0;
      const monthlyGross = Math.round(payingDays * monthlySalary);
      // TDS is entered by the admin per employee per run (see runPayroll's tdsByEmp) — not a
      // formula. Defaults to 0 (or whatever was frozen last time this month was run).
      const tds = tdsByEmp?.[emp.id] ?? 0;
      // Floored at zero: TDS is typed in by hand, and a mistyped figure larger than the gross
      // would otherwise produce a negative payslip.
      const netPay = Math.max(0, Math.round(monthlyGross - tds));
      entries.push({
        // leaveDays reports PAID leave, so the columns still reconcile:
        // employed = present + weekOff + paidLeave + LOP. Unpaid leave is inside lopDays.
        employeeId: emp.id, emp: emp.name, totalDays: totalDaysInCycle, weekOffDays, workingDays, presentDays, leaveDays: paidLeaveDays, absentDays,
        shortLeaveDays, shortLeaveCarryOut, halfDayDays, lopDays, monthlyGross, tds, netPay,
      });
    }

    return { month: monthKey, periodFrom: from, periodTo: to, periodEnded, canRun, entries, missingCtcEmployees };
  }

  /** Freezes a month's payroll: computes it (refusing if the cycle hasn't fully ended yet, or if
   * anyone on the roster has no CTC set, which would otherwise silently freeze a ₹0 payslip for
   * them) and persists one hr_payroll_entries row per employee. Calling it again for an
   * already-run month recomputes and overwrites via upsert — that's the whole "recompute"
   * mechanism, no separate action, and there's no limit on how many times an admin can do this
   * once the cycle has ended. `tdsByEmp` carries whatever the admin typed into the TDS column
   * for this run (missing employees default to 0). */
  async runPayroll(
    monthKey: string, roster: PayrollRosterEntry[], actor?: string, tdsByEmp?: Record<string, number>
  ): Promise<{ ok: boolean; error?: string; entries?: HrPayrollEntry[] }> {
    const preview = await this.computePayrollForMonth(monthKey, roster, tdsByEmp);
    if (!preview.canRun) {
      return { ok: false, error: `Run Payroll unlocks once this cycle ends on ${preview.periodTo}.` };
    }
    if (preview.missingCtcEmployees.length > 0) {
      return { ok: false, error: `CTC is not set for: ${preview.missingCtcEmployees.join(', ')}. Set their Annual CTC in Directory before running payroll.` };
    }
    await Promise.all(preview.entries.map((e) => this.repository.upsertPayrollEntry(monthKey, e)));
    await this.repository.upsertPayrollRun({ month: monthKey, status: 'run', runAt: nowMysqlDatetime(), runBy: actor || null });
    return { ok: true, entries: preview.entries };
  }

  /** The frozen entries if this month has already been run, otherwise a live preview —
   * same response shape either way so the frontend doesn't need two code paths. */
  async getPayrollForMonth(monthKey: string, roster: PayrollRosterEntry[]): Promise<PayrollPreview & { alreadyRun: boolean }> {
    await this.repository.backfillMissingEmployeeIds();
    const runs = await this.repository.findPayrollRuns();
    const run = runs.find((r) => r.month === monthKey);
    if (run?.status === 'run') {
      const [entries, rules] = await Promise.all([
        this.repository.findPayrollEntriesForMonth(monthKey),
        this.repository.findRules(),
      ]);
      const { from, to } = payrollPeriodRange(monthKey, rules || DEFAULT_RULES);
      return { month: monthKey, periodFrom: from, periodTo: to, periodEnded: true, canRun: true, entries, missingCtcEmployees: [], alreadyRun: true };
    }
    const preview = await this.computePayrollForMonth(monthKey, roster);
    return { ...preview, alreadyRun: false };
  }

  async resetSampleData(keepEmployeeId: string | null): Promise<void> {
    await this.repository.resetSampleData(keepEmployeeId);
  }
}
