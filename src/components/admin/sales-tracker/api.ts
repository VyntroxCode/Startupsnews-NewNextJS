import { getAuthHeaders } from '@/lib/admin-auth';
import type { AssignableEmployee, DepartmentOption, LeadAssignment, LeadAssignmentDraft, LeadSource } from '@/modules/lead-assignments/domain/types';
import type { LeadFollowUpsView } from '@/modules/lead-followups/domain/types';
import type { SalesLead } from './types';

const API_BASE = '/api/admin/sales-tracker';

async function apiGetLeads(): Promise<{ leads: SalesLead[]; promotedCities: Record<string, string[]> }> {
  const res = await fetch(`${API_BASE}/leads`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load leads');
  const json = await res.json();
  return { leads: json.data || [], promotedCities: json.promotedCities || {} };
}
async function apiSaveLead(lead: SalesLead): Promise<SalesLead> {
  const res = await fetch(`${API_BASE}/leads`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(lead) });
  if (!res.ok) throw new Error('Failed to save lead');
  const json = await res.json();
  return json.data;
}
async function apiDeleteLead(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/leads/${encodeURIComponent(id)}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete lead');
}
async function apiDeleteAllLeads(): Promise<void> {
  const res = await fetch(`${API_BASE}/leads`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete leads');
}
async function apiGetAssignments(): Promise<{ employees: AssignableEmployee[]; departments: DepartmentOption[]; assignments: LeadAssignment[] }> {
  const res = await fetch(`${API_BASE}/assignments`, { headers: getAuthHeaders() });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load assignments');
  return { employees: json.data.employees || [], departments: json.data.departments || [], assignments: json.data.assignments || [] };
}
/** Sets the lead's departments and people to exactly `draft` (empty = unassigned) and returns what's stored. */
async function apiAssignLead(source: LeadSource, leadId: string, draft: LeadAssignmentDraft): Promise<LeadAssignment> {
  const res = await fetch(`${API_BASE}/assignments`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ source, leadId, ...draft }) });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || "Couldn't save the assignment");
  return json.data;
}
/** What the assigned employees logged on one lead from My Leads — read-only here. */
async function apiGetFollowUps(source: LeadSource, leadId: string): Promise<LeadFollowUpsView> {
  const qs = new URLSearchParams({ source, leadId });
  const res = await fetch(`${API_BASE}/follow-ups?${qs}`, { headers: getAuthHeaders() });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load follow-ups');
  return json.data;
}

export const salesTrackerApi = {
  getLeads: apiGetLeads,
  saveLead: apiSaveLead,
  deleteLead: apiDeleteLead,
  deleteAllLeads: apiDeleteAllLeads,
  getAssignments: apiGetAssignments,
  assignLead: apiAssignLead,
  getFollowUps: apiGetFollowUps,
};
