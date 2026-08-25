import { HrToolRepository } from '../repository/hr-tool.repository';
import {
  HrBootstrap, HrTeam, HrHoliday, HrEmployee, HrDocRef, HrOnboarding, HrAttendanceRecord, HrAttendanceOverride, HrPunch,
  HrRegularization, HrLeaveRequest, HrExpense, HrTicket, HrPayrollEntry, HrRules, HrAuditLogEntry, HrCompanyProfile,
} from '../domain/types';
import { todayStr, nowTimeStr, nowMinutesSinceMidnight, monthRange, payrollPeriodRange, eachDateInRange, isSunday, addDaysUTC, daysUntil } from '../utils/time';
import { latenessBucket } from '../utils/lateness';
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
 * Assigning IDs (hr_employee_credentials), which is what attendance is actually recorded
 * against. HrToolService stays decoupled from the hr-credentials module (see getBootstrap's
 * comment), so the caller (API route) builds this list and passes it in, rather than
 * HrToolService reaching into hr_employee_credentials itself. */
export interface PayrollRosterEntry { name: string; doj: string; }

export interface PunchResult {
  ok: boolean;
  error?: string;
  today?: { inTime: string | null; outTime: string | null; inMinutes: number | null; outMinutes: number | null };
  note?: string;
}

