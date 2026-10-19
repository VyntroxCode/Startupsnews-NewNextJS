'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Inbox } from 'lucide-react';
import Avatar from './Avatar';
import Modal from './Modal';
import { PRIORITY_LABELS, STATUS_COLUMNS } from './constants';
import { kpiDrillDown, type ReportKpi } from './reports';
import StatusLozenge from './StatusLozenge';
import { CloseIcon, PriorityIcon, SearchIcon, TypeIcon } from './TicketIcons';
import { BTN_ICON, COMPACT_INPUT, EMPLOYEE_TAG, TD, TH } from './ui';
import { formatDate, formatDateTime, isOverdue, relativeTime } from './utils';
import type { ItTicket, ItTicketStatus } from './types';

interface KpiDrillDownModalProps {
  kpi: ReportKpi;
  tickets: ItTicket[];
  filterSummary: string;
  onOpenTicket: (ticket: ItTicket) => void;
  onClose: () => void;
}

function daysLabel(days: number | null): string {
  if (days === null) return '—';
  if (days === 0) return '< 1 day';
  return `${days} day${days === 1 ? '' : 's'}`;
}

/** Drill-down behind a Reports KPI tile: the exact tickets that make up the number, with a status
 * breakdown strip, a quick search and rows that open the issue view. */
