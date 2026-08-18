import { HrToolRepository } from '../repository/hr-tool.repository';
import {
  HrBootstrap, HrTeam, HrHoliday, HrEmployee, HrOnboarding, HrAttendanceRecord, HrAttendanceOverride, HrPunch,
  HrRegularization, HrLeaveRequest, HrExpense, HrTicket, HrPayrollEntry, HrRules, HrAuditLogEntry,
} from '../domain/types';
import { todayStr, nowTimeStr, nowMinutesSinceMidnight, monthRange, payrollPeriodRange, eachDateInRange, isSunday, addDaysUTC } from '../utils/time';
import { latenessBucket } from '../utils/lateness';

/** How many days before a payroll period's end date "Run Payroll" unlocks — lets the admin
 * process payroll ahead of payday instead of only after the cycle is fully over. */
const RUN_PAYROLL_UNLOCK_DAYS_BEFORE_END = 5;

export interface PayrollPreview {
  month: string;
  periodFrom: string;
  periodTo: string;
  periodEnded: boolean;
  /** The earliest date "Run Payroll" is allowed to run for this cycle. */
  runUnlocksAt: string;
  canRun: boolean;
  entries: HrPayrollEntry[];
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
  today?: { inTime: string | null; outTime: string | null; inMinutes: number | null };
  note?: string;
}

