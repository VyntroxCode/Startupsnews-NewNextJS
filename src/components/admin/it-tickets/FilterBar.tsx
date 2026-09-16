'use client';

import { useEffect, useState } from 'react';
import Avatar from './Avatar';
import { PRIORITIES, STATUS_COLUMNS, TYPES } from './constants';
import { SearchIcon } from './TicketIcons';
import { CARD, CHIP, CHIP_ACTIVE, COMPACT_INPUT, LINK, SEGMENT, SEGMENT_ACTIVE } from './ui';
import type { TicketAssignee, TicketFilters, TicketViewMode } from './types';

interface FilterBarProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
  view: TicketViewMode;
  onViewChange: (view: TicketViewMode) => void;
  assignees: TicketAssignee[];
  canManage: boolean;
  count: number;
  loaded: boolean;
}

const SEARCH_DEBOUNCE_MS = 300;

/** Toolbar card: search + filters + view switch on the first row; manager-only assignee chips and
 * "Only my tickets" on a second row, so nothing wraps into a ragged line at laptop widths. */
export default function FilterBar({ filters, onFiltersChange, view, onViewChange, assignees, canManage, count, loaded }: FilterBarProps) {
  // Local echo of the search box so typing feels instant while the request is debounced.
  const [search, setSearch] = useState(filters.search ?? '');
  // Re-sync when the filter is changed from outside (e.g. "Clear filters") — the "previous prop"
  // pattern from the React docs, rather than a setState-in-effect.
  const [prevSearch, setPrevSearch] = useState(filters.search);
  if (filters.search !== prevSearch) {
    setPrevSearch(filters.search);
    setSearch(filters.search ?? '');
  }
  useEffect(() => {
    const next = search.trim() || undefined;
    if (next === (filters.search || undefined)) return;
    const t = window.setTimeout(() => onFiltersChange({ ...filters, search: next }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function set<K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) {
    onFiltersChange({ ...filters, [key]: value || undefined });
  }

  function toggleAssignee(a: TicketAssignee) {
    const active = filters.assigneeId === a.id && filters.assigneeRole === a.role;
    onFiltersChange({ ...filters, assigneeId: active ? undefined : a.id, assigneeRole: active ? undefined : a.role });
  }

  const hasFilters = !!(filters.status || filters.priority || filters.type || filters.assigneeId || filters.search || filters.mine);

  return (
    <div className={`${CARD} mb-[18px] px-4 py-3`} data-testid="filter-bar">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative block w-[220px] max-w-full">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search tickets"
            title="Search by key, summary or description"
            aria-label="Search tickets"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${COMPACT_INPUT} w-full pl-8`}
          />
        </label>

        <select className={`${COMPACT_INPUT} w-[132px]`} aria-label="Filter by status" value={filters.status || ''} onChange={(e) => set('status', e.target.value as TicketFilters['status'])}>
          <option value="">All statuses</option>
          {STATUS_COLUMNS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select className={`${COMPACT_INPUT} w-[132px]`} aria-label="Filter by priority" value={filters.priority || ''} onChange={(e) => set('priority', e.target.value as TicketFilters['priority'])}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        <select className={`${COMPACT_INPUT} w-[140px]`} aria-label="Filter by type" value={filters.type || ''} onChange={(e) => set('type', e.target.value as TicketFilters['type'])}>
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>

        {hasFilters && (
          <button type="button" className={`${LINK} px-1`} onClick={() => { setSearch(''); onFiltersChange({}); }} data-testid="clear-filters">
            Clear filters
          </button>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <span className="whitespace-nowrap text-[12.5px] font-medium text-slate-500" data-testid="ticket-count">
            {loaded ? `${count} ticket${count === 1 ? '' : 's'}` : 'Loading…'}
          </span>
          <div className="inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="View">
            <button type="button" role="tab" aria-selected={view === 'board'} onClick={() => onViewChange('board')} className={view === 'board' ? SEGMENT_ACTIVE : SEGMENT}>
              Board
            </button>
            <button type="button" role="tab" aria-selected={view === 'list'} onClick={() => onViewChange('list')} className={view === 'list' ? SEGMENT_ACTIVE : SEGMENT}>
              List
            </button>
          </div>
        </div>
      </div>

      {canManage && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="mr-1 text-[12px] font-semibold text-slate-500">Assignee</span>
          {assignees.length > 0 && (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5" role="group" aria-label="Filter by assignee">
              {assignees.map((a) => {
                const active = filters.assigneeId === a.id && filters.assigneeRole === a.role;
                return (
                  <button
                    key={`${a.role}-${a.id}`}
                    type="button"
                    className={active ? CHIP_ACTIVE : CHIP}
                    onClick={() => toggleAssignee(a)}
                    aria-pressed={active}
                    title={`Assigned to ${a.name}`}
                  >
                    <Avatar name={a.name} size="sm" />
                    <span className="max-w-[140px] truncate">{a.name}</span>
                  </button>
                );
              })}
            </div>
          )}
          <span className="mx-1 hidden h-5 w-px bg-slate-200 sm:inline-block" aria-hidden />
          <button
            type="button"
            className={`${filters.mine ? CHIP_ACTIVE : CHIP} pl-3`}
            onClick={() => set('mine', !filters.mine)}
            aria-pressed={!!filters.mine}
            data-testid="filter-mine"
          >
            Only my tickets
          </button>
        </div>
      )}
    </div>
  );
}
