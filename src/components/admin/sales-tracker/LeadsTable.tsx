'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Download } from 'lucide-react';
import { foundUsText, referredByLabel } from '@/modules/ens-travel-enquiries/domain/sources';
import { participationLabel } from '@/modules/ens-travel-enquiries/domain/participation';
import type { AssignableEmployee, DepartmentOption, LeadAssignment } from '@/modules/lead-assignments/domain/types';
import StatusBadge from './StatusBadge';
import { PAGE_LEAD_FILTER_OPTIONS, PAGE_LEAD_LABELS, STATUSES, TYPES } from './constants';
import { exportLeadsCsv, exportLeadsExcel, exportLeadsPdf } from './exports';
import type { UnifiedLeadRow } from './types';
import { assignmentKey } from './useSalesTrackerData';
import { matchesType, statusLabelOf } from './utils';

const DASH = <span className="hint">—</span>;

/** "Filter: assigned to" value for leads nobody is assigned to. */
const UNASSIGNED = 'unassigned';

/** The Assigned cell: up to two names, then "+N". */
function assigneeSummary(a: LeadAssignment | undefined): { text: string; full: string } | null {
  if (!a?.assignees.length) return null;
  const names = a.assignees.map((p) => p.employeeName || 'Former employee');
  return { text: names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2}` : ''), full: names.join(', ') };
}

export default function LeadsTable({ rows, employees, departments, assignments, onEdit, onDelete, filterType, onFilterTypeChange, filterPageType, onFilterPageTypeChange, filterStatus, onFilterStatusChange, jumpToken }: {
  rows: UnifiedLeadRow[];
  /** For the "assigned to" / "department" filters, and each lead's stored departments and people
   * keyed by assignmentKey (edited in the lead window, shown read-only here). */
  employees: AssignableEmployee[];
  departments: DepartmentOption[];
  assignments: Record<string, LeadAssignment>;
  /** Opens the right modal for the row's source — LeadFormModal for a sales_leads row,
   * EnsEnquiryDetailModal for an Expand North Star enquiry. The page component decides which,
   * from `row._source`. Row click and the Edit button both open it straight into edit mode —
   * nothing in the table itself is editable. */
  onEdit: (row: UnifiedLeadRow) => void;
  onDelete: (id: string) => void;
  /** "Filter: type", "Filter: page leads" and "Filter: status" values — owned by the page so a
   * click in Leads overview can set them from outside; the dropdowns below edit the same state.
   * '' = all. */
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  filterPageType: string;
  onFilterPageTypeChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  /** Bumped by a Leads overview click — opens this card and scrolls it into view. */
  jumpToken: number;
}) {
  const [open, setOpen] = useState(false);
  const [filterAssigned, setFilterAssigned] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [exportBusy, setExportBusy] = useState<'excel' | 'pdf' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jumpToken) return;
    // A Leads overview click means "show me exactly these leads" — the page has already set the
    // type/status filters; drop the rest so the table shows the same number of rows it counted.
    // The card may be collapsed and well below the overview, so open it and bring it into view.
    setFilterAssigned('');
    setFilterDepartment('');
    setFilterSearch('');
    setOpen(true);
    cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [jumpToken]);

  const filteredRows = useMemo(() => {
    const q = filterSearch.toLowerCase();
    return rows.filter((r) => {
      if (!matchesType(r, filterType)) return false;
      if (!matchesType(r, filterPageType)) return false;
      if (filterStatus && statusLabelOf(r) !== filterStatus) return false;
      const a = assignments[assignmentKey(r._source, r.id)];
      if (filterAssigned) {
        const people = a?.assignees ?? [];
        if (filterAssigned === UNASSIGNED ? people.length > 0 : !people.some((p) => String(p.credentialId) === filterAssigned)) return false;
      }
      if (filterDepartment && !(a?.departments ?? []).includes(filterDepartment)) return false;
      if (q) {
        const hay = (
          r._source === 'lead'
            ? [r.name, r.company, r.email, r.contact, r.source, r.eventTitle, r.description]
            : [r.name, r.email, r.contact, participationLabel(r.participation), r.requirement, referredByLabel(r.referredBy), foundUsText(r.foundUs, r.foundUsDetail), r.conversationNote]
        ).concat((a?.assignees ?? []).map((p) => p.employeeName), a?.departments ?? []).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const da = a._source === 'lead' ? a.date : a.createdAt.slice(0, 10);
      const db = b._source === 'lead' ? b.date : b.createdAt.slice(0, 10);
      return (db || '').localeCompare(da || '');
    });
  }, [rows, assignments, filterType, filterPageType, filterStatus, filterAssigned, filterDepartment, filterSearch]);

  // CSV / Excel / PDF export exactly the rows on screen — filteredRows, in the table's order, sales
  // leads and Expand North Star enquiries alike (see utils.leadExportRow for the shared columns).
  const assignmentFor = (row: UnifiedLeadRow) => assignments[assignmentKey(row._source, row.id)];

  async function handleExportExcel() {
    setExportBusy('excel');
    try { await exportLeadsExcel(filteredRows, assignmentFor); } finally { setExportBusy(null); }
  }
  async function handleExportPdf() {
    setExportBusy('pdf');
    try { await exportLeadsPdf(filteredRows, assignmentFor); } finally { setExportBusy(null); }
  }

  return (
    <div className="card" ref={cardRef}>
      <div className="card-head" onClick={() => setOpen((o) => !o)}>
        <h2>All leads</h2>
        <span className={`chev${open ? ' open' : ''}`}><ChevronRight size={16} aria-hidden /></span>
      </div>
      <div className={`card-body${open ? '' : ' collapsed'}`}>
        {(filterType || filterPageType || filterStatus) && (
          <div className="pending-banner">
            Showing {[filterPageType && (PAGE_LEAD_LABELS[filterPageType] || filterPageType), filterType, filterStatus].filter(Boolean).join(' · ')} leads only.
            <button type="button" className="small" onClick={(e) => { e.stopPropagation(); onFilterTypeChange(''); onFilterPageTypeChange(''); onFilterStatusChange(''); }}>Show all leads</button>
          </div>
        )}
        <div className="hint" style={{ margin: '0 0 10px' }}>
          Every page&apos;s submissions in one table — Feature Your Startup, Funding Round, Press Release, Sponsor an Event
          and Expand North Star. Click a lead to see all of its details; use Edit to change any of them.
        </div>
        <div className="toolbar">
          <div className="field" style={{ maxWidth: 180 }}><label>Filter: type</label>
            <select value={filterType} onChange={(e) => onFilterTypeChange(e.target.value)}>
              <option value="">All types</option>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 200 }}><label>Filter: page leads</label>
            <select value={filterPageType} onChange={(e) => onFilterPageTypeChange(e.target.value)}>
              <option value="">All page leads</option>{PAGE_LEAD_FILTER_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 180 }}><label>Filter: status</label>
            <select value={filterStatus} onChange={(e) => onFilterStatusChange(e.target.value)}>
              <option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 180 }}><label>Filter: assigned to</label>
            <select value={filterAssigned} onChange={(e) => setFilterAssigned(e.target.value)}>
              <option value="">Everyone</option>
              <option value={UNASSIGNED}>Unassigned</option>
              {employees.map((e) => <option key={e.credentialId} value={String(e.credentialId)}>{e.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 180 }}><label>Filter: department</label>
            <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
              <option value="">All departments</option>
              {departments.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ maxWidth: 200 }}><label>Search</label>
            <input type="text" placeholder="Name, company, email..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)} />
          </div>
          <div className="export-toolbar">
            <button type="button" onClick={() => exportLeadsCsv(filteredRows, assignmentFor)}><Download size={14} aria-hidden />CSV</button>
            <button type="button" disabled={exportBusy === 'excel'} onClick={handleExportExcel}>{exportBusy === 'excel' ? 'Preparing…' : <><Download size={14} aria-hidden />Excel</>}</button>
            <button type="button" disabled={exportBusy === 'pdf'} onClick={handleExportPdf}>{exportBusy === 'pdf' ? 'Preparing…' : <><Download size={14} aria-hidden />PDF</>}</button>
          </div>
        </div>
        <div className="hint" style={{ margin: '-6px 0 10px' }}>Exports contain exactly the leads shown below — every page, including Expand North Star — with your filters and search applied.</div>
        <div className="table-wrap">
          <table id="leadsTable">
            <thead>
              <tr>
                <th>Date</th><th>Name</th><th>Company</th><th>Contact</th><th>Email</th>
                <th>City</th><th>Source</th><th>Referred By</th><th>Assigned</th><th>Current Status</th>
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
                    <td>{isLead && r.company ? r.company : DASH}</td>
                    <td>{r.contact || DASH}</td>
                    <td>{r.email || DASH}</td>
                    <td>{r.city || DASH}</td>
                    <td>{isLead ? (r.source || DASH) : 'Expand North Star'}</td>
                    {/* Only Expand North Star enquiries record a referrer; sales leads have no such field. */}
                    <td>{!isLead && r.referredBy ? referredByLabel(r.referredBy) : DASH}</td>
                    <td>{(() => {
                      const a = assignments[assignmentKey(r._source, r.id)];
                      const summary = assigneeSummary(a);
                      const followUps = a?.followUpCount ?? 0;
                      return (
                        <>
                          {summary ? <span title={summary.full}>{summary.text}</span> : <span className="hint">Unassigned</span>}
                          {followUps > 0 && <div className="hint">{followUps} follow-up{followUps === 1 ? '' : 's'}</div>}
                        </>
                      );
                    })()}</td>
                    <td><StatusBadge value={statusLabelOf(r)} /></td>
                    <td>
                      {isLead ? (
                        <>
                          <button className="small" onClick={(e) => { e.stopPropagation(); onEdit(r); }}>Edit</button>
                          <button className="small danger" onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}>Delete</button>
                        </>
                      ) : (
                        <button className="small" onClick={(e) => { e.stopPropagation(); onEdit(r); }}>Edit</button>
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
