'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { foundUsText, referredByLabel } from '@/modules/ens-travel-enquiries/domain/sources';
import { leadStatusLabel } from '@/modules/ens-travel-enquiries/domain/lead-status';
import { participationLabel } from '@/modules/ens-travel-enquiries/domain/participation';
import StatusSelect from './StatusSelect';
import { ENS_ENQUIRY_TYPE_LABEL, PAGE_LEAD_FILTER_OPTIONS, PAGE_LEAD_LABELS, STATUSES, TYPES } from './constants';
import { exportLeadsCsv, exportLeadsExcel, exportLeadsPdf } from './exports';
import type { SalesLead, UnifiedLeadRow } from './types';

const DASH = <span className="hint">—</span>;

/** Same "never touched since it arrived" rule SummaryCard's Pending leads tile counts by. Only
 * ever true for a sales_leads row — ENS enquiries have their own "no conversation yet" state,
 * tracked by `leadStatus`, not by this. */
function isPending(row: UnifiedLeadRow): boolean {
  return row._source === 'lead' && !!row.createdAt && row.createdAt === row.updatedAt;
}

/** The label shown in the Type column/badge and matched against the type filters. Kept distinct
 * from the raw `type` column so the manual "Others" filter still matches on the stored value, not
 * the "Others: <detail>" display string. */
function typeLabel(row: UnifiedLeadRow): string {
  if (row._source === 'ens') return ENS_ENQUIRY_TYPE_LABEL;
  return row.type === 'Others' && row.otherType ? `Others: ${row.otherType}` : row.type;
}

export function matchesType(row: UnifiedLeadRow, value: string): boolean {
  if (!value) return true;
  return row._source === 'ens' ? value === ENS_ENQUIRY_TYPE_LABEL : row.type === value;
}

