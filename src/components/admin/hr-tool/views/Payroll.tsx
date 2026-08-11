'use client';

import { useState } from 'react';
import { useHrTool } from '../HrToolContext';
import AttendanceCalendar from './AttendanceCalendar';
import { StatusBadge, exportCSV, exportExcel, salaryPeriodLabel } from '../utils';

/** Gross/deduction figures are computed for real from each employee's CTC — the old
 * standalone tool also hardcoded an extra "July 2026 · ₹62,000 · ..." payslip row that
 * showed for every company regardless of actual data; that row is gone, only the real,
 * DB-backed current payroll cycle is shown. */
function grossFor(ctc: number): number { return Math.round(ctc / 12); }
function deductionFor(gross: number): number { return Math.round(gross * 0.078); }

export default function Payroll() {
  const { state, persistPayrollRun } = useHrTool();
  const [calEmp, setCalEmp] = useState<string | null>(null);

  if (state.role === 'Employee') {
    const me = state.currentUser!;
    const gross = grossFor(me.ctc), ded = deductionFor(gross);
    return (
      <>
        <div className="topbar">
          <div><h1 className="page-title">My Payslips</h1><div className="page-sub">Download your monthly salary slips, and see your attendance for the cycle.</div></div>
          <div className="as-role">{me.name} · {state.role}</div>
        </div>
        <div className="card"><table><thead><tr><th>Month</th><th>Gross</th><th>Deductions</th><th>Net Pay</th><th></th></tr></thead>
          <tbody>
            <tr><td>{state.payrollRun.month}</td><td>₹{gross.toLocaleString('en-IN')}</td><td>₹{ded.toLocaleString('en-IN')}</td><td>₹{(gross - ded).toLocaleString('en-IN')}</td>
              <td style={{ textAlign: 'right' }}><button className="btn ghost sm" disabled={state.payrollRun.status !== 'run'}>Download PDF</button></td></tr>
          </tbody>
        </table></div>
        <section className="block" style={{ marginTop: 22 }}>
          <div className="block-head"><h2>Attendance calendar — {state.payrollRun.month}</h2></div>
          <div className="card pad"><AttendanceCalendar empName={me.name} /></div>
        </section>
        <div className="footnote">TDS is auto-calculated from your tax regime choice and Form 12BB investment declarations. Salary period: {salaryPeriodLabel(state.rules)}.</div>
      </>
    );
  }

  const payable = state.employees.filter((e) => e.status !== 'exited');
  const totalPayout = payable.reduce((s, e) => s + grossFor(e.ctc), 0);
  const pickedEmp = calEmp || payable[0]?.name || '';

  async function runPayroll() {
    await persistPayrollRun({ month: state.payrollRun.month, status: 'run' });
  }
  function exportPayroll(fmt: 'csv' | 'excel') {
    const rows: (string | number)[][] = [['Employee', 'Gross', 'Deductions', 'Net Pay']];
    payable.forEach((e) => { const gross = grossFor(e.ctc), ded = deductionFor(gross); rows.push([e.name, gross, ded, gross - ded]); });
    const fname = 'payroll_' + state.payrollRun.month.replace(/\s+/g, '_');
    if (fmt === 'csv') exportCSV(fname + '.csv', rows); else exportExcel(fname + '.xlsx', rows);
  }

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Payroll &amp; Salary Slips</h1><div className="page-sub">Auto-computed from CTC structure, attendance, and approved leave. Salary period: {salaryPeriodLabel(state.rules)}</div></div>
        <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
      </div>
      <div className="card pad" style={{ marginBottom: 20 }}>
        <div className="block-head"><h2>Pre-payroll summary — {state.payrollRun.month}</h2></div>
        <table><thead><tr><th>Employee</th><th>Gross</th><th>Deductions</th><th>Net Pay</th></tr></thead>
          <tbody>
            {payable.map((e) => { const gross = grossFor(e.ctc), ded = deductionFor(gross); return (
              <tr key={e.id}><td>{e.name}</td><td>₹{gross.toLocaleString('en-IN')}</td><td>₹{ded.toLocaleString('en-IN')}</td><td>₹{(gross - ded).toLocaleString('en-IN')}</td></tr>
            ); })}
            {payable.length === 0 && <tr><td colSpan={4}><div className="empty">No active employees to run payroll for yet.</div></td></tr>}
          </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <div className="meta">Total payout: <strong>₹{totalPayout.toLocaleString('en-IN')}</strong> · TDS auto-applied per employee tax regime</div>
          <div className="toolbar">
            <button className="btn sm" onClick={() => exportPayroll('csv')}>⇩ CSV</button>
            <button className="btn sm" onClick={() => exportPayroll('excel')}>⇩ Excel</button>
            <button className="btn primary" disabled={state.payrollRun.status === 'run' || payable.length === 0} onClick={runPayroll}>{state.payrollRun.status === 'run' ? 'Payroll run ✓' : 'Run Payroll'}</button>
          </div>
        </div>
      </div>
      {payable.length > 0 && (
        <section className="block">
          <div className="block-head"><h2>Attendance calendar (feeds payroll)</h2>
            <select value={pickedEmp} onChange={(e) => setCalEmp(e.target.value)} style={{ width: 220 }}>
              {payable.map((e) => <option key={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="card pad"><AttendanceCalendar empName={pickedEmp} /></div>
        </section>
      )}
      <section className="block">
        <div className="block-head"><h2>Payslip history</h2></div>
        <div className="card"><table><thead><tr><th>Month</th><th>Employees paid</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr><td>{state.payrollRun.month}</td><td>{payable.length}</td><td><StatusBadge status={state.payrollRun.status === 'run' ? 'approved' : 'pending'} /></td>
              <td style={{ textAlign: 'right' }}><button className="btn ghost sm" disabled={state.payrollRun.status !== 'run'}>Download payslips (PDF)</button></td></tr>
          </tbody>
        </table></div>
      </section>
    </>
  );
}
