'use client';

import { useState } from 'react';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import LeadFormModal from '@/components/admin/sales-tracker/LeadFormModal';
import LeadsTable from '@/components/admin/sales-tracker/LeadsTable';
import SalesTrackerStyles from '@/components/admin/sales-tracker/SalesTrackerStyles';
import EnsEnquiryDetailModal from '@/components/admin/sales-tracker/EnsEnquiryDetailModal';
import SummaryCard from '@/components/admin/sales-tracker/SummaryCard';
import PageLeadsKpis from '@/components/admin/sales-tracker/PageLeadsKpis';
import TeamCard from '@/components/admin/sales-tracker/TeamCard';
import { useSalesTrackerData } from '@/components/admin/sales-tracker/useSalesTrackerData';
import { emptyLead } from '@/components/admin/sales-tracker/utils';
import type { SalesLead, UnifiedLeadRow } from '@/components/admin/sales-tracker/types';

export default function SalesTrackerPage() {
  const {
    leads, ensEnquiries, rows, team, promotedCities, loaded,
    saveLead, deleteLead, deleteAllLeads, updateLeadField, setTeam, applyEnsEnquiryUpdate,
  } = useSalesTrackerData();
  const [activeLead, setActiveLead] = useState<SalesLead | null>(null);
  const [activeEnsId, setActiveEnsId] = useState<string | null>(null);
  // Set by the Summary card's "Pending leads" tile, read by LeadsTable to filter down to just
  // those and cleared from there once the reader is done looking — see LeadsTable's own
  // pendingOnly handling for why the filter lives as a prop rather than inside either card.
  const [pendingOnly, setPendingOnly] = useState(false);
  // "Filter: page leads" in All leads, lifted here so the Leads by page tiles can drive it.
  // jumpToken is bumped on a tile click so LeadsTable opens and scrolls into view.
  const [pageFilter, setPageFilter] = useState('');
  const [jumpToken, setJumpToken] = useState(0);

  async function handleSave(lead: SalesLead) {
    await saveLead(lead);
    setActiveLead(null);
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

        <SummaryCard leads={leads} loaded={loaded} onPendingLeadsClick={() => setPendingOnly(true)} />

        <PageLeadsKpis
          rows={rows}
          active={pageFilter}
          onSelect={(value) => { setPageFilter(value); if (value) setJumpToken((n) => n + 1); }}
        />

        {/* Sponsor Event submissions and Expand North Star enquiries used to get their own
            standalone sections here (KPI tiles + table + detail view each). Removed 2026-09-23 —
            all of that data now shows as rows in the unified "All leads" table below, with Sponsor
            Event's fields fully editable there and an Expand North Star row still opening
            EnsEnquiryDetailModal (rendered below) on click, exactly as it did from its old card. */}

        {activeLead && (
          <LeadFormModal lead={activeLead} team={team} promotedCities={promotedCities} onClose={() => setActiveLead(null)} onSave={handleSave} />
        )}

        {activeEnsEnquiry && (
          <EnsEnquiryDetailModal
            key={activeEnsEnquiry.id}
            enquiry={activeEnsEnquiry}
            onClose={() => setActiveEnsId(null)}
            onSaved={applyEnsEnquiryUpdate}
          />
        )}

        <LeadsTable
          rows={rows}
          team={team}
          onEdit={handleRowEdit}
          onDelete={deleteLead}
          onDeleteAll={deleteAllLeads}
          onUpdateField={updateLeadField}
          pendingOnly={pendingOnly}
          onClearPendingOnly={() => setPendingOnly(false)}
          filterPageType={pageFilter}
          onFilterPageTypeChange={setPageFilter}
          jumpToken={jumpToken}
        />

        <TeamCard team={team} onTeamChange={setTeam} />

        <SalesTrackerStyles />
      </div>
    </AdminErrorBoundary>
  );
}