export default function LeadsTable({ rows, team, onEdit, onDelete, onDeleteAll, onUpdateField, pendingOnly, onClearPendingOnly, filterPageType, onFilterPageTypeChange, jumpToken }: {
  rows: UnifiedLeadRow[];
  team: string[];
  /** Opens the right modal for the row's source — LeadFormModal for a sales_leads row,
   * EnsEnquiryDetailModal for an Expand North Star enquiry. The page component decides which,
   * from `row._source`. */
  onEdit: (row: UnifiedLeadRow) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  onUpdateField: (id: string, patch: Partial<SalesLead>) => void;
  /** Set by the Summary card's "Pending leads" tile. Owned by the page rather than this component
   * so that tile can turn it on from outside; this component turns it back off once the reader is
   * done, via `onClearPendingOnly`. */
  pendingOnly: boolean;
  onClearPendingOnly: () => void;
  /** "Filter: page leads" value — owned by the page so the Leads by page tiles (PageLeadsKpis)
   * can set it from outside; the dropdown below edits the same state. '' = all. */
  filterPageType: string;
  onFilterPageTypeChange: (value: string) => void;
  /** Bumped by a Leads by page tile click — opens this card and scrolls it into view. */
  jumpToken: number;
}) {
  const [open, setOpen] = useState(false);
  const [filterType, setFilterType] = useState('');
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
  useEffect(() => {
    if (!jumpToken) return;
    setOpen(true);
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [jumpToken]);

  const filteredRows = useMemo(() => {
    const q = filterSearch.toLowerCase();
    return rows.filter((r) => {
      if (pendingOnly && !isPending(r)) return false;
      if (!matchesType(r, filterType)) return false;
      if (!matchesType(r, filterPageType)) return false;
      if (filterStatus && (r._source !== 'lead' || r.status !== filterStatus)) return false;
      if (filterAssigned && (r._source !== 'lead' || r.assignedTo !== filterAssigned)) return false;
      if (q) {
        const hay = (
          r._source === 'lead'
            ? [r.name, r.company, r.email, r.contact, r.source, r.eventTitle, r.description]
            : [r.name, r.email, r.contact, participationLabel(r.participation), r.requirement, referredByLabel(r.referredBy), foundUsText(r.foundUs, r.foundUsDetail), r.conversationNote]
        ).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const da = a._source === 'lead' ? a.date : a.createdAt.slice(0, 10);
      const db = b._source === 'lead' ? b.date : b.createdAt.slice(0, 10);
      return (db || '').localeCompare(da || '');
    });
  }, [rows, pendingOnly, filterType, filterPageType, filterStatus, filterAssigned, filterSearch]);

  // Exports keep their existing SalesLead-only CSV/Excel/PDF shape — ENS enquiries have their own
  // export-free detail view, so they're left out of these rather than reshaping the sheet for them.
  const exportableLeads = useMemo(
    () => filteredRows.filter((r): r is { _source: 'lead' } & SalesLead => r._source === 'lead'),
    [filteredRows]
  );

  async function handleExportExcel() {
    setExportBusy('excel');
    try { await exportLeadsExcel(exportableLeads); } finally { setExportBusy(null); }
  }
  async function handleExportPdf() {
    setExportBusy('pdf');
    try { await exportLeadsPdf(exportableLeads); } finally { setExportBusy(null); }
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
        {filterPageType && (
          <div className="pending-banner">
            Showing {PAGE_LEAD_LABELS[filterPageType] || filterPageType} leads only.
            <button type="button" className="small" onClick={(e) => { e.stopPropagation(); onFilterPageTypeChange(''); }}>Show all leads</button>
          </div>
        )}
        <div style={{ marginBottom: 12 }}>
          <button type="button" className="danger" onClick={onDeleteAll}>🗑 Delete all leads</button>
        </div>
        <div className="hint" style={{ margin: '0 0 10px' }}>
          Every page&apos;s submissions in one table — Feature Your Startup, Funding Round, Press Release, Sponsor an Event
          and Expand North Star. A field that page doesn&apos;t collect shows as “—”.
        </div>
        <div className="toolbar">
          <div className="field" style={{ maxWidth: 180 }}><label>Filter: type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">All types</option>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 200 }}><label>Filter: page leads</label>
            <select value={filterPageType} onChange={(e) => onFilterPageTypeChange(e.target.value)}>
              <option value="">All page leads</option>{PAGE_LEAD_FILTER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
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
            <button type="button" onClick={() => exportLeadsCsv(exportableLeads)}>⬇ CSV</button>
            <button type="button" disabled={exportBusy === 'excel'} onClick={handleExportExcel}>{exportBusy === 'excel' ? 'Preparing…' : '⬇ Excel'}</button>
            <button type="button" disabled={exportBusy === 'pdf'} onClick={handleExportPdf}>{exportBusy === 'pdf' ? 'Preparing…' : '⬇ PDF'}</button>
          </div>
        </div>
        <div className="hint" style={{ margin: '-6px 0 10px' }}>Exports cover sales_leads rows matching your filters/search above (Expand North Star enquiries aren&apos;t included — open one to email or export it individually).</div>
        <div className="table-wrap">
          <table id="leadsTable">
            <thead>
              <tr>
                <th>Date</th><th>Name</th><th>Company</th><th>Contact</th><th>Email</th>
                <th>Country</th><th>City</th>
                <th>Source</th><th>Type</th><th>Query</th><th>Assigned</th><th>Current Status</th>
                <th>Next Follow-up</th><th>Last Connect Date</th><th>Last Call Discussion</th>
                <th>Event Title</th><th>Event Date</th><th>Event Time</th><th>External URL</th><th>Poster</th><th>Event Description</th>
                <th>Participation</th><th>Requirement</th><th>Referred By</th><th>Found Us</th><th>ENS Lead Status</th><th>Conversation Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => {
                const isLead = r._source === 'lead';
                return (
                  <tr key={`${r._source}:${r.id}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, input, select')) return; onEdit(r); }}>
                    <td>{isLead ? r.date : r.createdAt.slice(0, 10)}</td>
                    <td>{r.name}</td>
                    <td>{isLead ? r.company : DASH}</td>
                    <td>{r.contact}</td>
                    <td>{r.email}</td>
                    <td>{r.country || DASH}</td>
                    <td>{r.city || DASH}</td>
                    <td>{isLead ? r.source : 'Expand North Star'}</td>
                    <td><span className="badge">{typeLabel(r)}</span></td>
                    <td className="cell-query">{isLead ? (r.query || '').slice(0, 120) : DASH}</td>
                    <td>{isLead ? (r.assignedTo || <span className="hint">Unassigned</span>) : DASH}</td>
                    <td>{isLead
                      ? <StatusSelect value={r.status} onChange={(v) => onUpdateField(r.id, { status: v })} />
                      : DASH}</td>
                    <td>{isLead
                      ? <input type="date" className="inline-cell" value={r.nextFollowUpDate || ''} onClick={(e) => e.stopPropagation()} onChange={(e) => onUpdateField(r.id, { nextFollowUpDate: e.target.value })} />
                      : DASH}</td>
                    <td>{isLead
                      ? <input type="date" className="inline-cell" value={r.lastConnectDate || ''} onClick={(e) => e.stopPropagation()} onChange={(e) => onUpdateField(r.id, { lastConnectDate: e.target.value })} />
                      : DASH}</td>
                    <td>{isLead
                      ? <input type="text" className="inline-cell inline-cell-text" placeholder="Notes from last call..." defaultValue={r.lastCallDiscussion || ''} onClick={(e) => e.stopPropagation()} onBlur={(e) => { if (e.target.value !== r.lastCallDiscussion) onUpdateField(r.id, { lastCallDiscussion: e.target.value }); }} />
                      : DASH}</td>
                    <td>{isLead && r.eventTitle ? r.eventTitle : DASH}</td>
                    <td>{isLead && r.eventDate ? r.eventDate : DASH}</td>
                    <td>{isLead && r.eventTime ? r.eventTime : DASH}</td>
                    <td>{isLead && r.externalUrl ? <a href={r.externalUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>Link ↗</a> : DASH}</td>
                    <td>{isLead && r.posterUrl ? <a href={r.posterUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>View poster</a> : DASH}</td>
                    <td className="cell-query">{isLead && r.description ? r.description.slice(0, 120) : DASH}</td>
                    <td>{!isLead ? participationLabel(r.participation) : DASH}</td>
                    <td className="cell-query">{!isLead && r.requirement ? r.requirement.slice(0, 120) : DASH}</td>
                    <td>{!isLead ? (r.referredBy ? referredByLabel(r.referredBy) : <span className="hint">Not referred</span>) : DASH}</td>
                    <td>{!isLead ? (foundUsText(r.foundUs, r.foundUsDetail) || DASH) : DASH}</td>
                    <td>{!isLead ? leadStatusLabel(r.leadStatus) : DASH}</td>
                    <td className="cell-query">{!isLead && r.conversationNote ? r.conversationNote.slice(0, 120) : DASH}</td>
                    <td>
                      {isLead ? (
                        <>
                          <button className="small" onClick={(e) => { e.stopPropagation(); onEdit(r); }}>Edit</button>
                          <button className="small danger" onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}>Delete</button>
                        </>
                      ) : (
                        <button className="small" onClick={(e) => { e.stopPropagation(); onEdit(r); }}>View</button>
                      )}
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
