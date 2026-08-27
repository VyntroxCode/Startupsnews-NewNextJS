import { getAuthHeaders } from '@/lib/admin-auth';
import type {
  HrBootstrap, HrTeam, HrEmployee, HrOnboarding, HrRegularization, HrLeaveRequest, HrExpense,
  HrTicket, HrRules, HrAttendanceRecord, HrAttendanceOverride, HrPunch, HrPayrollEntry, HrAuditLogEntry,
  HrCompanyProfile,
} from './types';

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
}
/** Payroll calls preserve the server's specific error message (e.g. "period hasn't ended
 * yet") instead of the generic apiGet/apiPost "Request failed", since that message is
 * meaningful to show the admin directly. */
async function apiRaw<T>(path: string, init?: RequestInit): Promise<{ success: boolean; data?: T; error?: string }> {
  const res = await fetch(API_BASE + path, { ...init, headers: { ...getAuthHeaders(), ...(init?.headers || {}) } });
  return res.json();
}

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
  saveRegularizations: (v: HrRegularization[]) => apiPut('/regularizations', v),
  saveLeaveRequests: (v: HrLeaveRequest[]) => apiPut('/leave-requests', v),
  saveExpenses: (v: HrExpense[]) => apiPut('/expenses', v),
  saveTickets: (v: HrTicket[]) => apiPut('/tickets', v),
  saveRules: (v: HrRules) => apiPut('/rules', v),
  saveCompanyProfile: (v: HrCompanyProfile) => apiPut('/company-profile', v),
  recordAttendance: (v: HrAttendanceRecord) => apiPost('/attendance', v),
  recordAttendanceOverride: (v: HrAttendanceOverride) => apiPost('/attendance-overrides', v),
  recordPunch: (v: HrPunch) => apiPost('/punch-log', v),
  getPayroll: (month: string) => apiRaw<PayrollApiResult>('/payroll?month=' + encodeURIComponent(month)),
  runPayroll: (month: string, tds?: Record<string, number>) =>
    apiRaw<{ entries: HrPayrollEntry[] }>('/payroll-runs', { method: 'POST', body: JSON.stringify({ month, tds }) }),
  saveTemplate: (name: string, content: string) => apiPut('/templates/' + encodeURIComponent(name), { content }),
  appendAuditLog: (entry: HrAuditLogEntry) => apiPost('/audit-log', entry).catch(() => {}),
  resetSampleData: (keepEmployeeId: string | null) => apiPost('/reset-sample-data', { keepEmployeeId }),
};
