'use client';

import { useMemo } from 'react';
import { buildTicketReport, type ReportBreakdown } from './reports';
import { CARD } from './ui';
import type { ItTicket } from './types';

interface TicketReportsProps {
  tickets: ItTicket[];
  loaded: boolean;
  filterSummary: string;
}

const SIZE = 132;
const R = 60;
const R_INNER = 36;

function arcPath(cx: number, cy: number, r: number, ri: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const pt = (rad: number, ang: number) => `${(cx + rad * Math.cos(ang)).toFixed(3)} ${(cy + rad * Math.sin(ang)).toFixed(3)}`;
  return `M${pt(r, a0)} A${r} ${r} 0 ${large} 1 ${pt(r, a1)} L${pt(ri, a1)} A${ri} ${ri} 0 ${large} 0 ${pt(ri, a0)} Z`;
}

function percent(count: number, total: number): string {
  if (!total) return '0%';
  const p = (count / total) * 100;
  return `${p < 10 && p > 0 ? p.toFixed(1) : Math.round(p)}%`;
}

/** Donut chart drawn with plain SVG — no chart library on the page. */
function PieChart({ breakdown }: { breakdown: ReportBreakdown }) {
  const c = SIZE / 2;
  const { total, slices } = breakdown;
  let angle = -Math.PI / 2;
  const visible = slices.filter((s) => s.count > 0);

  return (
    <div className={`${CARD} min-w-0 p-4`} data-testid={`report-chart-${breakdown.id}`}>
      <div className="mb-3 text-[13px] font-bold text-slate-900">{breakdown.title}</div>
      <div className="flex min-w-0 items-center gap-4">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${breakdown.title}: ${visible.map((s) => `${s.label} ${s.count}`).join(', ')}`} className="shrink-0">
          {total === 0 ? (
            <circle cx={c} cy={c} r={(R + R_INNER) / 2} fill="none" stroke="#e2e8f0" strokeWidth={R - R_INNER} />
          ) : (
            visible.map((s) => {
              const fraction = s.count / total;
              if (fraction >= 0.9999) {
                return (
                  <circle key={s.key} cx={c} cy={c} r={(R + R_INNER) / 2} fill="none" stroke={s.color} strokeWidth={R - R_INNER}>
                    <title>{`${s.label}: ${s.count} (100%)`}</title>
                  </circle>
                );
              }
              const a0 = angle;
              const a1 = angle + fraction * Math.PI * 2;
              angle = a1;
              return (
                <path key={s.key} d={arcPath(c, c, R, R_INNER, a0, a1)} fill={s.color} stroke="#fff" strokeWidth={1.5}>
                  <title>{`${s.label}: ${s.count} (${percent(s.count, total)})`}</title>
                </path>
              );
            })
          )}
          <text x={c} y={c - 2} textAnchor="middle" className="fill-slate-900 text-[20px] font-bold">{total}</text>
          <text x={c} y={c + 14} textAnchor="middle" className="fill-slate-500 text-[10px] font-semibold">tickets</text>
        </svg>
        <ul className="m-0 flex min-w-0 flex-1 list-none flex-col gap-1.5 p-0">
          {slices.map((s) => (
            <li key={s.key} className={`flex min-w-0 items-center gap-2 text-[12.5px] ${s.count ? 'text-slate-700' : 'text-slate-400'}`}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.count ? s.color : '#e2e8f0' }} aria-hidden />
              <span className="min-w-0 flex-1 truncate" title={s.label}>{s.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-900" data-slice={s.key}>{s.count}</span>
              <span className="w-11 shrink-0 text-right tabular-nums text-slate-400">{percent(s.count, total)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Reports panel on /admin/it-tickets: headline numbers + six pie charts for the tickets matching the
 * current filters. Same numbers as the Excel export's Summary sheet (both use buildTicketReport). */
export default function TicketReports({ tickets, loaded, filterSummary }: TicketReportsProps) {
  const report = useMemo(() => buildTicketReport(tickets), [tickets]);

  return (
    <section className="mb-[18px]" data-testid="ticket-reports" aria-label="Ticket reports">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="m-0 text-[15px] font-bold text-slate-900">Reports</h2>
        <span className="min-w-0 text-[12.5px] text-slate-500">
          {loaded ? `Based on ${report.total} ticket${report.total === 1 ? '' : 's'}` : 'Loading…'} · Filters: {filterSummary}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
        {report.kpis.map((k) => (
          <div key={k.id} className="min-w-0 rounded-[10px] border border-slate-200 border-l-[3px] border-l-[#6366F1] bg-white px-4 py-3" data-testid={`kpi-${k.id}`}>
            <div className="text-[22px] font-bold leading-tight tabular-nums text-slate-900">
              {k.value}
              {k.hint === 'days' && <span className="ml-1 text-[12px] font-semibold text-slate-500">days</span>}
            </div>
            {/* Wraps to a second line rather than truncating ("Avg age of open tickets" at narrow tiles). */}
            <div className="mt-0.5 text-[12px] font-semibold leading-snug text-slate-600" title={k.hint && k.hint !== 'days' ? k.hint : k.label}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-3">
        {report.breakdowns.map((b) => <PieChart key={b.id} breakdown={b} />)}
      </div>
    </section>
  );
}
