'use client';

import { useEffect, useState } from 'react';
import { salesTrackerApi } from './api';
import type { SalesLead } from './types';

/** Owns the leads/team data + mutations for the Sales Tracker page, so the page component
 * itself only has to worry about layout and which modal is open. */
export function useSalesTrackerData() {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [team, setTeam] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try { setLeads(await salesTrackerApi.getLeads()); } catch { setLeads([]); }
      try { setTeam(await salesTrackerApi.getTeam()); } catch { setTeam([]); }
      setLoaded(true);
    })();
  }, []);

  async function saveLead(lead: SalesLead): Promise<void> {
    const saved = await salesTrackerApi.saveLead(lead);
    setLeads((prev) => (lead.id && prev.some((l) => l.id === lead.id) ? prev.map((l) => (l.id === lead.id ? saved : l)) : [...prev, saved]));
  }

  async function deleteLead(id: string): Promise<void> {
    try { await salesTrackerApi.deleteLead(id); } catch { alert('Could not delete the lead. Try again.'); return; }
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  async function deleteAllLeads(): Promise<void> {
    if (!leads.length) { alert('There are no leads to delete.'); return; }
    if (!confirm(`Delete ALL ${leads.length} lead(s) from this table? This cannot be undone.`)) return;
    try { await salesTrackerApi.deleteAllLeads(); } catch { alert('Could not delete leads. Try again.'); return; }
    setLeads([]);
  }

  async function updateLeadField(id: string, patch: Partial<SalesLead>): Promise<void> {
    const current = leads.find((l) => l.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    try { await salesTrackerApi.saveLead(updated); } catch { alert('Could not save that change. Try again.'); }
  }

  return { leads, team, loaded, saveLead, deleteLead, deleteAllLeads, updateLeadField, setTeam };
}
