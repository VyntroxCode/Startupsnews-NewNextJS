'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { hrApi } from './api';
import { todayStr } from './utils';
import { payrollCycleToRunKey } from '@/modules/hr-tool/utils/time';
import { getAdminUser } from '@/lib/admin-auth';
import type { HrEmployeeCredential } from '@/modules/hr-credentials/domain/types';
import type {
  HrTeam, HrOrgStructure, HrEmployee, HrOnboarding, HrAttendanceRecord, HrAttendanceOverride, HrPunch,
  HrRegularization, HrLeaveRequest, HrExpense, HrTicket, HrComplianceTask, HrPayrollRun, HrPayrollEntry, HrRules,
  HrAuditLogEntry, HrRole, HrView,
} from './types';

interface HrState {
  role: HrRole | null;
  view: HrView;
  currentUser: HrEmployee | null;
  teams: HrTeam[];
  orgStructure: HrOrgStructure;
  employees: HrEmployee[];
  employeeCredentials: HrEmployeeCredential[];
  onboarding: HrOnboarding[];
  attendance: HrAttendanceRecord[];
  attendanceOverrides: Record<string, string>;
  punchLog: Record<string, HrPunch>;
  regularizations: HrRegularization[];
  leaveRequests: HrLeaveRequest[];
  expenses: HrExpense[];
  tickets: HrTicket[];
  compliance: HrComplianceTask[];
  payrollRun: HrPayrollRun;
  templates: Record<string, { content: string }>;
  rules: HrRules;
  auditLog: HrAuditLogEntry[];
}

const DEFAULT_RULES: HrRules = {
  workingDaysPattern: 'Mon–Sat, alternate Saturdays off', shiftStartTime: '10:00', shiftEndTime: '19:00',
  shiftGraceMinutes: 15, halfDayThresholdHours: 5.5, regularizationWindowDays: 5, regularizationOverride: false,
  regularizationMonthlyQuota: 5, shortLeaveMaxHours: 1, shortLeaveMonthlyQuota: 2,
  halfDayMinWorkedHours: 4.5, shortLeaveMinWorkedHours: 7.5, fullDayMinWorkedHours: 8.25,
  salaryPeriodFrom: 26, salaryPeriodTo: '25', ctcSplit: { basicPct: 50, hraPctOfBasic: 50, convenienceType: 'amount', convenienceValue: 0 },
  leaveTypes: { Casual: true, Sick: true, Earned: true, Maternity: true, Paternity: true, 'Comp-off': true },
  twoLevelApproval: { leave: true, attendance: true, expense: true },
  lateMarkPenalty: false, geoFencing: false, selfieCheckin: false, pfEsi: false,
  optionalHolidayChoice: true, assetChecklist: true,
};

function initialState(): HrState {
  return {
    role: null, view: 'dashboard', currentUser: null, teams: [],
    orgStructure: { designations: [], expenseCategories: [], requiredDocuments: [], holidays: [] },
    employees: [], employeeCredentials: [], onboarding: [], attendance: [], attendanceOverrides: {}, punchLog: {},
    regularizations: [], leaveRequests: [], expenses: [], tickets: [], compliance: [],
    payrollRun: { month: payrollCycleToRunKey(DEFAULT_RULES), status: 'not_run' },
    templates: {}, rules: DEFAULT_RULES, auditLog: [],
  };
}

function warnSaveFailed(): void { alert("Could not save that change. It's only kept until you reload — please try again."); }

// HR Management is only reachable by the outer admin panel's super-admin role
// (see HR_TOOL_ROLES in shared/middleware/roles.ts), so anyone who gets here is
// already a verified admin — they always land as Founder, no separate internal login.
function resolveFounder(employees: HrEmployee[]): HrEmployee {
  const existing = employees.find((e) => e.sysRole === 'Founder');
  if (existing) return existing;
  const adminUser = getAdminUser();
  return {
    id: 'FOUNDER',
    name: adminUser?.name || 'Founder',
    email: adminUser?.email || '',
    phone: null,
    designation: 'Founder & CEO',
    team: 'Leadership',
    manager: null,
    status: 'active',
    doj: todayStr(),
    sysRole: 'Founder',
    ctc: 0,
    leaveBalance: {},
    documents: [],
    signedDocs: [],
  };
}

