import { getAuthHeaders } from '@/lib/admin-auth';
import type {
  HrBootstrap, HrTeam, HrEmployee, HrOnboarding, HrRegularization, HrLeaveRequest, HrExpense,
  HrTicket, HrRules, HrAttendanceRecord, HrAttendanceOverride, HrPunch, HrPayrollRun, HrAuditLogEntry,
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

export const hrApi = {
  bootstrap: () => apiGet<HrBootstrap>('/bootstrap'),
  saveTeams: (v: HrTeam[]) => apiPut('/teams', v),
  saveDesignations: (v: string[]) => apiPut('/designations', v),
  saveExpenseCategories: (v: string[]) => apiPut('/expense-categories', v),
  saveRequiredDocuments: (v: string[]) => apiPut('/required-documents', v),
  saveHolidays: (v: { date: string; name: string }[]) => apiPut('/holidays', v),
  saveEmployees: (v: HrEmployee[]) => apiPut('/employees', v),
  saveOnboarding: (v: HrOnboarding[]) => apiPut('/onboarding', v),
  saveRegularizations: (v: HrRegularization[]) => apiPut('/regularizations', v),
  saveLeaveRequests: (v: HrLeaveRequest[]) => apiPut('/leave-requests', v),
  saveExpenses: (v: HrExpense[]) => apiPut('/expenses', v),
  saveTickets: (v: HrTicket[]) => apiPut('/tickets', v),
  saveRules: (v: HrRules) => apiPut('/rules', v),
  recordAttendance: (v: HrAttendanceRecord) => apiPost('/attendance', v),
  recordAttendanceOverride: (v: HrAttendanceOverride) => apiPost('/attendance-overrides', v),
  recordPunch: (v: HrPunch) => apiPost('/punch-log', v),
  savePayrollRun: (v: HrPayrollRun) => apiPost('/payroll-runs', v),
  saveTemplate: (name: string, content: string) => apiPut('/templates/' + encodeURIComponent(name), { content }),
  appendAuditLog: (entry: HrAuditLogEntry) => apiPost('/audit-log', entry).catch(() => {}),
  resetSampleData: (keepEmployeeId: string | null) => apiPost('/reset-sample-data', { keepEmployeeId }),
};