export default function KpiDrillDownModal({ kpi, tickets, filterSummary, onOpenTicket, onClose }: KpiDrillDownModalProps) {
  const drill = useMemo(() => kpiDrillDown(kpi.id, tickets), [kpi.id, tickets]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItTicketStatus | null>(null);

  const statusCounts = useMemo(() => {
    const counts = new Map<ItTicketStatus, number>();
    for (const r of drill.rows) counts.set(r.ticket.status, (counts.get(r.ticket.status) ?? 0) + 1);
    return STATUS_COLUMNS.filter((s) => counts.get(s.key)).map((s) => ({ ...s, count: counts.get(s.key) ?? 0 }));
  }, [drill.rows]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drill.rows.filter(({ ticket: t }) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (!q) return true;
      return [t.ticketKey, t.title, t.assigneeName, t.reporterName].some((v) => v?.toLowerCase().includes(q));
    });
  }, [drill.rows, query, statusFilter]);

  const isDays = kpi.hint === 'days';
  const headline = isDays ? `${kpi.value} day${kpi.value === 1 ? '' : 's'}` : String(kpi.value);

  return (
    <Modal onClose={onClose} size="xl" labelledBy="kpi-drill-title" className="overflow-hidden">
      <div data-testid={`kpi-drill-${kpi.id}`}>
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-slate-200 px-6 py-5 max-sm:px-4">
          <div className="flex h-14 min-w-14 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] px-3 text-[22px] font-bold tabular-nums text-[#4F46E5]">
            {isDays ? kpi.value : drill.rows.length}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="kpi-drill-title" className="m-0 text-[17px] font-bold text-slate-900">{kpi.label}</h2>
            <p className="m-0 mt-1 text-[13px] text-slate-500">{drill.description}</p>
            <p className="m-0 mt-1 text-[12px] text-slate-400">
              {isDays && <>Average {headline} across {drill.rows.length} ticket{drill.rows.length === 1 ? '' : 's'} · </>}
              Filters: {filterSummary}
            </p>
          </div>
          <button type="button" className={BTN_ICON} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {/* Toolbar: status chips + search */}
        {drill.rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-6 py-3 max-sm:px-4">
            <button
              type="button"
              onClick={() => setStatusFilter(null)}
              className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors ${statusFilter === null ? 'border-[#6366F1] bg-[#EEF2FF] text-[#4F46E5]' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}
            >
              All <span className="tabular-nums">{drill.rows.length}</span>
            </button>
            {statusCounts.length > 1 && statusCounts.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStatusFilter(statusFilter === s.key ? null : s.key)}
                className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors ${statusFilter === s.key ? 'border-[#6366F1] bg-[#EEF2FF] text-[#4F46E5]' : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400'}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} aria-hidden />
                {s.label} <span className="tabular-nums">{s.count}</span>
              </button>
            ))}
            <label className="relative ml-auto w-full max-w-[260px] max-sm:max-w-none">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"><SearchIcon size={14} /></span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search key, title or person"
                aria-label="Search these tickets"
                className={`${COMPACT_INPUT} w-full pl-8`}
              />
            </label>
          </div>
        )}

        {/* Body */}
        {drill.rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><Inbox size={22} aria-hidden /></span>
            <div className="text-[14px] font-semibold text-slate-700">Nothing here</div>
            <div className="text-[13px] text-slate-500">No tickets count towards “{kpi.label}” with the current filters.</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13px] text-slate-400">No tickets match your search.</div>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className={`${TH} w-10`}>T</th>
                  <th className={`${TH} w-20`}>Key</th>
                  <th className={TH}>Summary</th>
                  <th className={TH}>Assignee</th>
                  <th className={`${TH} w-28`}>Priority</th>
                  <th className={`${TH} w-32`}>Status</th>
                  <th className={`${TH} w-28`}>{drill.measureLabel ?? 'Created'}</th>
                  <th className={`${TH} w-28`}>Due</th>
                  <th className={`${TH} w-10`} aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ ticket: t, days }) => {
                  const overdue = isOverdue(t);
                  return (
                    <tr
                      key={t.id}
                      onClick={() => onOpenTicket(t)}
                      onKeyDown={(e) => { if (e.key === 'Enter') onOpenTicket(t); }}
                      tabIndex={0}
                      className="group cursor-pointer hover:bg-indigo-50/50 focus:bg-indigo-50/50 focus:outline-none"
                      data-ticket-key={t.ticketKey}
                    >
                      <td className={TD}><TypeIcon type={t.type} /></td>
                      <td className={`${TD} whitespace-nowrap font-semibold text-slate-500`}>{t.ticketKey}</td>
                      <td className={`${TD} min-w-[240px] max-w-[380px] font-medium text-slate-900`}>
                        <span className="line-clamp-2 [overflow-wrap:anywhere]" title={t.title}>{t.title}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] font-normal text-slate-400">
                          by {t.reporterName}
                          {t.reporterRole === 'employee' && <span className={EMPLOYEE_TAG}>Employee</span>}
                        </span>
                      </td>
                      <td className={TD}>
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <Avatar name={t.assigneeName} size="xs" />
                          <span className={t.assigneeName ? '' : 'text-slate-400'}>{t.assigneeName || 'Unassigned'}</span>
                        </span>
                      </td>
                      <td className={`${TD} whitespace-nowrap`}>
                        <span className="inline-flex items-center gap-1.5">
                          <PriorityIcon priority={t.priority} />
                          {PRIORITY_LABELS[t.priority]}
                        </span>
                      </td>
                      <td className={TD}><StatusLozenge status={t.status} /></td>
                      {drill.measureLabel ? (
                        <td className={`${TD} whitespace-nowrap font-semibold tabular-nums ${kpi.id === 'overdue' ? 'text-red-600' : 'text-slate-700'}`}>{daysLabel(days)}</td>
                      ) : (
                        <td className={`${TD} whitespace-nowrap text-slate-500`} title={formatDateTime(t.createdAt)}>{relativeTime(t.createdAt)}</td>
                      )}
                      <td className={`${TD} whitespace-nowrap ${overdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                        {t.dueDate ? formatDate(t.dueDate) : '—'}
                      </td>
                      <td className={`${TD} text-slate-300 group-hover:text-[#6366F1]`}><ArrowRight size={16} aria-hidden /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {drill.rows.length > 0 && (
          <div className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/60 px-6 py-3 text-[12px] text-slate-500 max-sm:px-4">
            <span>Showing {rows.length} of {drill.rows.length}</span>
            <span>Click a row to open the ticket</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
