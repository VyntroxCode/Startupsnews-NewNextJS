import { HrToolRepository } from '../repository/hr-tool.repository';
import {
  HrBootstrap, HrTeam, HrHoliday, HrEmployee, HrOnboarding, HrAttendanceRecord, HrAttendanceOverride, HrPunch,
  HrRegularization, HrLeaveRequest, HrExpense, HrTicket, HrPayrollRun, HrRules, HrAuditLogEntry,
} from '../domain/types';
import { todayStr, nowTimeStr, nowMinutesSinceMidnight } from '../utils/time';

export interface PunchResult {
  ok: boolean;
  error?: string;
  today?: { inTime: string | null; outTime: string | null };
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
  salaryPeriodFrom: 1,
  salaryPeriodTo: 'last',
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
  saveExpenseCategories(names: string[]) { return this.repository.replaceNameList('hr_expense_categories', names); }
  saveRequiredDocuments(names: string[]) { return this.repository.replaceNameList('hr_required_documents', names); }
  saveHolidays(holidays: HrHoliday[]) { return this.repository.replaceHolidays(holidays); }
  saveEmployees(employees: HrEmployee[]) { return this.repository.replaceEmployees(employees); }
  saveOnboarding(items: HrOnboarding[]) { return this.repository.replaceOnboarding(items); }
  recordAttendance(rec: HrAttendanceRecord) { return this.repository.upsertAttendance(rec); }
  recordAttendanceOverride(o: HrAttendanceOverride) { return this.repository.upsertAttendanceOverride(o); }
  recordPunch(p: HrPunch) { return this.repository.upsertPunch(p); }
  getPunchByEmp(emp: string) { return this.repository.findPunchByEmp(emp); }
  getAttendanceForEmployee(emp: string, limit: number) { return this.repository.findAttendanceForEmployee(emp, limit); }

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
      inTime: updated?.inTime || '—', outTime: updated?.outTime || '—',
    });

    return { ok: true, today: { inTime: updated?.inTime || null, outTime: updated?.outTime || null }, note };
  }
  saveRegularizations(items: HrRegularization[]) { return this.repository.replaceRegularizations(items); }
  saveLeaveRequests(items: HrLeaveRequest[]) { return this.repository.replaceLeaveRequests(items); }
  saveExpenses(items: HrExpense[]) { return this.repository.replaceExpenses(items); }
  saveTickets(items: HrTicket[]) { return this.repository.replaceTickets(items); }
  saveTemplate(name: string, content: string) { return this.repository.upsertTemplate(name, content); }
  saveRules(rules: HrRules) { return this.repository.saveRules(rules); }
  appendAuditLog(entry: HrAuditLogEntry) { return this.repository.appendAuditLog(entry); }

  async savePayrollRun(run: HrPayrollRun): Promise<void> {
    await this.repository.upsertPayrollRun(run);
  }

  async resetSampleData(keepEmployeeId: string | null): Promise<void> {
    await this.repository.resetSampleData(keepEmployeeId);
  }
}
