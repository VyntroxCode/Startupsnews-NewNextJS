'use client';

import { useMemo } from 'react';
import { PAGE_LEAD_FILTER_OPTIONS, PAGE_LEAD_LABELS } from './constants';
import { matchesType } from './LeadsTable';
import type { UnifiedLeadRow } from './types';

/** Still needs work: a sales lead not yet Successfully closed / Dropped, or an Expand North Star
 * enquiry not yet Confirmed / Cancelled (no conversation yet or Followed Up). */
function isOpen(row: UnifiedLeadRow): boolean {
  if (row._source === 'ens') return row.leadStatus !== 'confirmed' && row.leadStatus !== 'cancelled';
  return row.status !== 'Successfully closed' && row.status !== 'Dropped';
}

/** "Leads by page" — one clickable tile per public page that feeds the Sales Tracker, showing how
 * many leads came from it. Clicking a tile filters the All leads table down to that page (same
 * state as its "Filter: page leads" dropdown, owned by the page); clicking the active tile again
 * clears the filter. Counts use the same matchesType rule the table filters by, so a tile's number
 * always equals the rows it shows. A tile turns red while that page has any lead not yet closed
 * (see isOpen), with the count of those shown on the tile. */
export default function PageLeadsKpis({ rows, active, onSelect }: {
  rows: UnifiedLeadRow[];
  active: string;
  onSelect: (value: string) => void;
}) {
  const counts = useMemo(
    () => PAGE_LEAD_FILTER_OPTIONS.map((t) => {
      const pageRows = rows.filter((r) => matchesType(r, t));
      return { type: t, total: pageRows.length, open: pageRows.filter(isOpen).length };
    }),
    [rows]
  );

  return (
    <div className="card">
      <div className="card-body" style={{ paddingTop: 20, paddingBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 15.5, color: 'var(--pink-dark)' }}>Leads by page</h2>
        <div className="hint" style={{ marginTop: 4 }}>Click a page to see only its leads in All leads below.</div>
        <div className="metrics" style={{ marginTop: 14, marginBottom: 0 }}>
          {counts.map(({ type, total, open }) => {
            const isActive = active === type;
            return (
              <button
                key={type}
                type="button"
                className={`metric metric-btn${open > 0 ? ' alert' : ''}${isActive ? ' active' : ''}`}
                aria-pressed={isActive}
                onClick={() => onSelect(isActive ? '' : type)}
              >
                <div className="num">{total}</div>
                <div className="lbl">{PAGE_LEAD_LABELS[type] || type}</div>
                {open > 0 && <div className="metric-open">{open} not closed</div>}
                <div className="metric-cta">{isActive ? 'Showing in All leads · clear' : 'View in All leads'} <span className="chev">&#8250;</span></div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
