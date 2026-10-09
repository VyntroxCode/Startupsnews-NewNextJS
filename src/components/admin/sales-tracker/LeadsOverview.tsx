'use client';

import { Fragment, useMemo } from 'react';
import { CalendarClock } from 'lucide-react';
import type { LeadAssignment } from '@/modules/lead-assignments/domain/types';
import { FOLLOW_UP_TAG, localToday } from '@/modules/lead-followups/domain/follow-up-date';
import { PAGE_LEAD_FILTER_OPTIONS, PAGE_LEAD_LABELS, STATUSES, TYPES } from './constants';
import { assignmentKey } from './useSalesTrackerData';
import { followUpTagOf, matchesType, statusLabelOf } from './utils';
import type { UnifiedLeadRow } from './types';

/** What a click in the overview asks All leads to show: one lead type (a page type, Expand North
 * Star or a team-picked type) and/or one status. '' = any. */
export interface LeadsFilter { type: string; status: string }

/** Per-status colours — the same four tones as StatusBadge (amber / blue / green / red). */
const STATUS_STYLE: Record<string, { bar: string; edge: string }> = {
  Pending: { bar: 'bg-amber-400', edge: 'border-l-amber-400' },
  'Follow Up': { bar: 'bg-blue-500', edge: 'border-l-blue-500' },
  Confirmed: { bar: 'bg-emerald-500', edge: 'border-l-emerald-500' },
  'Not Interested': { bar: 'bg-red-500', edge: 'border-l-red-500' },
};

/** Every lead type, in two groups: where a lead came in from on the site (including Expand North
 * Star) and the channels a team member picks when adding one by hand. */
const GROUPS: { label: string; types: readonly string[] }[] = [
  { label: 'From website pages', types: PAGE_LEAD_FILTER_OPTIONS },
  { label: 'Added by the team', types: TYPES },
];

type Counts = { total: number; byStatus: Record<string, number> };

function countRows(list: UnifiedLeadRow[]): Counts {
  const byStatus: Record<string, number> = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const r of list) byStatus[statusLabelOf(r)] += 1;
  return { total: list.length, byStatus };
}

const typeLabel = (t: string) => PAGE_LEAD_LABELS[t] || t;
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

/** One clickable number in the breakdown table; a zero is a plain dash. */
function CountButton({ n, active, strong, title, onClick }: { n: number; active: boolean; strong?: boolean; title: string; onClick: () => void }) {
  if (!n) return <span className="text-slate-300">—</span>;
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={active
        ? 'tw min-w-9 cursor-pointer rounded-md border-0 bg-indigo-600 px-2 py-1 font-[inherit] text-[13px] font-bold text-white tabular-nums'
        : `tw min-w-9 cursor-pointer rounded-md border-0 bg-transparent px-2 py-1 font-[inherit] text-[13px] tabular-nums hover:bg-indigo-100 hover:text-indigo-700 ${strong ? 'font-bold text-indigo-700' : 'font-semibold text-slate-700'}`}
    >
      {n}
    </button>
  );
}

/** "Leads overview" — every lead in the tracker (sales leads from every website page and the team,
 * plus Expand North Star enquiries), counted from the same `rows` the All leads table lists and by
 * the same rules it filters with (matchesType, statusLabelOf), so every number equals the rows a
 * click shows. Status tiles across the top, then a lead type × status table and a stacked bar per
 * lead type.
 *
 * The first tile is "Today's Follow up": every open lead whose next follow-up date is today or
 * already past, whoever set that date — the admin (the lead's own date) or any assigned employee
 * (their own, set with a follow-up in My Leads). It shows two numbers — leads due Today and leads
 * Overdue (a lead with both counts once, as overdue; see utils.followUpTagOf) — and is red while
 * there is at least one, plain when nobody has a follow-up due. Clicking it lists exactly those leads in All leads (state owned
 * by the page); clicking it again clears that. A lead leaves it when the person whose date it is
 * sets a later one, or the lead becomes Confirmed / Not Interested. It counts with the same
 * rule the table filters and tags by. Replaced the old Summary card (team-picked types only, ENS counted in one tile only)
 * and the Leads by page tiles, 2026-10-05. */
