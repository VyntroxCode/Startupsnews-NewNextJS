'use client';

import { useEffect, useMemo, useState } from 'react';
import { useHrTool } from '../HrToolContext';
import AttendanceCalendar from './AttendanceCalendar';
import { StatusBadge, exportCSV, exportExcel, salaryPeriodLabel, monthKeyToLabel, computeCtcBreakdown } from '../utils';
import { payrollCycleToRunKey } from '@/modules/hr-tool/utils/time';
import { hrApi, type PayrollApiResult } from '../api';
import type { HrPayrollEntry } from '../types';
import { generatePayslipPdf, generateBulkPayslipPdf, triggerPdfDownload, type PayslipData } from '../payslipPdf';

function fmtShortDate(ymd: string): string {
  if (!ymd) return '—';
  const d = new Date(ymd + 'T00:00:00');
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Payroll() {
  const { state, runPayrollForMonth } = useHrTool();
  const [payroll, setPayroll] = useState<PayrollApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  // TDS is admin-entered per employee, not computed — seeded from whatever the server returns
  // (0 for a live/unrun preview, the frozen amount once a month has been run) and editable
  // locally before "Run Payroll" actually persists it. Keyed by employee name.
  const [tdsInputs, setTdsInputs] = useState<Record<string, string>>({});

  // The most recently ENDED cycle, not the one in progress — Run Payroll only ever unlocks
  // once a cycle is fully over, so this is the one the page should actually show/act on.
  const month = payrollCycleToRunKey(state.rules);

  async function loadPayroll(signal?: { cancelled: boolean }) {
    setLoading(true);
    setLoadError('');
    const res = await hrApi.getPayroll(month);
    if (signal?.cancelled) return;
    if (res.success && res.data) {
      setPayroll(res.data);
      setTdsInputs(Object.fromEntries(res.data.entries.map((e) => [e.emp, String(e.tds || 0)])));
    } else {
      setLoadError(res.error || 'Failed to load payroll');
    }
    setLoading(false);
  }

  useEffect(() => {
    const signal = { cancelled: false };
    loadPayroll(signal);
    return () => { signal.cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const employeeByName = useMemo(() => new Map(state.employees.map((e) => [e.name, e])), [state.employees]);

  /** Net Pay reflecting whatever TDS is currently typed in (not yet saved) — Gross is already
   * attendance-adjusted (see computePayrollForMonth), so Net Pay here is just Gross − TDS. */
  function liveTds(emp: string, fallback: number): number {
    const raw = tdsInputs[emp];
    return raw === undefined ? fallback : Number(raw) || 0;
  }
  function liveNetPay(e: PayrollApiResult['entries'][number]): number {
    return Math.round(e.monthlyGross - liveTds(e.emp, e.tds));
  }

  /** Builds the payslip's Basic/HRA/Conveyance/Special Allowance + totals from the same CTC
   * Structure (org default or per-employee override) Directory/Rules already use — prorated by
   * the same paying-days ratio computePayrollForMonth applied to get monthlyGross, so the four
   * earning lines always add up to exactly Gross Earnings. PAN is left out (no such field exists
   * on an employee yet); Income Tax mirrors the admin-entered TDS for the run; Provident Fund is
   * always 0 for now — there's no PF configuration anywhere in the HR module yet to derive one from.
   */
  function buildPayslipData(e: HrPayrollEntry, tds: number, netPay: number): PayslipData | null {
    const employee = employeeByName.get(e.emp);
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
      monthLabel: monthKeyToLabel(month),
      payDateLabel: fmtShortDate(payroll?.periodTo || ''),
      dojLabel: fmtShortDate(employee.doj),
      paidDays: e.totalDays - e.lopDays,
      lopDays: e.lopDays,
      basic, hra, convenience, specialAllowance,
      grossEarnings: e.monthlyGross,
      incomeTax: tds,
      providentFund: 0,
      totalDeductions: tds,
      netPay,
    };
  }

  const [pdfBusy, setPdfBusy] = useState(false);
  async function handleDownloadMyPayslip() {
    const me = state.currentUser;
    const entry = me ? payroll?.entries.find((e) => e.emp === me.name) : undefined;
    if (!entry) return;
    setPdfBusy(true);
    try {
      const data = buildPayslipData(entry, entry.tds, entry.netPay);
      if (!data) return;
      const bytes = await generatePayslipPdf(data);
      triggerPdfDownload(bytes, `payslip_${data.employeeCode}_${month}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  }
  async function handleDownloadAllPayslips() {
    if (!payroll) return;
    setPdfBusy(true);
    try {
      const list = entries
        .map((e) => buildPayslipData(e, liveTds(e.emp, e.tds), liveNetPay(e)))
        .filter((d): d is PayslipData => d !== null);
      if (!list.length) return;
      const bytes = await generateBulkPayslipPdf(list);
      triggerPdfDownload(bytes, `payroll_slips_${month}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleRunPayroll() {
    setRunning(true);
    setRunError('');
    const tds: Record<string, number> = {};
    entries.forEach((e) => { tds[e.emp] = liveTds(e.emp, e.tds); });
    const res = await runPayrollForMonth(month, tds);
    if (res.success) {
      await loadPayroll();
    } else {
      setRunError(res.error || 'Failed to run payroll');
    }
    setRunning(false);
  }

  function exportPayroll(fmt: 'csv' | 'excel') {
    if (!payroll) return;
    const rows: (string | number)[][] = [['Employee', 'CTC (Monthly)', 'Total Days', 'Present Days', 'Absent Days', 'Week Off', 'Leaves', 'LOP Days', 'Gross', 'TDS', 'Net Pay']];
    payroll.entries.forEach((e) => {
      const tds = liveTds(e.emp, e.tds);
      rows.push([
        e.emp, Math.round((employeeByName.get(e.emp)?.ctc ?? 0) / 12), e.totalDays, e.presentDays, e.absentDays,
        e.weekOffDays, e.leaveDays, e.lopDays, e.monthlyGross, tds, liveNetPay(e),
      ]);
    });
    const fname = 'payroll_' + month;
    if (fmt === 'csv') exportCSV(fname + '.csv', rows); else exportExcel(fname + '.xlsx', rows);
  }

  if (state.role === 'Employee') {
    const me = state.currentUser!;
    const myEntry = payroll?.entries.find((e) => e.emp === me.name);
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
          <div className="card pad"><AttendanceCalendar empName={me.name} /></div>
        </section>
        <div className="footnote">Net Pay reflects attendance and approved leave for the cycle — no deductions are applied yet. Salary period: {salaryPeriodLabel(state.rules)}.</div>
      </>
    );
  }

  const entries = payroll?.entries || [];
  const totalPayout = entries.reduce((s, e) => s + liveNetPay(e), 0);
  const alreadyRun = payroll?.alreadyRun ?? false;
  const missingCtc = payroll?.missingCtcEmployees || [];

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Payroll &amp; Salary Slips</h1><div className="page-sub">Computed from attendance and approved leave. Salary period: {salaryPeriodLabel(state.rules)}</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>
      <div className="card pad" style={{ marginBottom: 20 }}>
        <div className="block-head"><h2>{alreadyRun ? 'Payroll' : 'Ready to run'} — {monthKeyToLabel(month)}</h2></div>
        {loading && <div className="empty">Loading…</div>}
        {loadError && <div className="notice" style={{ borderColor: '#FECACA' }}>{loadError}</div>}
        {!loading && !loadError && (
          <>
            <div className="table-scroll"><table><thead><tr><th>Employee</th><th>CTC (Monthly)</th><th>Total Days</th><th>Present Days</th><th>Absent Days</th><th>Week Off</th><th>Leaves</th><th>LOP Days</th><th>Gross</th><th>TDS</th><th>Net Pay</th></tr></thead>
              <tbody>
                {entries.map((e) => {
                  const ctc = employeeByName.get(e.emp)?.ctc ?? 0;
                  return (
                    <tr key={e.emp}>
                      <td>{e.emp}</td>
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
                            value={tdsInputs[e.emp] ?? String(e.tds)}
                            onChange={(ev) => setTdsInputs((prev) => ({ ...prev, [e.emp]: ev.target.value }))}
                            style={{ width: 90 }}
                          />
                        </div>
                      </td>
                      <td>₹{liveNetPay(e).toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
                {entries.length === 0 && <tr><td colSpan={11}><div className="empty">No active employees to run payroll for yet.</div></td></tr>}
              </tbody>
            </table></div>
            {!alreadyRun && payroll && missingCtc.length > 0 && (
              <div className="notice" style={{ borderColor: '#FECACA', marginTop: 12 }}>
                <strong>CTC not set for {missingCtc.length} employee{missingCtc.length > 1 ? 's' : ''}: {missingCtc.join(', ')}.</strong>{' '}
                Run Payroll is disabled until every active employee has an Annual CTC — set it from Directory, then come back here.
              </div>
            )}
            {runError && <div className="notice" style={{ borderColor: '#FECACA', marginTop: 12 }}>{runError}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <div className="meta">Total payout: <strong>₹{totalPayout.toLocaleString('en-IN')}</strong>{alreadyRun ? ' · frozen for this cycle' : ' · cycle ended, ready to run'}</div>
              <div className="toolbar">
                <button className="btn sm" onClick={() => exportPayroll('csv')} disabled={entries.length === 0}>⇩ CSV</button>
                <button className="btn sm" onClick={() => exportPayroll('excel')} disabled={entries.length === 0}>⇩ Excel</button>
                <button
                  className="btn primary"
                  disabled={!(payroll?.canRun ?? false) || entries.length === 0 || running || missingCtc.length > 0}
                  title={missingCtc.length > 0 ? `Set CTC for: ${missingCtc.join(', ')}` : undefined}
                  onClick={handleRunPayroll}
                >
                  {running ? 'Running…' : alreadyRun ? 'Recompute & Run Payroll' : 'Run Payroll'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      <section className="block">
        <div className="block-head"><h2>Payslip history</h2></div>
        <div className="card"><table><thead><tr><th>Month</th><th>Employees paid</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr><td>{monthKeyToLabel(month)}</td><td>{entries.length}</td><td><StatusBadge status={alreadyRun ? 'approved' : 'pending'} /></td>
              <td style={{ textAlign: 'right' }}>
                <button className="btn ghost sm" disabled={!alreadyRun || entries.length === 0 || pdfBusy} onClick={handleDownloadAllPayslips}>
                  {pdfBusy ? 'Generating…' : 'Download payslips (PDF)'}
                </button>
              </td></tr>
          </tbody>
        </table></div>
      </section>
    </>
  );
}
