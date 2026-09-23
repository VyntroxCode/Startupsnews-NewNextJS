'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EnsTravelEnquiry } from '@/modules/ens-travel-enquiries/domain/types';
import { salesTrackerApi } from './api';
import { fetchEnsEnquiries } from './ensEnquiriesApi';
import type { SalesLead, UnifiedLeadRow } from './types';

/** Owns the leads/team/ENS-enquiry data + mutations for the Sales Tracker page, so the page
 * component itself only has to worry about layout and which modal is open.
 *
 * ENS enquiries are fetched here too, independently of the leads fetch, purely so the unified
 * `rows` list below can join them into the "All leads" table (their own standalone card was
 * removed 2026-09-23 once this table covered the same data). They are never written back through
 * this hook; editing one still goes through EnsEnquiryDetailModal / ensEnquiriesApi, and
 * `applyEnsEnquiryUpdate` below only patches this hook's own copy after that save succeeds. */
export function useSalesTrackerData() {
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [ensEnquiries, setEnsEnquiries] = useState<EnsTravelEnquiry[]>([]);
  const [team, setTeam] = useState<string[]>([]);
  const [promotedCities, setPromotedCities] = useState<Record<string, string[]>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await salesTrackerApi.getLeads();
        setLeads(res.leads);
        setPromotedCities(res.promotedCities);
      } catch { setLeads([]); }
      try { setEnsEnquiries(await fetchEnsEnquiries()); } catch { setEnsEnquiries([]); }
      try { setTeam(await salesTrackerApi.getTeam()); } catch { setTeam([]); }
      setLoaded(true);
    })();
  }, []);

  const rows = useMemo<UnifiedLeadRow[]>(() => [
    ...leads.map((l): UnifiedLeadRow => ({ _source: 'lead', ...l })),
    ...ensEnquiries.map((e): UnifiedLeadRow => ({ _source: 'ens', ...e })),
  ], [leads, ensEnquiries]);

  function applyEnsEnquiryUpdate(updated: EnsTravelEnquiry): void {
    setEnsEnquiries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  }

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

  return {
    leads, ensEnquiries, rows, team, promotedCities, loaded,
    saveLead, deleteLead, deleteAllLeads, updateLeadField, setTeam, applyEnsEnquiryUpdate,
  };
}
