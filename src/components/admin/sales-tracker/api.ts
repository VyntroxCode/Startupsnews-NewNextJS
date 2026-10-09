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
/** `adminNote` = the lead window's Conversation result; the server logs it in the lead's history. */
async function apiSaveLead(lead: SalesLead, adminNote = ''): Promise<SalesLead> {
  const res = await fetch(`${API_BASE}/leads`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(adminNote ? { ...lead, adminNote } : lead) });
  if (!res.ok) throw new Error('Failed to save lead');
  const json = await res.json();
  return json.data;
}
async function apiDeleteLead(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/leads/${encodeURIComponent(id)}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to delete lead');
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
/** The lead's history: what the assigned employees logged from My Leads and the admin's status
 * updates, each with the replies under it. */
async function apiGetFollowUps(source: LeadSource, leadId: string): Promise<LeadFollowUpsView> {
  const qs = new URLSearchParams({ source, leadId });
  const res = await fetch(`${API_BASE}/follow-ups?${qs}`, { headers: getAuthHeaders() });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load follow-ups');
  return json.data;
}
/** Adds the admin's reply under one entry of the lead's history; returns the refreshed history. */
async function apiAddReply(source: LeadSource, leadId: string, followUpId: number, message: string): Promise<LeadFollowUpsView> {
  const res = await fetch(`${API_BASE}/follow-ups/replies`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ source, leadId, followUpId, message }) });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) throw new Error(json?.error || "Couldn't save the reply");
  return json.data;
}

export const salesTrackerApi = {
  getLeads: apiGetLeads,
  saveLead: apiSaveLead,
  deleteLead: apiDeleteLead,
  getAssignments: apiGetAssignments,
  assignLead: apiAssignLead,
  getFollowUps: apiGetFollowUps,
  addReply: apiAddReply,
};