const DEFAULT_RULES: HrRules = {
  workingDaysPattern: 'Mon–Sat, alternate Saturdays off',
  shiftStartTime: '10:00',
  shiftEndTime: '19:00',
  shiftGraceMinutes: 15,
  halfDayThresholdHours: 4,
  regularizationWindowDays: 5,
  regularizationOverride: false,
  regularizationMonthlyQuota: 5,
  shortLeaveMaxHours: 2,
  shortLeaveMonthlyQuota: 2,
  salaryPeriodFrom: 26,
  salaryPeriodTo: '25',
  ctcSplit: { basic: 50, hra: 20, allowances: 30 },
  leaveTypes: { Casual: true, Sick: true, Earned: true, Maternity: true, Paternity: true, 'Comp-off': true },
  twoLevelApproval: { leave: true, attendance: true, expense: true },
  lateMarkPenalty: false,
  geoFencing: false,
  selfieCheckin: false,
  pfEsi: false,
  optionalHolidayChoice: true,
  assetChecklist: true,
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
    shortLeaveMaxHours: number; shortLeaveMonthlyQuota: number;
  }> {
    const rules = await this.repository.findRules();
    const source = rules || DEFAULT_RULES;
    return {
      shiftStartTime: source.shiftStartTime, shiftEndTime: source.shiftEndTime, shiftGraceMinutes: source.shiftGraceMinutes,
      regularizationWindowDays: source.regularizationWindowDays, regularizationMonthlyQuota: source.regularizationMonthlyQuota,
      shortLeaveMaxHours: source.shortLeaveMaxHours, shortLeaveMonthlyQuota: source.shortLeaveMonthlyQuota,
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
   * with the rest of the table). Only a late or grace-period punch-in may be regularized, only
   * within the admin's configured window/override, and only up to the monthly quota.
   */
  async submitEmployeeRegularization(emp: string, date: string, reason: string): Promise<{ ok: boolean; error?: string }> {
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) return { ok: false, error: 'A reason is required.' };

    const existing = await this.repository.findRegularizationByEmpAndDate(emp, date);
    if (existing) return { ok: false, error: 'A regularization request already exists for this date.' };

    const rules = (await this.repository.findRules()) || DEFAULT_RULES;

    const [dayRecord] = await this.repository.findAttendanceForEmployeeInRange(emp, date, date);
    const bucket = latenessBucket(dayRecord?.inMinutes ?? null, rules);
    if (bucket !== 'grace' && bucket !== 'late') {
      return { ok: false, error: 'Only a late or grace-period punch-in can be regularized.' };
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
      id: 'R-' + Date.now(), emp, date, reason: trimmedReason, stage, status: 'pending', rmRemarks: '', hrRemarks: '',
    });
    return { ok: true };
  }
  saveExpenseCategories(names: string[]) { return this.repository.replaceNameList('hr_expense_categories', names); }
  saveRequiredDocuments(names: string[]) { return this.repository.replaceNameList('hr_required_documents', names); }
  saveHolidays(holidays: HrHoliday[]) { return this.repository.replaceHolidays(holidays); }
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
        outTime: todaysPunch?.outTime || null,
      });
    } else {
      if (todaysPunch?.outTime) {
        return { ok: false, error: 'Already punched out today.' };
      }
      if (!todaysPunch?.inTime) note = 'No punch-in recorded today.';
      await this.recordPunch({
        emp, date: today, inTime: todaysPunch?.inTime || null,
        inMinutes: todaysPunch?.inMinutes ?? null, outTime: time,
      });
    }

    const updated = await this.getPunchByEmp(emp);
    await this.recordAttendance({
      emp, date: today, status: 'Present',
      inTime: updated?.inTime || '—', outTime: updated?.outTime || '—', inMinutes: updated?.inMinutes ?? null,
    });

    return { ok: true, today: { inTime: updated?.inTime || null, outTime: updated?.outTime || null, inMinutes: updated?.inMinutes ?? null }, note };
  }
  saveRegularizations(items: HrRegularization[]) { return this.repository.replaceRegularizations(items); }
  saveLeaveRequests(items: HrLeaveRequest[]) { return this.repository.replaceLeaveRequests(items); }
  saveExpenses(items: HrExpense[]) { return this.repository.replaceExpenses(items); }
  saveTickets(items: HrTicket[]) { return this.repository.replaceTickets(items); }
  saveTemplate(name: string, content: string) { return this.repository.upsertTemplate(name, content); }
  saveRules(rules: HrRules) { return this.repository.saveRules(rules); }
  appendAuditLog(entry: HrAuditLogEntry) { return this.repository.appendAuditLog(entry); }

  /**
   * Computes (but does not persist) Net Pay for every real employee for a payroll month —
   * either a live preview of the current/an unrun month, or (via getPayrollForMonth) the same
   * shape rebuilt from the frozen hr_payroll_entries once a month has actually been run.
   * Net Pay = Monthly Gross − (LOP days × Monthly Gross ÷ actual period length). An LOP day is
   * a working day (not Sunday, not on the Holiday calendar) with no full punch (in AND out)
   * and no approved leave covering it. No deductions (PF/ESI/TDS) in V1 — Net Pay is the full
   * payable gross.
   *
   * "Run Payroll" unlocks RUN_PAYROLL_UNLOCK_DAYS_BEFORE_END days before the period ends, so
   * admins can process payroll ahead of payday rather than only after the cycle fully closes —
   * which means this can run while some of the period's days haven't happened yet. Those
   * future days are simply not judged present/leave/LOP at all (not counted as LOP just for
   * not having occurred yet); re-running once the cycle actually ends picks them up for real,
   * via the existing recompute-and-overwrite mechanism. Working Days, though, always reflects
   * the FULL period regardless of when this runs — that's a calendar fact, not a time-based one.
   *
   * `roster` (see PayrollRosterEntry) is the real Employee-ID roster, not the hr_employees
   * table — attendance is recorded against Employee-ID names, so anyone with an Employee ID
   * but no CTC set yet still needs to show up here (with monthlyGross 0, prompting the admin
   * to set their salary) rather than being silently invisible, which was the original bug.
   * hr_employees is used only to enrich a matching name with its real ctc/doj/status when set.
   */
  async computePayrollForMonth(monthKey: string, roster: PayrollRosterEntry[]): Promise<PayrollPreview> {
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const { from, to } = payrollPeriodRange(monthKey, rules);
    const today = todayStr();
    const periodEnded = to <= today;
    const runUnlocksAt = addDaysUTC(to, -RUN_PAYROLL_UNLOCK_DAYS_BEFORE_END);
    const canRun = today >= runUnlocksAt;
    // Don't judge days that haven't happened yet when this runs early.
    const evalTo = to < today ? to : today;

    const [employees, holidays] = await Promise.all([
      this.repository.findEmployees(),
      this.repository.findHolidays(),
    ]);
    const holidaySet = new Set(holidays.map((h) => h.date));
    const employeeByName = new Map(employees.map((e) => [e.name, e]));

    const entries: HrPayrollEntry[] = [];
    for (const r of roster) {
      const emp = employeeByName.get(r.name);
      if (emp?.status === 'exited') continue;
      const ctc = emp?.ctc ?? 0;
      const doj = emp?.doj || r.doj;

      // Clip the period to their join date — and if they joined entirely after this period
      // ended, they weren't employed yet, so they get no entry at all (not a full-gross one).
      const clippedFrom = doj && doj > from ? doj : from;
      if (clippedFrom > to) continue;

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

      // The full period's day count — used as the per-day rate's divisor, so a LOP day on a
      // 31-day cycle costs a little less than one on a 29-day cycle, rather than a fixed ÷30.
      const periodDays = eachDateInRange(clippedFrom, to).length;

      let workingDays = 0, presentDays = 0, leaveDays = 0, lopDays = 0;
      for (const date of eachDateInRange(clippedFrom, to)) {
        if (isSunday(date) || holidaySet.has(date)) continue; // not a working day either way
        workingDays++;
        if (date > evalTo) continue; // hasn't happened yet — not judged either way
        const att = attendanceByDate.get(date);
        const hasFullPunch = !!att?.inTime && att.inTime !== '—' && !!att?.outTime && att.outTime !== '—';
        if (hasFullPunch) presentDays++;
        else if (approvedLeaveDates.has(date)) leaveDays++;
        else lopDays++;
      }

      const monthlyGross = Math.round(ctc / 12);
      const netPay = Math.round(monthlyGross - lopDays * (monthlyGross / periodDays));
      entries.push({ emp: r.name, workingDays, presentDays, leaveDays, lopDays, monthlyGross, netPay });
    }

    return { month: monthKey, periodFrom: from, periodTo: to, periodEnded, runUnlocksAt, canRun, entries };
  }

  /** Freezes a month's payroll: computes it (refusing if it's not within the unlock window yet
   * — see RUN_PAYROLL_UNLOCK_DAYS_BEFORE_END) and persists one hr_payroll_entries row per
   * employee. Calling it again for an already-run month recomputes and overwrites via upsert —
   * that's the whole "recompute" mechanism, no separate action. */
  async runPayroll(monthKey: string, roster: PayrollRosterEntry[], actor?: string): Promise<{ ok: boolean; error?: string; entries?: HrPayrollEntry[] }> {
    const preview = await this.computePayrollForMonth(monthKey, roster);
    if (!preview.canRun) {
      return { ok: false, error: `Run Payroll unlocks on ${preview.runUnlocksAt} — ${RUN_PAYROLL_UNLOCK_DAYS_BEFORE_END} days before this cycle ends on ${preview.periodTo}.` };
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
      return { month: monthKey, periodFrom: from, periodTo: to, periodEnded: true, runUnlocksAt: addDaysUTC(to, -RUN_PAYROLL_UNLOCK_DAYS_BEFORE_END), canRun: true, entries, alreadyRun: true };
    }
    const preview = await this.computePayrollForMonth(monthKey, roster);
    return { ...preview, alreadyRun: false };
  }

  async resetSampleData(keepEmployeeId: string | null): Promise<void> {
    await this.repository.resetSampleData(keepEmployeeId);
  }
}
