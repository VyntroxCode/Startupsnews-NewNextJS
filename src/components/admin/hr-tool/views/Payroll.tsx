'use client';

import { useEffect, useMemo, useState } from 'react';
import { useHrTool } from '../HrToolContext';
import AttendanceCalendar from './AttendanceCalendar';
import { StatusBadge, exportCSV, exportExcel, salaryPeriodLabel, monthKeyToLabel } from '../utils';
import { currentPayrollMonthKey } from '@/modules/hr-tool/utils/time';
import { hrApi, type PayrollApiResult } from '../api';

export default function Payroll() {
  const { state, runPayrollForMonth } = useHrTool();
  const [calEmp, setCalEmp] = useState<string | null>(null);
  const [payroll, setPayroll] = useState<PayrollApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  // TDS is admin-entered per employee, not computed — seeded from whatever the server returns
  // (0 for a live/unrun preview, the frozen amount once a month has been run) and editable
  // locally before "Run Payroll" actually persists it. Keyed by employee name.
  const [tdsInputs, setTdsInputs] = useState<Record<string, string>>({});

  const month = currentPayrollMonthKey(state.rules);

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
    const rows: (string | number)[][] = [['Employee', 'CTC (Monthly)', 'Total Days', 'Present Days', 'Absent Days', 'Week Off', 'Leave Days', 'LOP Days', 'Gross', 'TDS', 'Net Pay']];
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
        <div className="card"><div className="table-scroll"><table><thead><tr><th>Month</th><th>Total Days</th><th>Present Days</th><th>Absent Days</th><th>Week Off</th><th>Leave Days</th><th>LOP Days</th><th>Gross</th><th>TDS</th><th>Net Pay</th><th></th></tr></thead>
          <tbody>
            {myEntry ? (
              <tr>
                <td>{monthKeyToLabel(month)}</td><td>{myEntry.totalDays}</td><td>{myEntry.presentDays}</td>
                <td>{myEntry.absentDays}</td><td>{myEntry.weekOffDays}</td><td>{myEntry.leaveDays}</td><td>{myEntry.lopDays}</td>
                <td>₹{myEntry.monthlyGross.toLocaleString('en-IN')}</td><td>₹{myEntry.tds.toLocaleString('en-IN')}</td>
                <td>₹{myEntry.netPay.toLocaleString('en-IN')}</td>
                <td style={{ textAlign: 'right' }}><button className="btn ghost sm" disabled={!payroll?.alreadyRun}>Download PDF</button></td>
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
  const pickedEmp = calEmp || entries[0]?.emp || state.employees.find((e) => e.status !== 'exited')?.name || '';
  const alreadyRun = payroll?.alreadyRun ?? false;
  const missingCtc = payroll?.missingCtcEmployees || [];

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Payroll &amp; Salary Slips</h1><div className="page-sub">Computed from attendance and approved leave. Salary period: {salaryPeriodLabel(state.rules)}</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>
      <div className="card pad" style={{ marginBottom: 20 }}>
        <div className="block-head"><h2>{alreadyRun ? 'Payroll' : 'Pre-payroll preview'} — {monthKeyToLabel(month)}</h2></div>
        {loading && <div className="empty">Loading…</div>}
        {loadError && <div className="notice" style={{ borderColor: '#FECACA' }}>{loadError}</div>}
        {!loading && !loadError && (
          <>
            <div className="table-scroll"><table><thead><tr><th>Employee</th><th>CTC (Monthly)</th><th>Total Days</th><th>Present Days</th><th>Absent Days</th><th>Week Off</th><th>Leave Days</th><th>LOP Days</th><th>Gross</th><th>TDS</th><th>Net Pay</th></tr></thead>
              <tbody>
                {entries.map((e) => {
                  const ctc = employeeByName.get(e.emp)?.ctc ?? 0;
                  return (
                    <tr key={e.emp}>
                      <td>{e.emp}</td>
                      <td>
                        {ctc > 0 ? '₹' + Math.round(ctc / 12).toLocaleString('en-IN') : <span className="meta">Not set — set from Employee Directory</span>}
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
            {!alreadyRun && payroll && !payroll.canRun && (
              <div className="notice" style={{ marginTop: 12 }}>
                This payroll period ({payroll.periodFrom} to {payroll.periodTo}) is still open — the numbers above are a live preview. Run Payroll unlocks on {payroll.runUnlocksAt}, 5 days before the cycle ends.
              </div>
            )}
            {!alreadyRun && payroll && missingCtc.length > 0 && (
              <div className="notice" style={{ borderColor: '#FECACA', marginTop: 12 }}>
                <strong>CTC not set for {missingCtc.length} employee{missingCtc.length > 1 ? 's' : ''}: {missingCtc.join(', ')}.</strong>{' '}
                Run Payroll is disabled until every active employee has an Annual CTC — set it from Employee Directory, then come back here.
              </div>
            )}
            {runError && <div className="notice" style={{ borderColor: '#FECACA', marginTop: 12 }}>{runError}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <div className="meta">Total payout: <strong>₹{totalPayout.toLocaleString('en-IN')}</strong>{alreadyRun ? ' · frozen for this cycle' : ' · live preview, not yet run'}</div>
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
      {entries.length > 0 && (
        <section className="block">
          <div className="block-head"><h2>Attendance calendar (feeds payroll)</h2>
            <select value={pickedEmp} onChange={(e) => setCalEmp(e.target.value)} style={{ width: 220 }}>
              {entries.map((e) => <option key={e.emp}>{e.emp}</option>)}
            </select>
          </div>
          <div className="card pad"><AttendanceCalendar empName={pickedEmp} /></div>
        </section>
      )}
      <section className="block">
        <div className="block-head"><h2>Payslip history</h2></div>
        <div className="card"><table><thead><tr><th>Month</th><th>Employees paid</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr><td>{monthKeyToLabel(month)}</td><td>{entries.length}</td><td><StatusBadge status={alreadyRun ? 'approved' : 'pending'} /></td>
              <td style={{ textAlign: 'right' }}><button className="btn ghost sm" disabled>Download payslips (PDF)</button></td></tr>
          </tbody>
        </table></div>
      </section>
    </>
  );
}