const DEFAULT_RULES: HrRules = {
  workingDaysPattern: 'Mon–Sat, alternate Saturdays off',
  shiftStartTime: '10:00',
  shiftEndTime: '19:00',
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
  leaveTypes: { Casual: true, Sick: true, Earned: true, Maternity: true, Paternity: true, 'Comp-off': true },
  twoLevelApproval: { leave: true, attendance: true, expense: true },
  lateMarkPenalty: false,
  geoFencing: false,
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
    leaveTypes: Record<string, boolean>;
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
    };
  }
  getRegularizationsForEmployee(emp: string) { return this.repository.findRegularizationsForEmployee(emp); }
  countRegularizationsForEmployeeInMonth(emp: string, fromDate: string, toDate: string) {
    return this.repository.countRegularizationsForEmployeeInMonth(emp, fromDate, toDate);
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
  async submitEmployeeRegularization(
    emp: string, date: string, reason: string, punchType: HrRegularization['punchType'], requestedTime: string
  ): Promise<{ ok: boolean; error?: string }> {
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) return { ok: false, error: 'A reason is required.' };
    const trimmedTime = (requestedTime || '').trim();
    if (!trimmedTime) return { ok: false, error: 'The time you are requesting is required.' };

    const existing = await this.repository.findRegularizationByEmpDateAndType(emp, date, punchType);
    if (existing) return { ok: false, error: `A ${punchType === 'in' ? 'punch-in' : 'punch-out'} regularization request already exists for this date.` };

    const rules = (await this.repository.findRules()) || DEFAULT_RULES;

    const [dayRecord] = await this.repository.findAttendanceForEmployeeInRange(emp, date, date);
    if (punchType === 'in') {
      const bucket = latenessBucket(dayRecord?.inMinutes ?? null, rules);
      if (bucket === null || bucket === 'on-time') {
        return { ok: false, error: 'Only a late punch-in (grace period or later) can be regularized.' };
      }
    } else {
      const hasOut = !!dayRecord?.outTime && dayRecord.outTime !== '—';
      if (hasOut) {
        return { ok: false, error: 'A punch-out is already recorded for this date.' };
      }
    }

    const diffDays = Math.round((new Date(todayStr()).getTime() - new Date(date).getTime()) / 86400000);
    if (!rules.regularizationOverride && diffDays > rules.regularizationWindowDays) {
      return { ok: false, error: `This date is outside the ${rules.regularizationWindowDays}-day regularization window.` };
    }

    const { from, to } = monthRange(date.slice(0, 7));
    const used = await this.repository.countRegularizationsForEmployeeInMonth(emp, from, to);
    if (used >= rules.regularizationMonthlyQuota) {
      return { ok: false, error: `Monthly regularization limit reached (${rules.regularizationMonthlyQuota} per month).` };
    }

    const stage = rules.twoLevelApproval.attendance ? 'rm' : 'hr';
    await this.repository.insertRegularization({
      id: 'R-' + Date.now() + '-' + punchType, emp, date, punchType, reason: trimmedReason, requestedTime: trimmedTime,
      stage, status: 'pending', rmRemarks: '', hrRemarks: '',
    });
    return { ok: true };
  }

  getLeaveRequestsForEmployee(emp: string) { return this.repository.findLeaveRequestsForEmployee(emp); }

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
    emp: string, type: string, from: string, to: string, reason: string
  ): Promise<{ ok: boolean; error?: string }> {
    const trimmedType = (type || '').trim();
    if (!trimmedType) return { ok: false, error: 'A leave type is required.' };
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) return { ok: false, error: 'A reason is required.' };
    if (!from || !to) return { ok: false, error: 'From and to dates are required.' };
    if (to < from) return { ok: false, error: 'The end date cannot be before the start date.' };

    const tomorrow = addDaysUTC(todayStr(), 1);
    if (from < tomorrow) return { ok: false, error: 'Leave can only be applied for future dates, starting tomorrow.' };

    const overlapping = await this.repository.findOverlappingLeaveRequestForEmployee(emp, from, to);
    if (overlapping) return { ok: false, error: 'You already have a leave request covering part of this date range.' };

    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const stage = rules.twoLevelApproval.leave ? 'rm' : 'hr';
    await this.repository.insertLeaveRequest({
      id: 'L-' + Date.now(), emp, type: trimmedType, from, to, remarks: trimmedReason,
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

    const existing = employee.documents || [];
    const uploadedAt = todayStr();
    const nextDoc: HrDocRef = { name: docName, status: 'pending', url, uploadedAt, remarks: null };
    const documents = existing.some((d) => d.name === docName)
      ? existing.map((d) => (d.name === docName ? nextDoc : d))
      : [...existing, nextDoc];

    await this.repository.updateEmployeeDocuments(employee.id, documents);
    return { ok: true };
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
  saveOnboarding(items: HrOnboarding[]) { return this.repository.replaceOnboarding(items); }
  recordAttendance(rec: HrAttendanceRecord) { return this.repository.upsertAttendance(rec); }
  recordAttendanceOverride(o: HrAttendanceOverride) { return this.repository.upsertAttendanceOverride(o); }
  recordPunch(p: HrPunch) { return this.repository.upsertPunch(p); }
  getPunchByEmp(emp: string) { return this.repository.findPunchByEmp(emp); }
  getAttendanceForEmployeeInRange(emp: string, fromDate: string, toDate: string) { return this.repository.findAttendanceForEmployeeInRange(emp, fromDate, toDate); }

  /**
   * Once-per-calendar-day punch in/out, shared by every punch-capable role (Publisher/Event
   * Admin, plain employees). The single place that enforces "can't punch twice today" so
   * every caller gets identical, real server-side enforcement instead of separate copies.
   */
  async punchEmployee(emp: string, type: 'in' | 'out'): Promise<PunchResult> {
    const today = todayStr();
    const existing = await this.getPunchByEmp(emp);
    const todaysPunch = existing?.date === today ? existing : null;

    let note: string | undefined;
    const time = nowTimeStr();

    if (type === 'in') {
      if (todaysPunch?.inTime) {
        return { ok: false, error: 'Already punched in today.' };
      }
      await this.recordPunch({
        emp, date: today, inTime: time, inMinutes: nowMinutesSinceMidnight(),
        outTime: todaysPunch?.outTime || null, outMinutes: todaysPunch?.outMinutes ?? null,
      });
    } else {
      if (todaysPunch?.outTime) {
        return { ok: false, error: 'Already punched out today.' };
      }
      if (!todaysPunch?.inTime) note = 'No punch-in recorded today.';
      await this.recordPunch({
        emp, date: today, inTime: todaysPunch?.inTime || null,
        inMinutes: todaysPunch?.inMinutes ?? null, outTime: time, outMinutes: nowMinutesSinceMidnight(),
      });
    }

    const updated = await this.getPunchByEmp(emp);
    await this.recordAttendance({
      emp, date: today, status: 'Present',
      inTime: updated?.inTime || '—', outTime: updated?.outTime || '—',
      inMinutes: updated?.inMinutes ?? null, outMinutes: updated?.outMinutes ?? null,
    });

    return {
      ok: true,
      today: { inTime: updated?.inTime || null, outTime: updated?.outTime || null, inMinutes: updated?.inMinutes ?? null, outMinutes: updated?.outMinutes ?? null },
      note,
    };
  }
  saveRegularizations(items: HrRegularization[]) { return this.repository.replaceRegularizations(items); }
  saveLeaveRequests(items: HrLeaveRequest[]) { return this.repository.replaceLeaveRequests(items); }
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
   * `roster` (see PayrollRosterEntry) is the real Employee-ID roster, not the hr_employees
   * table — attendance is recorded against Employee-ID names, so anyone with an Employee ID
   * but no CTC set yet still needs to show up here (with monthlyGross 0, prompting the admin
   * to set their salary) rather than being silently invisible, which was the original bug.
   * hr_employees is used only to enrich a matching name with its real ctc/doj/status when set.
   */
  async computePayrollForMonth(monthKey: string, roster: PayrollRosterEntry[], tdsByEmp?: Record<string, number>): Promise<PayrollPreview> {
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const { from, to } = payrollPeriodRange(monthKey, rules);
    const today = todayStr();
    const periodEnded = to <= today;
    const canRun = periodEnded;
    // Don't judge days that haven't happened yet when this runs early.
    const evalTo = to < today ? to : today;

    const [employees, holidays] = await Promise.all([
      this.repository.findEmployees(),
      this.repository.findHolidays(),
    ]);
    const holidaySet = new Set(holidays.map((h) => h.date));
    const employeeByName = new Map(employees.map((e) => [e.name, e]));

    const entries: HrPayrollEntry[] = [];
    const missingCtcEmployees: string[] = [];
    for (const r of roster) {
      const emp = employeeByName.get(r.name);
      if (emp?.status === 'exited') continue;
      const ctc = emp?.ctc ?? 0;
      const doj = emp?.doj || r.doj;

      // Clip the period to their join date — and if they joined entirely after this period
      // ended, they weren't employed yet, so they get no entry at all (not a full-gross one).
      const clippedFrom = doj && doj > from ? doj : from;
      if (clippedFrom > to) continue;

      if (ctc <= 0) missingCtcEmployees.push(r.name);

      const [attendance, leaves] = await Promise.all([
        this.repository.findAttendanceForEmployeeInRange(r.name, clippedFrom, to),
        this.repository.findLeaveRequestsForEmployeeInRange(r.name, clippedFrom, to),
      ]);
      const attendanceByDate = new Map(attendance.map((a) => [a.date, a]));

      const approvedLeaveDates = new Set<string>();
      for (const leave of leaves) {
        if (leave.status !== 'approved') continue;
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
      // The "Total Days" COLUMN is the full calendar cycle length (e.g. 31/30/28-29) regardless
      // of date of joining — a plain "how many days are in this month's cycle" figure. The pay
      // formula below still needs the DOJ-clipped day count (employedDays) so a mid-cycle joiner
      // isn't charged LOP for days before they were even employed — those two numbers are
      // deliberately different now, where they used to be the same (DOJ-clipped) value.
      const totalDaysInCycle = eachDateInRange(from, to).length;
      const employedDays = eachDateInRange(clippedFrom, to).length;
      for (const date of eachDateInRange(clippedFrom, to)) {
        if (isSunday(date) || holidaySet.has(date)) { weekOffDays++; continue; }
        if (date > evalTo) { futureDays++; continue; }
        const att = attendanceByDate.get(date);
        const hasFullPunch = !!att?.inTime && att.inTime !== '—' && !!att?.outTime && att.outTime !== '—';
        if (hasFullPunch) presentDays++;
        else if (approvedLeaveDates.has(date)) leaveDays++;
        // else: falls through, accounted for in the lopDays residual below.
      }
      const workingDays = employedDays - weekOffDays;

      // LOP Days = Employed Days − Present Days − Week Off − Leave Days (futureDays subtracted
      // too, purely so an open cycle's not-yet-happened days don't get counted as loss-of-pay;
      // it's always 0 once the cycle has ended, at which point this is exactly that formula).
      // Absent Days is the same whole-day count, shown as its own column for "did they come in"
      // status separately from the pay-impact number.
      const lopDays = employedDays - presentDays - weekOffDays - leaveDays - futureDays;
      const absentDays = lopDays;

      // actual days = employed days − LOP days; paying days = actual days ÷ employed days;
      // Gross = paying days × monthly salary (the attendance-adjusted take-home before TDS).
      const monthlySalary = Math.round(ctc / 12);
      const actualDays = employedDays - lopDays;
      const payingDays = employedDays > 0 ? actualDays / employedDays : 0;
      const monthlyGross = Math.round(payingDays * monthlySalary);
      // TDS is entered by the admin per employee per run (see runPayroll's tdsByEmp) — not a
      // formula. Defaults to 0 (or whatever was frozen last time this month was run).
      const tds = tdsByEmp?.[r.name] ?? 0;
      const netPay = Math.round(monthlyGross - tds);
      entries.push({
        emp: r.name, totalDays: totalDaysInCycle, weekOffDays, workingDays, presentDays, leaveDays, absentDays,
        shortLeaveDays: 0, shortLeaveCarryOut: 0, halfDayDays: 0, lopDays, monthlyGross, tds, netPay,
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
    await this.repository.upsertPayrollRun({ month: monthKey, status: 'run', runAt: new Date().toISOString(), runBy: actor || null });
    return { ok: true, entries: preview.entries };
  }

  /** The frozen entries if this month has already been run, otherwise a live preview —
   * same response shape either way so the frontend doesn't need two code paths. */
  async getPayrollForMonth(monthKey: string, roster: PayrollRosterEntry[]): Promise<PayrollPreview & { alreadyRun: boolean }> {
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
