import { getAuthHeaders } from '@/lib/admin-auth';
import type { BrowserLocation } from '@/lib/browser-geolocation';
import type {
  HrBootstrap, HrTeam, HrEmployee, HrOnboarding, HrRegularization, HrLeaveRequest, HrExpense,
  HrTicket, HrRules, HrPayrollEntry, HrAuditLogEntry,
  HrCompanyProfile,
} from './types';
import type { EmployeeCycleLedger } from '@/modules/hr-tool/utils/day-ledger';
import type { OffboardingCase, OffboardingCaseDetail, OffboardingClearanceItem, OffboardingSettings } from '@/modules/hr-offboarding/domain/types';

const API_BASE = '/api/admin/hr-tool';

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(API_BASE + path, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Request failed'); 
  return (await res.json()).data as T;
}
async function apiPut(path: string, body: unknown): Promise<void> {
  const res = await fetch(API_BASE + path, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error('Request failed');
}
async function apiPost(path: string, body: unknown): Promise<void> {
  const res = await fetch(API_BASE + path, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error('Request failed');
}
/** Keeps the server's message (e.g. "Employee not found") — deletes are one-shot and
 * irreversible, so the admin needs to know exactly why one didn't go through. */
async function apiDelete(path: string): Promise<void> {
  const res = await fetch(API_BASE + path, { method: 'DELETE', headers: getAuthHeaders() });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) throw new Error(body?.error || 'Request failed');
}

export interface PayrollApiResult {
  month: string;
  periodFrom: string;
  periodTo: string;
  periodEnded: boolean;
  canRun: boolean;
  alreadyRun: boolean;
  entries: HrPayrollEntry[];
  missingCtcEmployees: string[];
  /** Leavers left out because an approved Full & Final pays their salary for this cycle. */
  fnfSettledEmployees?: string[];
  /** Employees whose salary is held during their notice and paid in their Full & Final. */
  noticeHeldEmployees?: string[];
  /** Days up to this date were already paid by an earlier run (changeover). */
  settledThrough?: string | null;
  /** Where the cycle stands — see HrToolService.getPayrollCycleState. */
  cycle?: {
    phase: 'in-progress' | 'window' | 'overdue' | 'locked';
    windowFrom: string; windowTo: string;
    pendingRequests: { kind: 'regularization' | 'leave'; id: string; employeeId: string; emp: string; dates: string; detail: string }[];
    stale: boolean; lockedAt: string | null; reopenedUntil: string | null; canRun: boolean;
  };
  /** When the saved payslips were last computed or verified against attendance (run months). */
  computedAt?: string | null;
  /** Undecided requests per employee in this cycle — their figures are provisional. */
  pendingByEmployee?: Record<string, number>;
}
/** Payroll calls preserve the server's specific error message (e.g. "period hasn't ended
 * yet") instead of the generic apiGet/apiPost "Request failed", since that message is
 * meaningful to show the admin directly. */
async function apiRaw<T>(path: string, init?: RequestInit): Promise<{ success: boolean; data?: T; error?: string; code?: string }> {
  const res = await fetch(API_BASE + path, { ...init, headers: { ...getAuthHeaders(), ...(init?.headers || {}) } });
  return res.json();
}

export interface PunchApiResult {
  today: { inTime: string | null; outTime: string | null; inMinutes: number | null; outMinutes: number | null };
  note?: string;
  geo?: { distanceM: number; allowedM: number };
}

export interface OffboardingListResult { cases: OffboardingCase[]; clearance: OffboardingClearanceItem[]; settings: OffboardingSettings; }

export const hrApi = {
  bootstrap: () => apiGet<HrBootstrap>('/bootstrap'),
  saveTeams: (v: HrTeam[]) => apiPut('/teams', v),
  saveDesignations: (v: string[]) => apiPut('/designations', v),
  saveExpenseCategories: (v: string[]) => apiPut('/expense-categories', v),
  saveRequiredDocuments: (v: string[]) => apiPut('/required-documents', v),
  saveHolidays: (v: { date: string; name: string }[]) => apiPut('/holidays', v),
  saveEmployees: (v: HrEmployee[]) => apiPut('/employees', v),
  deleteEmployee: (id: string) => apiDelete('/employees/' + encodeURIComponent(id)),
  saveOnboarding: (v: HrOnboarding[]) => apiPut('/onboarding', v),
  decideRegularization: (id: string, level: 'rm' | 'hr', decision: 'approved' | 'rejected', remarks: string) =>
    apiRaw<HrRegularization>('/regularizations/decide', { method: 'POST', body: JSON.stringify({ id, level, decision, remarks }) }),
  /** Leave goes through the server's validated endpoints only (no whole-list save). */
  submitLeaveRequest: (v: { employeeId: string; type: string; from: string; to: string; reason: string; halfDay?: string | null }) =>
    apiRaw<{ created: HrLeaveRequest; paidDays: number; unpaidDays: number }>('/leave-requests', { method: 'POST', body: JSON.stringify(v) }),
  decideLeaveRequest: (id: string, decision: 'approved' | 'rejected', remarks: string) =>
    apiRaw<HrLeaveRequest>('/leave-requests/decide', { method: 'POST', body: JSON.stringify({ id, decision, remarks }) }),
  cancelLeaveRequest: (id: string, remarks: string) =>
    apiRaw<HrLeaveRequest>('/leave-requests/cancel', { method: 'POST', body: JSON.stringify({ id, remarks }) }),
  saveExpenses: (v: HrExpense[]) => apiPut('/expenses', v),
  saveTickets: (v: HrTicket[]) => apiPut('/tickets', v),
  saveRules: (v: HrRules) => apiPut('/rules', v),
  saveCompanyProfile: (v: HrCompanyProfile) => apiPut('/company-profile', v),
  /** Self-service punch through the same server rules (once-per-day + geofence) as every other
   * punch surface. apiRaw, not apiPost — the geofence refusal message must reach the user. */
  punch: (employeeId: string, type: 'in' | 'out', location?: BrowserLocation) =>
    apiRaw<PunchApiResult>('/punch', { method: 'POST', body: JSON.stringify({ employeeId, type, location }) }),
  /** One employee's pay cycle day by day — the same ledger payroll pays by. */
  getAttendanceLedger: (employeeId: string, month: string) =>
    apiRaw<EmployeeCycleLedger>(`/attendance-ledger?employeeId=${encodeURIComponent(employeeId)}&month=${encodeURIComponent(month)}`),
  /** Every employee's totals for one pay cycle — the Attendance page's monthly overview. */
  getAttendanceSummary: (month: string) =>
    apiRaw<{ month: string; periodFrom: string; periodTo: string; rows: { employeeId: string; name: string; totals: EmployeeCycleLedger['totals']; monthlyGross: number; paidInFnf: boolean; savedGross: number | null }[]; locked: boolean }>(
      '/attendance-summary?month=' + encodeURIComponent(month)),
  getPayroll: (month: string) => apiRaw<PayrollApiResult>('/payroll?month=' + encodeURIComponent(month)),
  reopenPayroll: (month: string, reason: string) =>
    apiRaw<{ reopenedUntil: string }>('/payroll-runs/reopen', { method: 'POST', body: JSON.stringify({ month, reason }) }),
  runPayroll: (month: string, tds?: Record<string, number>) =>
    apiRaw<{ entries: HrPayrollEntry[] }>('/payroll-runs', { method: 'POST', body: JSON.stringify({ month, tds }) }),
  saveTemplate: (name: string, content: string) => apiPut('/templates/' + encodeURIComponent(name), { content }),
  appendAuditLog: (entry: HrAuditLogEntry) => apiPost('/audit-log', entry).catch(() => {}),
  resetSampleData: (keepEmployeeId: string | null) => apiPost('/reset-sample-data', { keepEmployeeId }),
  // Offboarding — apiRaw throughout so the server's validation message reaches the admin.
  offboardingList: () => apiRaw<OffboardingListResult>('/offboarding'),
  offboardingStart: (body: Record<string, unknown>) =>
    apiRaw<OffboardingCase>('/offboarding', { method: 'POST', body: JSON.stringify(body) }),
  offboardingDetail: (id: number) => apiRaw<OffboardingCaseDetail>('/offboarding/' + id),
  /** Returns the updated case, or the checklist / handover result for those actions. */
  offboardingAction: <T = OffboardingCase>(id: number, body: Record<string, unknown>) =>
    apiRaw<T>('/offboarding/' + id, { method: 'POST', body: JSON.stringify(body) }),
  offboardingSaveSettings: (body: Partial<OffboardingSettings>) =>
    apiRaw<OffboardingSettings>('/offboarding/settings', { method: 'PUT', body: JSON.stringify(body) }),
};
