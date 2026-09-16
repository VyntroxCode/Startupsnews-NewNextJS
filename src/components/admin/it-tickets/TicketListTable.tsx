'use client';

import { useMemo } from 'react';
import Avatar from './Avatar';
import { PRIORITY_LABELS } from './constants';
import StatusLozenge from './StatusLozenge';
import { PriorityIcon, TypeIcon } from './TicketIcons';
import { EMPLOYEE_TAG, TD, TH, TH_SORTABLE } from './ui';
import { formatDate, formatDateTime, isOverdue, relativeTime, sortTickets } from './utils';
import type { ItTicket, ItTicketStatus, TicketSort, TicketSortKey } from './types';

interface TicketListTableProps {
  tickets: ItTicket[];
  canManage: boolean;
  sort: TicketSort;
  onSortChange: (sort: TicketSort) => void;
  onOpenTicket: (ticket: ItTicket) => void;
  onStatusChange: (id: string, status: ItTicketStatus) => void;
  /** Shared status policy — disables e.g. Blocked for IT Support. */
  canSetStatus: (from: ItTicketStatus | null, to: ItTicketStatus) => boolean;
  /** Employee portal: every ticket is the viewer's own, so the Reporter column is noise. */
  hideReporter?: boolean;
  /** Admin panel: mark tickets raised from the employee portal. */
  showEmployeeTag?: boolean;
}

const COLUMNS: { key: TicketSortKey | 'type'; label: string; sortable: boolean; className?: string }[] = [
  { key: 'type', label: 'T', sortable: false, className: 'w-10' },
  { key: 'key', label: 'Key', sortable: true, className: 'w-20' },
  { key: 'title', label: 'Summary', sortable: true },
  { key: 'assignee', label: 'Assignee', sortable: true },
  { key: 'reporter', label: 'Reporter', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true, className: 'w-28' },
  { key: 'status', label: 'Status', sortable: true, className: 'w-36' },
  { key: 'created', label: 'Created', sortable: true, className: 'w-28' },
  { key: 'due', label: 'Due', sortable: true, className: 'w-28' },
];

export default function TicketListTable({
  tickets, canManage, sort, onSortChange, onOpenTicket, onStatusChange, canSetStatus, hideReporter, showEmployeeTag,
}: TicketListTableProps) {
  const rows = useMemo(() => sortTickets(tickets, sort), [tickets, sort]);
  const columns = hideReporter ? COLUMNS.filter((c) => c.key !== 'reporter') : COLUMNS;

  function toggleSort(key: TicketSortKey) {
    if (sort.key === key) onSortChange({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    else onSortChange({ key, dir: key === 'created' || key === 'priority' ? 'desc' : 'asc' });
  }

  if (tickets.length === 0) {
    return (
      <div className="rounded-[14px] border border-slate-200 bg-white">
        <div className="p-10 text-center text-sm text-slate-400">No tickets match these filters.</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[14px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)]" data-testid="ticket-list">
      {/* min-w: below this the table scrolls sideways instead of squeezing names onto two lines. */}
      <table className={`w-full ${hideReporter ? 'min-w-[900px]' : 'min-w-[1040px]'} border-collapse text-sm`}>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort.key === c.key;
              return (
                <th
                  key={c.key}
                  className={`${c.sortable ? TH_SORTABLE : TH} ${c.className ?? ''}`}
                  onClick={c.sortable ? () => toggleSort(c.key as TicketSortKey) : undefined}
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  data-sort-key={c.key}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {active && <span aria-hidden className="text-indigo-600">{sort.dir === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const overdue = isOverdue(t);
            return (
              <tr key={t.id} onClick={() => onOpenTicket(t)} className="cursor-pointer hover:bg-indigo-50/40" data-ticket-key={t.ticketKey}>
                <td className={TD}><TypeIcon type={t.type} /></td>
                <td className={`${TD} whitespace-nowrap font-semibold text-slate-500`}>{t.ticketKey}</td>
                <td className={`${TD} min-w-[280px] max-w-[460px] font-medium text-slate-900`}>
                  <span className="line-clamp-2 [overflow-wrap:anywhere]" title={t.title}>{t.title}</span>
                </td>
                <td className={TD}>
                  <span className="inline-flex items-center gap-2 whitespace-nowrap">
                    <Avatar name={t.assigneeName} size="xs" />
                    <span className={t.assigneeName ? '' : 'text-slate-400'}>{t.assigneeName || 'Unassigned'}</span>
                  </span>
                </td>
                {!hideReporter && (
                  <td className={TD}>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <Avatar name={t.reporterName} size="xs" />
                      {t.reporterName}
                      {showEmployeeTag && t.reporterRole === 'employee' && <span className={EMPLOYEE_TAG}>Employee</span>}
                    </span>
                  </td>
                )}
                <td className={`${TD} whitespace-nowrap`}>
                  <span className="inline-flex items-center gap-1.5">
                    <PriorityIcon priority={t.priority} />
                    {PRIORITY_LABELS[t.priority]}
                  </span>
                </td>
                <td className={TD} onClick={(e) => e.stopPropagation()}>
                  <StatusLozenge
                    status={t.status}
                    onChange={canManage ? (s) => onStatusChange(t.id, s) : undefined}
                    isAllowed={(to) => canSetStatus(t.status, to)}
                    aria-label={`Status of ${t.ticketKey}`}
                  />
                </td>
                <td className={`${TD} whitespace-nowrap text-slate-500`} title={formatDateTime(t.createdAt)}>{relativeTime(t.createdAt)}</td>
                <td className={`${TD} whitespace-nowrap ${overdue ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
                  {t.dueDate ? formatDate(t.dueDate) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
