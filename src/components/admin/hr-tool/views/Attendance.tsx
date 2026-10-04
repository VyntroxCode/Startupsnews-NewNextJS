'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CircleCheck, MapPin, Timer, TriangleAlert } from 'lucide-react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import ApprovalCell from './ApprovalCell';
import AttendanceCalendar from './AttendanceCalendar';
import PunchOutTimeInput from '../../PunchOutTimeInput';
import { ApprovalBadge, StatusBadge, arrivalBucket, employeeName, isAdmin, latenessInfo, rmOf, scopedApprovals, todayStr } from '../utils';
import { hrApi } from '../api';
import { realDayHoursBucket } from '@/modules/hr-tool/utils/lateness';
import { payrollMonthKeyForDate, shiftMonthKey } from '@/modules/hr-tool/utils/time';
import { getAuthHeaders } from '@/lib/admin-auth';
import { getCurrentBrowserLocation, geofenceHintFor, type BrowserLocation } from '@/lib/browser-geolocation';
import type { PanelAdminRole } from '@/modules/panel-admins/domain/types';
import type { HrEmployeeCredential } from '@/modules/hr-credentials/domain/types';

const REG_REASONS = ['Forgot to punch out', 'Forgot to punch in', 'System/network issue', 'Worked from a client site'];
const PANEL_ROLE_LABEL: Record<PanelAdminRole, string> = { event_admin: 'Event Admin', publisher_admin: 'Publisher Admin', it_support: 'IT Support', financial_analyst: 'Financial Analyst' };