interface HrToolContextValue {
  state: HrState;
  loading: boolean;
  loadError: boolean;
  setView: (v: HrView) => void;
  login: (emp: HrEmployee) => void;
  logout: () => void;
  logRuleChange: (text: string) => void;

  persistTeams: (v: HrTeam[]) => Promise<void>;
  persistDesignations: (v: string[]) => Promise<void>;
  persistExpenseCategories: (v: string[]) => Promise<void>;
  persistRequiredDocuments: (v: string[]) => Promise<void>;
  persistHolidays: (v: { date: string; name: string }[]) => Promise<void>;
  persistEmployees: (v: HrEmployee[]) => Promise<void>;
  persistOnboarding: (v: HrOnboarding[]) => Promise<void>;
  persistRegularizations: (v: HrRegularization[]) => Promise<void>;
  persistLeaveRequests: (v: HrLeaveRequest[]) => Promise<void>;
  persistExpenses: (v: HrExpense[]) => Promise<void>;
  persistTickets: (v: HrTicket[]) => Promise<void>;
  persistRules: (v: HrRules) => Promise<void>;
  persistAttendance: (rec: HrAttendanceRecord) => Promise<void>;
  persistAttendanceOverride: (o: HrAttendanceOverride) => Promise<void>;
  persistPunch: (p: HrPunch) => Promise<void>;
  runPayrollForMonth: (month: string, tds?: Record<string, number>) => Promise<{ success: boolean; data?: { entries: HrPayrollEntry[] }; error?: string }>;
  persistTemplate: (name: string, content: string) => Promise<void>;
  resetSampleData: () => Promise<boolean>;
  upsertEmployeeCredentialInState: (cred: HrEmployeeCredential) => void;
}

const HrToolContext = createContext<HrToolContextValue | null>(null);

export function useHrTool(): HrToolContextValue {
  const ctx = useContext(HrToolContext);
  if (!ctx) throw new Error('useHrTool must be used within HrToolProvider');
  return ctx;
}

