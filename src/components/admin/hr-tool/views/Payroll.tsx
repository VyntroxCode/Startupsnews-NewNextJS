'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Download, Lock, RefreshCw, Undo2 } from 'lucide-react';
import { useHrTool } from '../HrToolContext';
import AttendanceCalendar from './AttendanceCalendar';
import { employeeName, exportCSV, exportExcel, salaryPeriodLabel, monthKeyToLabel } from '../utils';
import { payrollCycleToRunKey, currentPayrollMonthKey, payrollPeriodRange } from '@/modules/hr-tool/utils/time';
import { hrApi, type PayrollApiResult } from '../api';
import type { HrPayrollEntry, HrPayrollRun } from '../types';
import { generatePayslipPdf, generatePayslipZip, singlePayslipFilename, triggerBlobDownload, triggerPdfDownload, type PayslipData } from '../payslipPdf';
import { buildPayslipData as buildSlip } from '@/modules/hr-tool/utils/payslip-data';

function fmtShortDate(ymd: string): string {
  if (!ymd) return '—';
  const d = new Date(ymd + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** runAt is a MySQL datetime string ("2026-08-26 14:03:11"); Safari's Date parser rejects that
 * format outright (needs a "T"), so it's patched in before parsing. */
function fmtDateTime(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v.includes('T') ? v : v.replace(' ', 'T'));
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function Payroll() {
  const { state, runPayrollForMonth, patchPayrollRunInState } = useHrTool();
  const [payroll, setPayroll] = useState<PayrollApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [freezing, setFreezing] = useState(false);
  const [reverseOpen, setReverseOpen] = useState(false);
  const [reverseReason, setReverseReason] = useState('');
  const [reversing, setReversing] = useState(false);
  // TDS is admin-entered per employee, not computed — seeded from whatever the server returns
  // (0 for a live/unrun preview, the saved amount once a month has been run) and editable
  // locally before "Run Payroll" saves it. Read-only once the month is frozen. Keyed by employee id.
  const [tdsInputs, setTdsInputs] = useState<Record<string, string>>({});

  // Two cycles are reachable from this page. `runnableMonth` is the most recently ENDED one —
  // Run Payroll only ever unlocks once a cycle is fully over, so that stays the default and the
  // only one the button can act on. `liveMonth` is the cycle today actually falls inside; with a
  // wrapping 26→25 period those are different for all but the last day of a cycle, and there was
  // previously no way at all to see the running cycle's attendance-to-date (present/absent/week
  // off so far) — the admin could only ever look at the month that had already closed.
  const runnableMonth = payrollCycleToRunKey(state.rules);
  const liveMonth = currentPayrollMonthKey(state.rules);
  const hasLiveCycle = liveMonth !== runnableMonth;
  const [month, setMonth] = useState(runnableMonth);

  /** "26 Aug – 25 Sep 2026" — the actual window a cycle covers. Necessary now that a cycle
   * wraps two calendar months: "September 2026" alone doesn't say whether 26 Aug is in it. */
  function cycleRangeLabel(key: string): string {
    const { from, to } = payrollPeriodRange(key, state.rules);
    return `${fmtShortDate(from)} – ${fmtShortDate(to)}`;
  }

  /** `silent` refreshes the figures in place instead of swapping the table for "Loading…" — used
   * after a run, where the swap shortened the page and jumped the admin away from the Run button. */
  async function loadPayroll(signal?: { cancelled: boolean }, silent = false) {
    if (!silent) setLoading(true);
    setLoadError('');
    const res = await hrApi.getPayroll(month);
    if (signal?.cancelled) return;
    if (res.success && res.data) {
      const fresh = res.data;
      // A silent refresh keeps any TDS typed but not yet saved (input differs from the previously
      // loaded value); everything else takes the server's figure.
      const oldSaved = new Map((payroll?.entries || []).map((e) => [e.employeeId, String(e.tds || 0)]));
      setTdsInputs((inputs) => Object.fromEntries(fresh.entries.map((e) => {
        const typed = inputs[e.employeeId];
        const keep = silent && typed !== undefined && typed !== oldSaved.get(e.employeeId);
        return [e.employeeId, keep ? typed : String(e.tds || 0)];
      })));
      setPayroll(fresh);
    } else {
      setLoadError(res.error || 'Failed to load payroll');
    }
    setLoading(false);
  }

  // `month` is seeded from the client's DEFAULT_RULES on first render; once the real hr_rules
  // arrive (or a cycle rolls over) the runnable cycle can move, so snap the selection back onto
  // it rather than leaving the page pinned to a stale key.
  useEffect(() => { setMonth(runnableMonth); }, [runnableMonth]);

  useEffect(() => {
    const signal = { cancelled: false };
    loadPayroll(signal);
    return () => { signal.cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  // HR decided a request (or attendance changed) somewhere else in the HR tool while this page is
  // open: reload quietly so the "changed since the last Run" warning is current.
  // A saved draft never changes by itself — only Run Payroll rewrites it.
  const syncKey = useMemo(() => ({}), [state.attendance, state.regularizations, state.leaveRequests]); // eslint-disable-line react-hooks/exhaustive-deps
  const [firstSyncKey] = useState(syncKey);
  useEffect(() => {
    if (syncKey === firstSyncKey) return;
    const signal = { cancelled: false };
    loadPayroll(signal, true);
    return () => { signal.cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  // Payroll entries are keyed by employee id — two employees may share a name.
  const employeeById = useMemo(() => new Map(state.employees.map((e) => [e.id, e])), [state.employees]);

  /** Net Pay reflecting whatever TDS is currently typed in (not yet saved) — Gross is already
   * attendance-adjusted (see computePayrollForMonth), so Net Pay here is just Gross − TDS. */
  function liveTds(employeeId: string, fallback: number): number {
    const raw = tdsInputs[employeeId];
    return raw === undefined ? fallback : Number(raw) || 0;
  }
  function liveNetPay(e: PayrollApiResult['entries'][number]): number {
    return Math.round(e.monthlyGross - liveTds(e.employeeId, e.tds));
  }

  /** The payslip for one entry: a frozen month's stored snapshot as-is (final), otherwise built
   * from today's Directory data and marked DRAFT so it's never mistaken for the final slip. */
  function buildPayslipData(e: HrPayrollEntry, tds: number, netPay: number, monthKey: string, periodTo: string): PayslipData | null {
    if (e.payslip) return e.payslip;
    const employee = employeeById.get(e.employeeId);
    if (!employee) return null;
    const cred = employee.credentialId
      ? state.employeeCredentials.find((c) => c.id === employee.credentialId)
      : undefined;
    return buildSlip({
      entry: e, employee, defaultSplit: state.rules.ctcSplit, employeeCode: cred?.employeeCode, monthKey, periodTo, tds, netPay,
      provisionalNote: 'DRAFT - not final until payroll is frozen',
    });
  }

  const [pdfBusy, setPdfBusy] = useState(false);
  async function handleDownloadMyPayslip() {
    const me = state.currentUser;
    const entry = me ? payroll?.entries.find((e) => e.employeeId === me.id) : undefined;
    if (!entry) return;
    setPdfBusy(true);
    try {
      const data = buildPayslipData(entry, entry.tds, entry.netPay, month, payroll?.periodTo || '');
      if (!data) return;
      const bytes = await generatePayslipPdf(data);
      triggerPdfDownload(bytes, singlePayslipFilename(data, month));
    } finally {
      setPdfBusy(false);
    }
  }
  async function handleDownloadAllPayslips() {
    if (!payroll) return;
    setPdfBusy(true);
    try {
      const list = entries
        .map((e) => buildPayslipData(e, liveTds(e.employeeId, e.tds), liveNetPay(e), month, payroll?.periodTo || ''))
        .filter((d): d is PayslipData => d !== null);
      if (!list.length) return;
      // One PDF per employee, zipped — not one combined PDF (each payslip goes to a different person).
      triggerBlobDownload(await generatePayslipZip(list, month), `payslips_${month}.zip`);
    } catch {
      alert('Could not create the payslips. Please try again.');
    } finally {
      setPdfBusy(false);
    }
  }
  /** One employee's payslip from the current run's table. */
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  async function handleDownloadRowPayslip(e: HrPayrollEntry) {
    if (!payroll || rowBusyId) return;
    setRowBusyId(e.employeeId);
    try {
      const data = buildPayslipData(e, liveTds(e.employeeId, e.tds), liveNetPay(e), month, payroll.periodTo || '');
      if (!data) { alert('This employee has no Directory record, so no payslip can be made.'); return; }
      triggerPdfDownload(await generatePayslipPdf(data), singlePayslipFilename(data, month));
    } catch {
      alert('Could not create the payslip. Please try again.');
    } finally {
      setRowBusyId(null);
    }
  }

  /** Employee ID (login code) for the history table, through the employee's own credential link. */
  function employeeCodeFor(employeeId: string): string {
    const employee = employeeById.get(employeeId);
    const cred = employee?.credentialId != null
      ? state.employeeCredentials.find((c) => c.id === employee.credentialId)
      : undefined;
    return cred?.employeeCode || '—';
  }

  // Past runs (see state.payrollRuns), newest first — each row's per-employee detail (who got
  // paid, their ID, their Net Pay) is fetched on demand when expanded rather than for every
  // run up front, since a company can accumulate a lot of these over time.
  // A reversed (discarded) draft goes back to status 'not_run' — it has no payslips to list.
  const sortedRuns = useMemo(() => state.payrollRuns.filter((r) => r.status === 'run').sort((a, b) => b.month.localeCompare(a.month)), [state.payrollRuns]);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [historyCache, setHistoryCache] = useState<Record<string, PayrollApiResult>>({});
  const [historyLoadingMonth, setHistoryLoadingMonth] = useState<string | null>(null);
  const [historyBusyKey, setHistoryBusyKey] = useState<string | null>(null);

  async function toggleHistoryRow(monthKey: string) {
    if (expandedMonth === monthKey) { setExpandedMonth(null); return; }
    setExpandedMonth(monthKey);
    if (historyCache[monthKey]) return;
    setHistoryLoadingMonth(monthKey);
    const res = await hrApi.getPayroll(monthKey);
    if (res.success && res.data) setHistoryCache((c) => ({ ...c, [monthKey]: res.data! }));
    setHistoryLoadingMonth(null);
  }

  async function handleDownloadHistoryAll(run: HrPayrollRun) {
    const data = historyCache[run.month];
    if (!data) return;
    setHistoryBusyKey(run.month);
    try {
      const list = data.entries
        .map((e) => buildPayslipData(e, e.tds, e.netPay, run.month, data.periodTo))
        .filter((d): d is PayslipData => d !== null);
      if (!list.length) return;
      triggerBlobDownload(await generatePayslipZip(list, run.month), `payslips_${run.month}.zip`);
    } catch {
      alert('Could not create the payslips. Please try again.');
    } finally {
      setHistoryBusyKey(null);
    }
  }
  async function handleDownloadHistoryOne(run: HrPayrollRun, e: HrPayrollEntry) {
    const data = historyCache[run.month];
    if (!data) return;
    const key = run.month + ':' + e.employeeId;
    setHistoryBusyKey(key);
    try {
      const slip = buildPayslipData(e, e.tds, e.netPay, run.month, data.periodTo);
      if (!slip) return;
      const bytes = await generatePayslipPdf(slip);
      triggerPdfDownload(bytes, singlePayslipFilename(slip, run.month));
    } finally {
      setHistoryBusyKey(null);
    }
  }

  async function handleRunPayroll() {
    setRunning(true);
    setRunError('');
    const tds: Record<string, number> = {};
    entries.forEach((e) => { tds[e.employeeId] = liveTds(e.employeeId, e.tds); });
    const res = await runPayrollForMonth(month, tds);
    if (res.success) {
      await loadPayroll(undefined, true);
      // A re-run changes that month's slips — drop the cached copy so its history row refetches.
      setHistoryCache((c) => { const next = { ...c }; delete next[month]; return next; });
    } else {
      setRunError(res.error || 'Failed to run payroll');
    }
    setRunning(false);
  }

  /** Freeze: final. The server re-checks every blocker; on success the month's payslips are
   * published to employees. */
  async function handleFreeze() {
    if (!window.confirm(`Freeze payroll for ${monthKeyToLabel(month)}?\n\nFreezing is permanent: payslips are published to employees, and this month's payroll can never be reversed or changed — nothing dated in it can change either.`)) return;
    setFreezing(true);
    setRunError('');
    const res = await hrApi.freezePayroll(month);
    if (res.success) {
      patchPayrollRunInState(month, { frozenAt: new Date().toISOString(), frozenBy: state.currentUser?.name || null });
      setHistoryCache((c) => { const next = { ...c }; delete next[month]; return next; });
      await loadPayroll(undefined, true);
    } else {
      setRunError(res.error || 'Could not freeze payroll.');
    }
    setFreezing(false);
  }

  /** Reverse on a draft: discards it — the month goes back to "not run" and the next Run Payroll
   * reads attendance afresh. Frozen months are final and never offer this. */
  async function handleDiscardDraft() {
    if (!window.confirm(`Reverse payroll for ${monthKeyToLabel(month)}?\n\nThe saved draft is discarded and no payslip exists until you Run Payroll again (it recalculates from current attendance) and Freeze.`)) return;
    setReversing(true);
    setRunError('');
    const res = await hrApi.reversePayroll(month, '');
    if (res.success) {
      patchPayrollRunInState(month, { status: 'not_run', periodFrom: null, periodTo: null, reversedAt: new Date().toISOString(), reversedBy: state.currentUser?.name || null, reverseReason: null });
      setHistoryCache((c) => { const next = { ...c }; delete next[month]; return next; });
      await loadPayroll(undefined, true);
    } else {
      setRunError(res.error || 'Could not reverse payroll.');
    }
    setReversing(false);
  }

  /** Reverse on a frozen month — only offered when the server allows it (FROZEN_PAYROLL_REVERSIBLE,
   * off: frozen payroll is final). Back to a draft, payslips withdrawn, reason required. */
  async function handleReverse() {
    const reason = reverseReason.trim();
    if (!reason) { setRunError('Please give a reason — it is saved in the audit log.'); return; }
    setReversing(true);
    setRunError('');
    const res = await hrApi.reversePayroll(month, reason);
    if (res.success) {
      patchPayrollRunInState(month, { frozenAt: null, frozenBy: null, reversedAt: new Date().toISOString(), reverseReason: reason });
      setHistoryCache((c) => { const next = { ...c }; delete next[month]; return next; });
      setReverseOpen(false);
      setReverseReason('');
      await loadPayroll(undefined, true);
    } else {
      setRunError(res.error || 'Could not reverse payroll.');
    }
    setReversing(false);
  }

  function exportPayroll(fmt: 'csv' | 'excel') {
    if (!payroll) return;
    const rows: (string | number)[][] = [['Employee', 'CTC (Monthly)', 'Total Days', 'Present Days', 'Absent Days', 'Week Off', 'Leaves', 'LOP Days', 'Gross', 'TDS', 'Net Pay']];
    payroll.entries.forEach((e) => {
      const tds = liveTds(e.employeeId, e.tds);
      rows.push([
        employeeName(state.employees, e.employeeId, e.emp), Math.round((employeeById.get(e.employeeId)?.ctc ?? 0) / 12), e.totalDays, e.presentDays, e.absentDays,
        e.weekOffDays, e.leaveDays, e.lopDays, e.monthlyGross, tds, liveNetPay(e),
      ]);
    });
    const fname = 'payroll_' + month;
    if (fmt === 'csv') exportCSV(fname + '.csv', rows); else exportExcel(fname + '.xlsx', rows);
  }

  if (state.role === 'Employee') {
    const me = state.currentUser!;
    // Employees only ever see a FROZEN month's payslip — a draft is not final.
    const myEntry = payroll?.cycle?.phase === 'frozen' ? payroll.entries.find((e) => e.employeeId === me.id) : undefined;
    return (
      <>
        <div className="topbar">
          <div><h1 className="page-title">My Payslips</h1><div className="page-sub">Your final salary slip, available once HR freezes the month&apos;s payroll.</div></div>
          <div className="as-role">{me.name} · {state.role}</div>
        </div>
        <div className="card"><div className="table-scroll"><table><thead><tr><th>Month</th><th>Total Days</th><th>Present Days</th><th>Absent Days</th><th>Week Off</th><th>Leaves</th><th>LOP Days</th><th>Gross</th><th>TDS</th><th>Net Pay</th><th></th></tr></thead>
          <tbody>
            {myEntry ? (
              <tr>
                <td>{monthKeyToLabel(month)}</td><td>{myEntry.totalDays}</td><td>{myEntry.presentDays}</td>
                <td>{myEntry.absentDays}</td><td>{myEntry.weekOffDays}</td><td>{myEntry.leaveDays}</td><td>{myEntry.lopDays}</td>
                <td>₹{myEntry.monthlyGross.toLocaleString('en-IN')}</td><td>₹{myEntry.tds.toLocaleString('en-IN')}</td>
                <td>₹{myEntry.netPay.toLocaleString('en-IN')}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn ghost sm" disabled={pdfBusy} onClick={handleDownloadMyPayslip}>
                    {pdfBusy ? 'Generating…' : 'Download PDF'}
                  </button>
                </td>
              </tr>
            ) : (
              <tr><td colSpan={11}><div className="empty">{loading ? 'Loading…' : `Payslip for ${monthKeyToLabel(month)} is not generated yet.`}</div></td></tr>
            )}
          </tbody>
        </table></div></div>
        <section className="block" style={{ marginTop: 22 }}>
          <div className="block-head"><h2>Attendance calendar — {monthKeyToLabel(month)}</h2></div>
          <div className="card pad"><AttendanceCalendar employeeId={me.id} /></div>
        </section>
        <div className="footnote">Net Pay reflects attendance and approved leave for the cycle — no deductions are applied yet. Salary period: {salaryPeriodLabel(state.rules)}.</div>
      </>
    );
  }

  const entries = payroll?.entries || [];
  const totalPayout = entries.reduce((s, e) => s + liveNetPay(e), 0);
  const alreadyRun = payroll?.alreadyRun ?? false;
  const missingCtc = payroll?.missingCtcEmployees || [];
  const cycle = payroll?.cycle;
  const frozen = cycle?.phase === 'frozen';
  // TDS typed but not saved by a Run yet — Freeze must wait, or the typed amount would be lost.
  const tdsDirty = alreadyRun && !frozen && entries.some((e) => liveTds(e.employeeId, e.tds) !== e.tds);
  const freezeBlockers = [...(cycle?.freezeBlockers || []), ...(tdsDirty ? ['TDS was changed — click Run Payroll to save it.'] : [])];
  const canFreeze = !!cycle?.canFreeze && !tdsDirty;
  // Payroll stays separate from request approval: the "N request(s) still pending" blocker still
  // stops Freeze (server-side), but isn't shown here — HR decides requests in Attendance / Leave.
  const shownBlockers = freezeBlockers.filter((b) => !/request\(s\) still pending/.test(b));
  const heading = !cycle ? 'Payroll'
    : cycle.phase === 'in-progress' ? 'Cycle in progress'
    : frozen ? 'Frozen'
    : cycle.phase === 'overdue' ? 'Not frozen — overdue'
    : alreadyRun ? 'Draft saved — run window open' : 'Run window open';

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Payroll &amp; Salary Slips</h1><div className="page-sub">Computed from attendance and approved leave. Salary period: {salaryPeriodLabel(state.rules)}</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>
      <div className="card pad" style={{ marginBottom: 20 }}>
        <div className="block-head" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2>{heading} — {monthKeyToLabel(month)}</h2>
            <div className="meta">{cycleRangeLabel(month)}</div>
          </div>
          <div className="toolbar">
            {hasLiveCycle && (
              <>
                <button
                  className={'btn sm' + (month === runnableMonth ? ' primary' : '')}
                  onClick={() => setMonth(runnableMonth)}
                >
                  Ready to run · {monthKeyToLabel(runnableMonth)}
                </button>
                <button
                  className={'btn sm' + (month === liveMonth ? ' primary' : '')}
                  onClick={() => setMonth(liveMonth)}
                >
                  In progress · {monthKeyToLabel(liveMonth)}
                </button>
                <span className="mx-1 h-6 w-px self-center bg-slate-200" aria-hidden />
              </>
            )}
            <button className="btn sm" onClick={() => exportPayroll('csv')} disabled={loading || entries.length === 0}><Download className="size-3.5 shrink-0" aria-hidden />CSV</button>
            <button className="btn sm" onClick={() => exportPayroll('excel')} disabled={loading || entries.length === 0}><Download className="size-3.5 shrink-0" aria-hidden />Excel</button>
            <button className="btn sm" disabled={loading || !alreadyRun || entries.length === 0 || pdfBusy} onClick={handleDownloadAllPayslips}>
              {pdfBusy ? 'Generating…' : <><Download className="size-3.5 shrink-0" aria-hidden />All payslips (ZIP)</>}
            </button>
          </div>
        </div>
        {!loading && cycle?.phase === 'in-progress' && (
          <div className="notice info" style={{ marginBottom: 12 }}>
            Live preview — the cycle ends on {fmtShortDate(payroll?.periodTo || '')}. Run Payroll opens {fmtShortDate(cycle.windowFrom)} – {fmtShortDate(cycle.windowTo)}.
          </div>
        )}
        {!loading && cycle && frozen && (
          <div className="notice info" style={{ marginBottom: 12, borderColor: '#A7F3D0', background: '#ECFDF5' }}>
            Frozen on {fmtDateTime(cycle.frozenAt)}{cycle.frozenBy ? ` by ${cycle.frozenBy}` : ''}. These are the final payslips — employees can download them from My Payslips. This month&apos;s payroll is permanent and nothing dated in it can change.
          </div>
        )}
        {!loading && cycle?.phase === 'overdue' && (
          <div className="notice" style={{ marginBottom: 12, borderColor: '#FECACA', background: '#FEF2F2' }}>
            The run window ended on {fmtShortDate(cycle.windowTo)} and this month is not frozen yet. Employees can&apos;t download their payslips until it is.
          </div>
        )}
        {!loading && cycle && !frozen && !alreadyRun && cycle.reversedAt && (
          <div className="notice info" style={{ marginBottom: 12 }}>
            Payroll reversed on {fmtDateTime(cycle.reversedAt)}{cycle.reversedBy ? ` by ${cycle.reversedBy}` : ''}{cycle.reverseReason ? ` — “${cycle.reverseReason}”` : ''}. No payslip exists for this month — Run Payroll to recalculate from current attendance, then Freeze.
          </div>
        )}
        {!loading && payroll?.settledThrough && (
          <div className="notice info" style={{ marginBottom: 12 }}>
            {fmtShortDate(payroll.periodFrom)} – {fmtShortDate(payroll.settledThrough)} were already paid in the previous payroll, so those days count as paid here.
          </div>
        )}
        {reverseOpen && (
          <div className="notice" style={{ marginBottom: 12 }}>
            <div className="field"><label className="field-label">Why reverse {monthKeyToLabel(month)}? Employees&apos; payslips for this month are withdrawn until it is frozen again. (Saved in the audit log.)</label>
              <textarea value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} placeholder="e.g. Wrong TDS entered for one employee" />
            </div>
            <div className="toolbar">
              <button className="btn primary sm" disabled={reversing || !reverseReason.trim()} onClick={handleReverse}>{reversing ? 'Reversing…' : 'Reverse payroll'}</button>
              <button className="btn sm" onClick={() => { setReverseOpen(false); setReverseReason(''); }}>Cancel</button>
            </div>
          </div>
        )}
        {loading && <div className="empty">Loading…</div>}
        {loadError && <div className="notice" style={{ borderColor: '#FECACA' }}>{loadError}</div>}
        {!loading && !loadError && (
          <>
            <div className="table-scroll"><table><thead><tr><th>Employee</th><th>CTC (Monthly)</th><th>Total Days</th><th>Present Days</th><th>Absent Days</th><th>Week Off</th><th>Leaves</th><th>LOP Days</th><th>Gross</th><th>TDS</th><th>Net Pay</th><th>Payslip</th></tr></thead>
              <tbody>
                {entries.map((e) => {
                  const ctc = employeeById.get(e.employeeId)?.ctc ?? 0;
                  return (
                    <tr key={e.employeeId || e.emp}>
                      <td>{employeeName(state.employees, e.employeeId, e.emp)}</td>
                      <td>
                        {ctc > 0 ? '₹' + Math.round(ctc / 12).toLocaleString('en-IN') : <span className="meta">Not set — set from Directory</span>}
                      </td>
                      <td>{e.totalDays}</td><td>{e.presentDays}</td><td>{e.absentDays}</td><td>{e.weekOffDays}</td>
                      <td>{e.leaveDays}</td><td>{e.lopDays}</td>
                      <td>₹{e.monthlyGross.toLocaleString('en-IN')}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>₹</span>
                          <input
                            type="number"
                            min={0}
                            value={tdsInputs[e.employeeId] ?? String(e.tds)}
                            disabled={frozen}
                            onChange={(ev) => setTdsInputs((prev) => ({ ...prev, [e.employeeId]: ev.target.value }))}
                            style={{ width: 90 }}
                          />
                        </div>
                      </td>
                      <td>₹{liveNetPay(e).toLocaleString('en-IN')}</td>
                      <td>
                        <button className="btn ghost sm" disabled={!alreadyRun || rowBusyId === e.employeeId}
                          title={!alreadyRun ? 'Payslips are available once payroll is run' : frozen ? `Download ${employeeName(state.employees, e.employeeId, e.emp)}'s final payslip` : 'Draft payslip — final once payroll is frozen'}
                          onClick={() => handleDownloadRowPayslip(e)}>
                          {rowBusyId === e.employeeId ? '…' : <><Download className="size-3.5 shrink-0" aria-hidden />PDF</>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {entries.length === 0 && <tr><td colSpan={12}><div className="empty">No active employees to run payroll for yet.</div></td></tr>}
              </tbody>
            </table></div>
            {!alreadyRun && payroll && missingCtc.length > 0 && (
              <div className="notice" style={{ borderColor: '#FECACA', marginTop: 12 }}>
                <strong>CTC not set for {missingCtc.length} employee{missingCtc.length > 1 ? 's' : ''}: {missingCtc.join(', ')}.</strong>{' '}
                Run Payroll is disabled until every active employee has an Annual CTC — set it from Directory, then come back here.
              </div>
            )}
            {!alreadyRun && (payroll?.fnfSettledEmployees?.length ?? 0) > 0 && (
              <div className="notice info mt-3">
                Not in this run — paid in their Full &amp; Final instead: {payroll!.fnfSettledEmployees!.join(', ')}.
              </div>
            )}
            {!alreadyRun && (payroll?.noticeHeldEmployees?.length ?? 0) > 0 && (
              <div className="notice info mt-3">
                On notice — this cycle&apos;s salary is held and paid in their Full &amp; Final: {payroll!.noticeHeldEmployees!.join(', ')}.
              </div>
            )}
            {!loading && cycle && !frozen && cycle.phase !== 'in-progress' && shownBlockers.length > 0 && (
              <div className="notice mt-3" style={{ borderColor: '#FDE68A', background: '#FFFBEB' }}>
                <strong>Freeze is not available yet:</strong>
                <ul style={{ margin: '6px 0 0 18px', listStyle: 'disc' }}>
                  {shownBlockers.map((b) => <li key={b}>{b}</li>)}
                </ul>
              </div>
            )}
            {runError && <div className="notice" style={{ borderColor: '#FECACA', marginTop: 12 }}>{runError}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
              <div className="meta">
                Total payout: <strong>₹{totalPayout.toLocaleString('en-IN')}</strong>
                {frozen
                  ? ' · frozen (final)'
                  : alreadyRun
                    ? ' · draft, as of the last run'
                    : payroll?.periodEnded
                      ? ' · cycle ended, not run yet'
                      : ` · live preview — days not yet reached are not counted as absent`}
              </div>
              <div className="toolbar">
                {frozen ? (
                  cycle?.canReverse ? (
                    <button
                      className="btn"
                      disabled={reverseOpen}
                      title="Withdraw these payslips and turn the month back into a draft"
                      onClick={() => { setRunError(''); setReverseOpen(true); }}
                    >
                      <Undo2 className="size-3.5 shrink-0" aria-hidden />Reverse
                    </button>
                  ) : (
                    <span className="meta"><Lock className="size-3.5 shrink-0 inline" aria-hidden /> Final — cannot be reversed</span>
                  )
                ) : (
                  <>
                    {alreadyRun && (
                      <button
                        className="btn"
                        disabled={!cycle?.canReverse || running || freezing || reversing}
                        title="Discard this draft — no payslip until you Run Payroll again and Freeze"
                        onClick={handleDiscardDraft}
                      >
                        <Undo2 className="size-3.5 shrink-0" aria-hidden />{reversing ? 'Reversing…' : 'Reverse'}
                      </button>
                    )}
                    <button
                      className="btn"
                      disabled={!(payroll?.canRun ?? false) || entries.length === 0 || running || freezing || reversing || missingCtc.length > 0}
                      title={
                        missingCtc.length > 0
                          ? `Set CTC for: ${missingCtc.join(', ')}`
                          : cycle?.phase === 'in-progress'
                            ? `This cycle is still running — Run Payroll opens on ${fmtShortDate(cycle.windowFrom)}.`
                            : 'Recalculate from attendance and save as a draft (pending requests count as not approved)'
                      }
                      onClick={handleRunPayroll}
                    >
                      <RefreshCw className="size-3.5 shrink-0" aria-hidden />{running ? 'Running…' : alreadyRun ? 'Run Payroll again' : 'Run Payroll'}
                    </button>
                    <button
                      className="btn primary"
                      disabled={!canFreeze || running || freezing || reversing}
                      title={canFreeze ? 'Make this month final and publish payslips to employees' : shownBlockers.join(' ') || 'Not ready to freeze yet'}
                      onClick={handleFreeze}
                    >
                      <Lock className="size-3.5 shrink-0" aria-hidden />{freezing ? 'Freezing…' : 'Freeze'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <section className="block">
        <div className="block-head"><h2>Payslip history</h2></div>
        <div className="card">
          {sortedRuns.length === 0 ? (
            <div className="pad"><div className="empty">No payroll has been run yet — once you run a cycle above, it shows up here.</div></div>
          ) : (
            <div className="table-scroll"><table><thead><tr><th>Month</th><th>Run date</th><th>Run by</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {sortedRuns.map((run) => {
                  const isOpen = expandedMonth === run.month;
                  const data = historyCache[run.month];
                  const isLoading = historyLoadingMonth === run.month;
                  return (
                    <Fragment key={run.month}>
                      <tr>
                        <td>{monthKeyToLabel(run.month)}</td>
                        <td>{fmtDateTime(run.runAt)}</td>
                        <td>{run.runBy || '—'}</td>
                        <td>{run.frozenAt ? <span className="badge approved">Frozen</span> : <span className="badge pending">Draft</span>}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className="action-row">
                            <button className="btn ghost sm" onClick={() => toggleHistoryRow(run.month)}>
                              {isOpen ? 'Hide details' : 'View details'}
                            </button>
                            <button
                              className="btn ghost sm"
                              disabled={!data || data.entries.length === 0 || historyBusyKey === run.month}
                              onClick={() => handleDownloadHistoryAll(run)}
                            >
                              {historyBusyKey === run.month ? 'Generating…' : 'Download all (ZIP)'}
                            </button>
                          </span>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={5} style={{ padding: 0 }}>
                            <div style={{ padding: '4px 14px 16px', background: '#F8FAFC' }}>
                              {isLoading && <div className="empty">Loading…</div>}
                              {!isLoading && data && data.entries.length === 0 && (
                                <div className="empty">No employees were paid this month.</div>
                              )}
                              {!isLoading && data && data.entries.length > 0 && (
                                <div className="table-scroll"><table><thead><tr>
                                  <th>Employee</th><th>Employee ID</th><th>Gross</th><th>TDS</th><th>Net Pay</th><th style={{ textAlign: 'right' }}>Action</th>
                                </tr></thead>
                                  <tbody>{data.entries.map((e) => {
                                    const busyKey = run.month + ':' + e.employeeId;
                                    return (
                                      <tr key={e.employeeId || e.emp}>
                                        <td>{employeeName(state.employees, e.employeeId, e.emp)}</td>
                                        <td>{employeeCodeFor(e.employeeId)}</td>
                                        <td>₹{e.monthlyGross.toLocaleString('en-IN')}</td>
                                        <td>₹{e.tds.toLocaleString('en-IN')}</td>
                                        <td>₹{e.netPay.toLocaleString('en-IN')}</td>
                                        <td style={{ textAlign: 'right' }}>
                                          <button
                                            className="btn ghost sm"
                                            disabled={historyBusyKey === busyKey}
                                            onClick={() => handleDownloadHistoryOne(run, e)}
                                          >
                                            {historyBusyKey === busyKey ? 'Generating…' : 'Download PDF'}
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}</tbody>
                                </table></div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>
      </section>
    </>
  );
}
