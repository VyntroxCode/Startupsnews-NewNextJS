'use client';

import { useMemo, useState } from 'react';
import BarChart from './BarChart';
import { SUMMARY_STATUSES, STATUS_TO_SUMMARY, TYPES, STATUSES } from './constants';
import type { SalesLead } from './types';

export default function SummaryCard({ leads, loaded }: { leads: SalesLead[]; loaded: boolean }) {
  const [summaryOpen, setSummaryOpen] = useState(false);

  const totals = useMemo(() => ({
    total: leads.length,
    open: leads.filter((l) => !['Successfully closed', 'Dropped'].includes(l.status)).length,
    closed: leads.filter((l) => l.status === 'Successfully closed').length,
    dropped: leads.filter((l) => l.status === 'Dropped').length,
  }), [leads]);

  const typePairs = TYPES.map((t): [string, number] => [t, leads.filter((l) => l.type === t).length]);
  const statusPairs = STATUSES.map((s): [string, number] => [s, leads.filter((l) => l.status === s).length]);

  return (
    <div className="card">
      <div className="card-body" style={{ paddingTop: 20, paddingBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 15.5, color: 'var(--pink-dark)' }}>Summary</h2>
        <div className="metrics" style={{ marginTop: 14, marginBottom: 0 }}>
          <div className="metric"><div className="num">{totals.total}</div><div className="lbl">Total leads</div></div>
          <div className="metric"><div className="num">{totals.open}</div><div className="lbl">Active</div></div>
          <div className="metric"><div className="num">{totals.closed}</div><div className="lbl">Closed</div></div>
          <div className="metric"><div className="num">{totals.dropped}</div><div className="lbl">Dropped</div></div>
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
              <tr><th style={{ textAlign: 'left' }}>Type \ Status</th>{SUMMARY_STATUSES.map((s) => <th key={s}>{s}</th>)}<th>Total</th></tr>
            </thead>
            <tbody>
              {TYPES.map((t) => {
                const rowLeads = leads.filter((l) => l.type === t);
                return (
                  <tr key={t}>
                    <td className="rowlabel">{t}</td>
                    {SUMMARY_STATUSES.map((s) => {
                      const c = rowLeads.filter((l) => STATUS_TO_SUMMARY[l.status] === s).length;
                      return <td key={s}>{c || ''}</td>;
                    })}
                    <td className="total">{rowLeads.length}</td>
                  </tr>
                );
              })}
              <tr>
                <td className="rowlabel">Total</td>
                {SUMMARY_STATUSES.map((s) => {
                  const c = leads.filter((l) => STATUS_TO_SUMMARY[l.status] === s).length;
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