export function HrToolProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<HrState>(initialState);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await hrApi.bootstrap();
        const attendanceOverrides: Record<string, string> = {};
        (data.attendanceOverrides || []).forEach((o) => { attendanceOverrides[o.emp + '|' + o.date] = o.status; });
        const punchLog: Record<string, HrPunch> = {};
        (data.punchLog || []).forEach((p) => { punchLog[p.emp] = p; });
        const templates: Record<string, { content: string }> = {};
        (data.templates || []).forEach((t) => { templates[t.name] = { content: t.content }; });

        setState((s) => {
          const currentMonthRun = (data.payrollRuns || []).find((r) => r.month === s.payrollRun.month);
          return {
            ...s,
            teams: data.teams, orgStructure: data.orgStructure, employees: data.employees,
            employeeCredentials: data.employeeCredentials || [],
            onboarding: data.onboarding, attendance: data.attendance, attendanceOverrides, punchLog,
            regularizations: data.regularizations, leaveRequests: data.leaveRequests, expenses: data.expenses,
            tickets: data.tickets, compliance: data.compliance,
            payrollRun: currentMonthRun || s.payrollRun,
            templates, rules: data.rules || s.rules, auditLog: data.auditLog || [],
            currentUser: resolveFounder(data.employees),
            role: 'Founder',
          };
        });
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setView = useCallback((v: HrView) => setState((s) => ({ ...s, view: v })), []);
  const login = useCallback((emp: HrEmployee) => setState((s) => ({ ...s, currentUser: emp, role: emp.sysRole as HrRole, view: 'dashboard' })), []);
  const logout = useCallback(() => setState((s) => ({ ...s, currentUser: resolveFounder(s.employees), role: 'Founder', view: 'dashboard' })), []);

  const logRuleChange = useCallback((text: string) => {
    setState((s) => {
      const entry: HrAuditLogEntry = { ts: new Date().toISOString().slice(0, 10), who: `${s.currentUser ? s.currentUser.name : 'HR'} (${s.role})`, change: text };
      hrApi.appendAuditLog(entry);
      return { ...s, auditLog: [entry, ...s.auditLog] };
    });
  }, []);

  const persistTeams = useCallback(async (v: HrTeam[]) => { setState((s) => ({ ...s, teams: v })); try { await hrApi.saveTeams(v); } catch { warnSaveFailed(); } }, []);
  const persistDesignations = useCallback(async (v: string[]) => { setState((s) => ({ ...s, orgStructure: { ...s.orgStructure, designations: v } })); try { await hrApi.saveDesignations(v); } catch { warnSaveFailed(); } }, []);
  const persistExpenseCategories = useCallback(async (v: string[]) => { setState((s) => ({ ...s, orgStructure: { ...s.orgStructure, expenseCategories: v } })); try { await hrApi.saveExpenseCategories(v); } catch { warnSaveFailed(); } }, []);
  const persistRequiredDocuments = useCallback(async (v: string[]) => { setState((s) => ({ ...s, orgStructure: { ...s.orgStructure, requiredDocuments: v } })); try { await hrApi.saveRequiredDocuments(v); } catch { warnSaveFailed(); } }, []);
  const persistHolidays = useCallback(async (v: { date: string; name: string }[]) => { setState((s) => ({ ...s, orgStructure: { ...s.orgStructure, holidays: v } })); try { await hrApi.saveHolidays(v); } catch { warnSaveFailed(); } }, []);
  const persistEmployees = useCallback(async (v: HrEmployee[]) => {
    setState((s) => ({ ...s, employees: v, currentUser: s.currentUser ? v.find((e) => e.id === s.currentUser!.id) || s.currentUser : null }));
    try { await hrApi.saveEmployees(v); } catch { warnSaveFailed(); }
  }, []);
  const persistOnboarding = useCallback(async (v: HrOnboarding[]) => { setState((s) => ({ ...s, onboarding: v })); try { await hrApi.saveOnboarding(v); } catch { warnSaveFailed(); } }, []);
  const persistRegularizations = useCallback(async (v: HrRegularization[]) => { setState((s) => ({ ...s, regularizations: v })); try { await hrApi.saveRegularizations(v); } catch { warnSaveFailed(); } }, []);
  const persistLeaveRequests = useCallback(async (v: HrLeaveRequest[]) => { setState((s) => ({ ...s, leaveRequests: v })); try { await hrApi.saveLeaveRequests(v); } catch { warnSaveFailed(); } }, []);
  const persistExpenses = useCallback(async (v: HrExpense[]) => { setState((s) => ({ ...s, expenses: v })); try { await hrApi.saveExpenses(v); } catch { warnSaveFailed(); } }, []);
  const persistTickets = useCallback(async (v: HrTicket[]) => { setState((s) => ({ ...s, tickets: v })); try { await hrApi.saveTickets(v); } catch { warnSaveFailed(); } }, []);
  const persistRules = useCallback(async (v: HrRules) => { setState((s) => ({ ...s, rules: v })); try { await hrApi.saveRules(v); } catch { warnSaveFailed(); } }, []);
  const persistAttendance = useCallback(async (rec: HrAttendanceRecord) => {
    setState((s) => {
      const idx = s.attendance.findIndex((a) => a.emp === rec.emp && a.date === rec.date);
      const attendance = idx >= 0 ? s.attendance.map((a, i) => (i === idx ? rec : a)) : [...s.attendance, rec];
      return { ...s, attendance };
    });
    try { await hrApi.recordAttendance(rec); } catch { warnSaveFailed(); }
  }, []);
  const persistAttendanceOverride = useCallback(async (o: HrAttendanceOverride) => {
    setState((s) => ({ ...s, attendanceOverrides: { ...s.attendanceOverrides, [o.emp + '|' + o.date]: o.status } }));
    try { await hrApi.recordAttendanceOverride(o); } catch { warnSaveFailed(); }
  }, []);
  const persistPunch = useCallback(async (p: HrPunch) => {
    setState((s) => ({ ...s, punchLog: { ...s.punchLog, [p.emp]: p } }));
    try { await hrApi.recordPunch(p); } catch { warnSaveFailed(); }
  }, []);
  /** Computes and freezes real Net Pay for a payroll month (see HrToolService.runPayroll) —
   * refuses if the period hasn't ended yet. Updates state.payrollRun optimistically on
   * success so Dashboard's stat tile stays live without a full bootstrap reload. */
  const runPayrollForMonth = useCallback(async (month: string, tds?: Record<string, number>) => {
    const res = await hrApi.runPayroll(month, tds);
    if (res.success) {
      setState((s) => ({ ...s, payrollRun: { month, status: 'run', runAt: new Date().toISOString(), runBy: state.currentUser?.name || null } }));
    }
    return res;
  }, [state.currentUser]);
  /** Patches state.employeeCredentials with a just-created/edited credential (the REST
   * response already has the full row — no need to refetch the whole list). Keeps
   * Directory's orphan-credential detection and any name-matched lookups (Attendance,
   * Payroll) fresh immediately after a hire, without a full bootstrap reload. */
  const upsertEmployeeCredentialInState = useCallback((cred: HrEmployeeCredential) => {
    setState((s) => {
      const idx = s.employeeCredentials.findIndex((c) => c.id === cred.id);
      const employeeCredentials = idx >= 0
        ? s.employeeCredentials.map((c, i) => (i === idx ? cred : c))
        : [...s.employeeCredentials, cred];
      return { ...s, employeeCredentials };
    });
  }, []);

  const persistTemplate = useCallback(async (name: string, content: string) => {
    setState((s) => ({ ...s, templates: { ...s.templates, [name]: { content } } }));
    try { await hrApi.saveTemplate(name, content); } catch { warnSaveFailed(); }
  }, []);
  const resetSampleData = useCallback(async (): Promise<boolean> => {
    const me = state.currentUser;
    if (!me) return false;
    try { await hrApi.resetSampleData(me.id); } catch { warnSaveFailed(); return false; }
    const clearedTeams = state.teams.map((t) => (t.manager && t.manager !== me.name ? { ...t, manager: null } : t));
    setState((s) => ({
      ...s,
      employees: [{ ...me, manager: null, ctcSplitOverride: null }],
      teams: clearedTeams,
      onboarding: [], attendance: [], attendanceOverrides: {}, punchLog: {},
      regularizations: [], leaveRequests: [], expenses: [], tickets: [],
      payrollRun: { month: s.payrollRun.month, status: 'not_run' },
    }));
    await hrApi.saveTeams(clearedTeams).catch(() => warnSaveFailed());
    logRuleChange('Reset all sample data (kept Teams, Org Structure, Rules, and Templates)');
    return true;
  }, [state.currentUser, state.teams, logRuleChange]);

  const value = useMemo<HrToolContextValue>(() => ({
    state, loading, loadError, setView, login, logout, logRuleChange,
    persistTeams, persistDesignations, persistExpenseCategories, persistRequiredDocuments, persistHolidays,
    persistEmployees, persistOnboarding, persistRegularizations, persistLeaveRequests, persistExpenses,
    persistTickets, persistRules, persistAttendance, persistAttendanceOverride, persistPunch,
    runPayrollForMonth, persistTemplate, resetSampleData, upsertEmployeeCredentialInState,
  }), [
    state, loading, loadError, setView, login, logout, logRuleChange,
    persistTeams, persistDesignations, persistExpenseCategories, persistRequiredDocuments, persistHolidays,
    persistEmployees, persistOnboarding, persistRegularizations, persistLeaveRequests, persistExpenses,
    persistTickets, persistRules, persistAttendance, persistAttendanceOverride, persistPunch,
    runPayrollForMonth, persistTemplate, resetSampleData, upsertEmployeeCredentialInState,
  ]);

  return <HrToolContext.Provider value={value}>{children}</HrToolContext.Provider>;
}
