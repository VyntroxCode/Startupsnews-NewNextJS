import { HrToolRepository } from '../repository/hr-tool.repository';
import {
  HrBootstrap, HrTeam, HrHoliday, HrEmployee, HrDocRef, HrOnboarding, HrAttendanceRecord, HrPunch, HrPunchGeo,
  HrRegularization, HrLeaveRequest, HrExpense, HrTicket, HrPayrollEntry, HrRules, HrAuditLogEntry, HrCompanyProfile,
  HrLeaveTypeConfig, HrEmployeeRef, HrPayrollRun, WFH_LEAVE_TYPE,
  HrAttendanceOverride, HrAttendanceOverrideStatus, ATTENDANCE_OVERRIDE_STATUSES, ATTENDANCE_OVERRIDE_LABEL,
} from '../domain/types';
import { todayStr, nowTimeStr, isSunday, nowMinutesSinceMidnight, nowMysqlDatetime, payrollPeriodRange, payrollMonthKeyForDate, addDaysUTC, daysUntil } from '../utils/time';
import { latenessBucket, hhmmToMinutes, formatTime12h } from '../utils/lateness';
import { evaluateGeofence, GeofenceCode, PunchLocationInput } from '../utils/geofence';
import { computeLeaveBalances, allocateLeave, leaveDayUnits, creditsAccruedThisYear, leaveCreditDay, absenceCoverThrough, punchedShortfall, ABSENCE_COVER_ID, type LeaveAllocation } from '../utils/leave-balance';
import { buildDayLedger, approvedLeaveByDate, payFromLedger, DayLedger, EmployeeCycleLedger } from '../utils/day-ledger';
export type { EmployeeCycleLedger } from '../utils/day-ledger';
import { buildPayslipData, payslipMonthLabel, type PayslipData } from '../utils/payslip-data';
import { requestedTimeError, regularizationDeadline, countedRegularizationDates, REG_LATE_FILING_DAYS, DEFAULT_PUNCH_WINDOWS, fmtWindowTime, inWindow, type PunchWindows } from '../utils/regularization-policy';
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
  /** Leavers whose final salary for this cycle is paid in an approved/paid Full & Final — left out
   * of the run so they aren't paid twice (see HrOffboardingService F&F). */
  fnfSettledEmployees: string[];
  /** Employees serving (or past) an accepted notice: from the cycle their notice started in, their
   * salary is held and paid in the Full & Final, so they are left out of the run. */
  noticeHeldEmployees: string[];
  /** Days from `periodFrom` up to this date were already paid by an earlier run (the 1st→last to
   * 26th→25th changeover) and are counted as paid here; null when nothing overlaps. */
  settledThrough?: string | null;
}

/** Where a payroll cycle stands and what the Payroll page may do with it — see
 * HrToolService.getPayrollCycleState. Run Payroll saves a draft; Reverse discards that draft (the
 * month goes back to "not run"); Freeze makes it final and publishes the payslips — permanently. */
export interface PayrollCycleState {
  /** 'in-progress' until the cycle ends · 'window' the 5 days after it (26th–30th) · 'overdue'
   * past the window and not frozen yet (still runnable/freezable, shown in red) · 'frozen' final. */
  phase: 'in-progress' | 'window' | 'overdue' | 'frozen';
  windowFrom: string;
  windowTo: string;
  /** Requests waiting for a decision that touch this cycle. They count as not approved in the
   * figures, and Freeze is blocked until none remain. */
  pendingRequests: { kind: 'regularization' | 'leave'; id: string; employeeId: string; emp: string; dates: string; detail: string }[];
  /** A draft exists (Run Payroll was clicked) — frozen months always have one. */
  alreadyRun: boolean;
  /** The saved draft no longer matches what the records say today (a decision, attendance, CTC,
   * holiday or F&F changed since the last Run) — Run Payroll again before freezing. */
  stale: boolean;
  frozenAt: string | null;
  frozenBy: string | null;
  reversedAt: string | null;
  reversedBy: string | null;
  reverseReason: string | null;
  canRun: boolean;
  canFreeze: boolean;
  /** Why Freeze is disabled, in plain words — empty when canFreeze. */
  freezeBlockers: string[];
  /** A draft exists that Reverse can discard (or, only with FROZEN_PAYROLL_REVERSIBLE, the latest frozen month). */
  canReverse: boolean;
  /** Why Reverse is disabled on a frozen month — null otherwise. */
  reverseBlocker: string | null;
}

/** Days after a cycle ends during which Run Payroll is open (the 26th–30th for a 25th end). */
export const PAYROLL_RUN_WINDOW_DAYS = 5;

/** A frozen month is final: Reverse only discards an unfrozen draft. Flipping this to true is the
 * one code change that brings back reversing the latest frozen month (reason required, payslips
 * withdrawn) — the server path for it is kept below, unused while this is false. */
export const FROZEN_PAYROLL_REVERSIBLE = false;

/** computePayrollForMonth options — used by the offboarding Full & Final to price one leaver's final cycles. */
export interface PayrollComputeOptions {
  onlyEmployeeId?: string;
  /** The F&F computing itself: include someone even if their salary is held for, or already
   * settled in, a Full & Final. */
  includeFnfSettled?: boolean;
}

/** The real employee roster for payroll purposes — every active Employee ID issued via
 * Assigning IDs (hr_employee_credentials). Each one is matched to its Directory record by
 * `credentialId` (never by name — two people may share one). HrToolService stays decoupled from
 * the hr-credentials module (see getBootstrap's comment), so the caller (API route) builds this
 * list and passes it in, rather than HrToolService reaching into hr_employee_credentials itself. */
export interface PayrollRosterEntry { credentialId: number; name: string; doj: string; }

/** Employee ID login (hr_employee_credentials.id) → its Employee Code, for payslips. Includes
 * inactive logins so a leaver's frozen payslip still shows their code. */
export type EmployeeCodeMap = Map<number, string>;

/** Inputs shared by every employee's ledger in one cycle. */
interface LedgerContext {
  rules: HrRules; from: string; to: string; today: string; evalTo: string;
  clippedFrom: string; lastDay: string | null; settledThrough: string | null; holidays: Set<string>;
}

/** Days at the start of `monthKey`'s cycle that an EARLIER run already paid (its recorded
 * period_to reaches into this cycle) — counted as paid, never judged again. The 1st→last to
 * 26th→25th changeover: August paid 1–31 Aug, so September (26 Aug → 25 Sep) counts 26–31 Aug as paid. */
function settledThroughFor(runs: { month: string; periodTo?: string | null }[], monthKey: string, from: string): string | null {
  return runs
    .filter((r) => r.month < monthKey && r.periodTo && r.periodTo >= from)
    .reduce<string | null>((max, r) => (!max || r.periodTo! > max ? r.periodTo! : max), null);
}

/** The dates a cycle covers: the ones a run actually recorded (August 2026 was paid 1–31 Aug,
 * before the 26th→25th change), otherwise the current rule's range. */
function cyclePeriodFor(runs: { month: string; status: string; periodFrom?: string | null; periodTo?: string | null }[], monthKey: string, rules: HrRules): { from: string; to: string } {
  const run = runs.find((r) => r.month === monthKey && r.status === 'run');
  return run?.periodFrom && run.periodTo ? { from: run.periodFrom, to: run.periodTo } : payrollPeriodRange(monthKey, rules);
}

/** Fields that make up a payslip — two entries equal on all of these are the same payslip. */
function samePayslip(a: HrPayrollEntry, b: HrPayrollEntry): boolean {
  const keys: (keyof HrPayrollEntry)[] = ['emp', 'totalDays', 'weekOffDays', 'workingDays', 'presentDays', 'leaveDays', 'absentDays',
    'shortLeaveDays', 'shortLeaveCarryOut', 'halfDayDays', 'lopDays', 'monthlyGross', 'tds', 'netPay'];
  return keys.every((k) => (typeof a[k] === 'number' ? Number(a[k]) === Number(b[k]) : a[k] === b[k]));
}

/** Shown when an Employee ID login has no Directory record to attach records to. */
export const NO_DIRECTORY_RECORD_ERROR =
  'No Directory record is linked to this Employee ID yet. Ask HR to open HR Management → Directory, which links it automatically.';

