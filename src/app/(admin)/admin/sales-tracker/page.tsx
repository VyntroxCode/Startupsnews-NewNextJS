'use client';

import { useState } from 'react';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import LeadFormModal from '@/components/admin/sales-tracker/LeadFormModal';
import LeadsTable from '@/components/admin/sales-tracker/LeadsTable';
import SalesTrackerStyles from '@/components/admin/sales-tracker/SalesTrackerStyles';
import SponsorEventSubmissionsCard from '@/components/admin/sales-tracker/SponsorEventSubmissionsCard';
import SummaryCard from '@/components/admin/sales-tracker/SummaryCard';
import TeamCard from '@/components/admin/sales-tracker/TeamCard';
import { useSalesTrackerData } from '@/components/admin/sales-tracker/useSalesTrackerData';
import { emptyLead } from '@/components/admin/sales-tracker/utils';
import type { SalesLead } from '@/components/admin/sales-tracker/types';

export default function SalesTrackerPage() {
  const { leads, team, promotedCities, loaded, saveLead, deleteLead, deleteAllLeads, updateLeadField, setTeam } = useSalesTrackerData();
  const [activeLead, setActiveLead] = useState<SalesLead | null>(null);
  // Set by the Summary card's "Pending leads" tile, read by LeadsTable to filter down to just
  // those and cleared from there once the reader is done looking — see LeadsTable's own
  // pendingOnly handling for why the filter lives as a prop rather than inside either card.
  const [pendingOnly, setPendingOnly] = useState(false);

  async function handleSave(lead: SalesLead) {
    await saveLead(lead);
    setActiveLead(null);
  }

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

        {/* /sponsor-event submissions have their own fields (event, schedule, poster), so they get
            their own KPI tiles + table + detail view here, not just a row in All leads. */}
        <SponsorEventSubmissionsCard />

        {activeLead && (
          <LeadFormModal lead={activeLead} team={team} promotedCities={promotedCities} onClose={() => setActiveLead(null)} onSave={handleSave} />
        )}

        <LeadsTable
          leads={leads}
          team={team}
          onEdit={setActiveLead}
          onDelete={deleteLead}
          onDeleteAll={deleteAllLeads}
          onUpdateField={updateLeadField}
          pendingOnly={pendingOnly}
          onClearPendingOnly={() => setPendingOnly(false)}
        />

        <TeamCard team={team} onTeamChange={setTeam} />

        <SalesTrackerStyles />
      </div>
    </AdminErrorBoundary>
  );
}
