'use client';

import { useEffect, useMemo, useState } from 'react';
import { useHrTool } from '../HrToolContext';
import AttendanceCalendar from './AttendanceCalendar';
import { StatusBadge, exportCSV, exportExcel, salaryPeriodLabel, monthKeyToLabel, nextEmployeeId, todayStr } from '../utils';
import { currentPayrollMonthKey } from '@/modules/hr-tool/utils/time';
import { hrApi, type PayrollApiResult } from '../api';

export default function Payroll() {
  const { state, runPayrollForMonth, persistEmployees } = useHrTool();
  const [calEmp, setCalEmp] = useState<string | null>(null);
  const [payroll, setPayroll] = useState<PayrollApiResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [salaryEditFor, setSalaryEditFor] = useState<string | null>(null);
  const [salaryInput, setSalaryInput] = useState('');
  const [savingSalary, setSavingSalary] = useState(false);

  const month = currentPayrollMonthKey(state.rules);

  async function loadPayroll(signal?: { cancelled: boolean }) {
    setLoading(true);
    setLoadError('');
    const res = await hrApi.getPayroll(month);
    if (signal?.cancelled) return;
    if (res.success && res.data) setPayroll(res.data);
    else setLoadError(res.error || 'Failed to load payroll');
    setLoading(false);
  }

  useEffect(() => {
    const signal = { cancelled: false };
    loadPayroll(signal);
    return () => { signal.cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const employeeByName = useMemo(() => new Map(state.employees.map((e) => [e.name, e])), [state.employees]);

  async function handleRunPayroll() {
    setRunning(true);
    setRunError('');
    const res = await runPayrollForMonth(month);
    if (res.success) {
      const refreshed = await hrApi.getPayroll(month);
      if (refreshed.success && refreshed.data) setPayroll(refreshed.data);
    } else {
      setRunError(res.error || 'Failed to run payroll');
    }
    setRunning(false);
  }

  function openSalaryEdit(name: string) {
    setSalaryEditFor(name);
    setSalaryInput(String(employeeByName.get(name)?.ctc ?? ''));
  }

  /** Employees hired via Assigning IDs don't have an hr_employees record until their salary is
   * set here for the first time — this creates one (mirroring Directory's CSV-import defaults)
   * if none exists yet, or just updates the ctc on the existing record if one does. */
  async function saveSalary(name: string) {
    const ctc = Number(salaryInput);
    if (!Number.isFinite(ctc) || ctc < 0) { alert('Enter a valid annual CTC amount.'); return; }
    setSavingSalary(true);
    const existing = employeeByName.get(name);
    let updated;
    if (existing) {
      updated = state.employees.map((e) => (e.name === name ? { ...e, ctc } : e));
    } else {
      const credential = state.employeeCredentials.find((c) => c.name === name);
      updated = [...state.employees, {
        id: nextEmployeeId(state.employees), name, email: credential?.email || '—',
        designation: credential?.designation || '—', team: state.teams[0]?.name || '', manager: null,
        status: 'active', doj: credential ? new Date(credential.createdAt).toISOString().slice(0, 10) : todayStr(),
        sysRole: 'Employee', ctc, leaveBalance: { Casual: 6, Sick: 6, Earned: 10 }, documents: [], signedDocs: [],
      }];
    }
    await persistEmployees(updated);
    await loadPayroll();
    setSalaryEditFor(null);
    setSavingSalary(false);
  }

  function exportPayroll(fmt: 'csv' | 'excel') {
    if (!payroll) return;
    const rows: (string | number)[][] = [['Employee', 'CTC (Annual)', 'Working Days', 'Present Days', 'Leave Days', 'LOP Days', 'Gross', 'Net Pay']];
    payroll.entries.forEach((e) => rows.push([e.emp, employeeByName.get(e.emp)?.ctc ?? 0, e.workingDays, e.presentDays, e.leaveDays, e.lopDays, e.monthlyGross, e.netPay]));
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
        <div className="card"><table><thead><tr><th>Month</th><th>Present Days</th><th>Leave Days</th><th>LOP Days</th><th>Gross</th><th>Net Pay</th><th></th></tr></thead>
          <tbody>
            {myEntry ? (
              <tr>
                <td>{monthKeyToLabel(month)}</td><td>{myEntry.presentDays}</td><td>{myEntry.leaveDays}</td><td>{myEntry.lopDays}</td>
                <td>₹{myEntry.monthlyGross.toLocaleString('en-IN')}</td><td>₹{myEntry.netPay.toLocaleString('en-IN')}</td>
                <td style={{ textAlign: 'right' }}><button className="btn ghost sm" disabled={!payroll?.alreadyRun}>Download PDF</button></td>
              </tr>
            ) : (
              <tr><td colSpan={7}><div className="empty">{loading ? 'Loading…' : 'No payroll data for you yet this cycle.'}</div></td></tr>
            )}
          </tbody>
        </table></div>
        <section className="block" style={{ marginTop: 22 }}>
          <div className="block-head"><h2>Attendance calendar — {monthKeyToLabel(month)}</h2></div>
          <div className="card pad"><AttendanceCalendar empName={me.name} /></div>
        </section>
        <div className="footnote">Net Pay reflects attendance and approved leave for the cycle — no deductions are applied yet. Salary period: {salaryPeriodLabel(state.rules)}.</div>
      </>
    );
  }

  const entries = payroll?.entries || [];
  const totalPayout = entries.reduce((s, e) => s + e.netPay, 0);
  const pickedEmp = calEmp || entries[0]?.emp || state.employees.find((e) => e.status !== 'exited')?.name || '';
  const alreadyRun = payroll?.alreadyRun ?? false;
  const periodEnded = payroll?.periodEnded ?? false;

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
            <table><thead><tr><th>Employee</th><th>CTC (Annual)</th><th>Working Days</th><th>Present Days</th><th>Leave Days</th><th>LOP Days</th><th>Gross</th><th>Net Pay</th></tr></thead>
              <tbody>
                {entries.map((e) => {
                  const ctc = employeeByName.get(e.emp)?.ctc ?? 0;
                  return (
                    <tr key={e.emp}>
                      <td>{e.emp}</td>
                      <td>
                        {salaryEditFor === e.emp ? (
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <input
                              type="number" min={0} className="mini-input" style={{ width: 110 }}
                              value={salaryInput} onChange={(ev) => setSalaryInput(ev.target.value)} autoFocus
                            />
                            <button className="btn sm" disabled={savingSalary} onClick={() => saveSalary(e.emp)}>{savingSalary ? '…' : 'Save'}</button>
                            <button className="btn ghost sm" disabled={savingSalary} onClick={() => setSalaryEditFor(null)}>Cancel</button>
                          </div>
                        ) : (
                          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {ctc > 0 ? '₹' + ctc.toLocaleString('en-IN') : <span className="meta">Not set</span>}
                            <button className="btn ghost sm" onClick={() => openSalaryEdit(e.emp)}>{ctc > 0 ? 'Edit' : 'Set salary'}</button>
                          </span>
                        )}
                      </td>
                      <td>{e.workingDays}</td><td>{e.presentDays}</td><td>{e.leaveDays}</td><td>{e.lopDays}</td>
                      <td>₹{e.monthlyGross.toLocaleString('en-IN')}</td><td>₹{e.netPay.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
                {entries.length === 0 && <tr><td colSpan={8}><div className="empty">No active employees to run payroll for yet.</div></td></tr>}
              </tbody>
            </table>
            <div className="footnote" style={{ marginTop: 10 }}>
              Net Pay = Gross − (LOP Days × Gross ÷ days in this cycle). An LOP (Loss of Pay) day is a working day with no full punch (in and out) and no approved leave. Present Days and Leave Days are shown separately from LOP Days; no PF/ESI/TDS deductions are applied yet.
            </div>
            {!alreadyRun && payroll && !payroll.canRun && (
              <div className="notice" style={{ marginTop: 12 }}>
                This payroll period ({payroll.periodFrom} to {payroll.periodTo}) is still open — the numbers above are a live preview. Run Payroll unlocks on {payroll.runUnlocksAt}, 5 days before the cycle ends.
              </div>
            )}
            {!alreadyRun && payroll && payroll.canRun && !periodEnded && (
              <div className="notice" style={{ marginTop: 12 }}>
                This cycle hasn&apos;t ended yet ({payroll.periodTo}), but you&apos;re within the run window — days after today aren&apos;t counted present/leave/LOP yet. Running now locks in today&apos;s numbers; run again after the cycle ends to pick up the remaining days.
              </div>
            )}
            {runError && <div className="notice" style={{ borderColor: '#FECACA', marginTop: 12 }}>{runError}</div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <div className="meta">Total payout: <strong>₹{totalPayout.toLocaleString('en-IN')}</strong>{alreadyRun ? ' · frozen for this cycle' : ' · live preview, not yet run'}</div>
              <div className="toolbar">
                <button className="btn sm" onClick={() => exportPayroll('csv')} disabled={entries.length === 0}>⇩ CSV</button>
                <button className="btn sm" onClick={() => exportPayroll('excel')} disabled={entries.length === 0}>⇩ Excel</button>
                <button className="btn primary" disabled={!(payroll?.canRun ?? false) || entries.length === 0 || running} onClick={handleRunPayroll}>
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