export default function LeadsOverview({ rows, assignments, loaded, active, onSelect, followUpActive, onFollowUpSelect }: {
  rows: UnifiedLeadRow[];
  /** Each lead's people (with their own next follow-up dates), keyed by assignmentKey. */
  assignments: Record<string, LeadAssignment>;
  loaded: boolean;
  /** The All leads filters currently applied, to highlight the matching tile / number. */
  active: LeadsFilter;
  /** Applies a filter to All leads and scrolls it into view — owned by the page. */
  onSelect: (filter: LeadsFilter) => void;
  /** Whether All leads is showing only the leads in Today's Follow up, and the switch for it. */
  followUpActive: boolean;
  onFollowUpSelect: (on: boolean) => void;
}) {
  const due = useMemo(() => {
    const today = localToday();
    let dueToday = 0;
    let overdue = 0;
    for (const r of rows) {
      const tag = followUpTagOf(r, assignments[assignmentKey(r._source, r.id)], today);
      if (tag === 'overdue') overdue++;
      else if (tag === 'today') dueToday++;
    }
    return { total: dueToday + overdue, dueToday, overdue };
  }, [rows, assignments]);

  const stats = useMemo(() => {
    const known = new Set(GROUPS.flatMap((g) => g.types));
    return {
      all: countRows(rows),
      groups: GROUPS.map((g) => ({
        label: g.label,
        types: g.types.map((t) => ({ type: t, ...countRows(rows.filter((r) => matchesType(r, t))) })),
      })),
      // A sales lead whose type is in neither list (e.g. blank) — counted so the rows add up to
      // the total, but not clickable since All leads has no filter for it.
      untyped: countRows(rows.filter((r) => r._source === 'lead' && !known.has(r.type))),
    };
  }, [rows]);

  const maxTypeTotal = Math.max(1, ...stats.groups.flatMap((g) => g.types.map((t) => t.total)));
  const isActive = (type: string, status: string) => active.type === type && active.status === status;

  return (
    <div className="card">
      <div className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="m-0 text-[15.5px] font-bold text-indigo-600">Leads overview</h2>
          <p className="m-0 text-xs text-slate-500">
            {loaded ? 'Every page, Expand North Star and leads added by the team. Click any number to see those leads in All leads.' : 'Loading…'}
          </p>
        </div>

        {/* Status tiles */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <button
            type="button"
            aria-pressed={followUpActive}
            title="Open leads whose next follow-up date is today or has passed, set by you or by the people assigned"
            onClick={() => onFollowUpSelect(!followUpActive)}
            className={`tw flex w-full cursor-pointer flex-col items-start rounded-[10px] border border-l-[3px] px-4 py-3 text-left font-[inherit] transition-colors ${
              due.total > 0
                ? `border-red-200 border-l-red-600 bg-red-50 hover:border-red-400 ${followUpActive ? 'ring-3 ring-red-500/25' : ''}`
                : `border-l-slate-300 ${followUpActive ? 'border-indigo-300 bg-indigo-50 ring-3 ring-indigo-500/20' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`
            }`}
          >
            {/* Two numbers, not a total: leads due today and leads whose date has already passed. */}
            <span className="flex w-full items-end gap-4">
              <span className="flex flex-col">
                <span className={`text-2xl font-bold leading-tight tabular-nums ${due.dueToday > 0 ? FOLLOW_UP_TAG.today.text : 'text-slate-300'}`}>{due.dueToday}</span>
                <span className={`text-[11px] font-semibold ${due.dueToday > 0 ? FOLLOW_UP_TAG.today.text : 'text-slate-400'}`}>Today</span>
              </span>
              <span className="flex flex-col">
                <span className={`text-2xl font-bold leading-tight tabular-nums ${due.overdue > 0 ? FOLLOW_UP_TAG.overdue.text : 'text-slate-300'}`}>{due.overdue}</span>
                <span className={`text-[11px] font-semibold ${due.overdue > 0 ? FOLLOW_UP_TAG.overdue.text : 'text-slate-400'}`}>Overdue</span>
              </span>
            </span>
            <span className={`mt-1 flex items-center gap-1 text-xs font-semibold ${due.total > 0 ? 'text-red-700' : 'text-slate-600'}`}>
              <CalendarClock size={13} aria-hidden />Today&apos;s Follow up
            </span>
            <span className={`mt-1 text-[11.5px] ${due.total > 0 ? 'text-red-600' : 'text-slate-400'}`}>
              {due.total > 0 ? (followUpActive ? 'Showing in All leads · clear' : 'View in All leads') : 'Nothing due'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onSelect({ type: '', status: '' })}
            className="tw flex w-full cursor-pointer flex-col items-start rounded-[10px] border border-l-[3px] border-slate-200 border-l-indigo-500 bg-white px-4 py-3 text-left font-[inherit] transition-colors hover:border-indigo-300 hover:bg-slate-50"
          >
            <span className="text-2xl font-bold leading-tight text-slate-900 tabular-nums">{stats.all.total}</span>
            <span className="mt-0.5 text-xs font-semibold text-slate-600">All leads</span>
            <span className="mt-1 text-[11.5px] text-slate-400">Show every lead</span>
          </button>
          {STATUSES.map((s) => {
            const n = stats.all.byStatus[s];
            const on = isActive('', s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => onSelect({ type: '', status: s })}
                className={`tw flex w-full cursor-pointer flex-col items-start rounded-[10px] border border-l-[3px] px-4 py-3 text-left font-[inherit] transition-colors ${STATUS_STYLE[s]?.edge ?? ''} ${on ? 'border-indigo-300 bg-indigo-50 ring-3 ring-indigo-500/20' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'}`}
              >
                <span className="text-2xl font-bold leading-tight text-slate-900 tabular-nums">{n}</span>
                <span className="mt-0.5 text-xs font-semibold text-slate-600">{s}</span>
                <span className="mt-1 text-[11.5px] text-slate-400">{pct(n, stats.all.total)}% of all leads</span>
              </button>
            );
          })}
        </div>

        {/* All leads split by status, one segment per status (widths are data, hence inline style) */}
        <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={STATUSES.map((s) => `${s}: ${stats.all.byStatus[s]}`).join(', ')}>
          {STATUSES.map((s) => stats.all.byStatus[s] > 0 && (
            <div key={s} className={STATUS_STYLE[s]?.bar} style={{ width: `${pct(stats.all.byStatus[s], stats.all.total)}%` }} title={`${s}: ${stats.all.byStatus[s]}`} />
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* Lead type × status table */}
          <div className="min-w-0">
            <div className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">Leads by type and status</div>
            <div className="overflow-x-auto rounded-[10px] border border-slate-200">
              <table className="tw w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Lead type</th>
                    {STATUSES.map((s) => (
                      <th key={s} className="whitespace-nowrap px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s}</th>
                    ))}
                    <th className="bg-indigo-50 px-2 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-indigo-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.groups.map((g) => (
                    <Fragment key={g.label}>
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td colSpan={STATUSES.length + 2} className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{g.label}</td>
                      </tr>
                      {g.types.map((t) => (
                        <tr key={t.type} className="border-t border-slate-100">
                          <td className="whitespace-nowrap px-3 py-1 font-semibold text-slate-800">{typeLabel(t.type)}</td>
                          {STATUSES.map((s) => (
                            <td key={s} className="px-1 py-1 text-center">
                              <CountButton n={t.byStatus[s]} active={isActive(t.type, s)} title={`Show ${typeLabel(t.type)} leads that are ${s}`} onClick={() => onSelect({ type: t.type, status: s })} />
                            </td>
                          ))}
                          <td className="bg-indigo-50/60 px-1 py-1 text-center">
                            <CountButton n={t.total} strong active={isActive(t.type, '')} title={`Show all ${typeLabel(t.type)} leads`} onClick={() => onSelect({ type: t.type, status: '' })} />
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                  {stats.untyped.total > 0 && (
                    <tr className="border-t border-slate-200">
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-slate-500">No type set</td>
                      {STATUSES.map((s) => <td key={s} className="px-3 py-2 text-center text-slate-500 tabular-nums">{stats.untyped.byStatus[s] || '—'}</td>)}
                      <td className="bg-indigo-50/60 px-3 py-2 text-center font-bold text-slate-500 tabular-nums">{stats.untyped.total}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-indigo-50">
                    <td className="px-3 py-1.5 font-bold text-slate-900">Total</td>
                    {STATUSES.map((s) => (
                      <td key={s} className="px-1 py-1 text-center">
                        <CountButton n={stats.all.byStatus[s]} strong active={isActive('', s)} title={`Show every ${s} lead`} onClick={() => onSelect({ type: '', status: s })} />
                      </td>
                    ))}
                    <td className="px-1 py-1 text-center">
                      <CountButton n={stats.all.total} strong active={false} title="Show every lead" onClick={() => onSelect({ type: '', status: '' })} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Stacked bar per lead type: length = that type's leads (vs. the biggest type), split by status */}
          <div className="min-w-0">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Leads by type</span>
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                {STATUSES.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5 text-[11.5px] text-slate-500">
                    <span className={`inline-block h-2 w-2 rounded-full ${STATUS_STYLE[s]?.bar ?? ''}`} />{s}
                  </span>
                ))}
              </span>
            </div>
            {stats.groups.map((g) => (
              <div key={g.label} className="mb-3">
                <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{g.label}</div>
                {g.types.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    title={`Show all ${typeLabel(t.type)} leads`}
                    onClick={() => onSelect({ type: t.type, status: '' })}
                    className={`tw flex w-full cursor-pointer items-center gap-2.5 rounded-md border-0 px-1.5 py-1 text-left font-[inherit] ${isActive(t.type, '') ? 'bg-indigo-50' : 'bg-transparent hover:bg-slate-50'}`}
                  >
                    <span className="w-36 shrink-0 truncate text-[12.5px] text-slate-600">{typeLabel(t.type)}</span>
                    <span className="flex h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span className="flex h-full" style={{ width: `${pct(t.total, maxTypeTotal)}%` }}>
                        {STATUSES.map((s) => t.byStatus[s] > 0 && (
                          <span key={s} className={`h-full ${STATUS_STYLE[s]?.bar ?? ''}`} style={{ width: `${pct(t.byStatus[s], t.total)}%` }} />
                        ))}
                      </span>
                    </span>
                    <span className="w-7 shrink-0 text-right text-[12.5px] font-bold text-slate-900 tabular-nums">{t.total}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
