import { getAuthHeaders } from '@/lib/admin-auth';
import type { SalesLead } from './types';

const API_BASE = '/api/admin/sales-tracker';

async function apiGetLeads(): Promise<SalesLead[]> {
  const res = await fetch(`${API_BASE}/leads`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load leads');
  const json = await res.json();
  return json.data || [];
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
async function apiGetTeam(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/team`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to load team');
  const json = await res.json();
  return json.data || [];
}
async function apiAddTeamMember(name: string): Promise<string[]> {
  const res = await fetch(`${API_BASE}/team`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ name }) });
  if (!res.ok) throw new Error('Failed to add team member');
  const json = await res.json();
  return json.data || [];
}
async function apiRemoveTeamMember(name: string): Promise<void> {
  const res = await fetch(`${API_BASE}/team?name=${encodeURIComponent(name)}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Failed to remove team member');
}

export const salesTrackerApi = {
  getLeads: apiGetLeads,
  saveLead: apiSaveLead,
  deleteLead: apiDeleteLead,
  deleteAllLeads: apiDeleteAllLeads,
  getTeam: apiGetTeam,
  addTeamMember: apiAddTeamMember,
  removeTeamMember: apiRemoveTeamMember,
};
