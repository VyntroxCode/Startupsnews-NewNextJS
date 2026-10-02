'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LedgerTotals } from '@/modules/hr-tool/utils/day-ledger';

interface CycleData { month: string; periodFrom: string; periodTo: string; totals: LedgerTotals; locked: boolean; }

function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const tileClass = 'rounded-lg border border-solid p-3';

/** "This pay cycle" card on the self-service attendance page — the employee's own days for one
 * pay cycle (e.g. 26 Aug – 25 Sep), from the same day ledger payroll pays by
 * (`${apiBase}/ledger`), so what they see here is what their payslip counts. `refreshKey` changes
 * whenever the attendance page reloads (a punch, a regularization), triggering a re-fetch. */
export default function AttendanceCycleSummary({ apiBase, getHeaders, refreshKey }: { apiBase: string; getHeaders: () => HeadersInit; refreshKey: unknown }) {
  const [monthKey, setMonthKey] = useState<string | null>(null);
  const [currentKey, setCurrentKey] = useState<string | null>(null);
  const [data, setData] = useState<CycleData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    fetch(`${apiBase}/ledger${monthKey ? `?month=${monthKey}` : ''}`, { headers: getHeaders() })
      .then((r) => r.json())
      .then((json) => {
        if (!live) return;
        if (!json.success) { setError(json.error || 'Could not load this pay cycle.'); return; }
        setError('');
        setData(json.data);
        if (json.data && !currentKey) setCurrentKey(json.data.month);
      })
      .catch(() => { if (live) setError('Could not load this pay cycle.'); });
    return () => { live = false; };
  }, [apiBase, monthKey, refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="m-0 text-sm text-red-700">{error}</p>;
  if (!data) return null;
  const t = data.totals;
  const canGoNext = !!currentKey && data.month < currentKey;
  const tiles: { label: string; value: number; sub?: string; tone: string }[] = [
    { label: 'Present', value: t.presentDays, sub: 'paid worth of days worked', tone: 'border-green-200 bg-green-50 text-green-900' },
    { label: 'Half day', value: t.halfDayDays, sub: '½ day each', tone: 'border-orange-200 bg-orange-50 text-orange-900' },
    { label: 'Short leave', value: t.shortLeaveDays, sub: t.shortLeaveDeductions ? `${t.shortLeaveDeductions} cost ½ day` : 'within the free limit', tone: 'border-amber-200 bg-amber-50 text-amber-900' },
    { label: 'Paid leave', value: t.leaveDays, tone: 'border-sky-200 bg-sky-50 text-sky-900' },
    { label: 'Unpaid leave', value: t.unpaidLeaveDays, sub: 'beyond balance', tone: 'border-rose-200 bg-rose-50 text-rose-900' },
    { label: 'Absent / LOP', value: t.lopDays, tone: 'border-red-200 bg-red-50 text-red-900' },
    { label: 'Week-offs', value: t.weekOffDays, sub: 'Sundays + holidays', tone: 'border-slate-200 bg-slate-50 text-slate-700' },
    { label: 'Paid days', value: t.paidDays, sub: t.futureDays ? `${t.futureDays} still to come` : `of ${t.totalDays}`, tone: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={() => setMonthKey(shiftMonthKey(data.month, -1))} aria-label="Previous pay cycle"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-solid border-slate-200 bg-white text-slate-700">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <div className="text-center">
          <h3 className="m-0 text-base font-semibold text-slate-900">Pay cycle {fmtDate(data.periodFrom)} – {fmtDate(data.periodTo)}</h3>
          <p className="m-0 text-xs text-slate-500">{data.locked ? 'Payroll locked' : 'Same numbers your payslip uses'}</p>
        </div>
        <button type="button" onClick={() => canGoNext && setMonthKey(shiftMonthKey(data.month, 1))} disabled={!canGoNext} aria-label="Next pay cycle"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-solid border-slate-200 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-35">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className={`${tileClass} ${tile.tone}`}>
            <div className="text-[0.65rem] font-semibold uppercase tracking-wide opacity-75">{tile.label}</div>
            <div className="mt-1 text-xl font-bold tabular-nums">{fmtNum(tile.value)}</div>
            {tile.sub && <div className="mt-0.5 text-[0.7rem] opacity-70">{tile.sub}</div>}
          </div>
        ))}
      </div>
      <p className="m-0 mt-3 text-xs leading-relaxed text-slate-500">
        A working day with no punch-in, or a punch-in with no punch-out, is absent. A day you punched in on can only take half-day leave.
        Changes HR approves (regularizations, leave) show up here straight away.
      </p>
    </div>
  );
}