export type PunchErrorCode = 'ALREADY_PUNCHED' | 'ON_LEAVE' | 'OUTSIDE_PUNCH_WINDOW' | GeofenceCode;

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
  ...DEFAULT_PUNCH_WINDOWS,
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
    /** Punch In / Punch Out clock windows — also the times a regularization may request. */
    punchWindows: PunchWindows;
  }> {
    const rules = await this.repository.findRules();
    const source = rules || DEFAULT_RULES;
    return {
      shiftStartTime: source.shiftStartTime, shiftEndTime: source.shiftEndTime, shiftGraceMinutes: source.shiftGraceMinutes,
      punchWindows: { punchInFrom: source.punchInFrom, punchInTo: source.punchInTo, punchOutFrom: source.punchOutFrom, punchOutTo: source.punchOutTo },
      regularizationWindowDays: source.regularizationWindowDays, regularizationMonthlyQuota: source.regularizationMonthlyQuota,
      shortLeaveMaxHours: source.shortLeaveMaxHours, shortLeaveMonthlyQuota: source.shortLeaveMonthlyQuota,
      halfDayThresholdHours: source.halfDayThresholdHours,
      halfDayMinWorkedHours: source.halfDayMinWorkedHours, shortLeaveMinWorkedHours: source.shortLeaveMinWorkedHours,
      fullDayMinWorkedHours: source.fullDayMinWorkedHours,
      leaveTypes: source.leaveTypes,
      geoFencing: source.geoFencing, geoFenceRadiusM: source.geoFenceRadiusM,
    };
  }
  /** Balance still available today per enabled leave type (see computeLeaveBalances): accrued
   * so far this year minus the paid days held by approved + pending requests. Recomputed on every
   * call — nothing stored. Also what the Full & Final encashes. */
  async getLeaveBalancesForEmployee(employeeId: string): Promise<Record<string, number>> {
    const { leaveBalance } = await this.getLeaveOverviewForEmployee(employeeId);
    return leaveBalance;
  }

  /** Everything a leave screen needs for one employee: their requests, each with its paid/unpaid
   * split (allocateLeave — the same split payroll pays), the balances, and the inputs (join date,
   * holiday dates) a form needs to preview a new request's split before it's sent. */
  async getLeaveOverviewForEmployee(employeeId: string): Promise<{
    leaveRequests: (HrLeaveRequest & { paidDays: number; unpaidDays: number })[];
    leaveBalance: Record<string, number>;
    doj: string;
    holidays: string[];
    /** Dates this year with a punch-in — a form's preview needs them for the absence cover. */
    workedDates: string[];
    /** Last date that counts as an absence for the automatic Casual cover (absenceCoverThrough). */
    absenceCoverThrough: string;
    /** Dates HR set a status on — never covered from Casual automatically. */
    absenceCoverSkip: string[];
    /** Punched dates that still cost pay → days covered from Casual (punchedShortfall). */
    absenceCoverShortfall: Record<string, number>;
    /** leaveCreditDay(rules) — a form's preview needs it to count credits the same way. */
    creditDay: number;
  }> {
    const today = todayStr();
    const [employee, rules, requests, holidays, attendance, exitDates, overrides] = await Promise.all([
      this.repository.findEmployeeById(employeeId),
      this.repository.findRules(),
      this.repository.findLeaveRequestsForEmployee(employeeId),
      this.repository.findHolidays(),
      this.repository.findAttendanceForEmployeeInRange(employeeId, `${today.slice(0, 4)}-01-01`, today),
      this.repository.findExitDates(today),
      this.repository.findAttendanceOverridesForEmployeeInRange(employeeId, `${today.slice(0, 4)}-01-01`, today),
    ]);
    const source = rules || DEFAULT_RULES;
    const doj = employee?.doj || '';
    const holidayDates = holidays.map((h) => h.date);
    const workedDates = attendance.filter((a) => a.inMinutes != null).map((a) => a.date);
    // Absences (and what half days / deducted short leaves cost) are paid from Casual
    // automatically — up to yesterday, or a leaver's last day.
    const through = absenceCoverThrough(today, exitDates.get(employeeId) ?? null);
    const absenceCover = {
      through, skip: overrides.map((o) => o.date),
      shortfall: punchedShortfall({ doj, attendance, overrides, requests, holidayDates, rules: source, through }),
    };
    const creditDay = leaveCreditDay(source);
    const allocation = allocateLeave(doj, source.leaveTypes, creditDay, requests, today, holidayDates, workedDates, absenceCover);
    return {
      leaveRequests: requests.map((r) => ({ ...r, paidDays: allocation.get(r.id)?.paid ?? 0, unpaidDays: allocation.get(r.id)?.unpaid ?? 0 })),
      leaveBalance: computeLeaveBalances(doj, source.leaveTypes, creditDay, requests, today, holidayDates, workedDates, absenceCover),
      doj,
      holidays: holidayDates,
      workedDates,
      absenceCoverThrough: absenceCover.through,
      absenceCoverSkip: absenceCover.skip,
      absenceCoverShortfall: absenceCover.shortfall,
      creditDay,
    };
  }
  getRegularizationsForEmployee(employeeId: string) { return this.repository.findRegularizationsForEmployee(employeeId); }
  getAttendanceOverridesForEmployeeInRange(employeeId: string, from: string, to: string) { return this.repository.findAttendanceOverridesForEmployeeInRange(employeeId, from, to); }
  /** Start and end of the payroll cycle a date falls in — the same range payroll computes over
   * (payrollPeriodRange), so the regularization limit and payroll can never disagree about where
   * a cycle begins and ends. */
  private cycleRangeForDate(date: string, rules: HrRules): { from: string; to: string } {
    return payrollPeriodRange(payrollMonthKeyForDate(date, rules), rules);
  }

  /** How many DAYS of their regularization limit an employee has used in the CURRENT payroll
   * cycle, with the limit alongside it. Single source of truth: the enforcement below and the
   * figure shown on every attendance page both come from here, so the number they see can't
   * disagree with the number that blocks them. */
  async getRegularizationUsage(employeeId: string): Promise<{ used: number; quota: number; from: string; to: string; windowDays: number }> {
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const { from, to } = this.cycleRangeForDate(todayStr(), rules);
    const regs = await this.repository.findRegularizationsForEmployeeInRange(employeeId, from, to);
    return { used: countedRegularizationDates(regs, from, to).size, quota: rules.regularizationMonthlyQuota, from, to, windowDays: rules.regularizationWindowDays };
  }

  /** Recent past days the employee punched in on but never punched out, for which a punch-out
   * regularization can still be filed — the same date checks submitEmployeeRegularization applies
   * (window, closed cycle, frozen month, HR-set day, existing punch-out request, full-day leave).
   * The attendance widget shows these on the Today card, since the calendar alone hid them. */
  async getMissedPunchOuts(employeeId: string): Promise<string[]> {
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const today = todayStr();
    const from = addDaysUTC(today, -Math.max(0, Number(rules.regularizationWindowDays) || 0));
    const to = addDaysUTC(today, -1);
    if (to < from) return [];
    const [attendance, overrides, regs] = await Promise.all([
      this.repository.findAttendanceForEmployeeInRange(employeeId, from, to),
      this.repository.findAttendanceOverridesForEmployeeInRange(employeeId, from, to),
      this.repository.findRegularizationsForEmployeeInRange(employeeId, from, to),
    ]);
    const currentCycle = this.cycleRangeForDate(today, rules);
    const out: string[] = [];
    for (const a of attendance) {
      if (a.inMinutes == null || (a.outTime && a.outTime !== '—')) continue;
      if (today > regularizationDeadline(a.date, rules.regularizationWindowDays)) continue;
      const cycle = this.cycleRangeForDate(a.date, rules);
      if (cycle.to < currentCycle.from && today > addDaysUTC(cycle.to, REG_LATE_FILING_DAYS)) continue;
      if (overrides.some((o) => o.date === a.date)) continue;
      if (regs.some((r) => r.date === a.date && r.punchType === 'out')) continue;
      if (await this.frozenMonthLabelFor([a.date])) continue;
      if (await this.fullDayLeaveOn(employeeId, a.date, ['pending', 'approved'])) continue;
      out.push(a.date);
    }
    return out.sort();
  }

  /**
   * The ONLY way a day's punch can be corrected (HR's direct calendar edits and Bulk mark were
   * removed — HR now approves or rejects these requests and nothing else). Used by the employee
   * portal, the Publisher/Event Admin panel and HR Management's own Regularize buttons, so every
   * surface gets identical, server-side rules:
   *  - requested time: inside the punch windows in hr_rules (default in 09:00–15:00, out
   *    15:00–23:59 — the same windows as a real punch), and out after in;
   *  - window: within `regularizationWindowDays` calendar days of the date, never a future date;
   *  - cycle: a date in the previous payroll cycle only until REG_LATE_FILING_DAYS after it ended;
   *  - limit: `regularizationMonthlyQuota` DAYS per cycle — in + out on one date is one day,
   *    approved, pending and rejected all count. A hard limit, no override.
   * Punch-in is only eligible when it wasn't on time; punch-out only while it's missing — today
   * included, for a time not later than now.
   */
  async submitEmployeeRegularization(
    employee: HrEmployeeRef, date: string, reason: string, punchType: HrRegularization['punchType'], requestedTime: string
  ): Promise<{ ok: boolean; error?: string; created?: HrRegularization }> {
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) return { ok: false, error: 'A reason is required.' };
    const trimmedTime = (requestedTime || '').trim();
    if (!trimmedTime) return { ok: false, error: 'The time you are requesting is required.' };
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmedTime)) return { ok: false, error: 'Please enter a valid time.' };
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const timeError = requestedTimeError(punchType, trimmedTime, rules);
    if (timeError) return { ok: false, error: timeError };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return { ok: false, error: 'Please choose a valid date.' };

    const today = todayStr();
    if (date > today) return { ok: false, error: 'You can only regularize a date that has already arrived.' };
    // Today's punch-out may be regularized too (since 2026-10-06), but only for a time already passed.
    if (punchType === 'out' && date === today && hhmmToMinutes(trimmedTime) > nowMinutesSinceMidnight()) {
      return { ok: false, error: `Today's punch-out can't be later than the current time (${formatTime12h(nowMinutesSinceMidnight())}).` };
    }
    const frozenLabel = await this.frozenMonthLabelFor([date]);
    if (frozenLabel) return { ok: false, error: `Payroll for ${frozenLabel} is already final, so attendance on this date can't be changed. Contact HR.` };

    const deadline = regularizationDeadline(date, rules.regularizationWindowDays);
    if (today > deadline) {
      return { ok: false, error: `Regularization must be requested within ${rules.regularizationWindowDays} days of the date — the last day for ${date} was ${deadline}.` };
    }

    // A date in an earlier cycle is accepted only in the few days right after that cycle ends, so
    // HR can decide everything before payroll is run; after that the cycle is closed.
    const cycle = this.cycleRangeForDate(date, rules);
    const currentCycle = this.cycleRangeForDate(today, rules);
    if (cycle.to < currentCycle.from) {
      const lastFilingDay = addDaysUTC(cycle.to, REG_LATE_FILING_DAYS);
      if (today > lastFilingDay) {
        return { ok: false, error: `The ${cycle.from} → ${cycle.to} payroll cycle is closed for new requests (last day was ${lastFilingDay}).` };
      }
    }

    const [hrSet] = await this.repository.findAttendanceOverridesForEmployeeInRange(employee.id, date, date);
    if (hrSet) return { ok: false, error: `HR has already set your attendance for this day (${ATTENDANCE_OVERRIDE_LABEL[hrSet.status] || hrSet.status}). Contact HR if it needs changing.` };

    const existing = await this.repository.findRegularizationByEmployeeDateAndType(employee.id, date, punchType);
    if (existing) return { ok: false, error: `A ${punchType === 'in' ? 'punch-in' : 'punch-out'} regularization request already exists for this date.` };

    if (await this.fullDayLeaveOn(employee.id, date, ['pending', 'approved'])) {
      return { ok: false, error: 'You have full-day leave on this date. Cancel the leave first if you actually worked.' };
    }

    const [dayRecord] = await this.repository.findAttendanceForEmployeeInRange(employee.id, date, date);
    if (punchType === 'in') {
      // A missing punch-in (bucket === null) is precisely the case this exists for. Only an
      // on-time punch-in has genuinely nothing to correct.
      if (latenessBucket(dayRecord?.inMinutes ?? null, rules) === 'on-time') {
        return { ok: false, error: 'That punch-in was on time — there is nothing to regularize.' };
      }
    } else if (dayRecord?.outTime && dayRecord.outTime !== '—') {
      return { ok: false, error: 'A punch-out is already recorded for this date.' };
    }

    // Out must come after in — checked against the other punch as it will stand if everything
    // on file is approved: a live request for the other punch wins over the raw punch.
    const cycleRegs = await this.repository.findRegularizationsForEmployeeInRange(employee.id, cycle.from, cycle.to);
    const otherType = punchType === 'in' ? 'out' : 'in';
    const otherReg = cycleRegs.find((r) => r.date === date && r.punchType === otherType && r.status !== 'rejected' && r.requestedTime);
    const otherMinutes = otherReg?.requestedTime
      ? hhmmToMinutes(otherReg.requestedTime)
      : (otherType === 'in' ? dayRecord?.inMinutes : dayRecord?.outMinutes) ?? null;
    const requestedMinutes = hhmmToMinutes(trimmedTime);
    if (otherMinutes != null) {
      if (punchType === 'out' && requestedMinutes <= otherMinutes) {
        return { ok: false, error: `Punch-out must be after that day's punch-in (${formatTime12h(otherMinutes)}).` };
      }
      if (punchType === 'in' && requestedMinutes >= otherMinutes) {
        return { ok: false, error: `Punch-in must be before that day's punch-out (${formatTime12h(otherMinutes)}).` };
      }
    }

    // Limit is counted in DAYS over the date's own cycle: a second request for a date that
    // already has one (the other punch type) doesn't use another day.
    const limitError = `Regularization limit reached — ${rules.regularizationMonthlyQuota} days already used in the ${cycle.from} → ${cycle.to} payroll cycle.`;
    const usedDates = countedRegularizationDates(cycleRegs, cycle.from, cycle.to);
    if (!usedDates.has(date) && usedDates.size >= rules.regularizationMonthlyQuota) {
      return { ok: false, error: limitError };
    }

    // Single approval step: HR Head when the module's toggle is on, Founder/admin when it's off.
    const stage = 'hr';
    // Returned so callers that keep their own copy of the list (the HR tool's client state) can
    // insert exactly the row that was written, instead of rebuilding an approximation of it.
    const created: HrRegularization = {
      // Random suffix: two requests in the same millisecond must not share an id.
      id: 'R-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '-' + punchType, employeeId: employee.id, emp: employee.name, date, punchType, reason: trimmedReason, requestedTime: trimmedTime,
      stage, status: 'pending', rmRemarks: '', hrRemarks: '', source: 'employee',
    };
    // The check above is repeated inside one locked transaction, so two requests sent at the same
    // moment can't both slip under the limit (or both create the same date + punch).
    const inserted = await this.repository.insertRegularizationWithinLimit(created, cycle.from, cycle.to, rules.regularizationMonthlyQuota);
    if (inserted === 'limit') return { ok: false, error: limitError };
    if (inserted === 'duplicate') return { ok: false, error: `A ${punchType === 'in' ? 'punch-in' : 'punch-out'} regularization request already exists for this date.` };
    return { ok: true, created };
  }

  getLeaveRequestsForEmployee(employeeId: string) { return this.repository.findLeaveRequestsForEmployee(employeeId); }

  /**
   * The ONLY way a leave request is created — employee portal, Publisher/Event Admin, and HR
   * Management's "+ Apply for leave" all post through here, so every surface gets the same rules:
   *  - type must be one HR has switched on (no free-text "Other"; Work From Home is discontinued);
   *  - any date — past, today or future — except one in a frozen payroll month, or a day HR set a
   *    status on;
   *  - half-day only on a single date; the range must include at least one working day;
   *  - no overlap with a pending/approved request;
   *  - full-day leave is refused for a date that already has a punch-in (use half-day leave or
   *    regularization instead).
   * Going over the balance is allowed: the extra days are unpaid, and the returned split says so.
   */
  async submitEmployeeLeaveRequest(
    employee: HrEmployeeRef, type: string, from: string, to: string, reason: string, halfDay?: string | null
  ): Promise<{ ok: boolean; error?: string; created?: HrLeaveRequest; paidDays?: number; unpaidDays?: number }> {
    const trimmedType = (type || '').trim();
    if (!trimmedType) return { ok: false, error: 'A leave type is required.' };
    const normalizedType = trimmedType.toLowerCase().replace(/[^a-z]/g, '');
    if (normalizedType === WFH_LEAVE_TYPE.toLowerCase() || normalizedType === 'workfromhome') {
      return { ok: false, error: 'Work From Home is no longer available.' };
    }
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const enabledTypes = Object.entries(rules.leaveTypes).filter(([, c]) => c.enabled).map(([k]) => k);
    if (!enabledTypes.includes(trimmedType)) {
      return { ok: false, error: enabledTypes.length ? `Please choose one of the leave types HR has switched on: ${enabledTypes.join(', ')}.` : 'No leave types are switched on yet — ask HR.' };
    }
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) return { ok: false, error: 'A reason is required.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '')) return { ok: false, error: 'From and to dates are required.' };
    if (to < from) return { ok: false, error: 'The end date cannot be before the start date.' };
    const half = halfDay === 'first' || halfDay === 'second' ? halfDay : null;
    if (halfDay && !half) return { ok: false, error: 'Half-day must be the first or second half.' };
    if (half && from !== to) return { ok: false, error: 'Half-day leave is for a single date — set From and To to the same day.' };

    // Any date — past, today or future (since 2026-10-06) — except a month whose payroll is frozen.
    const today = todayStr();
    const frozenLabel = await this.frozenMonthLabelFor([from, to]);
    if (frozenLabel) return { ok: false, error: `Payroll for ${frozenLabel} is already final, so leave can't be applied on these dates. Contact HR.` };

    const holidays = await this.repository.findHolidays();
    const holidayDates = holidays.map((h) => h.date);
    if (leaveDayUnits({ from, to, halfDay: half }, holidayDates).length === 0) {
      return { ok: false, error: 'Those dates are all Sundays or holidays — no leave is needed.' };
    }

    const overlapping = await this.repository.findOverlappingLeaveRequestForEmployee(employee.id, from, to);
    if (overlapping) return { ok: false, error: 'You already have a leave request covering part of this date range.' };
    const hrSet = (await this.repository.findAttendanceOverridesForEmployeeInRange(employee.id, from, to))[0];
    if (hrSet) return { ok: false, error: `HR has already set your attendance for ${hrSet.date} (${ATTENDANCE_OVERRIDE_LABEL[hrSet.status] || hrSet.status}), so leave can't be applied on that day. Contact HR.` };

    if (!half && from <= today) {
      const punched = (await this.repository.findAttendanceForEmployeeInRange(employee.id, from, to < today ? to : today))
        .find((a) => a.inMinutes != null);
      if (punched) {
        return { ok: false, error: `You punched in on ${punched.date}, so full-day leave isn't possible for that day. Use half-day leave or regularization instead.` };
      }
    }

    // Single approval step: HR Head when the module's toggle is on, Founder/admin when it's off.
    const created: HrLeaveRequest = {
      id: 'L-' + Date.now(), employeeId: employee.id, emp: employee.name, type: trimmedType, from, to, remarks: trimmedReason,
      stage: 'hr', status: 'pending', rmRemarks: '', hrRemarks: '', halfDay: half,
    };
    await this.repository.insertLeaveRequest(created);
    const [employeeRow, all, yearAttendance, yearOverrides] = await Promise.all([
      this.repository.findEmployeeById(employee.id),
      this.repository.findLeaveRequestsForEmployee(employee.id),
      this.repository.findAttendanceForEmployeeInRange(employee.id, `${today.slice(0, 4)}-01-01`, today),
      this.repository.findAttendanceOverridesForEmployeeInRange(employee.id, `${today.slice(0, 4)}-01-01`, today),
    ]);
    const worked = yearAttendance.filter((a) => a.inMinutes != null).map((a) => a.date);
    // Same split the leave screens and payroll show — including absences covered from Casual.
    const through = absenceCoverThrough(today);
    const shortfall = punchedShortfall({ doj: employeeRow?.doj || '', attendance: yearAttendance, overrides: yearOverrides, requests: all, holidayDates, rules, through });
    const split = allocateLeave(employeeRow?.doj || '', rules.leaveTypes, leaveCreditDay(rules), all, today, holidayDates, worked,
      { through, skip: yearOverrides.map((o) => o.date), shortfall }).get(created.id);
    return { ok: true, created, paidDays: split?.paid ?? 0, unpaidDays: split?.unpaid ?? 0 };
  }

  /** HR's approve/reject — one pending request, one row written (replaces the old whole-list PUT). */
  async decideLeaveRequest(id: string, decision: 'approved' | 'rejected', remarks: string): Promise<{ ok: boolean; error?: string; updated?: HrLeaveRequest }> {
    const req = await this.repository.findLeaveRequestById(id);
    if (!req) return { ok: false, error: 'Leave request not found.' };
    if (req.status !== 'pending') return { ok: false, error: `This request is already ${req.status}.` };
    const frozenLabel = await this.frozenMonthLabelFor([req.from, req.to]);
    if (frozenLabel) return { ok: false, error: `Payroll for ${frozenLabel} is frozen and final — this leave can no longer change.` };
    // A day someone punched in on can only be half a day of leave — they came in. Full-day leave
    // can't be approved over a punch (they may have punched in while the request was pending).
    if (decision === 'approved' && !(req.halfDay && req.from === req.to)) {
      const punched = (await this.repository.findAttendanceForEmployeeInRange(req.employeeId, req.from, req.to)).find((a) => a.inMinutes != null);
      if (punched) {
        return { ok: false, error: `${req.emp} punched in on ${punched.date}, so only half-day leave is possible for that day. Reject this request and ask them to apply for half-day leave instead.` };
      }
    }
    const updated: HrLeaveRequest = { ...req, status: decision, stage: 'done', hrRemarks: (remarks || '').trim() };
    await this.repository.updateLeaveRequestStatus(updated);
    return { ok: true, updated };
  }

  /** Cancels a pending or approved request and so releases its balance. The employee may withdraw
   * their own PENDING request at any time (e.g. they came in after all and must punch in); an
   * APPROVED one only before it starts — after that only HR can. */
  async cancelLeaveRequest(
    id: string, by: { kind: 'employee'; employeeId: string } | { kind: 'hr' }, remarks = ''
  ): Promise<{ ok: boolean; error?: string; updated?: HrLeaveRequest }> {
    const req = await this.repository.findLeaveRequestById(id);
    if (!req) return { ok: false, error: 'Leave request not found.' };
    if (req.status !== 'pending' && req.status !== 'approved') return { ok: false, error: `This request is already ${req.status}.` };
    if (by.kind === 'employee') {
      if (req.employeeId !== by.employeeId) return { ok: false, error: 'Leave request not found.' };
      if (req.status === 'approved' && todayStr() >= req.from) return { ok: false, error: 'This approved leave has already started — only HR can cancel it now.' };
    }
    const frozenLabel = await this.frozenMonthLabelFor([req.from, req.to]);
    if (frozenLabel) return { ok: false, error: `Payroll for ${frozenLabel} is frozen and final — this leave can no longer change.` };
    const note = (remarks || '').trim() || (by.kind === 'employee' ? 'Cancelled by the employee.' : 'Cancelled by HR.');
    const updated: HrLeaveRequest = { ...req, status: 'cancelled', stage: 'done', hrRemarks: note };
    await this.repository.updateLeaveRequestStatus(updated);
    return { ok: true, updated };
  }

  /** Full-day leave (pending or approved) covering `date`, if any — a day can't be both leave and
   * worked, so punch-in and regularization refuse such a date. */
  private async fullDayLeaveOn(employeeId: string, date: string, statuses: string[]): Promise<HrLeaveRequest | null> {
    const leaves = await this.repository.findLeaveRequestsForEmployeeInRange(employeeId, date, date);
    return leaves.find((l) => statuses.includes(l.status) && !(l.halfDay && l.from === l.to)) || null;
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
  // Private on purpose: a raw attendance/punch row is only ever written by a real punch
  // (punchEmployee) or an approved regularization (decideRegularization). HR's direct-edit
  // routes that used to call these were removed.
  private recordAttendance(rec: HrAttendanceRecord) { return this.repository.upsertAttendance(rec); }
  /** Every Directory record — for routes that validate a batch of employee ids in one read. */
  listEmployees() { return this.repository.findEmployees(); }
  private recordPunch(p: HrPunch) { return this.repository.upsertPunch(p); }
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

    // Duplicate-punch check comes BEFORE the geofence so someone who already punched in today
    // gets "Already punched in" rather than a confusing location error.
    if (type === 'in' && todaysPunch?.inTime) {
      return { ok: false, error: 'Already punched in today.', code: 'ALREADY_PUNCHED' };
    }
    if (type === 'out' && todaysPunch?.outTime) {
      return { ok: false, error: 'Already punched out today.', code: 'ALREADY_PUNCHED' };
    }
    // A punch-in after the day's punch-out would only ever count 0 hours.
    if (type === 'in' && todaysPunch?.outTime) {
      return { ok: false, error: 'You have already punched out today, so you can\'t punch in again. If this is a mistake, request a regularization.', code: 'ALREADY_PUNCHED' };
    }

    // Clock windows (hr_rules, IST): Punch In only inside punchInFrom–punchInTo; Punch Out up to
    // punchOutTo, and before punchOutFrom only after a punch-in today (early leave — hours worked
    // still decide Half day / Absent). Later than 6:30 pm is fine: pay clamps to shift end.
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const nowMinutes = nowMinutesSinceMidnight();
    if (type === 'in' && !inWindow(nowMinutes, rules.punchInFrom, rules.punchInTo)) {
      return {
        ok: false, code: 'OUTSIDE_PUNCH_WINDOW',
        error: nowMinutes < hhmmToMinutes(rules.punchInFrom)
          ? `Punch In opens at ${fmtWindowTime(rules.punchInFrom)}.`
          : `Punch In closed at ${fmtWindowTime(rules.punchInTo)} — it can't be done after that. Apply for leave or contact HR.`,
      };
    }
    if (type === 'out' && nowMinutes > hhmmToMinutes(rules.punchOutTo)) {
      return { ok: false, code: 'OUTSIDE_PUNCH_WINDOW', error: `Punch Out closed at ${fmtWindowTime(rules.punchOutTo)} for today.` };
    }
    if (type === 'out' && !todaysPunch?.inTime && nowMinutes < hhmmToMinutes(rules.punchOutFrom)) {
      return { ok: false, code: 'OUTSIDE_PUNCH_WINDOW', error: `You haven't punched in today. Punch Out opens at ${fmtWindowTime(rules.punchOutFrom)}.` };
    }
    // Pending counts too: punching in under a pending full-day request would leave HR approving
    // a full day of leave on a worked day.
    const leaveToday = type === 'in' ? await this.fullDayLeaveOn(employee.id, today, ['pending', 'approved']) : null;
    if (leaveToday) {
      return {
        ok: false, code: 'ON_LEAVE',
        error: leaveToday.status === 'approved'
          ? 'You are on approved full-day leave today. If you are working, ask HR to cancel the leave first.'
          : 'You have a pending full-day leave request for today. Cancel it from your Leave page before punching in — a day you work can only take half-day leave.',
      };
    }

    // Geofence (server-enforced; the client only supplies coordinates). When the rule is off the
    // supplied location is ignored entirely and nothing is stored — no GPS collection without a
    // policy that needs it.
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
      // Punch-out is accepted until punchOutTo (checked above), with no cutoff at shift end.
      // Credited hours clamp to the shift window regardless of when it's actually clicked (see
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
    if (reg.status !== 'pending') return { ok: false, error: `This request is already ${reg.status}.` };
    // Requests filed before the time windows existed can still hold nonsense times (a 22:00
    // punch-in); approving one would write that into attendance and payroll.
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const badTime = decision === 'approved' && reg.requestedTime ? requestedTimeError(reg.punchType, reg.requestedTime, rules) : null;
    if (badTime) return { ok: false, error: `${badTime} Reject this request and ask the employee to file a new one.` };
    const frozenLabel = await this.frozenMonthLabelFor([reg.date]);
    if (frozenLabel) return { ok: false, error: `Payroll for ${frozenLabel} is frozen and final — this request can no longer be decided.` };

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

  /**
   * HR (HR Head / Founder) sets one day's status directly — Present, Short leave, Half day,
   * Absent, Unpaid leave or a paid Week-off. The day ledger reads it before punches and leave, so
   * payroll, the HR calendar and the employee's own calendar all follow at once; the real punch
   * times on hr_attendance are left as they were. Refused for future days, Sundays/holidays, days
   * outside employment, days already paid by an earlier run, frozen months and dates with a
   * pending/approved leave request (cancel or reject it first). A pending regularization on the
   * date is closed ('cancelled' — not counted in the employee's limit). If this cycle's payroll
   * has been run as a draft, that employee's draft payslip is recomputed straight away.
   */
  async setAttendanceOverride(
    employeeId: string, date: string, status: string, reason: string, actor: string, roster: PayrollRosterEntry[]
  ): Promise<{ ok: boolean; error?: string; override?: HrAttendanceOverride; closedRegularizations?: HrRegularization[]; draftUpdated?: boolean }> {
    if (!(ATTENDANCE_OVERRIDE_STATUSES as readonly string[]).includes(status)) return { ok: false, error: 'Choose a valid status.' };
    const trimmedReason = (reason || '').trim();
    if (!trimmedReason) return { ok: false, error: 'A reason is required.' };
    const check = await this.checkOverrideDate(employeeId, date);
    if (!check.ok) return { ok: false, error: check.error };
    const { emp, rules } = check;

    const leave = (await this.repository.findLeaveRequestsForEmployee(employeeId))
      .find((l) => (l.status === 'approved' || l.status === 'pending') && l.from <= date && l.to >= date);
    if (leave) {
      return { ok: false, error: `${emp.name} has a ${leave.status} ${leave.type} leave request on this date. ${leave.status === 'pending' ? 'Reject' : 'Cancel'} it in Leave first, then set the day.` };
    }

    const [previous] = await this.repository.findAttendanceOverridesForEmployeeInRange(employeeId, date, date);
    const override: HrAttendanceOverride = {
      employeeId, emp: emp.name, date, status: status as HrAttendanceOverrideStatus, reason: trimmedReason, setBy: actor, setAt: nowMysqlDatetime(),
    };
    await this.repository.upsertAttendanceOverride(override);

    const label = ATTENDANCE_OVERRIDE_LABEL[override.status];
    const closedRegularizations: HrRegularization[] = [];
    for (const r of await this.repository.findRegularizationsForEmployee(employeeId)) {
      if (r.date !== date || r.status !== 'pending') continue;
      const closed: HrRegularization = { ...r, status: 'cancelled', stage: 'done', hrRemarks: `Closed — HR set this day to ${label} directly.` };
      await this.repository.updateRegularization(closed);
      closedRegularizations.push(closed);
    }

    await this.repository.appendAuditLog({
      ts: nowMysqlDatetime(), who: actor,
      change: `Set attendance for ${emp.name} on ${date}: ${previous ? ATTENDANCE_OVERRIDE_LABEL[previous.status] || previous.status : 'from punches'} → ${label}. Reason: ${trimmedReason}`,
    });
    const draftUpdated = await this.refreshDraftPayslip(employeeId, payrollMonthKeyForDate(date, rules), roster);
    return { ok: true, override, closedRegularizations, draftUpdated };
  }

  /** Removes an HR-set status — the day goes back to being judged from punches and leave. */
  async clearAttendanceOverride(employeeId: string, date: string, actor: string, roster: PayrollRosterEntry[]): Promise<{ ok: boolean; error?: string; draftUpdated?: boolean }> {
    const [existing] = await this.repository.findAttendanceOverridesForEmployeeInRange(employeeId, date, date);
    if (!existing) return { ok: false, error: 'HR has not set a status on this day.' };
    const frozenLabel = await this.frozenMonthLabelFor([date]);
    if (frozenLabel) return { ok: false, error: `Payroll for ${frozenLabel} is frozen and final — this day can no longer change.` };
    await this.repository.deleteAttendanceOverride(employeeId, date);
    await this.repository.appendAuditLog({
      ts: nowMysqlDatetime(), who: actor,
      change: `Removed HR attendance status for ${existing.emp} on ${date} (was ${ATTENDANCE_OVERRIDE_LABEL[existing.status] || existing.status}) — back to punches`,
    });
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const draftUpdated = await this.refreshDraftPayslip(employeeId, payrollMonthKeyForDate(date, rules), roster);
    return { ok: true, draftUpdated };
  }

  /** Whether HR may set a status on this employee's date — see setAttendanceOverride. */
  private async checkOverrideDate(employeeId: string, date: string): Promise<{ ok: true; emp: HrEmployee; rules: HrRules } | { ok: false; error: string }> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return { ok: false, error: 'A valid date is required.' };
    const today = todayStr();
    const [emp, rules, holidays, exitDates, runs] = await Promise.all([
      this.repository.findEmployeeById(employeeId),
      this.repository.findRules(),
      this.repository.findHolidays(),
      this.repository.findExitDates(today),
      this.repository.findPayrollRuns(),
    ]);
    if (!emp) return { ok: false, error: 'Employee not found.' };
    const r = rules || DEFAULT_RULES;
    if (date > today) return { ok: false, error: "A future day can't be set — only past days and today." };
    if (emp.doj && date < emp.doj) return { ok: false, error: `${emp.name} joined on ${emp.doj} — this day is before joining.` };
    const lastDay = exitDates.get(employeeId);
    if (lastDay && date > lastDay) return { ok: false, error: `${emp.name}'s last working day was ${lastDay}.` };
    if (isSunday(date)) return { ok: false, error: 'This is a Sunday — already a paid week-off.' };
    const holiday = holidays.find((h) => h.date === date);
    if (holiday) return { ok: false, error: `This is a company holiday (${holiday.name}) — already a paid week-off.` };
    const frozenLabel = await this.frozenMonthLabelFor([date]);
    if (frozenLabel) return { ok: false, error: `Payroll for ${frozenLabel} is frozen and final — this day can no longer change.` };
    const monthKey = payrollMonthKeyForDate(date, r);
    const settled = settledThroughFor(runs, monthKey, cyclePeriodFor(runs, monthKey, r).from);
    if (settled && date <= settled) return { ok: false, error: 'This day was already paid in an earlier payroll run and cannot be changed.' };
    return { ok: true, emp, rules: r };
  }

  /** After an HR-set status changes, recomputes that one employee's DRAFT payslip for the cycle
   * (keeping the TDS typed into it) so the saved draft matches the calendar. Nothing happens when
   * payroll hasn't been run for the cycle (the live preview already follows) or it's frozen. */
  private async refreshDraftPayslip(employeeId: string, monthKey: string, roster: PayrollRosterEntry[]): Promise<boolean> {
    const run = (await this.repository.findPayrollRuns()).find((r) => r.month === monthKey && r.status === 'run');
    if (!run || run.frozenAt) return false;
    const saved = await this.repository.findPayrollEntryForEmployee(monthKey, employeeId);
    const preview = await this.computePayrollForMonth(monthKey, roster, { [employeeId]: saved?.tds ?? 0 }, { onlyEmployeeId: employeeId });
    const entry = preview.entries.find((e) => e.employeeId === employeeId);
    if (entry) await this.repository.upsertPayrollEntry(monthKey, entry);
    else if (saved) await this.repository.deletePayrollEntry(monthKey, employeeId);
    return true;
  }

  saveExpenses(items: HrExpense[]) { return this.repository.replaceExpenses(items); }
  saveTickets(items: HrTicket[]) { return this.repository.replaceTickets(items); }
  saveTemplate(name: string, content: string) { return this.repository.upsertTemplate(name, content); }
  /** Saves hr_rules. Punch windows missing from an older client fall back to the defaults; bad
   * ones are refused (the route turns the thrown message into a 400). */
  saveRules(rules: HrRules) {
    const next: HrRules = { ...DEFAULT_PUNCH_WINDOWS, ...rules };
    const { punchInFrom, punchInTo, punchOutFrom, punchOutTo } = next;
    if (![punchInFrom, punchInTo, punchOutFrom, punchOutTo].every((t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t || ''))) throw new Error('Punch window times must be valid HH:MM times.');
    if (punchInFrom >= punchInTo || punchOutFrom >= punchOutTo) throw new Error('Each punch window must open before it closes.');
    if (punchOutFrom < '12:00') throw new Error('The Punch Out window must open at 12:00 PM or later.');
    return this.repository.saveRules(next);
  }
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
   * When Run Payroll may act (window, pending requests, lock) is decided by
   * getPayrollCycleState, not here; this function only computes. `canRun` here just means the
   * period has ended (to < today) — callers overwrite it with the cycle state. Its "don't judge
   * days that haven't happened yet" handling (evalTo/futureDays) matters only for a live preview
   * of a cycle still in progress. Days already settled by an earlier run (`settledThrough`) are
   * paid as present. Short leave: the first `shortLeaveMonthlyQuota` are free, then every 3rd one
   * after them costs half a day (2 → 5th, 8th, 11th…; `isShortLeaveDeducted`); nothing carries over.
   *
   * `roster` (see PayrollRosterEntry) is the real Employee-ID roster. Each login is matched to its
   * Directory record by credential id, and from there EVERYTHING — CTC, joining date, attendance,
   * approved leave, short-leave carry-over and TDS — is looked up by that record's employee id,
   * never by name, so two employees with the same name are paid independently. A login with no
   * Directory record, or a record with no CTC, is listed in missingCtcEmployees (which blocks Run
   * Payroll) rather than being silently invisible.
   */
  async computePayrollForMonth(monthKey: string, roster: PayrollRosterEntry[], tdsByEmp?: Record<string, number>, options: PayrollComputeOptions = {}): Promise<PayrollPreview> {
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const { from, to } = payrollPeriodRange(monthKey, rules);
    const today = todayStr();
    // A cycle has ended only once its last day is over — running on the last day itself missed
    // that day's punch-outs (September was run at 10:44 PM on its final day).
    const periodEnded = to < today;
    const canRun = periodEnded;
    // Don't judge days that haven't happened yet when this runs early.
    const evalTo = to < today ? to : today;

    await this.repository.backfillMissingEmployeeIds();
    const [employees, holidays] = await Promise.all([
      this.repository.findEmployees(),
      this.repository.findHolidays(),
    ]);
    const holidaySet = new Set(holidays.map((h) => h.date));
    // Offboarding: a leaver's last working day ends their employment for pay purposes, and anyone
    // whose final salary is in an approved Full & Final is left out (else they'd be paid twice).
    // Salary from the cycle a notice started in is held for the F&F (the F&F pays the whole of it).
    const [exitDates, fnfSettled, noticeStarts] = await Promise.all([
      this.repository.findExitDates(today),
      options.includeFnfSettled ? Promise.resolve(new Set<string>()) : this.repository.findFnfSettledEmployeeIds(monthKey),
      options.includeFnfSettled ? Promise.resolve(new Map<string, string>()) : this.repository.findNoticeStartDates(),
    ]);
    const fnfSettledEmployees: string[] = [];
    const noticeHeldEmployees: string[] = [];

    // Days at the start of this cycle that an EARLIER run already paid (its recorded period_to
    // reaches into this cycle) are counted as paid, never judged again — the 1st→last to 26th→25th
    // changeover: August paid 1–31 Aug, so September (26 Aug → 25 Sep) counts 26–31 Aug as paid.
    const settledThrough = settledThroughFor(await this.repository.findPayrollRuns(), monthKey, from);
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
      if (options.onlyEmployeeId && emp.id !== options.onlyEmployeeId) continue;
      if (fnfSettled.has(emp.id)) { fnfSettledEmployees.push(emp.name); continue; }
      const lastDay = exitDates.get(emp.id) ?? null;
      // Left before this cycle began — nothing to pay, and no ₹0 payslip either.
      if (lastDay && lastDay < from) continue;
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

      const noticeStart = noticeStarts.get(emp.id);
      if (noticeStart && payrollMonthKeyForDate(noticeStart, rules) <= monthKey) { noticeHeldEmployees.push(emp.name); continue; }

      if (ctc <= 0) missingCtcEmployees.push(emp.name);

      // Every day of the cycle is decided by the shared day ledger — the same days and totals the
      // attendance calendar shows (see utils/day-ledger.ts), so the two can't disagree.
      const ledger = await this.buildEmployeeLedger(emp.id, doj || '', { rules, from, to, today, evalTo, clippedFrom, lastDay, settledThrough, holidays: holidaySet });
      if (isExited && ledger.attendanceInCycle === 0) continue;
      const t = ledger.totals;
      // TDS is entered by the admin per employee per run (see runPayroll's tdsByEmp) — not a
      // formula. Defaults to 0 (or whatever was saved last time this month was run).
      const tds = tdsByEmp?.[emp.id] ?? 0;
      const { monthlyGross, netPay } = payFromLedger(ctc, t, tds);
      entries.push({
        // leaveDays reports PAID leave, so the columns reconcile:
        // total = present + weekOff + paidLeave + LOP. Unpaid leave is inside lopDays.
        // absentDays is only the no-show days (a part of LOP), never LOP itself.
        employeeId: emp.id, emp: emp.name, totalDays: t.totalDays, weekOffDays: t.weekOffDays, workingDays: t.workingDays,
        presentDays: t.presentDays, leaveDays: t.leaveDays, absentDays: t.absentDays,
        shortLeaveDays: t.shortLeaveDays, shortLeaveCarryOut: 0, halfDayDays: t.halfDayDays, lopDays: t.lopDays, monthlyGross, tds, netPay,
      });
    }

    return { month: monthKey, periodFrom: from, periodTo: to, periodEnded, canRun, entries, missingCtcEmployees, fnfSettledEmployees, noticeHeldEmployees, settledThrough };
  }

  /** One employee's ledger for a cycle: loads their year-to-date punches and ALL their leave
   * (whether a leave day is paid depends on how much balance earlier leave already used), splits
   * leave into paid/unpaid with allocateLeave over approved + pending requests (pending holds
   * balance — the same split every leave screen shows), and lets buildDayLedger decide each day
   * using only the APPROVED leave. Legacy Work From Home is left out: those days were written to
   * hr_attendance as full shifts and are paid as worked days. */
  private async buildEmployeeLedger(employeeId: string, doj: string, ctx: LedgerContext): Promise<DayLedger & {
    attendanceInCycle: number; leaveRequests: HrLeaveRequest[]; allocation: Map<string, LeaveAllocation>; workedDates: string[];
    absenceCover: { through: string; skip: string[]; shortfall: Record<string, number> };
  }> {
    // Punches through today (not just the cycle end): absences after this cycle use Casual balance
    // too, and they must be known to split the balance the same way every screen does.
    const yearTo = ctx.to > ctx.today ? ctx.to : ctx.today;
    const [yearAttendance, leaves, yearOverrides] = await Promise.all([
      this.repository.findAttendanceForEmployeeInRange(employeeId, `${ctx.from.slice(0, 4)}-01-01`, yearTo),
      this.repository.findLeaveRequestsForEmployee(employeeId),
      this.repository.findAttendanceOverridesForEmployeeInRange(employeeId, `${ctx.from.slice(0, 4)}-01-01`, yearTo),
    ]);
    const attendance = yearAttendance.filter((a) => a.date >= ctx.clippedFrom && a.date <= ctx.to);
    const leave = leaves.filter((l) => l.type !== WFH_LEAVE_TYPE);
    const workedDates = yearAttendance.filter((a) => a.inMinutes != null).map((a) => a.date);
    // A day HR set a status on is decided by that status — never paid from Casual automatically.
    const through = absenceCoverThrough(ctx.today, ctx.lastDay);
    const absenceCover = {
      through, skip: yearOverrides.map((o) => o.date),
      shortfall: punchedShortfall({ doj, attendance: yearAttendance, overrides: yearOverrides, requests: leave, holidayDates: ctx.holidays, rules: ctx.rules, through }),
    };
    const allocation = allocateLeave(doj, ctx.rules.leaveTypes, leaveCreditDay(ctx.rules), leave, ctx.today, ctx.holidays, workedDates, absenceCover);
    const approvedIds = new Set(leave.filter((l) => l.status === 'approved').map((l) => l.id));
    const ledger = buildDayLedger({
      from: ctx.from, to: ctx.to, evalTo: ctx.evalTo, clippedFrom: ctx.clippedFrom, lastDay: ctx.lastDay,
      settledThrough: ctx.settledThrough, holidays: ctx.holidays, rules: ctx.rules,
      attendanceByDate: new Map(attendance.map((a) => [a.date, a])),
      leaveByDate: approvedLeaveByDate(allocation, approvedIds),
      overrideByDate: new Map(yearOverrides.filter((o) => o.date >= ctx.from && o.date <= ctx.to).map((o) => [o.date, o.status])),
    });
    return { ...ledger, attendanceInCycle: attendance.length, leaveRequests: leave, allocation, workedDates, absenceCover };
  }

  /** The attendance calendar's data for one employee and one pay cycle — built exactly as
   * computePayrollForMonth builds that employee's payslip. `monthKey` names the cycle by the month
   * it ends in (e.g. 2026-09 = 26 Aug → 25 Sep); without one, today's cycle. Null when the
   * employee doesn't exist. */
  async getEmployeeCycleLedger(employeeId: string, monthKey?: string | null): Promise<EmployeeCycleLedger | null> {
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const today = todayStr();
    if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) monthKey = payrollMonthKeyForDate(today, rules);
    const [emp, holidays, exitDates, runs, noticeStarts] = await Promise.all([
      this.repository.findEmployeeById(employeeId),
      this.repository.findHolidays(),
      this.repository.findExitDates(today),
      this.repository.findPayrollRuns(),
      this.repository.findNoticeStartDates(),
    ]);
    if (!emp) return null;
    const { from, to } = cyclePeriodFor(runs, monthKey, rules);
    // Same rule as payroll: from the cycle a notice started in, salary is paid in the Full & Final.
    const noticeStart = noticeStarts.get(emp.id);
    const paidInFnf = !!noticeStart && payrollMonthKeyForDate(noticeStart, rules) <= monthKey;
    const doj = emp.doj || '';
    const ledger = await this.buildEmployeeLedger(emp.id, doj, {
      rules, from, to, today, evalTo: to < today ? to : today,
      clippedFrom: doj && doj > from ? doj : from,
      lastDay: exitDates.get(emp.id) ?? null,
      settledThrough: settledThroughFor(runs, monthKey, from),
      holidays: new Set(holidays.map((h) => h.date)),
    });
    const run = runs.find((r) => r.month === monthKey && r.status === 'run');
    const savedEntry = run ? await this.repository.findPayrollEntryForEmployee(monthKey, emp.id) : null;
    const tds = savedEntry?.tds ?? 0;

    // Leave per enabled type: balance left today (same computeLeaveBalances every leave screen
    // shows), earned this year, and this cycle's requested days split by the same allocation
    // payroll pays by — approved into paid/unpaid, pending shown separately.
    const holidayDates = holidays.map((h) => h.date);
    const balances = computeLeaveBalances(doj, rules.leaveTypes, leaveCreditDay(rules), ledger.leaveRequests, today, holidayDates, ledger.workedDates, ledger.absenceCover);
    const cover = ledger.allocation.get(ABSENCE_COVER_ID);
    const leave: EmployeeCycleLedger['leave'] = Object.entries(rules.leaveTypes)
      .filter(([, cfg]) => cfg.enabled)
      .map(([type, cfg]) => {
        let paid = 0, unpaid = 0, pending = 0;
        for (const r of ledger.leaveRequests) {
          if (r.type !== type) continue;
          const alloc = ledger.allocation.get(r.id);
          if (!alloc) continue;
          for (const d of alloc.days) {
            if (d.date < from || d.date > to) continue;
            if (r.status === 'approved') { paid += d.paid; unpaid += d.units - d.paid; }
            else if (r.status === 'pending') pending += d.units;
          }
        }
        // Absences in this cycle paid from this type's balance automatically.
        const auto = cover?.type === type ? cover.days.filter((d) => d.date >= from && d.date <= to).reduce((n, d) => n + d.paid, 0) : 0;
        const round = (n: number) => Math.round(n * 100) / 100;
        return {
          type, available: balances[type] ?? 0,
          earnedThisYear: round(creditsAccruedThisYear(doj, today, leaveCreditDay(rules)) * (Number(cfg.perMonth) || 0)),
          appliedInCycle: round(paid + unpaid + pending), paidInCycle: round(paid), unpaidInCycle: round(unpaid), pendingInCycle: round(pending),
          autoInCycle: round(auto),
        };
      });
    return {
      month: monthKey, periodFrom: from, periodTo: to, doj, days: ledger.days, totals: ledger.totals, leave,
      pay: { ...payFromLedger(emp.ctc ?? 0, ledger.totals, tds), tds },
      saved: savedEntry ? { monthlyGross: savedEntry.monthlyGross, netPay: savedEntry.netPay } : null,
      locked: !!run?.frozenAt,
      paidInFnf,
    };
  }

  /** Every employee's totals for one pay cycle — the Attendance page's monthly overview. One row
   * per Directory record employed at some point in the cycle (joined by its end, and not gone
   * before its start), each built by getEmployeeCycleLedger, so a row equals that employee's
   * calendar and payslip. `monthKey` = the cycle's end month; omitted, today's cycle. `paidInFnf`
   * marks a leaver whose salary for this cycle is paid in their Full & Final, not by payroll;
   * `savedGross` is the saved payslip once the cycle has been run (a locked month paid under older
   * rules can differ from what today's records say — shown, never rewritten). */
  async getCycleAttendanceSummary(monthKey?: string | null): Promise<{
    month: string; periodFrom: string; periodTo: string;
    rows: { employeeId: string; name: string; totals: EmployeeCycleLedger['totals']; monthlyGross: number; paidInFnf: boolean; savedGross: number | null }[];
    locked: boolean;
  }> {
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const today = todayStr();
    const key = monthKey && /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : payrollMonthKeyForDate(today, rules);
    const [employees, exitDates, runs] = await Promise.all([
      this.repository.findEmployees(), this.repository.findExitDates(today), this.repository.findPayrollRuns(),
    ]);
    const { from, to } = cyclePeriodFor(runs, key, rules);
    const rows: { employeeId: string; name: string; totals: EmployeeCycleLedger['totals']; monthlyGross: number; paidInFnf: boolean; savedGross: number | null }[] = [];
    for (const emp of employees) {
      if (emp.doj && emp.doj > to) continue;
      const lastDay = exitDates.get(emp.id);
      if (lastDay && lastDay < from) continue;
      const ledger = await this.getEmployeeCycleLedger(emp.id, key);
      if (!ledger) continue;
      // An exited record with nothing in this cycle is someone who left long ago.
      if (emp.status === 'exited' && ledger.totals.presentDays === 0 && ledger.totals.leaveDays === 0) continue;
      rows.push({ employeeId: emp.id, name: emp.name, totals: ledger.totals, monthlyGross: ledger.pay.monthlyGross, paidInFnf: ledger.paidInFnf, savedGross: ledger.saved?.monthlyGross ?? null });
    }
    rows.sort((a, b) => a.name.localeCompare(b.name));
    const run = runs.find((r) => r.month === key && r.status === 'run');
    return { month: key, periodFrom: from, periodTo: to, rows, locked: !!run?.frozenAt };
  }

  /** Months that have been frozen, newest first. */
  private frozenMonths(runs: HrPayrollRun[]): string[] {
    return runs.filter((r) => r.status === 'run' && r.frozenAt).map((r) => r.month).sort().reverse();
  }

  /**
   * Where a cycle stands and what the Payroll page may do with it:
   *  - in-progress: the cycle hasn't ended (to ≥ today) — preview only;
   *  - window: the PAYROLL_RUN_WINDOW_DAYS after it ends (26th–30th);
   *  - overdue: past the window and not frozen — still runnable and freezable, shown in red;
   *  - frozen: final and permanent. Nothing dated in it can change (see FROZEN_PAYROLL_REVERSIBLE).
   * Run Payroll saves a draft and never updates by itself. Freeze needs a draft that still matches
   * today's records (`stale` — checked by recomputing, so a decision, attendance, CTC, holiday or
   * F&F change all count), no pending requests, every CTC set, and every earlier drafted month
   * frozen (months freeze in order). Reverse discards a draft; a frozen month can't be reversed.
   * Without a `roster`, `stale` and the CTC check are skipped (callers that only need the phase).
   */
  async getPayrollCycleState(monthKey: string, roster?: PayrollRosterEntry[]): Promise<PayrollCycleState & { missingCtcEmployees: string[] }> {
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const runs = await this.repository.findPayrollRuns();
    const { from, to } = cyclePeriodFor(runs, monthKey, rules);
    const today = todayStr();
    const windowFrom = addDaysUTC(to, 1);
    const windowTo = addDaysUTC(to, PAYROLL_RUN_WINDOW_DAYS);
    const pendingRequests = await this.repository.findPendingRequestsInRange(from, to);
    const run = runs.find((r) => r.month === monthKey && r.status === 'run') || null;
    const frozenAt = run?.frozenAt || null;

    let phase: PayrollCycleState['phase'];
    if (frozenAt) phase = 'frozen';
    else if (to >= today) phase = 'in-progress';
    else if (today <= windowTo) phase = 'window';
    else phase = 'overdue';

    let stale = false;
    let missingCtcEmployees: string[] = [];
    if (roster && run && !frozenAt && phase !== 'in-progress') {
      const saved = await this.repository.findPayrollEntriesForMonth(monthKey);
      const live = await this.computePayrollForMonth(monthKey, roster, Object.fromEntries(saved.map((e) => [e.employeeId, e.tds])));
      missingCtcEmployees = live.missingCtcEmployees;
      const savedById = new Map(saved.map((e) => [e.employeeId, e]));
      stale = live.entries.length !== saved.length
        || live.entries.some((e) => { const before = savedById.get(e.employeeId); return !before || !samePayslip(before, e); });
    }

    const canRun = phase === 'window' || phase === 'overdue';
    const freezeBlockers: string[] = [];
    if (phase === 'in-progress') freezeBlockers.push(`This cycle is still running — it ends on ${to}.`);
    else if (phase !== 'frozen') {
      if (!run) freezeBlockers.push('Run Payroll first.');
      if (pendingRequests.length > 0) freezeBlockers.push(`${pendingRequests.length} request(s) still pending — approve or reject them in Attendance / Leave, then Run Payroll again.`);
      if (missingCtcEmployees.length > 0) freezeBlockers.push(`CTC is not set for: ${missingCtcEmployees.join(', ')}.`);
      else if (stale) freezeBlockers.push('Attendance or salary data changed since the last Run — click Run Payroll again.');
      const earlierDraft = runs.filter((r) => r.status === 'run' && !r.frozenAt && r.month < monthKey).map((r) => r.month).sort()[0];
      if (earlierDraft) freezeBlockers.push(`Freeze ${payslipMonthLabel(earlierDraft)} first — months are frozen in order.`);
    }
    const canFreeze = canRun && freezeBlockers.length === 0;

    const latestFrozen = this.frozenMonths(runs)[0];
    let reverseBlocker: string | null = null;
    if (frozenAt && !FROZEN_PAYROLL_REVERSIBLE) reverseBlocker = 'Frozen payroll is final — it cannot be reversed.';
    else if (frozenAt && latestFrozen !== monthKey) reverseBlocker = `Only the latest frozen month (${payslipMonthLabel(latestFrozen)}) can be reversed.`;

    return {
      phase, windowFrom, windowTo, pendingRequests, alreadyRun: !!run, stale,
      frozenAt, frozenBy: run?.frozenBy || null,
      reversedAt: run?.reversedAt || null, reversedBy: run?.reversedBy || null, reverseReason: run?.reverseReason || null,
      canRun, canFreeze, freezeBlockers, canReverse: !!run && !reverseBlocker, reverseBlocker, missingCtcEmployees,
    };
  }

  /** The frozen month `date` falls in, as a label ("October 2026"), or null. Nothing dated in a
   * frozen month may change — request decisions, cancellations and new requests are refused. */
  async frozenMonthLabelFor(dates: string[]): Promise<string | null> {
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const frozen = new Set(this.frozenMonths(await this.repository.findPayrollRuns()));
    for (const d of dates) {
      if (!d) continue;
      const key = payrollMonthKeyForDate(d, rules);
      if (frozen.has(key)) return payslipMonthLabel(key);
    }
    return null;
  }

  /** Saves a month's payroll as a draft: computes it from the current records and persists one
   * hr_payroll_entries row per employee (dropping anyone no longer in it). Refused while the cycle
   * is still running or frozen, or while anyone on the roster has no CTC. Pending requests count as
   * not approved. The draft never updates by itself — after any change, Run again. `tdsByEmp`
   * carries what the admin typed into the TDS column. */
  async runPayroll(
    monthKey: string, roster: PayrollRosterEntry[], actor?: string, tdsByEmp?: Record<string, number>
  ): Promise<{ ok: boolean; error?: string; entries?: HrPayrollEntry[] }> {
    const state = await this.getPayrollCycleState(monthKey);
    if (state.phase === 'in-progress') {
      return { ok: false, error: `This cycle is still running — Run Payroll opens on ${state.windowFrom}.` };
    }
    if (state.phase === 'frozen') {
      return { ok: false, error: 'This month is frozen — its payroll is final and cannot be run again.' };
    }
    const preview = await this.computePayrollForMonth(monthKey, roster, tdsByEmp);
    if (preview.missingCtcEmployees.length > 0) {
      return { ok: false, error: `CTC is not set for: ${preview.missingCtcEmployees.join(', ')}. Set their Annual CTC in Directory before running payroll.` };
    }
    const keep = new Set(preview.entries.map((e) => e.employeeId));
    const saved = await this.repository.findPayrollEntriesForMonth(monthKey);
    await Promise.all(saved.filter((e) => !keep.has(e.employeeId)).map((e) => this.repository.deletePayrollEntry(monthKey, e.employeeId)));
    await Promise.all(preview.entries.map((e) => this.repository.upsertPayrollEntry(monthKey, e)));
    await this.repository.upsertPayrollRun({
      month: monthKey, status: 'run', runAt: nowMysqlDatetime(), runBy: actor || null, periodFrom: preview.periodFrom, periodTo: preview.periodTo,
    });
    await this.repository.appendAuditLog({ ts: nowMysqlDatetime(), who: actor || 'HR', change: `Ran payroll ${monthKey} (${preview.entries.length} employees)` });
    return { ok: true, entries: preview.entries };
  }

  /** Makes a drafted month final: re-checks every Freeze blocker server-side, marks it frozen
   * (conditional update — a double click can't freeze twice) and snapshots each payslip so later
   * CTC/designation edits never change a published slip. */
  async freezePayroll(monthKey: string, roster: PayrollRosterEntry[], codes: EmployeeCodeMap, actor: string): Promise<{ ok: boolean; error?: string }> {
    const state = await this.getPayrollCycleState(monthKey, roster);
    if (state.phase === 'frozen') return { ok: false, error: 'This month is already frozen.' };
    if (!state.canFreeze) return { ok: false, error: state.freezeBlockers.join(' ') || 'This month cannot be frozen yet.' };
    if (!(await this.repository.freezePayrollRun(monthKey, actor))) return { ok: false, error: 'This month is already frozen.' };
    await this.ensurePayslipSnapshots(monthKey, codes);
    const count = (await this.repository.findPayrollEntriesForMonth(monthKey)).length;
    await this.repository.appendAuditLog({ ts: nowMysqlDatetime(), who: actor, change: `Froze payroll ${monthKey} — ${count} payslips published` });
    return { ok: true };
  }

  /** Reverse. On a draft (run, not frozen): discards it — saved entries deleted, the month back to
   * "not run", so the next Run Payroll reads attendance afresh; no payslip exists meanwhile. On a
   * frozen month: refused — payroll is final (FROZEN_PAYROLL_REVERSIBLE). With that flag on, the
   * latest frozen month goes back to a draft and its payslips are withdrawn; reason mandatory. */
  async reversePayroll(monthKey: string, reason: string, actor: string): Promise<{ ok: boolean; error?: string }> {
    const state = await this.getPayrollCycleState(monthKey);
    if (!state.canReverse) {
      return { ok: false, error: state.reverseBlocker || (state.alreadyRun ? 'This month cannot be reversed.' : 'Payroll has not been run for this month.') };
    }
    if (state.phase !== 'frozen') {
      if (!(await this.repository.discardPayrollDraft(monthKey, actor))) return { ok: false, error: 'This month is no longer a draft — refresh the page.' };
      await this.repository.appendAuditLog({ ts: nowMysqlDatetime(), who: actor, change: `Reversed payroll ${monthKey} (draft discarded)` });
      return { ok: true };
    }
    const trimmed = (reason || '').trim();
    if (!trimmed) return { ok: false, error: 'A reason is required to reverse a frozen payroll.' };
    if (!(await this.repository.reversePayrollRun(monthKey, actor, trimmed))) return { ok: false, error: 'This month is not frozen any more.' };
    await this.repository.appendAuditLog({ ts: nowMysqlDatetime(), who: actor, change: `Reversed payroll ${monthKey}: ${trimmed}` });
    return { ok: true };
  }

  /** Writes the payslip snapshot for every entry of a frozen month that doesn't have one yet —
   * right after Freeze, and lazily for months frozen by the migration. */
  async ensurePayslipSnapshots(monthKey: string, codes: EmployeeCodeMap): Promise<void> {
    const runs = await this.repository.findPayrollRuns();
    const run = runs.find((r) => r.month === monthKey && r.status === 'run');
    if (!run?.frozenAt) return;
    const entries = await this.repository.findPayrollEntriesForMonth(monthKey);
    const missing = entries.filter((e) => !e.payslip);
    if (missing.length === 0) return;
    const [employees, rules] = await Promise.all([this.repository.findEmployees(), this.repository.findRules()]);
    const byId = new Map(employees.map((e) => [e.id, e]));
    const { to } = cyclePeriodFor(runs, monthKey, rules || DEFAULT_RULES);
    for (const e of missing) {
      const employee = byId.get(e.employeeId);
      if (!employee) continue;
      const payslip = buildPayslipData({
        entry: e, employee, defaultSplit: (rules || DEFAULT_RULES).ctcSplit, monthKey, periodTo: to,
        employeeCode: employee.credentialId != null ? codes.get(Number(employee.credentialId)) : null,
      });
      await this.repository.savePayslipSnapshot(monthKey, e.employeeId, payslip);
    }
  }

  /** One employee's published payslips (frozen months only), newest first. */
  async getEmployeePayslips(employeeId: string, codes: EmployeeCodeMap): Promise<{ month: string; periodFrom: string; periodTo: string; netPay: number; payslip: PayslipData }[]> {
    const rules = (await this.repository.findRules()) || DEFAULT_RULES;
    const runs = await this.repository.findPayrollRuns();
    const out: { month: string; periodFrom: string; periodTo: string; netPay: number; payslip: PayslipData }[] = [];
    for (const month of this.frozenMonths(runs)) {
      let entry = await this.repository.findPayrollEntryForEmployee(month, employeeId);
      if (!entry) continue;
      if (!entry.payslip) {
        await this.ensurePayslipSnapshots(month, codes);
        entry = await this.repository.findPayrollEntryForEmployee(month, employeeId);
      }
      if (!entry?.payslip) continue;
      const { from, to } = cyclePeriodFor(runs, month, rules);
      out.push({ month, periodFrom: from, periodTo: to, netPay: entry.payslip.netPay, payslip: entry.payslip });
    }
    return out;
  }

  /** The saved draft/frozen entries if this month has been run, otherwise a live preview — same
   * response shape either way — plus the cycle's state and `pendingByEmployee` (undecided requests
   * per employee: those figures count them as not approved). A frozen month's entries carry their
   * payslip snapshots. */
  async getPayrollForMonth(monthKey: string, roster: PayrollRosterEntry[], codes: EmployeeCodeMap): Promise<PayrollPreview & { alreadyRun: boolean; cycle: PayrollCycleState; computedAt: string | null; pendingByEmployee: Record<string, number> }> {
    await this.repository.backfillMissingEmployeeIds();
    const { missingCtcEmployees: _missing, ...cycle } = await this.getPayrollCycleState(monthKey, roster);
    void _missing;
    const pendingByEmployee: Record<string, number> = {};
    for (const p of cycle.pendingRequests) pendingByEmployee[p.employeeId] = (pendingByEmployee[p.employeeId] || 0) + 1;
    if (cycle.phase === 'frozen') await this.ensurePayslipSnapshots(monthKey, codes);
    const runs = await this.repository.findPayrollRuns();
    const run = runs.find((r) => r.month === monthKey && r.status === 'run');
    if (run) {
      const [entries, rules] = await Promise.all([
        this.repository.findPayrollEntriesForMonth(monthKey),
        this.repository.findRules(),
      ]);
      const { from, to } = cyclePeriodFor(runs, monthKey, rules || DEFAULT_RULES);
      return { month: monthKey, periodFrom: from, periodTo: to, periodEnded: to < todayStr(), canRun: cycle.canRun, entries, missingCtcEmployees: [], fnfSettledEmployees: [], noticeHeldEmployees: [], alreadyRun: true, cycle, computedAt: run.computedAt || null, pendingByEmployee };
    }
    const preview = await this.computePayrollForMonth(monthKey, roster);
    return { ...preview, canRun: cycle.canRun, alreadyRun: false, cycle, computedAt: null, pendingByEmployee };
  }

  async resetSampleData(keepEmployeeId: string | null): Promise<void> {
    await this.repository.resetSampleData(keepEmployeeId);
  }
}
