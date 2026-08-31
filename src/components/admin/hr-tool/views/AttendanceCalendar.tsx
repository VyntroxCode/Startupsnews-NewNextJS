'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import ApprovalCell from './ApprovalCell';
import { getAuthHeaders } from '@/lib/admin-auth';
import { applyApprovalDecision, ApprovalBadge, attendanceKey, isAdmin } from '../utils';
import { isSunday } from '@/modules/hr-tool/utils/time';

const REG_REASONS = ['Forgot to punch out', 'Forgot to punch in', 'System/network issue', 'Worked from a client site'];

function daysInMonth(year: number, monthIndex: number): number { return new Date(year, monthIndex + 1, 0).getDate(); }
const DOWS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type DayStatus = 'present' | 'absent' | 'leave' | 'off' | null;

/** Attendance calendar for the current real month — a real record (or an HR override) drives
 * each day's colour; days with neither show as "not recorded" instead of a fabricated status.
 * (The old standalone tool filled every blank day with a deterministic pseudo-random
 * present/absent/leave value seeded off the employee's name length — that's the fake data
 * this component replaces with an honest "not recorded" state.) */
export default function AttendanceCalendar({ empName }: { empName: string }) {
  const { state } = useHrTool();
  const [selected, setSelected] = useState<{ dateStr: string } | null>(null);

  const now = new Date();
  const year = now.getFullYear(), month = now.getMonth();
  const totalDays = daysInMonth(year, month);
  const todayNum = now.getDate();
  const todayIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(todayNum).padStart(2, '0')}`;
  const firstDow = new Date(year, month, 1).getDay();
  const holidaySet = useMemo(() => new Set(state.orgStructure.holidays.map((h) => h.date)), [state.orgStructure.holidays]);
  // Nobody can be absent before they joined, so days earlier than the employee's date of joining
  // are held out of the absent rule (and out of every total) rather than back-dated into
  // absences the moment a mid-month hire is opened.
  const doj = useMemo(() => state.employees.find((e) => e.name === empName)?.doj || null, [state.employees, empName]);
  function isBeforeJoining(dateStr: string): boolean { return !!doj && dateStr < doj; }

  function getDayStatus(dateStr: string): DayStatus {
    const override = state.attendanceOverrides[attendanceKey(empName, dateStr)];
    if (override) return override as DayStatus;
    // A Sunday or a company holiday is a day off regardless of any punch that happens to
    // exist for it — it shouldn't be judged present/absent just because nobody worked it.
    if (isSunday(dateStr) || holidaySet.has(dateStr)) return 'off';
    const real = state.attendance.find((a) => a.emp === empName && a.date === dateStr);
    if (real) {
      const s = real.status.toLowerCase();
      if (s === 'present' || s === 'absent' || s === 'leave' || s === 'off') return s;
      return 'present';
    }
    // No punch-in/punch-out and no HR override on a working day that has already arrived: absent.
    // (Purely derived — nothing is written to hr_attendance — so the moment a punch or an HR
    // correction lands for that date it takes over. Future days and pre-joining days stay null.)
    if (isBeforeJoining(dateStr)) return null;
    return dateStr <= todayIso ? 'absent' : null;
  }

  // Walk the month once, building both the visible cells and the numeric summary above them —
  // the calendar used to render colours with no totals at all, so "how many days was this person
  // actually present?" meant counting squares by eye.
  const cells: ReactNode[] = [];
  const tally = { present: 0, absent: 0, leave: 0, off: 0, preJoining: 0, upcoming: 0, regPending: 0, regApproved: 0, workedElapsed: 0 };
  for (let i = 0; i < firstDow; i++) cells.push(<div key={'b' + i} className="cal-cell blank" />);
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const status = getDayStatus(dateStr);
    const reg = state.regularizations.find((r) => r.emp === empName && r.date === dateStr);
    const elapsed = d <= todayNum;
    const preJoining = isBeforeJoining(dateStr);

    if (status === 'off') tally.off++;
    else if (status === 'present') tally.present++;
    else if (status === 'absent') tally.absent++;
    else if (status === 'leave') tally.leave++;
    else if (preJoining) tally.preJoining++;
    else tally.upcoming++;
    // "Working days so far" is the honest denominator for an attendance %: it excludes
    // week-offs/holidays, days before joining, and every day that hasn't happened yet.
    if (status !== 'off' && elapsed && !preJoining) tally.workedElapsed++;
    if (reg) { if (reg.stage === 'done' && reg.status === 'approved') tally.regApproved++; else if (reg.status === 'pending') tally.regPending++; }

    let cellClass: string = status || 'unrecorded';
    if (reg) cellClass = reg.stage === 'done' && reg.status === 'approved' ? 'regapproved' : reg.status === 'pending' ? 'regpending' : cellClass;
    cells.push(
      <div key={dateStr} className={`cal-cell ${cellClass}`} style={{ cursor: 'pointer' }} onClick={() => setSelected({ dateStr })}>
        <div className="cal-day">{d}</div>
      </div>
    );
  }
  const workingDays = totalDays - tally.off - tally.preJoining;
  const attendancePct = tally.workedElapsed ? Math.round((tally.present / tally.workedElapsed) * 100) : null;
  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <>
      <div className="cal-summary">
        <div className="cal-summary-head">
          <span className="cal-summary-month">{monthLabel}</span>
          <span className="cal-summary-note">
            {attendancePct === null
              ? 'No working days elapsed yet this month'
              : <><strong>{tally.present}</strong> of <strong>{tally.workedElapsed}</strong> working days so far marked present · <strong>{attendancePct}%</strong> attendance</>}
          </span>
        </div>
        {tally.workedElapsed > 0 && (
          <div className="cal-summary-bar" role="img"
            aria-label={`${tally.present} present, ${tally.absent} absent, ${tally.leave} on leave out of ${tally.workedElapsed} working days so far`}>
            {([['present', tally.present], ['absent', tally.absent], ['leave', tally.leave]] as const)
              .filter(([, n]) => n > 0)
              .map(([k, n]) => <span key={k} className={`seg ${k}`} style={{ width: `${(n / tally.workedElapsed) * 100}%` }} />)}
          </div>
        )}
        <div className="cal-stats">
          <CalStat label="Days in month" value={totalDays} sub={`${todayNum} elapsed`} tone="neutral" />
          <CalStat label="Working days" value={workingDays} sub={`${tally.workedElapsed} so far`} tone="neutral" />
          <CalStat label="Present" value={tally.present} tone="present" />
          <CalStat label="Absent" value={tally.absent} tone="absent" />
          <CalStat label="On leave" value={tally.leave} tone="leave" />
          <CalStat label="Week-offs" value={tally.off} sub="Sundays + holidays" tone="off" />
          <CalStat label="Reg. pending" value={tally.regPending} tone="regpending" />
          <CalStat label="Regularized" value={tally.regApproved} tone="regapproved" />
        </div>
        <div className="cal-summary-rule">
          A working day with no punch-in/punch-out counts as absent.
          {tally.upcoming > 0 && ` ${tally.upcoming} working day${tally.upcoming === 1 ? '' : 's'} still to come this month.`}
          {tally.preJoining > 0 && ` ${tally.preJoining} day${tally.preJoining === 1 ? '' : 's'} before joining excluded.`}
        </div>
      </div>
      <div className="cal-grid">
        {DOWS.map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {cells}
      </div>
      <div className="cal-legend">
        <span><span className="dot" style={{ background: 'var(--green-soft)', border: '1px solid #14532D' }} />Present</span>
        <span><span className="dot" style={{ background: '#FECACA', border: '1px solid #7F1D1D' }} />Absent</span>
        <span><span className="dot" style={{ background: '#DBEAFE', border: '1px solid #1E3A8A' }} />On leave</span>
        <span><span className="dot" style={{ background: '#FDE68A', border: '1px solid #78350F' }} />Regularization pending</span>
        <span><span className="dot" style={{ background: '#EDE9FE', border: '1px solid #5B21B6' }} />Already regularized</span>
        <span><span className="dot" style={{ background: '#F1F5F9', border: '1px solid var(--muted)' }} />Week-off</span>
        <span><span className="dot" style={{ background: '#fff', border: '1px solid var(--border-strong, #CBD5E1)' }} />Not due yet</span>
      </div>
      <div className="footnote">Click any day for details{isAdmin(state.role) ? ' — HR can also correct a day\'s status directly.' : '.'}</div>
      {selected && <DayDetailModal empName={empName} dateStr={selected.dateStr} status={getDayStatus(selected.dateStr)} onClose={() => setSelected(null)} />}
    </>
  );
}

/** One number in the calendar's summary strip. `tone` maps to a `.cal-stat` colour variant that
 * matches the same status's colour in the grid below, so the tiles and the squares read as one
 * thing. Styling lives in HrToolApp's global block — Tailwind isn't compiled for /admin. */
function CalStat({ label, value, sub, tone }: { label: string; value: number; sub?: string; tone: string }) {
  return (
    <div className={`cal-stat ${tone}`}>
      <div className="cal-stat-label">{label}</div>
      <div className="cal-stat-num">{value}</div>
      <div className="cal-stat-sub">{sub || '\u00A0'}</div>
    </div>
  );
}

function DayDetailModal({ empName, dateStr, status, onClose }: { empName: string; dateStr: string; status: DayStatus; onClose: () => void }) {
  const { state, persistAttendanceOverride, persistRegularizations, logRuleChange, addRegularizationToState } = useHrTool();
  const [manualStatus, setManualStatus] = useState<DayStatus>(status || 'present');
  const [showRegForm, setShowRegForm] = useState<'in' | 'out' | null>(null);
  const [regTime, setRegTime] = useState('');
  const [regReason, setRegReason] = useState(REG_REASONS[0]);
  const [regReasonOther, setRegReasonOther] = useState('');

  const real = state.attendance.find((a) => a.emp === empName && a.date === dateStr);
  const regIn = state.regularizations.find((r) => r.emp === empName && r.date === dateStr && r.punchType === 'in');
  const regOut = state.regularizations.find((r) => r.emp === empName && r.date === dateStr && r.punchType === 'out');
  const statusLabel = status === 'off' ? 'Week-off' : real ? real.status : (status ? { present: 'Present', absent: 'Absent', leave: 'On leave' }[status] : 'Not recorded');
  const times = real ? { inTime: real.inTime, outTime: real.outTime } : { inTime: '—', outTime: '—' };

  async function saveCorrection() {
    await persistAttendanceOverride({ emp: empName, date: dateStr, status: manualStatus || 'present' });
    logRuleChange(`Manually set ${empName}'s attendance on ${dateStr} to ${manualStatus}`);
    onClose();
  }
  async function submitRegularization() {
    if (!showRegForm) return;
    const reason = regReason === '__other__' ? regReasonOther.trim() : regReason;
    if (!reason) { alert('Please describe the reason.'); return; }
    const time = regTime.trim();
    if (!time) { alert('Please set the time being regularized.'); return; }
    // Goes through the server so the SAME rules apply here as on the employee portal: cycle
    // date limit, per-cycle quota, duplicate check, and the on-time-punch check. This screen used
    // to build the row itself and save it straight to state, which applied none of them.
    const res = await fetch('/api/admin/hr-tool/regularizations', {
      method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ emp: empName, date: dateStr, reason, punchType: showRegForm, requestedTime: time }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) { alert(json?.error || 'Could not submit the regularization request.'); return; }
    addRegularizationToState(json.data);
    onClose();
  }
  async function decideReg(id: string, level: 'rm' | 'hr', decision: 'approved' | 'rejected', remarks: string) {
    await persistRegularizations(state.regularizations.map((r) => (r.id === id ? applyApprovalDecision(r, level, decision, remarks, state.rules.twoLevelApproval.attendance) : r)));
    onClose();
  }

  return (
    <ModalShell title={`${empName} — ${new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`} onClose={onClose} actions={[{ label: 'Close', cls: 'btn', onClick: onClose }]}>
      <div className="field"><label className="field-label">Status</label>{statusLabel}</div>
      <div className="field"><label className="field-label">In / Out</label>{times.inTime} – {times.outTime}</div>
      {(regIn || regOut) && (
        <div className="field"><label className="field-label">Regularization</label>
          {regIn && (
            <div style={{ marginBottom: 8 }}>
              Punch In ({regIn.requestedTime}): {regIn.reason} — <ApprovalBadge req={regIn} />
              {regIn.rmRemarks && <div className="meta">Manager remarks: {regIn.rmRemarks}</div>}
              {regIn.hrRemarks && <div className="meta">HR remarks: {regIn.hrRemarks}</div>}
              <div style={{ marginTop: 8 }}><ApprovalCell req={regIn} onDecide={(level, decision, remarks) => decideReg(regIn.id, level, decision, remarks)} /></div>
            </div>
          )}
          {regOut && (
            <div>
              Punch Out ({regOut.requestedTime}): {regOut.reason} — <ApprovalBadge req={regOut} />
              {regOut.rmRemarks && <div className="meta">Manager remarks: {regOut.rmRemarks}</div>}
              {regOut.hrRemarks && <div className="meta">HR remarks: {regOut.hrRemarks}</div>}
              <div style={{ marginTop: 8 }}><ApprovalCell req={regOut} onDecide={(level, decision, remarks) => decideReg(regOut.id, level, decision, remarks)} /></div>
            </div>
          )}
        </div>
      )}
      {(!regIn || !regOut) && empName === state.currentUser?.name && !showRegForm && (
        <div className="field" style={{ display: 'flex', gap: 8 }}>
          {!regIn && <button className="btn sm" onClick={() => { setShowRegForm('in'); setRegTime(''); }}>+ Regularize Punch In</button>}
          {!regOut && <button className="btn sm" onClick={() => { setShowRegForm('out'); setRegTime(''); }}>+ Regularize Punch Out</button>}
        </div>
      )}
      {showRegForm && (
        <div className="field">
          <label className="field-label">{showRegForm === 'out' ? 'Punch Out' : 'Punch In'} time</label>
          <input type="time" value={regTime} onChange={(e) => setRegTime(e.target.value)} />
          <label className="field-label" style={{ marginTop: 8 }}>Reason</label>
          <select value={regReason} onChange={(e) => setRegReason(e.target.value)}>
            {REG_REASONS.map((r) => <option key={r}>{r}</option>)}
            <option value="__other__">Other (please specify)</option>
          </select>
          {regReason === '__other__' && <textarea style={{ marginTop: 8 }} placeholder="Describe the reason..." value={regReasonOther} onChange={(e) => setRegReasonOther(e.target.value)} />}
          <button className="btn primary sm" style={{ marginTop: 8 }} onClick={submitRegularization}>Submit</button>
        </div>
      )}
      {isAdmin(state.role) && (
        <div className="field"><label className="field-label">HR correction</label>
          <select value={manualStatus || 'present'} onChange={(e) => setManualStatus(e.target.value as DayStatus)}>
            <option value="present">Present</option><option value="absent">Absent</option><option value="leave">On leave</option><option value="off">Week-off</option>
          </select>
          <button className="btn sm" style={{ marginTop: 8 }} onClick={saveCorrection}>Save correction</button>
        </div>
      )}
    </ModalShell>
  );
}
