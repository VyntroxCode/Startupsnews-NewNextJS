'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useHrTool } from '../HrToolContext';
import ModalShell from '../ModalShell';
import ApprovalCell from './ApprovalCell';
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
  const firstDow = new Date(year, month, 1).getDay();
  const holidaySet = useMemo(() => new Set(state.orgStructure.holidays.map((h) => h.date)), [state.orgStructure.holidays]);

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
    return null;
  }

  const cells: ReactNode[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(<div key={'b' + i} className="cal-cell blank" />);
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const status = getDayStatus(dateStr);
    const reg = state.regularizations.find((r) => r.emp === empName && r.date === dateStr);
    let cellClass: string = status || 'unrecorded';
    if (reg) cellClass = reg.stage === 'done' && reg.status === 'approved' ? 'regapproved' : reg.status === 'pending' ? 'regpending' : cellClass;
    cells.push(
      <div key={dateStr} className={`cal-cell ${cellClass}`} style={{ cursor: 'pointer' }} onClick={() => setSelected({ dateStr })}>
        <div className="cal-day">{d}</div>
      </div>
    );
  }

  return (
    <>
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
        <span><span className="dot" style={{ background: '#fff', border: '1px solid var(--border-strong, #CBD5E1)' }} />Not recorded</span>
      </div>
      <div className="footnote">Click any day for details{isAdmin(state.role) ? ' — HR can also correct a day\'s status directly.' : '.'}</div>
      {selected && <DayDetailModal empName={empName} dateStr={selected.dateStr} status={getDayStatus(selected.dateStr)} onClose={() => setSelected(null)} />}
    </>
  );
}

function DayDetailModal({ empName, dateStr, status, onClose }: { empName: string; dateStr: string; status: DayStatus; onClose: () => void }) {
  const { state, persistAttendanceOverride, persistRegularizations, logRuleChange } = useHrTool();
  const [manualStatus, setManualStatus] = useState<DayStatus>(status || 'present');
  const [showRegForm, setShowRegForm] = useState(false);
  const [regReason, setRegReason] = useState(REG_REASONS[0]);
  const [regReasonOther, setRegReasonOther] = useState('');

  const real = state.attendance.find((a) => a.emp === empName && a.date === dateStr);
  const reg = state.regularizations.find((r) => r.emp === empName && r.date === dateStr);
  const statusLabel = status === 'off' ? 'Week-off' : real ? real.status : (status ? { present: 'Present', absent: 'Absent', leave: 'On leave' }[status] : 'Not recorded');
  const times = real ? { inTime: real.inTime, outTime: real.outTime } : { inTime: '—', outTime: '—' };

  async function saveCorrection() {
    await persistAttendanceOverride({ emp: empName, date: dateStr, status: manualStatus || 'present' });
    logRuleChange(`Manually set ${empName}'s attendance on ${dateStr} to ${manualStatus}`);
    onClose();
  }
  async function submitRegularization() {
    const reason = regReason === '__other__' ? regReasonOther.trim() : regReason;
    if (!reason) { alert('Please describe the reason.'); return; }
    const diff = Math.round((new Date().getTime() - new Date(dateStr).getTime()) / 86400000);
    if (!state.rules.regularizationOverride && diff > state.rules.regularizationWindowDays) {
      alert(`This date is outside the ${state.rules.regularizationWindowDays}-day regularization window. Contact HR for an override.`);
      return;
    }
    const stage = state.rules.twoLevelApproval.attendance ? 'rm' : 'hr';
    await persistRegularizations([{ id: 'R-' + Date.now(), emp: empName, date: dateStr, reason, stage, status: 'pending', rmRemarks: '', hrRemarks: '' }, ...state.regularizations]);
    onClose();
  }
  async function decideReg(level: 'rm' | 'hr', decision: 'approved' | 'rejected', remarks: string) {
    if (!reg) return;
    await persistRegularizations(state.regularizations.map((r) => (r.id === reg.id ? applyApprovalDecision(r, level, decision, remarks, state.rules.twoLevelApproval.attendance) : r)));
    onClose();
  }

  return (
    <ModalShell title={`${empName} — ${new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`} onClose={onClose} actions={[{ label: 'Close', cls: 'btn', onClick: onClose }]}>
      <div className="field"><label className="field-label">Status</label>{statusLabel}</div>
      <div className="field"><label className="field-label">In / Out</label>{times.inTime} – {times.outTime}</div>
      {reg && (
        <div className="field"><label className="field-label">Regularization</label>
          {reg.reason} — <ApprovalBadge req={reg} />
          {reg.rmRemarks && <div className="meta">Manager remarks: {reg.rmRemarks}</div>}
          {reg.hrRemarks && <div className="meta">HR remarks: {reg.hrRemarks}</div>}
          <div style={{ marginTop: 8 }}><ApprovalCell req={reg} onDecide={decideReg} /></div>
        </div>
      )}
      {!reg && empName === state.currentUser?.name && !showRegForm && (
        <div className="field"><button className="btn sm" onClick={() => setShowRegForm(true)}>+ Submit regularization request for this day</button></div>
      )}
      {!reg && showRegForm && (
        <div className="field">
          <label className="field-label">Reason</label>
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
