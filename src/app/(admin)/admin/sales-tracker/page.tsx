'use client';

import { useState } from 'react';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import LeadFormModal from '@/components/admin/sales-tracker/LeadFormModal';
import LeadsTable from '@/components/admin/sales-tracker/LeadsTable';
import SalesTrackerStyles from '@/components/admin/sales-tracker/SalesTrackerStyles';
import EnsEnquiryDetailModal from '@/components/admin/sales-tracker/EnsEnquiryDetailModal';
import LeadsOverview, { type LeadsFilter } from '@/components/admin/sales-tracker/LeadsOverview';
import PageLeadsKpis from '@/components/admin/sales-tracker/PageLeadsKpis';
import { assignmentKey, useSalesTrackerData } from '@/components/admin/sales-tracker/useSalesTrackerData';
import { emptyLead } from '@/components/admin/sales-tracker/utils';
import { PAGE_LEAD_FILTER_OPTIONS } from '@/components/admin/sales-tracker/constants';
import type { SalesLead, UnifiedLeadRow } from '@/components/admin/sales-tracker/types';
import { assignmentToDraft, type LeadAssignmentDraft, sameAssignmentDraft } from '@/modules/lead-assignments/domain/types';

export default function SalesTrackerPage() {
  const {
    ensEnquiries, rows, employees, departments, assignments, promotedCities, loaded,
    saveLead, deleteLead, assignLead, applyEnsEnquiryUpdate,
  } = useSalesTrackerData();
  const [activeLead, setActiveLead] = useState<SalesLead | null>(null);
  // Both lead windows open straight into edit mode; saving an existing lead asks for confirmation.
  const [activeEnsId, setActiveEnsId] = useState<string | null>(null);
  // All leads' "Filter: type" / "Filter: page leads" / "Filter: status", lifted here so a click in
  // Leads overview can drive them. jumpToken is bumped on that click so LeadsTable opens and
  // scrolls into view.
  const [typeFilter, setTypeFilter] = useState('');
  const [pageFilter, setPageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  // All leads' "follow-up due" filter, switched on by the Today's Follow up tile in Leads overview: only open leads
  // whose next follow-up date (the admin's or an assignee's) is today or overdue.
  const [followUpDueOnly, setFollowUpDueOnly] = useState(false);
  const [jumpToken, setJumpToken] = useState(0);

  // An overview lead type is either a page type (its own dropdown in All leads) or a team-picked one.
  function showInAllLeads({ type, status }: LeadsFilter) {
    const isPage = PAGE_LEAD_FILTER_OPTIONS.includes(type);
    setTypeFilter(isPage ? '' : type);
    setPageFilter(isPage ? type : '');
    setStatusFilter(status);
    setFollowUpDueOnly(false);
    setJumpToken((n) => n + 1);
  }

  // The Today's Follow up tile: every lead due, across all pages and statuses — so the other
  // filters are cleared and the table shows exactly the number on the tile.
  function showFollowUpsDue(on: boolean) {
    setFollowUpDueOnly(on);
    if (!on) return;
    setTypeFilter('');
    setPageFilter('');
    setStatusFilter('');
    setJumpToken((n) => n + 1);
  }

  // One Save does everything, in order: the lead (a new lead needs its row before it can be
  // assigned), then its departments and people if they changed. An error keeps the dialog open
  // with its message; saving again is safe (the lead save is an upsert, the assignment save
  // replaces).
  // `adminNote` (the window's Conversation result) rides along with the lead save; the server adds
  // it, and any status change, to the lead's history.
  // The window stays open after a save (same as the Expand North Star window): it is handed the
  // stored lead straight away, so it shows what was saved — and a just-created lead has its id
  // even if the assignment step then fails and the save is retried.
  async function handleSave(lead: SalesLead, assignmentDraft: LeadAssignmentDraft, adminNote: string): Promise<SalesLead> {
    const saved = await saveLead(lead, adminNote);
    setActiveLead(saved);
    const current = assignmentToDraft(assignments[assignmentKey('lead', saved.id)]);
    if (!sameAssignmentDraft(assignmentDraft, current)) await assignLead('lead', saved.id, assignmentDraft);
    return saved;
  }

  // The unified All leads table holds both sales_leads rows and (display-only) Expand North Star
  // enquiries — see useSalesTrackerData's `rows`. A click opens whichever modal actually owns that
  // row's data: LeadFormModal saves through the generic lead upsert, EnsEnquiryDetailModal through
  // its own PATCH endpoint. Neither reads or writes the other's table.
  function handleRowEdit(row: UnifiedLeadRow) {
    if (row._source === 'lead') setActiveLead(row);
    else setActiveEnsId(row.id);
  }

  const activeEnsEnquiry = activeEnsId ? ensEnquiries.find((e) => e.id === activeEnsId) ?? null : null;

  return (
    <AdminErrorBoundary>
      <div className="sales-tracker-page">
        <div className="page-head">
          <div>
            <h1>Sales Tracker</h1>
            <div className="sub">Shared across your team · saved automatically{!loaded ? ' · loading…' : ''}</div>
          </div>
          <button type="button" className="primary" onClick={() => setActiveLead(emptyLead())}>+ Add new lead</button>
        </div>

        <LeadsOverview
          rows={rows}
          assignments={assignments}
          loaded={loaded}
          active={{ type: pageFilter || typeFilter, status: statusFilter }}
          onSelect={showInAllLeads}
          followUpActive={followUpDueOnly}
          onFollowUpSelect={showFollowUpsDue}
        />

        {/* Leads by page tiles: a click shows just that page's leads in All leads; clicking the
            active tile again clears that filter. */}
        <PageLeadsKpis
          rows={rows}
          active={pageFilter}
          onSelect={(value) => (value ? showInAllLeads({ type: value, status: '' }) : setPageFilter(''))}
        />

        {/* Sponsor Event submissions and Expand North Star enquiries used to get their own
            standalone sections here (KPI tiles + table + detail view each). Removed 2026-09-23 —
            all of that data now shows as rows in the unified "All leads" table below, with Sponsor
            Event's fields editable from its lead window and an Expand North Star row still opening
            EnsEnquiryDetailModal (rendered below) on click, exactly as it did from its old card. */}

        {activeLead && (
          <LeadFormModal
            lead={activeLead}
            employees={employees}
            departments={departments}
            assignment={activeLead.id ? assignments[assignmentKey('lead', activeLead.id)] : undefined}
            promotedCities={promotedCities} onClose={() => setActiveLead(null)} onSave={handleSave} />
        )}

        {activeEnsEnquiry && (
          <EnsEnquiryDetailModal
            key={activeEnsEnquiry.id}
            enquiry={activeEnsEnquiry}
            employees={employees}
            departments={departments}
            assignment={assignments[assignmentKey('ens', activeEnsEnquiry.id)]}
            onAssign={(draft) => assignLead('ens', activeEnsEnquiry.id, draft)}
            onClose={() => setActiveEnsId(null)}
            onSaved={applyEnsEnquiryUpdate}
          />
        )}

        <LeadsTable
          rows={rows}
          employees={employees}
          departments={departments}
          assignments={assignments}
          onEdit={handleRowEdit}
          onDelete={deleteLead}
          filterType={typeFilter}
          onFilterTypeChange={setTypeFilter}
          filterPageType={pageFilter}
          onFilterPageTypeChange={setPageFilter}
          filterStatus={statusFilter}
          onFilterStatusChange={setStatusFilter}
          followUpDueOnly={followUpDueOnly}
          onFollowUpDueOnlyChange={setFollowUpDueOnly}
          jumpToken={jumpToken}
        />

        <SalesTrackerStyles />
      </div>
    </AdminErrorBoundary>
  );
}