export default function Attendance() {
  const { state, applyServerPunch, decideRegularization, addRegularizationToState } = useHrTool();
  const [punching, setPunching] = useState<'in' | 'out' | null>(null);
  const [regOpen, setRegOpen] = useState(false);
  const [regDate, setRegDate] = useState(todayStr());
  const [regPunchType, setRegPunchType] = useState<'in' | 'out'>('in');
  const [regTime, setRegTime] = useState('');
  const [regReason, setRegReason] = useState(REG_REASONS[0]);
  const [regReasonOther, setRegReasonOther] = useState('');
  // Whose calendar is open, and on which pay cycle (null = today's).
  const [calendarEmp, setCalendarEmp] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<string | undefined>(undefined);

  const isEmployeeOnly = state.role === 'Employee';
  const scopeFilter = isAdmin(state.role)
    ? () => true
    : state.role === 'Reporting Manager'
      ? (employeeId: string) => rmOf(state.employees, employeeId) === state.currentUser?.id || employeeId === state.currentUser?.id
      : (employeeId: string) => employeeId === state.currentUser?.id;
  const attRows = state.attendance.filter((a) => a.date === todayStr() && scopeFilter(a.employeeId));
  const regRows = scopedApprovals(state.regularizations, state.role, state.currentUser?.id, state.employees);
  // Employee ID / role for a row comes through that employee's own credential link, never a name match.
  const credentialById = useMemo(() => new Map(state.employeeCredentials.map((c) => [c.id, c])), [state.employeeCredentials]);
  const employeeById = useMemo(() => new Map(state.employees.map((e) => [e.id, e])), [state.employees]);
  const credentialFor = (employeeId: string): HrEmployeeCredential | undefined => {
    const credentialId = employeeById.get(employeeId)?.credentialId;
    return credentialId != null ? credentialById.get(credentialId) : undefined;
  };

  const myPunch = isEmployeeOnly && state.currentUser ? state.punchLog[state.currentUser.id] : null;
  const punchedInToday = !!(myPunch && myPunch.date === new Date().toISOString().slice(0, 10) && myPunch.inTime);
  const punchedOutToday = !!(myPunch && myPunch.date === new Date().toISOString().slice(0, 10) && myPunch.outTime);
  const myLateness = punchedInToday && myPunch ? latenessInfo(myPunch.inMinutes, state.rules) : null;

  /** Self-service punch. Goes through POST /api/admin/hr-tool/punch so the once-per-day rule and
   * the Geo-fencing rule are enforced server-side exactly as for every other punch surface —
   * the old version wrote straight to the raw punch-log upsert and claimed "Geolocation captured"
   * without capturing anything. */
  async function punch(type: 'in' | 'out') {
    const me = state.currentUser;
    if (!me || punching) return;
    setPunching(type);
    try {
      let location: BrowserLocation | undefined;
      if (state.rules.geoFencing) {
        try {
          location = await getCurrentBrowserLocation();
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Could not get your location.');
          return;
        }
      }
      const res = await hrApi.punch(me.id, type, location);
      if (!res.success || !res.data) {
        alert([res.error || 'Could not record the punch.', geofenceHintFor(res.code)].filter(Boolean).join('\n\n'));
        return;
      }
      const { today, note, geo } = res.data;
      applyServerPunch({
        employeeId: me.id, emp: me.name, date: todayStr(), inTime: today.inTime, inMinutes: today.inMinutes, outTime: today.outTime, outMinutes: today.outMinutes,
      });
      const where = geo ? ` Recorded ${Math.round(geo.distanceM)} m from the office.` : '';
      if (type === 'in') {
        const lateness = latenessInfo(today.inMinutes, state.rules);
        alert(`Punched in at ${today.inTime}${lateness ? ` — ${lateness.text}` : ''}.${where}`);
      } else {
        alert(`Punched out at ${today.outTime}${note ? ` — ${note.replace(/\.$/, '').toLowerCase()}` : ''}.${where}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not record the punch.');
    } finally {
      setPunching(null);
    }
  }

  async function submitRegularization() {
    const reason = regReason === '__other__' ? regReasonOther.trim() : regReason;
    if (!reason) { alert('Please describe the reason.'); return; }
    const time = regTime.trim();
    if (!time) { alert('Please set the time being regularized.'); return; }
    if (!state.currentUser) return;
    // Goes through the server so the SAME rules apply here as on the employee portal: cycle
    // date limit, per-cycle quota, duplicate check, and the on-time-punch check. This screen used
    // to build the row itself and save it straight to state, which applied none of them.
    const res = await fetch('/api/admin/hr-tool/regularizations', {
      method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: state.currentUser.id, date: regDate, reason, punchType: regPunchType, requestedTime: time }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) { alert(json?.error || 'Could not submit the regularization request.'); return; }
    addRegularizationToState(json.data);
    setRegOpen(false);
  }
  async function decideReg(id: string, level: 'rm' | 'hr', decision: 'approved' | 'rejected', remarks: string) {
    await decideRegularization(id, level, decision, remarks);
  }

  return (
    <>
      <div className="topbar">
        <div><h1 className="page-title">Attendance</h1><div className="page-sub">{isEmployeeOnly ? 'Your punches and regularization requests.' : "Punches and regularization requests, scoped to your view."}</div></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="as-role">{state.currentUser ? state.currentUser.name : ''} · {state.role}</div>
        </div>
      </div>
      {isEmployeeOnly && (
        <div className="toolbar" style={{ justifyContent: 'flex-end', alignItems: 'center', marginBottom: 14, gap: 8 }}>
          <div style={{ color: 'var(--muted)', fontSize: 12.5, marginRight: 'auto' }}>
            Shift: {state.rules.shiftStartTime} – {state.rules.shiftEndTime} ({state.rules.shiftGraceMinutes} min grace) — set by HR
            {state.rules.geoFencing && <><br /><span className="ic-text"><MapPin size={13} aria-hidden />Punch In / Out only within {state.rules.geoFenceRadiusM} m of the office — your browser will ask for your location.</span></>}
            {myLateness && <><br /><span className="ic-text" style={{ fontWeight: 700, color: myLateness.late ? 'var(--red)' : 'var(--green)' }}>{myLateness.late ? <TriangleAlert size={13} aria-hidden /> : <CircleCheck size={13} aria-hidden />}{myLateness.text}</span></>}
          </div>
          <button className="btn primary" disabled={punchedInToday || punching !== null} onClick={() => punch('in')}>
            {punching === 'in' ? 'Getting location…' : <><Timer size={14} aria-hidden />Punch In{punchedInToday && myPunch ? ` — ${myPunch.inTime}` : ''}</>}
          </button>
          <button className="btn primary" disabled={punchedOutToday || punching !== null} onClick={() => punch('out')}>
            {punching === 'out' ? 'Getting location…' : <><Timer size={14} aria-hidden />Punch Out{punchedOutToday && myPunch ? ` — ${myPunch.outTime}` : ''}</>}
          </button>
        </div>
      )}
      <section className="block">
        <div className="block-head"><h2>Today — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</h2></div>
        <div className="card"><div className="table-scroll"><table><thead><tr><th>Employee</th><th>Employee ID</th><th>Role</th><th>Status</th><th>In</th><th>Out</th><th>Lateness</th></tr></thead>
          <tbody>
            {attRows.map((a) => {
              const cred = credentialFor(a.employeeId);
              const rowInMinutes = state.punchLog[a.employeeId]?.inMinutes ?? null;
              const rowBucket = arrivalBucket(rowInMinutes, state.rules);
              const rowLateness = latenessInfo(rowInMinutes, state.rules);
              // Real hours worked, not the raw stored status (always 'Present' from the moment
              // of punch-in) — a punch-in with no punch-out shows Absent immediately, until
              // punch-out is actually clicked. See realDayHoursBucket.
              const dayBucket = realDayHoursBucket(a.inMinutes ?? null, a.outMinutes ?? null, state.rules);
              return (
                <tr key={a.employeeId || a.emp} onClick={() => { setCalendarMonth(undefined); setCalendarEmp(a.employeeId); }} style={{ cursor: 'pointer' }}>
                  <td>{employeeName(state.employees, a.employeeId, a.emp)}</td>
                  <td>{cred ? <code>{cred.employeeCode}</code> : <span className="meta">—</span>}</td>
                  <td>{cred?.panelRole ? PANEL_ROLE_LABEL[cred.panelRole] : <span className="meta">—</span>}</td>
                  <td>
                    {dayBucket === 'absent' && <span className="ic-text" style={{ fontWeight: 700, color: 'var(--red)' }}><TriangleAlert size={13} aria-hidden />Absent</span>}
                    {dayBucket === 'half-day' && <span style={{ fontWeight: 700, color: 'var(--orange)' }}>Half Day</span>}
                    {dayBucket === 'short-leave' && <span style={{ fontWeight: 700, color: 'var(--orange)' }}>Short Leave</span>}
                    {dayBucket === 'full-time' && <StatusBadge status="active" />}
                    {dayBucket === null && <StatusBadge status="pending" />}
                  </td>
                  <td>{a.inTime}</td>
                  <td>{a.outTime}</td>
                  <td>
                    {rowBucket === null && <span className="meta">—</span>}
                    {rowBucket === 'on-time' && <span>On time</span>}
                    {rowBucket === 'grace' && <span className="ic-text" style={{ fontWeight: 700, color: 'var(--orange)' }}><TriangleAlert size={13} aria-hidden />Within grace period</span>}
                    {rowBucket === 'short-leave' && <span className="ic-text" style={{ fontWeight: 700, color: 'var(--orange)' }} title={rowLateness?.text}><TriangleAlert size={13} aria-hidden />Short Leave</span>}
                    {rowBucket === 'half-day' && <span className="ic-text" style={{ fontWeight: 700, color: 'var(--red)' }} title={rowLateness?.text}><TriangleAlert size={13} aria-hidden />Half Day</span>}
                    {rowBucket === 'absent' && <span className="ic-text" style={{ fontWeight: 700, color: 'var(--red)' }} title={rowLateness?.text}><TriangleAlert size={13} aria-hidden />Absent</span>}
                  </td>
                </tr>
              );
            })}
            {attRows.length === 0 && <tr><td colSpan={7}><div className="empty">No attendance recorded yet today.</div></td></tr>}
          </tbody>
        </table></div></div>
      </section>
      <MonthlyAttendance scopeFilter={scopeFilter} onOpen={(employeeId, month) => { setCalendarMonth(month); setCalendarEmp(employeeId); }} />
      <section className="block">
        <div className="block-head"><h2>Regularization requests</h2>
          {isEmployeeOnly && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn sm" onClick={() => { setRegDate(todayStr()); setRegPunchType('in'); setRegTime(''); setRegReason(REG_REASONS[0]); setRegReasonOther(''); setRegOpen(true); }}>+ Regularize Punch In</button>
              <button className="btn sm" onClick={() => { setRegDate(todayStr()); setRegPunchType('out'); setRegTime(''); setRegReason(REG_REASONS[0]); setRegReasonOther(''); setRegOpen(true); }}>+ Regularize Punch Out</button>
            </div>
          )}
        </div>
        <div className="meta" style={{ marginBottom: 10 }}>Employees can request within {state.rules.regularizationWindowDays} days of the date, up to {state.rules.regularizationMonthlyQuota} days per payroll cycle. HR approves or rejects — attendance can&apos;t be edited directly.</div>
        <div className="card"><div className="table-scroll wrap-table"><table>
          <colgroup>
            <col style={{ width: '13%' }} /><col style={{ width: '9%' }} /><col style={{ width: '9%' }} /><col style={{ width: '10%' }} /><col style={{ width: '27%' }} /><col style={{ width: '13%' }} /><col style={{ width: '19%' }} />
          </colgroup>
          <thead><tr><th>Employee</th><th>Date</th><th>Type</th><th>Requested Time</th><th>Reason</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
          <tbody>
            {regRows.map((r) => (
              <tr key={r.id}><td>{employeeName(state.employees, r.employeeId, r.emp)}</td><td>{r.date}</td><td>{r.punchType === 'out' ? 'Punch Out' : 'Punch In'}</td><td>{r.requestedTime || '—'}</td><td>{r.reason}</td><td><ApprovalBadge req={r} /></td>
                <td style={{ textAlign: 'right' }}><ApprovalCell req={r} onDecide={(level, decision, remarks) => decideReg(r.id, level, decision, remarks)} /></td>
              </tr>
            ))}
            {regRows.length === 0 && <tr><td colSpan={7}><div className="empty">Nothing here.</div></td></tr>}
          </tbody>
        </table></div></div>
      </section>

      {regOpen && (
        <ModalShell title={`Regularize ${regPunchType === 'out' ? 'Punch Out' : 'Punch In'}`} onClose={() => setRegOpen(false)} actions={[
          { label: 'Cancel', cls: 'btn', onClick: () => setRegOpen(false) },
          { label: 'Submit', cls: 'btn primary', onClick: submitRegularization },
        ]}>
          <div className="notice">Requests must be submitted within {state.rules.regularizationWindowDays} days of the date, up to {state.rules.regularizationMonthlyQuota} days per payroll cycle. Punch In 8:00 AM–2:00 PM, Punch Out 2:00 PM–11:00 PM.</div>
          <div className="field"><label className="field-label">Date</label><input type="date" value={regDate} onChange={(e) => setRegDate(e.target.value)} /></div>
          <div className="field"><label className="field-label">{regPunchType === 'out' ? 'Punch Out' : 'Punch In'} time</label>{regPunchType === 'out'
            ? <div><PunchOutTimeInput value={regTime} onChange={setRegTime} selectStyle={{ width: 'auto' }} /></div>
            : <input type="time" min="08:00" max="14:00" value={regTime} onChange={(e) => setRegTime(e.target.value)} />}</div>
          <div className="field"><label className="field-label">Reason</label>
            <select value={regReason} onChange={(e) => setRegReason(e.target.value)}>
              {REG_REASONS.map((r) => <option key={r}>{r}</option>)}
              <option value="__other__">Other (please specify)</option>
            </select>
          </div>
          {regReason === '__other__' && <div className="field"><label className="field-label">Please specify</label><textarea placeholder="Describe the reason..." value={regReasonOther} onChange={(e) => setRegReasonOther(e.target.value)} /></div>}
        </ModalShell>
      )}

      {calendarEmp && (
        <ModalShell title={`${employeeName(state.employees, calendarEmp)} — Attendance calendar`} onClose={() => setCalendarEmp(null)} actions={[{ label: 'Close', cls: 'btn', onClick: () => setCalendarEmp(null) }]} maxWidth="80vw">
          <AttendanceCalendar key={`${calendarEmp}:${calendarMonth || ''}`} employeeId={calendarEmp} initialMonth={calendarMonth} />
        </ModalShell>
      )}
    </>
  );
}

const fmtCycleDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtDays = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** Monthly overview: every employee in view for one pay cycle (26th → 25th), any past cycle
 * reachable with the arrows. Each row is that employee's day ledger totals — the same numbers
 * their calendar and payslip show — and clicking it opens their calendar on that cycle. Re-fetches
 * when attendance, a regularization or a leave changes in the HR tool. */
function MonthlyAttendance({ scopeFilter, onOpen }: { scopeFilter: (employeeId: string) => boolean; onOpen: (employeeId: string, month: string) => void }) {
  const { state } = useHrTool();
  const currentCycle = useMemo(() => payrollMonthKeyForDate(todayStr(), state.rules), [state.rules]);
  const [month, setMonth] = useState(currentCycle);
  const [data, setData] = useState<Awaited<ReturnType<typeof hrApi.getAttendanceSummary>>['data'] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let live = true;
    hrApi.getAttendanceSummary(month)
      .then((res) => { if (!live) return; if (res.success && res.data) { setData(res.data); setError(''); } else setError(res.error || 'Could not load attendance.'); })
      .catch(() => { if (live) setError('Could not load attendance.'); });
    return () => { live = false; };
  }, [month, state.attendance, state.regularizations, state.leaveRequests, state.rules, state.orgStructure.holidays]);

  const rows = (data?.month === month ? data.rows : [])
    .filter((r) => scopeFilter(r.employeeId))
    .filter((r) => !query.trim() || r.name.toLowerCase().includes(query.trim().toLowerCase()));
  const canGoNext = month < currentCycle;
  const hasRun = !!data && data.month === month && data.rows.some((r) => r.savedGross != null);

  return (
    <section className="block">
      <div className="block-head">
        <h2>Monthly attendance</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button type="button" className="btn ghost sm" onClick={() => setMonth((m) => shiftMonthKey(m, -1))} aria-label="Previous pay cycle"><ChevronLeft size={14} aria-hidden /></button>
          <strong style={{ fontSize: 13 }}>{data?.month === month ? `${fmtCycleDate(data.periodFrom)} – ${fmtCycleDate(data.periodTo)}` : '…'}</strong>
          <button type="button" className="btn ghost sm" onClick={() => canGoNext && setMonth((m) => shiftMonthKey(m, 1))} disabled={!canGoNext} aria-label="Next pay cycle" style={{ opacity: canGoNext ? 1 : 0.4 }}><ChevronRight size={14} aria-hidden /></button>
        </div>
      </div>
      <div className="meta" style={{ marginBottom: 10, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>
          One salary month{month === currentCycle ? ', so far' : ''}. These are the numbers payroll pays by. Click an employee to open their calendar for this month.
          {data?.month === month && data.locked && ' Payroll for this month is locked — the saved payslips are what was paid.'}
        </span>
        <input type="search" placeholder="Search employee…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 220, marginLeft: 'auto' }} />
      </div>
      {error && <div className="notice bad">{error}</div>}
      <div className="card"><div className="table-scroll"><table>
        <thead><tr><th>Employee</th><th>Present</th><th>Half day</th><th>Short leave</th><th>Paid leave</th><th>Unpaid leave</th><th>Absent / LOP</th><th>Week off</th><th>Paid days</th>{hasRun && <th>Saved payslip</th>}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.employeeId} onClick={() => onOpen(r.employeeId, month)} style={{ cursor: 'pointer' }}>
              <td>
                {employeeName(state.employees, r.employeeId, r.name)}
                {r.paidInFnf && <div className="meta">Salary for this month is paid in the Full &amp; Final</div>}
              </td>
              <td>{fmtDays(r.totals.presentDays)}</td>
              <td>{r.totals.halfDayDays}</td>
              <td>{r.totals.shortLeaveDays}{r.totals.shortLeaveDeductions > 0 && <span className="meta"> ({r.totals.shortLeaveDeductions} deducted)</span>}</td>
              <td>{fmtDays(r.totals.leaveDays)}</td>
              <td>{fmtDays(r.totals.unpaidLeaveDays)}</td>
              <td style={{ color: r.totals.lopDays > 0 ? 'var(--red)' : undefined, fontWeight: r.totals.lopDays > 0 ? 700 : undefined }}>{fmtDays(r.totals.lopDays)}</td>
              <td>{r.totals.weekOffDays}</td>
              <td><strong>{fmtDays(r.totals.paidDays)}</strong> <span className="meta">/ {r.totals.totalDays}{r.totals.futureDays ? ` · ${r.totals.futureDays} to come` : ''}</span></td>
              {hasRun && (
                <td>
                  {r.savedGross == null ? <span className="meta">—</span> : <>₹{r.savedGross.toLocaleString('en-IN')}</>}
                  {r.savedGross != null && r.savedGross !== r.monthlyGross && (
                    <div className="meta" style={{ color: '#B45309' }}>today&apos;s records: ₹{r.monthlyGross.toLocaleString('en-IN')}</div>
                  )}
                </td>
              )}
            </tr>
          ))}
          {data?.month === month && rows.length === 0 && <tr><td colSpan={10}><div className="empty">No employees in this salary month.</div></td></tr>}
          {data?.month !== month && !error && <tr><td colSpan={10}><div className="empty">Loading…</div></td></tr>}
        </tbody>
      </table></div></div>
    </section>
  );
}
