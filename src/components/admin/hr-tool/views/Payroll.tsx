'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Clock, Download } from 'lucide-react';
import { useHrTool } from '../HrToolContext';
import AttendanceCalendar from './AttendanceCalendar';
import { StatusBadge, employeeName, exportCSV, exportExcel, salaryPeriodLabel, monthKeyToLabel, computeCtcBreakdown } from '../utils';
import { payrollCycleToRunKey, currentPayrollMonthKey, payrollPeriodRange } from '@/modules/hr-tool/utils/time';
import { hrApi, type PayrollApiResult } from '../api';
import type { HrPayrollEntry, HrPayrollRun } from '../types';
import { generatePayslipPdf, generatePayslipZip, singlePayslipFilename, triggerBlobDownload, triggerPdfDownload, type PayslipData } from '../payslipPdf';

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
  const { state, runPayrollForMonth, decideRegularization, upsertLeaveRequestInState } = useHrTool();
  const [payroll, setPayroll] = useState<PayrollApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  // Employee whose pending requests are expanded under their payroll row, and the request being decided.
  const [openPendingFor, setOpenPendingFor] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  // TDS is admin-entered per employee, not computed — seeded from whatever the server returns
  // (0 for a live/unrun preview, the frozen amount once a month has been run) and editable
  // locally before "Run Payroll" actually persists it. Keyed by employee id.
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
  // open: reload quietly. The server recalculates — and for a run, unlocked month rewrites the
  // saved payslips — on every load, so the table follows attendance without a manual refresh.
  const syncKey = useMemo(() => ({}), [state.attendance, state.regularizations, state.leaveRequests]); // eslint-disable-line react-hooks/exhaustive-deps
  const [firstSyncKey] = useState(syncKey);
  useEffect(() => {
    if (syncKey === firstSyncKey) return;
    const signal = { cancelled: false };
    loadPayroll(signal, true);
    return () => { signal.cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncKey]);

  // Undecided requests per employee for the month shown — their figures are provisional.
  const pendingByEmployee: Record<string, number> = payroll?.pendingByEmployee || {};

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

  /** Builds the payslip's Basic/HRA/Conveyance/Special Allowance + totals from the same CTC
   * Structure (org default or per-employee override) Directory/Rules already use — prorated by
   * the same paying-days ratio computePayrollForMonth applied to get monthlyGross, so the four
   * earning lines always add up to exactly Gross Earnings. PAN is left out (no such field exists
   * on an employee yet); Income Tax mirrors the admin-entered TDS for the run; Provident Fund is
   * always 0 for now — there's no PF configuration anywhere in the HR module yet to derive one from.
   */
  function buildPayslipData(e: HrPayrollEntry, tds: number, netPay: number, monthKey: string, periodTo: string, pendingCount = 0): PayslipData | null {
    const employee = employeeById.get(e.employeeId);
    if (!employee) return null;
    const cred = employee.credentialId
      ? state.employeeCredentials.find((c) => c.id === employee.credentialId)
      : undefined;
    const split = employee.ctcSplitOverride || state.rules.ctcSplit;
    const breakdown = computeCtcBreakdown(employee.ctc, split);
    const monthlySalary = Math.round(employee.ctc / 12);
    const ratio = monthlySalary > 0 ? e.monthlyGross / monthlySalary : 0;
    const basic = Math.round(breakdown.basic * ratio);
    const hra = Math.round(breakdown.hra * ratio);
    const convenience = Math.round(breakdown.convenience * ratio);
    // Special Allowance is the remainder, not its own prorated figure — guarantees the four
    // earning lines sum to exactly e.monthlyGross regardless of rounding on the other three.
    const specialAllowance = e.monthlyGross - basic - hra - convenience;
    return {
      employeeName: employee.name,
      employeeCode: cred?.employeeCode || '—',
      designation: employee.designation,
      monthLabel: monthKeyToLabel(monthKey),
      payDateLabel: fmtShortDate(periodTo),
      dojLabel: fmtShortDate(employee.doj),
      paidDays: e.totalDays - e.lopDays,
      lopDays: e.lopDays,
      basic, hra, convenience, specialAllowance,
      grossEarnings: e.monthlyGross,
      incomeTax: tds,
      providentFund: 0,
      totalDeductions: tds,
      netPay,
      provisionalNote: pendingCount > 0 ? `PROVISIONAL - ${pendingCount} request(s) pending; updates when decided` : undefined,
    };
  }

  const [pdfBusy, setPdfBusy] = useState(false);
  async function handleDownloadMyPayslip() {
    const me = state.currentUser;
    const entry = me ? payroll?.entries.find((e) => e.employeeId === me.id) : undefined;
    if (!entry) return;
    setPdfBusy(true);
    try {
      const data = buildPayslipData(entry, entry.tds, entry.netPay, month, payroll?.periodTo || '', pendingByEmployee[entry.employeeId]);
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
        .map((e) => buildPayslipData(e, liveTds(e.employeeId, e.tds), liveNetPay(e), month, payroll?.periodTo || '', pendingByEmployee[e.employeeId]))
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
      const data = buildPayslipData(e, liveTds(e.employeeId, e.tds), liveNetPay(e), month, payroll.periodTo || '', pendingByEmployee[e.employeeId]);
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
  const sortedRuns = useMemo(() => [...state.payrollRuns].sort((a, b) => b.month.localeCompare(a.month)), [state.payrollRuns]);
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
        .map((e) => buildPayslipData(e, e.tds, e.netPay, run.month, data.periodTo, data.pendingByEmployee?.[e.employeeId]))
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
      const slip = buildPayslipData(e, e.tds, e.netPay, run.month, data.periodTo, data.pendingByEmployee?.[e.employeeId]);
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

  /** Approve/reject a pending request straight from its payroll row. The server re-calculates the
   * cycle on every decision (refreshPayrollForDates), so a silent reload shows the new figures. */
  async function decidePending(req: { kind: 'regularization' | 'leave'; id: string }, decision: 'approved' | 'rejected') {
    setDecidingId(req.id);
    if (req.kind === 'regularization') {
      await decideRegularization(req.id, 'hr', decision, '');
    } else {
      const res = await hrApi.decideLeaveRequest(req.id, decision, '');
      if (!res.success || !res.data) alert(res.error || 'Could not save the decision.');
      else upsertLeaveRequestInState(res.data);
    }
    await loadPayroll(undefined, true);
    setDecidingId(null);
  }

  async function handleReopen() {
    const reason = reopenReason.trim();
    if (!reason) { alert('Please give a reason — it is saved in the audit log.'); return; }
    const res = await hrApi.reopenPayroll(month, reason);
    if (!res.success) { alert(res.error || 'Could not reopen this cycle.'); return; }
    setReopenOpen(false);
    setReopenReason('');
    await loadPayroll(undefined, true);
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
    const myEntry = payroll?.entries.find((e) => e.employeeId === me.id);
    return (
      <>
        <div className="topbar">
          <div><h1 className="page-title">My Payslips</h1><div className="page-sub">Your attendance-adjusted salary for the cycle.</div></div>
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
                  <button className="btn ghost sm" disabled={!payroll?.alreadyRun || pdfBusy} onClick={handleDownloadMyPayslip}>
                    {pdfBusy ? 'Generating…' : 'Download PDF'}
                  </button>
                </td>
              </tr>
            ) : (
              <tr><td colSpan={11}><div className="empty">{loading ? 'Loading…' : 'No payroll data for you yet this cycle.'}</div></td></tr>
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
  const pending = cycle?.pendingRequests || [];
  const heading = !cycle ? 'Payroll'
    : cycle.phase === 'in-progress' ? 'Cycle in progress'
    : cycle.phase === 'locked' ? 'Locked'
    // Past the run window but not locked yet. Not shown as an error: once run, the saved payslips
    // follow every leave/regularization decision on their own (refreshRunIfOpen) and the cycle
    // locks by itself when nothing is pending.
    : cycle.phase === 'overdue' ? (alreadyRun ? 'Run — updating automatically' : 'Not run yet')
    : alreadyRun ? 'Run window open — already run' : 'Run window open';

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
          {hasLiveCycle && (
            <div className="toolbar">
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
            </div>
          )}
        </div>
        {/* Run window / overdue need no banner — pending requests are decided from each row's
            "Provisional" link below, and the figures follow every decision automatically. */}
        {!loading && cycle && (cycle.phase === 'in-progress' || cycle.phase === 'locked') && (
          <div className="notice info" style={{ marginBottom: 12 }}>
            {cycle.phase === 'in-progress' && <>Live preview — the cycle ends on {fmtShortDate(payroll?.periodTo || '')}. Run Payroll opens {fmtShortDate(cycle.windowFrom)} – {fmtShortDate(cycle.windowTo)}.</>}
            {cycle.phase === 'locked' && <>Locked{cycle.lockedAt ? ` on ${fmtDateTime(cycle.lockedAt)}` : ''}. Nothing in this cycle can change.{state.role === 'Founder' && <> <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => setReopenOpen(true)}>Reopen (Founder)</button></>}</>}
          </div>
        )}
        {!loading && payroll?.settledThrough && (
          <div className="notice info" style={{ marginBottom: 12 }}>
            {fmtShortDate(payroll.periodFrom)} – {fmtShortDate(payroll.settledThrough)} were already paid in the previous payroll, so those days count as paid here.
          </div>
        )}
        {reopenOpen && (
          <div className="notice" style={{ marginBottom: 12 }}>
            <div className="field"><label className="field-label">Why reopen this locked cycle? (saved in the audit log)</label>
              <textarea value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder="e.g. Wrong TDS entered for one employee" />
            </div>
            <div className="toolbar"><button className="btn primary sm" onClick={handleReopen}>Reopen for 2 days</button><button className="btn sm" onClick={() => setReopenOpen(false)}>Cancel</button></div>
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
                  const rowPending = pending.filter((p) => p.employeeId === e.employeeId);
                  const pendingOpen = openPendingFor === e.employeeId && rowPending.length > 0;
                  return (
                    <Fragment key={e.employeeId || e.emp}>
                    <tr>
                      <td>
                        {employeeName(state.employees, e.employeeId, e.emp)}
                        {pendingByEmployee[e.employeeId] > 0 && (
                          <button type="button" className="meta" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#B45309', background: 'none', border: 0, padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
                            title="Calculated from current attendance — click to approve or reject the pending requests"
                            aria-expanded={pendingOpen}
                            onClick={() => setOpenPendingFor(pendingOpen ? null : e.employeeId)}>
                            <Clock className="size-3.5 shrink-0" aria-hidden />Provisional · {pendingByEmployee[e.employeeId]} pending
                          </button>
                        )}
                      </td>
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
                            onChange={(ev) => setTdsInputs((prev) => ({ ...prev, [e.employeeId]: ev.target.value }))}
                            style={{ width: 90 }}
                          />
                        </div>
                      </td>
                      <td>₹{liveNetPay(e).toLocaleString('en-IN')}</td>
                      <td>
                        <button className="btn ghost sm" disabled={!alreadyRun || rowBusyId === e.employeeId}
                          title={alreadyRun ? `Download ${employeeName(state.employees, e.employeeId, e.emp)}'s payslip` : 'Payslips are available once payroll is run'}
                          onClick={() => handleDownloadRowPayslip(e)}>
                          {rowBusyId === e.employeeId ? '…' : <><Download className="size-3.5 shrink-0" aria-hidden />PDF</>}
                        </button>
                      </td>
                    </tr>
                    {pendingOpen && (
                      <tr>
                        <td colSpan={12} style={{ background: 'var(--surface-2, #FFFBEB)' }}>
                          {rowPending.map((p) => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 0' }}>
                              <div>
                                <strong>{p.kind === 'leave' ? 'Leave' : 'Regularization'}</strong> · {p.dates}
                                {p.detail && <div className="meta">{p.detail}</div>}
                              </div>
                              <div className="toolbar">
                                <button className="btn primary sm" disabled={decidingId !== null} onClick={() => decidePending(p, 'approved')}>
                                  {decidingId === p.id ? '…' : 'Approve'}
                                </button>
                                <button className="btn sm" disabled={decidingId !== null} onClick={() => decidePending(p, 'rejected')}>Reject</button>
                              </div>
                            </div>
                          ))}
                        </td>
                      </tr>
                    )}
                    </Fragment>
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
            {runError && <div className="notice" style={{ borderColor: '#FECACA', marginTop: 12 }}>{runError}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <div className="meta">
                Total payout: <strong>₹{totalPayout.toLocaleString('en-IN')}</strong>
                {cycle?.phase === 'locked'
                  ? ' · locked'
                  : alreadyRun
                    ? ' · as of the last run'
                    : payroll?.periodEnded
                      ? ' · cycle ended, not run yet'
                      : ` · live preview — days not yet reached are not counted as absent`}
              </div>
              <div className="toolbar">
                <button className="btn sm" onClick={() => exportPayroll('csv')} disabled={entries.length === 0}><Download className="size-3.5 shrink-0" aria-hidden />CSV</button>
                <button className="btn sm" onClick={() => exportPayroll('excel')} disabled={entries.length === 0}><Download className="size-3.5 shrink-0" aria-hidden />Excel</button>
                <button className="btn sm" disabled={!alreadyRun || entries.length === 0 || pdfBusy} onClick={handleDownloadAllPayslips}>
                  {pdfBusy ? 'Generating…' : <><Download className="size-3.5 shrink-0" aria-hidden />All payslips (ZIP)</>}
                </button>
                <button
                  className="btn primary"
                  disabled={!(payroll?.canRun ?? false) || entries.length === 0 || running || missingCtc.length > 0}
                  title={
                    missingCtc.length > 0
                      ? `Set CTC for: ${missingCtc.join(', ')}`
                      : cycle?.phase === 'in-progress'
                        ? `This cycle is still running — Run Payroll opens on ${fmtShortDate(cycle.windowFrom)}.`
                        : cycle?.phase === 'locked'
                          ? 'This cycle is locked.'
                          : pending.length > 0
                            ? `${pending.length} request(s) still pending — those payslips are provisional and update when decided.`
                            : undefined
                  }
                  onClick={handleRunPayroll}
                >
                  {running ? 'Running…' : alreadyRun ? 'Re-run Payroll' : 'Run Payroll'}
                </button>
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
                        <td><StatusBadge status="approved" /></td>
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
