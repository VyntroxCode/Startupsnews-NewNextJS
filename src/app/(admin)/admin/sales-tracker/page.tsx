'use client';

import { useState } from 'react';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import LeadFormModal from '@/components/admin/sales-tracker/LeadFormModal';
import LeadsTable from '@/components/admin/sales-tracker/LeadsTable';
import SalesTrackerStyles from '@/components/admin/sales-tracker/SalesTrackerStyles';
import SummaryCard from '@/components/admin/sales-tracker/SummaryCard';
import TeamCard from '@/components/admin/sales-tracker/TeamCard';
import { useSalesTrackerData } from '@/components/admin/sales-tracker/useSalesTrackerData';
import { emptyLead } from '@/components/admin/sales-tracker/utils';
import type { SalesLead } from '@/components/admin/sales-tracker/types';

export default function SalesTrackerPage() {
  const { leads, team, loaded, saveLead, deleteLead, deleteAllLeads, updateLeadField, setTeam } = useSalesTrackerData();
  const [activeLead, setActiveLead] = useState<SalesLead | null>(null);

  async function handleSave(lead: SalesLead) {
    await saveLead(lead);
    setActiveLead(null);
  }

  return (
    <AdminErrorBoundary>
      <div className="sales-tracker-page">
        <h1>Sales Tracker</h1>
        <div className="sub">Shared across your team · saved automatically{!loaded ? ' · loading…' : ''}</div>

        <SummaryCard leads={leads} loaded={loaded} />

        <div className="card">
          <div className="card-head" onClick={() => setActiveLead(emptyLead())}><h2>+ Add new lead</h2></div>
        </div>

        {activeLead && (
          <LeadFormModal lead={activeLead} team={team} onClose={() => setActiveLead(null)} onSave={handleSave} />
        )}

        <TeamCard team={team} onTeamChange={setTeam} />

        <LeadsTable
          leads={leads}
          team={team}
          onEdit={setActiveLead}
          onDelete={deleteLead}
          onDeleteAll={deleteAllLeads}
          onUpdateField={updateLeadField}
        />

        <SalesTrackerStyles />
      </div>
    </AdminErrorBoundary>
  );
}
