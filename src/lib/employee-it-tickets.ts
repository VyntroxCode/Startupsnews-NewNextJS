import { getEmployeeAuthHeaders } from '@/lib/employee-auth';
import type { TicketsClientConfig, TicketViewer } from '@/components/admin/it-tickets/TicketsClientContext';

/**
 * IT Tickets UI config for the employee portal (/employee/it-tickets). Kept here, next to
 * employee-auth.ts, so the shared ticket components never import the employee session themselves.
 * A module-level constant on purpose: its identity keys the memoised API client.
 */
export const EMPLOYEE_TICKETS_CONFIG: TicketsClientConfig = {
  variant: 'employee',
  apiBase: '/api/employee/it-tickets',
  presignUrl: '/api/employee/it-tickets/presign',
  getHeaders: getEmployeeAuthHeaders,
  // The employee session stores only { name, employeeCode }, so the ticket identity (credential id +
  // role 'employee') comes from the server.
  loadViewer: async (): Promise<TicketViewer | null> => {
    try {
      const res = await fetch('/api/employee/it-tickets/me', { headers: getEmployeeAuthHeaders() });
      const json = await res.json().catch(() => null);
      return res.ok && json?.success ? (json.data as TicketViewer) : null;
    } catch {
      return null;
    }
  },
  pagePath: '/employee/it-tickets',
  viewStorageKey: 'it-tickets:view:employee',
  defaultView: 'list',
};
