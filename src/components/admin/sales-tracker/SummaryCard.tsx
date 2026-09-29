'use client';

import { useMemo, useState } from 'react';
import BarChart from './BarChart';
import { isOpenStatusLabel, STATUSES, TYPES } from './constants';
import type { SalesLead } from './types';

export default function SummaryCard({ leads, ensPendingCount, loaded, onPendingLeadsClick }: {
  leads: SalesLead[];
  /** Expand North Star enquiries with no status yet — they're Pending too, and the Pending leads
   * tile opens the All leads table where they sit alongside sales leads. */
  ensPendingCount: number;
  loaded: boolean;
  /** Jumps the reader to All leads filtered down to just the pending ones — see the page's own
   * `pendingOnly` state, which this only sets; LeadsTable owns applying and clearing the filter. */
  onPendingLeadsClick: () => void;
}) {
  const [summaryOpen, setSummaryOpen] = useState(false);

  const totals = useMemo(() => ({
    total: leads.length,
    open: leads.filter((l) => isOpenStatusLabel(l.status)).length,
    closed: leads.filter((l) => l.status === 'Confirmed').length,
    dropped: leads.filter((l) => l.status === 'Not Interested').length,
    // Status Pending, across sales leads and Expand North Star enquiries — the same rows the tile's
    // "View in All leads" filter shows (LeadsTable isPending).
    pending: leads.filter((l) => l.status === 'Pending').length + ensPendingCount,
  }), [leads, ensPendingCount]);

  const typePairs = TYPES.map((t): [string, number] => [t, leads.filter((l) => l.type === t).length]);
  const statusPairs = STATUSES.map((s): [string, number] => [s, leads.filter((l) => l.status === s).length]);

  return (
    <div className="card">
      <div className="card-body" style={{ paddingTop: 20, paddingBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 15.5, color: 'var(--pink-dark)' }}>Summary</h2>
        <div className="metrics" style={{ marginTop: 14, marginBottom: 0 }}>
          <div className="metric"><div className="num">{totals.total}</div><div className="lbl">Total leads</div></div>
          <div className="metric"><div className="num">{totals.open}</div><div className="lbl">Active (Pending + Follow Up)</div></div>
          <div className="metric"><div className="num">{totals.closed}</div><div className="lbl">Confirmed</div></div>
          <div className="metric"><div className="num">{totals.dropped}</div><div className="lbl">Not Interested</div></div>
          <button type="button" className="metric metric-btn" onClick={onPendingLeadsClick}>
            <div className="num">{totals.pending}</div>
            <div className="lbl">Pending leads</div>
            <div className="metric-cta">View in All leads <span className="chev">&#8250;</span></div>
          </button>
        </div>
        {!loaded && <div className="hint" style={{ marginTop: 10 }}>Loading…</div>}
      </div>
      <div className="card-head" style={{ borderTop: '1px solid var(--border)' }} onClick={() => setSummaryOpen((o) => !o)}>
        <h2>Breakdown table and charts</h2>
        <span className={`chev${summaryOpen ? ' open' : ''}`}>&#8250;</span>
      </div>
      <div className={`card-body${summaryOpen ? '' : ' collapsed'}`}>
        <div style={{ overflowX: 'auto' }}>
          <table className="summary-table">
            <thead>
              <tr><th style={{ textAlign: 'left' }}>Type \ Status</th>{STATUSES.map((s) => <th key={s}>{s}</th>)}<th>Total</th></tr>
            </thead>
            <tbody>
              {TYPES.map((t) => {
                const rowLeads = leads.filter((l) => l.type === t);
                return (
                  <tr key={t}>
                    <td className="rowlabel">{t}</td>
                    {STATUSES.map((s) => {
                      const c = rowLeads.filter((l) => l.status === s).length;
                      return <td key={s}>{c || ''}</td>;
                    })}
                    <td className="total">{rowLeads.length}</td>
                  </tr>
                );
              })}
              <tr>
                <td className="rowlabel">Total</td>
                {STATUSES.map((s) => {
                  const c = leads.filter((l) => l.status === s).length;
                  return <td key={s} className="total">{c || ''}</td>;
                })}
                <td className="total">{totals.total}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="charts-wrap">
          <div><div className="chart-title">Leads by type</div><BarChart pairs={typePairs} /></div>
          <div><div className="chart-title">Leads by status</div><BarChart pairs={statusPairs} /></div>
        </div>
      </div>
    </div>
  );
}
