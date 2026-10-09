'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EnsTravelEnquiry } from '@/modules/ens-travel-enquiries/domain/types';
import type { AssignableEmployee, DepartmentOption, LeadAssignment, LeadAssignmentDraft, LeadSource } from '@/modules/lead-assignments/domain/types';
import { salesTrackerApi } from './api';
import { fetchEnsEnquiries } from './ensEnquiriesApi';
import type { SalesLead, UnifiedLeadRow } from './types';

/** Key of a lead's entry in the `assignments` map: the lead's source table plus its id. */
export function assignmentKey(source: LeadSource, leadId: string): string {
  return `${source}:${leadId}`;
}

/** Owns the leads/ENS-enquiry/assignment data + mutations for the Sales Tracker page, so the page
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
  // Each lead's departments and people (sales_lead_departments / sales_lead_assignments), keyed by
  // assignmentKey — a lead with nobody on it has no entry — and the HR employees and departments
  // the lead window's Departments / Assigned to fields offer.
  const [employees, setEmployees] = useState<AssignableEmployee[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [assignments, setAssignments] = useState<Record<string, LeadAssignment>>({});
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
      try {
        const res = await salesTrackerApi.getAssignments();
        setEmployees(res.employees);
        setDepartments(res.departments);
        setAssignments(Object.fromEntries(res.assignments.map((a) => [assignmentKey(a.source, a.leadId), a])));
      } catch { setEmployees([]); setDepartments([]); setAssignments({}); }
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

  async function saveLead(lead: SalesLead, adminNote = ''): Promise<SalesLead> {
    const saved = await salesTrackerApi.saveLead(lead, adminNote);
    setLeads((prev) => (lead.id && prev.some((l) => l.id === lead.id) ? prev.map((l) => (l.id === lead.id ? saved : l)) : [...prev, saved]));
    return saved;
  }

  /** Sets a lead's (either source) departments and people to `draft`. Throws on failure so the
   * caller can show the message. */
  async function assignLead(source: LeadSource, leadId: string, draft: LeadAssignmentDraft): Promise<void> {
    const saved = await salesTrackerApi.assignLead(source, leadId, draft);
    const key = assignmentKey(source, leadId);
    setAssignments((prev) => {
      const next = { ...prev };
      // The PUT answer carries no follow-up count (reassigning never changes it) — keep the one loaded.
      if (saved.assignees.length || saved.departments.length) next[key] = { ...saved, followUpCount: prev[key]?.followUpCount ?? 0 };
      else delete next[key];
      return next;
    });
  }

  async function deleteLead(id: string): Promise<void> {
    try { await salesTrackerApi.deleteLead(id); } catch { alert('Could not delete the lead. Try again.'); return; }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[assignmentKey('lead', id)];
      return next;
    });
  }

  return {
    ensEnquiries, rows, employees, departments, assignments, promotedCities, loaded,
    saveLead, deleteLead, assignLead, applyEnsEnquiryUpdate,
  };
}
