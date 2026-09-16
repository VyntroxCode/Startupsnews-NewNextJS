'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import StatusSelect from './StatusSelect';
import { PAGE_LEAD_TYPES, STATUSES, TYPES } from './constants';
import { exportLeadsCsv, exportLeadsExcel, exportLeadsPdf } from './exports';
import type { SalesLead } from './types';

/** Same "never touched since it arrived" rule SummaryCard's Pending leads tile counts by. */
function isPending(l: SalesLead): boolean {
  return !!l.createdAt && l.createdAt === l.updatedAt;
}

export default function LeadsTable({ leads, team, onEdit, onDelete, onDeleteAll, onUpdateField, pendingOnly, onClearPendingOnly }: {
  leads: SalesLead[];
  team: string[];
  onEdit: (lead: SalesLead) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  onUpdateField: (id: string, patch: Partial<SalesLead>) => void;
  /** Set by the Summary card's "Pending leads" tile. Owned by the page rather than this component
   * so that tile can turn it on from outside; this component turns it back off once the reader is
   * done, via `onClearPendingOnly`. */
  pendingOnly: boolean;
  onClearPendingOnly: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterPageType, setFilterPageType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [exportBusy, setExportBusy] = useState<'excel' | 'pdf' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Jumping in from the Pending leads tile should open the (possibly collapsed) card and bring it
  // into view — the tile can be clicked from well above this section on a long page.
  useEffect(() => {
    if (!pendingOnly) return;
    setOpen(true);
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pendingOnly]);

  const filteredLeads = useMemo(() => {
    const q = filterSearch.toLowerCase();
    return leads.filter((l) => {
      if (pendingOnly && !isPending(l)) return false;
      if (filterType && l.type !== filterType) return false;
      if (filterPageType && l.type !== filterPageType) return false;
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterAssigned && l.assignedTo !== filterAssigned) return false;
      if (q) {
        const hay = [l.name, l.company, l.email, l.contact, l.source].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [leads, pendingOnly, filterType, filterPageType, filterStatus, filterAssigned, filterSearch]);

  async function handleExportExcel() {
    setExportBusy('excel');
    try { await exportLeadsExcel(filteredLeads); } finally { setExportBusy(null); }
  }
  async function handleExportPdf() {
    setExportBusy('pdf');
    try { await exportLeadsPdf(filteredLeads); } finally { setExportBusy(null); }
  }

  return (
    <div className="card" ref={cardRef}>
      <div className="card-head" onClick={() => setOpen((o) => !o)}>
        <h2>All leads</h2>
        <span className={`chev${open ? ' open' : ''}`}>&#8250;</span>
      </div>
      <div className={`card-body${open ? '' : ' collapsed'}`}>
        {pendingOnly && (
          <div className="pending-banner">
            Showing pending leads only — arrived, not yet touched.
            <button type="button" className="small" onClick={(e) => { e.stopPropagation(); onClearPendingOnly(); }}>Show all leads</button>
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <button type="button" className="danger" onClick={onDeleteAll}>🗑 Delete all leads</button>
        </div>
        <div className="toolbar">
          <div className="field" style={{ maxWidth: 180 }}><label>Filter: type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All types</option>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 180 }}><label>Filter: page leads</label>
            <select value={filterPageType} onChange={(e) => setFilterPageType(e.target.value)}>
              <option value="">All page leads</option>{PAGE_LEAD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 180 }}><label>Filter: status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 180 }}><label>Filter: assigned to</label>
            <select value={filterAssigned} onChange={(e) => setFilterAssigned(e.target.value)}>
              <option value="">All members</option>{team.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 200 }}><label>Search</label>
            <input type="text" placeholder="Name, company, email..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
          </div>
          <div className="export-toolbar">
            <button type="button" onClick={() => exportLeadsCsv(filteredLeads)}>⬇ CSV</button>
            <button type="button" disabled={exportBusy === 'excel'} onClick={handleExportExcel}>{exportBusy === 'excel' ? 'Preparing…' : '⬇ Excel'}</button>
            <button type="button" disabled={exportBusy === 'pdf'} onClick={handleExportPdf}>{exportBusy === 'pdf' ? 'Preparing…' : '⬇ PDF'}</button>
          </div>
        </div>
        <div className="hint" style={{ margin: '-6px 0 10px' }}>Exports use the leads currently matching your filters/search above.</div>
        <div className="table-wrap">
          <table id="leadsTable">
            <thead>
              <tr>
                <th>Date</th><th>Name</th><th>Company</th><th>Contact</th><th>Email</th>
                <th>Country</th><th>City</th>
                <th>Source</th><th>Type</th><th>Query</th><th>Assigned</th><th>Current Status</th>
                <th>Next Follow-up</th><th>Last Connect Date</th><th>Last Call Discussion</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((l) => {
                const typeLabel = l.type === 'Others' && l.otherType ? `Others: ${l.otherType}` : l.type;
                return (
                  <tr key={l.id} onClick={(e) => { if ((e.target as HTMLElement).closest('button, input, select')) return; onEdit(l); }}>
                    <td>{l.date}</td>
                    <td>{l.name}</td>
                    <td>{l.company}</td>
                    <td>{l.contact}</td>
                    <td>{l.email}</td>
                    <td>{l.country || <span className="hint">—</span>}</td>
                    <td>{l.city || <span className="hint">—</span>}</td>
                    <td>{l.source}</td>
                    <td><span className="badge">{typeLabel}</span></td>
                    <td className="cell-query">{(l.query || '').slice(0, 120)}</td>
                    <td>{l.assignedTo || <span className="hint">Unassigned</span>}</td>
                    <td><StatusSelect value={l.status} onChange={(v) => onUpdateField(l.id, { status: v })} /></td>
                    <td><input type="date" className="inline-cell" value={l.nextFollowUpDate || ''} onClick={(e) => e.stopPropagation()} onChange={(e) => onUpdateField(l.id, { nextFollowUpDate: e.target.value })} /></td>
                    <td><input type="date" className="inline-cell" value={l.lastConnectDate || ''} onClick={(e) => e.stopPropagation()} onChange={(e) => onUpdateField(l.id, { lastConnectDate: e.target.value })} /></td>
                    <td><input type="text" className="inline-cell inline-cell-text" placeholder="Notes from last call..." defaultValue={l.lastCallDiscussion || ''} onClick={(e) => e.stopPropagation()} onBlur={(e) => { if (e.target.value !== l.lastCallDiscussion) onUpdateField(l.id, { lastCallDiscussion: e.target.value }); }} /></td>
                    <td>
                      <button className="small" onClick={(e) => { e.stopPropagation(); onEdit(l); }}>Edit</button>
                      <button className="small danger" onClick={(e) => { e.stopPropagation(); onDelete(l.id); }}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
