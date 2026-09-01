'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { getAuthHeaders } from '@/lib/admin-auth';
import { latenessBucket, combinedAttendanceBucket, type ShiftSettings, type LatenessBucket } from '@/modules/hr-tool/utils/lateness';

interface AttendanceDayRecord { date: string; status: string; inTime: string; outTime: string; inMinutes: number | null; outMinutes: number | null; }
interface HolidayRecord { date: string; name: string; }
interface RegularizationRecord {
  id: string; date: string; reason: string; punchType: 'in' | 'out'; requestedTime: string | null;
  stage: string; status: string; rmRemarks: string; hrRemarks: string;
}
interface AttendanceMeData {
  linked: boolean;
  employeeCode?: string;
  name?: string;
  month?: string;
  calendar?: AttendanceDayRecord[];
  holidays?: HolidayRecord[];
  shiftRules?: ShiftSettings & { shiftEndTime: string };
  regularizations?: RegularizationRecord[];
  regularizationPolicy?: { windowDays: number; monthlyQuota: number; usedThisMonth: number };
}

const cardStyle: CSSProperties = {
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  padding: '2rem',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
  border: '1px solid rgba(0, 0, 0, 0.04)',
  marginTop: '1.5rem',
};

const thStyle: CSSProperties = {
  textAlign: 'left', padding: '0.6rem 0.9rem', fontSize: '0.75rem', textTransform: 'uppercase',
  letterSpacing: '0.04em', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0',
};
const tdStyle: CSSProperties = { padding: '0.75rem 0.9rem', borderBottom: '1px solid #f1f5f9', color: '#0f172a' };

function punchButtonStyle(color1: string, color2: string, disabled: boolean): CSSProperties {
  return {
    padding: '0.45rem 1rem',
    background: disabled ? '#cbd5e1' : `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
    color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const navButtonStyle: CSSProperties = {
  width: '2rem', height: '2rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#fff',
  color: '#334155', fontSize: '1.125rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

/** Matches the DB's date-column convention already used across the HR Tool (see hr-tool's own
 * client-side todayStr()) — UTC-based, not locale/timezone-aware, kept consistent on purpose. */
function localTodayStr(): string { return new Date().toISOString().slice(0, 10); }

function shiftMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function daysInMonth(monthStr: string): number {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
function firstWeekday(monthStr: string): number {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m - 1, 1).getDay();
}
function monthLabel(monthStr: string): string {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const BUCKET_COLORS: Record<LatenessBucket, { bg: string; border: string; text: string }> = {
  'on-time': { bg: '#dcfce7', border: '#4ade80', text: '#166534' },
  grace: { bg: '#fef9c3', border: '#facc15', text: '#854d0e' },
  late: { bg: '#ffe4d5', border: '#fb923c', text: '#c2410c' },
  'short-leave': { bg: '#ffedd5', border: '#fb923c', text: '#c2410c' },
  'half-day': { bg: '#fed7aa', border: '#f97316', text: '#9a3412' },
  absent: { bg: '#fee2e2', border: '#f87171', text: '#b91c1c' },
};

/** Short Leave / Half Day / Absent now carry real payroll consequences (see
 * HrToolService.computePayrollForMonth), so unlike the old 3-way grace/late split these are
 * shown to employees by their real name, not a vague "late"/"very late". */
const BUCKET_LABEL: Record<LatenessBucket, string> = {
  'on-time': 'On time', grace: 'Grace Period', late: 'Late', 'short-leave': 'Short Leave', 'half-day': 'Half Day', absent: 'Absent',
};

/** A date with a regularization request on file shows light blue on the calendar, overriding
 * whatever lateness color it would otherwise have — the request itself is now the more
 * relevant status for that day. */
const REG_COLORS = { bg: '#dbeafe', border: '#60a5fa', text: '#1e40af' };
const REG_STATUS_LABEL: Record<string, string> = { pending: 'Pending admin approval', approved: 'Approved', rejected: 'Rejected' };
const REG_TYPE_LABEL: Record<'in' | 'out', string> = { in: 'Punch In', out: 'Punch Out' };

/** A day on the admin's Holiday calendar (HR Management → Rules & Org Structure) — shown in
 * violet, distinct from every lateness/regularization color, on both the calendar grid and the
 * selected-date detail panel. */
const HOLIDAY_COLORS = { bg: '#ede9fe', border: '#a78bfa', text: '#6d28d9' };

function LegendDot({ color, border, label }: { color: string; border: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748b' }}>
      <span style={{ width: '0.85rem', height: '0.85rem', borderRadius: '3px', background: color, border: `1px solid ${border}` }} />
      {label}
    </div>
  );
}

interface AttendanceWidgetProps {
  /** Base path for the attendance API — defaults to the Publisher/Event Admin routes. */
  apiBase?: string;
  /** Auth header provider — defaults to the admin panel's session. */
  getHeaders?: () => HeadersInit;
}

/** Attendance card — resolves the caller's HR identity and writes into the same
 * hr_attendance/hr_punch_log tables the Founder's HR Tool Attendance view already reads.
 * Shows a date-detail table (Date/Status/Punch In/Punch Out) for whichever day is selected —
 * defaulting to today — plus a month calendar that colors each day green/orange/red by how the
 * punch-in landed against the admin-configured shift start + grace period. Clicking any day in
 * the calendar loads that day's details into the table above; punch in/out only ever apply to
 * today, so those actions only appear in the table when today is the selected day. Reused as-is
 * by both the Publisher/Event Admin dashboard (default props) and the plain employee dashboard
 * (apiBase="/api/employee/attendance", getHeaders=getEmployeeAuthHeaders). */
export default function AttendanceWidget({ apiBase = '/api/admin/attendance', getHeaders = getAuthHeaders }: AttendanceWidgetProps) {
  const today = localTodayStr();
  const [data, setData] = useState<AttendanceMeData | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [punching, setPunching] = useState<'in' | 'out' | null>(null);
  const [regFormOpen, setRegFormOpen] = useState<'in' | 'out' | null>(null);
  const [regReason, setRegReason] = useState('');
  const [regTime, setRegTime] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState('');

  const load = async (month: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/me?month=${month}`, { headers: getHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load attendance');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(calendarMonth); }, [calendarMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  async function punch(type: 'in' | 'out') {
    setPunching(type);
    setError('');
    setNote('');
    try {
      const res = await fetch(`${apiBase}/punch`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to record punch');
      if (json.data?.note) setNote(json.data.note);
      await load(calendarMonth);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record punch');
    } finally {
      setPunching(null);
    }
  }

  async function submitRegularization() {
    const punchType = regFormOpen;
    if (!punchType) return;
    const reason = regReason.trim();
    if (!reason) { setRegError('Please describe the reason.'); return; }
    const time = regTime.trim();
    if (!time) { setRegError('Please set the time you are regularizing.'); return; }
    setRegSubmitting(true);
    setRegError('');
    try {
      const res = await fetch(`${apiBase}/regularizations`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ date: selectedDate, reason, punchType, requestedTime: time }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to submit regularization request');
      setRegFormOpen(null);
      setRegReason('');
      setRegTime('');
      await load(calendarMonth);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : 'Failed to submit regularization request');
    } finally {
      setRegSubmitting(false);
    }
  }

  const calendarMap = useMemo(() => {
    const map = new Map<string, AttendanceDayRecord>();
    (data?.calendar || []).forEach((r) => map.set(r.date, r));
    return map;
  }, [data]);

  const regularizationByDate = useMemo(() => {
    const map = new Map<string, RegularizationRecord[]>();
    (data?.regularizations || []).forEach((r) => map.set(r.date, [...(map.get(r.date) || []), r]));
    return map;
  }, [data]);

  const holidayMap = useMemo(() => {
    const map = new Map<string, string>();
    (data?.holidays || []).forEach((h) => map.set(h.date, h.name));
    return map;
  }, [data]);

  function selectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setRegFormOpen(null);
    setRegReason('');
    setRegTime('');
    setRegError('');
  }

  function changeMonth(delta: number) {
    const newMonth = shiftMonth(calendarMonth, delta);
    const day = Number(selectedDate.slice(8, 10));
    const clampedDay = Math.min(day, daysInMonth(newMonth));
    selectDate(`${newMonth}-${String(clampedDay).padStart(2, '0')}`);
    setCalendarMonth(newMonth);
  }

  if (loading && !data) {
    return (
      <div style={cardStyle}>
        <p style={{ color: '#64748b', margin: 0 }}>Loading attendance…</p>
      </div>
    );
  }

  if (!data?.linked) {
    return (
      <div style={cardStyle}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#0f172a', letterSpacing: '-0.01em' }}>Attendance</h2>
        <p style={{ color: '#64748b', fontSize: '0.9375rem', margin: 0 }}>
          No Employee ID has been assigned to your account yet. Ask your Founder to assign one under HR Management → Assigning IDs to start marking attendance.
        </p>
      </div>
    );
  }

  const shiftRules = data.shiftRules;
  const selectedRecord = calendarMap.get(selectedDate);
  const isSelectedToday = selectedDate === today;
  const hasIn = !!selectedRecord?.inTime && selectedRecord.inTime !== '—';
  const hasOut = !!selectedRecord?.outTime && selectedRecord.outTime !== '—';
  const selectedHoliday = holidayMap.get(selectedDate);
  const rowStatus = selectedHoliday ? `Holiday — ${selectedHoliday}` : selectedRecord?.status || (isSelectedToday ? 'Not punched in yet' : 'No record');
  // Combined bucket (arrival time + hours worked, worse of the two) drives the day's displayed
  // status/color; the pure arrival-time bucket separately gates punch-in Regularization, since
  // that's specifically about correcting the punch-in itself, not the day's overall outcome —
  // an on-time arrival shouldn't become "regularizable" just because they left early.
  const selectedBucket = shiftRules ? combinedAttendanceBucket(selectedRecord?.inMinutes ?? null, selectedRecord?.outMinutes ?? null, shiftRules, false) : null;
  const selectedTimeBucket = shiftRules ? latenessBucket(selectedRecord?.inMinutes ?? null, shiftRules) : null;
  const selectedRegs = regularizationByDate.get(selectedDate) || [];
  const selectedRegIn = selectedRegs.find((r) => r.punchType === 'in');
  const selectedRegOut = selectedRegs.find((r) => r.punchType === 'out');
  const regPolicy = data.regularizationPolicy;
  const quotaReached = !!regPolicy && regPolicy.usedThisMonth >= regPolicy.monthlyQuota;
  // A punch that never happened is exactly what regularization is for — someone who forgot to
  // punch in and only punched out would otherwise be left with a permanently broken day, since a
  // missing punch-in has no lateness bucket at all. Only an on-time punch-in has nothing to
  // correct. Future dates are excluded because there is nothing there to fix yet.
  const isSelectedFuture = selectedDate > today;
  const canRequestInRegularization = !selectedRegIn && !isSelectedFuture
    && (!hasIn || (!!selectedTimeBucket && selectedTimeBucket !== 'on-time'));
  const canRequestOutRegularization = !selectedRegOut && !isSelectedToday && !isSelectedFuture && !hasOut;

  const totalDays = daysInMonth(calendarMonth);
  const leadPad = firstWeekday(calendarMonth);
  const cells: (number | null)[] = [...Array(leadPad).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const canGoNext = calendarMonth < today.slice(0, 7);

  return (
    <div style={cardStyle}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>Attendance</h2>
        <p style={{ color: '#64748b', fontSize: '0.9375rem', margin: '0.25rem 0 0' }}>
          {data.name} · <span style={{ fontFamily: 'monospace' }}>{data.employeeCode}</span>
        </p>
        {shiftRules && (
          <p style={{ color: '#94a3b8', fontSize: '0.8125rem', margin: '0.25rem 0 0' }}>
            Shift: {shiftRules.shiftStartTime}–{shiftRules.shiftEndTime} — set by HR
          </p>
        )}
      </div>

      {note && <p style={{ color: '#b45309', fontSize: '0.85rem', margin: '1rem 0 0' }}>{note}</p>}
      {error && <p style={{ color: '#b91c1c', fontSize: '0.85rem', margin: '1rem 0 0' }}>{error}</p>}

      {/* Selected-date detail table */}
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
          {formatDateLong(selectedDate)}{isSelectedToday ? ' · Today' : ''}
        </h3>
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Punch In</th>
                <th style={thStyle}>Punch Out</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>{selectedDate}</td>
                <td style={tdStyle}>{rowStatus}</td>
                <td style={tdStyle}>
                  {hasIn ? selectedRecord?.inTime : isSelectedToday ? (
                    <button type="button" onClick={() => punch('in')} disabled={punching !== null} style={punchButtonStyle('#48bb78', '#38a169', punching !== null)}>
                      {punching === 'in' ? 'Punching in…' : '⏱ Punch In'}
                    </button>
                  ) : <span style={{ color: '#94a3b8' }}>—</span>}
                </td>
                <td style={tdStyle}>
                  {hasOut ? selectedRecord?.outTime : isSelectedToday ? (
                    <button type="button" onClick={() => punch('out')} disabled={punching !== null} style={punchButtonStyle('#f56565', '#e53e3e', punching !== null)}>
                      {punching === 'out' ? 'Punching out…' : '⏱ Punch Out'}
                    </button>
                  ) : <span style={{ color: '#94a3b8' }}>—</span>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {selectedBucket && (
          <p style={{ fontWeight: 600, color: BUCKET_COLORS[selectedBucket].text, fontSize: '0.85rem', margin: '0.5rem 0 0' }}>
            {selectedBucket === 'on-time' ? '✓ ' : '⚠ '}{BUCKET_LABEL[selectedBucket]}
          </p>
        )}

        {(selectedRegIn || selectedRegOut) && (
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            {selectedRegIn && (
              <p style={{ fontWeight: 600, color: REG_COLORS.text, fontSize: '0.85rem', margin: 0 }}>
                Punch In regularization ({selectedRegIn.requestedTime}) — {REG_STATUS_LABEL[selectedRegIn.status] || selectedRegIn.status}
              </p>
            )}
            {selectedRegOut && (
              <p style={{ fontWeight: 600, color: REG_COLORS.text, fontSize: '0.85rem', margin: 0 }}>
                Punch Out regularization ({selectedRegOut.requestedTime}) — {REG_STATUS_LABEL[selectedRegOut.status] || selectedRegOut.status}
              </p>
            )}
          </div>
        )}

        {(canRequestInRegularization || canRequestOutRegularization) && (
          <div style={{ marginTop: '0.75rem' }}>
            {!regFormOpen ? (
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {canRequestInRegularization && (
                  <button type="button" onClick={() => setRegFormOpen('in')} disabled={quotaReached} style={punchButtonStyle('#60a5fa', '#3b82f6', quotaReached)}>
                    Regularize Punch In
                  </button>
                )}
                {canRequestOutRegularization && (
                  <button type="button" onClick={() => setRegFormOpen('out')} disabled={quotaReached} style={punchButtonStyle('#60a5fa', '#3b82f6', quotaReached)}>
                    Regularize Punch Out
                  </button>
                )}
                {regPolicy && (
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    {regPolicy.usedThisMonth} of {regPolicy.monthlyQuota} used this month
                    {quotaReached ? ' — limit reached' : ''}
                  </span>
                )}
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 600, color: '#334155', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
                  Regularizing: {REG_TYPE_LABEL[regFormOpen]}
                </p>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', marginBottom: '0.3rem' }}>
                  {REG_TYPE_LABEL[regFormOpen]} time
                </label>
                <input
                  type="time"
                  value={regTime}
                  onChange={(e) => setRegTime(e.target.value)}
                  style={{ borderRadius: 8, border: '1px solid #e2e8f0', padding: '0.5rem 0.6rem', fontSize: '0.875rem', fontFamily: 'inherit', marginBottom: '0.5rem' }}
                />
                <textarea
                  value={regReason}
                  onChange={(e) => setRegReason(e.target.value)}
                  placeholder="Reason for regularization…"
                  rows={3}
                  style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box', display: 'block', borderRadius: 8, border: '1px solid #e2e8f0', padding: '0.6rem', fontSize: '0.875rem', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={submitRegularization} disabled={regSubmitting} style={punchButtonStyle('#60a5fa', '#3b82f6', regSubmitting)}>
                    {regSubmitting ? 'Submitting…' : 'Submit'}
                  </button>
                  <button type="button" onClick={() => { setRegFormOpen(null); setRegReason(''); setRegTime(''); setRegError(''); }} disabled={regSubmitting} style={{ padding: '0.45rem 1rem', background: '#fff', color: '#334155', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
                {regError && <p style={{ color: '#b91c1c', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>{regError}</p>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Month calendar */}
      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <button type="button" onClick={() => changeMonth(-1)} style={navButtonStyle} aria-label="Previous month">‹</button>
          <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>{monthLabel(calendarMonth)}</h3>
          <button
            type="button"
            onClick={() => canGoNext && changeMonth(1)}
            disabled={!canGoNext}
            aria-label="Next month"
            style={{ ...navButtonStyle, opacity: canGoNext ? 1 : 0.35, cursor: canGoNext ? 'pointer' : 'not-allowed' }}
          >
            ›
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem', marginBottom: '0.4rem' }}>
          {WEEKDAY_LABELS.map((w) => (
            <div key={w} style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>{w}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
          {cells.map((day, idx) => {
            if (day === null) return <div key={`pad-${idx}`} />;
            const dateStr = `${calendarMonth}-${String(day).padStart(2, '0')}`;
            const rec = calendarMap.get(dateStr);
            const bucket = shiftRules ? combinedAttendanceBucket(rec?.inMinutes ?? null, rec?.outMinutes ?? null, shiftRules, false) : null;
            const isRegularized = regularizationByDate.has(dateStr);
            const holidayName = holidayMap.get(dateStr);
            // Regularization is the most actionable status, so it still wins if a request happens
            // to land on a holiday; otherwise a holiday must win over the plain attendance bucket,
            // since no punch on a non-working day would otherwise render as a false "Absent".
            const colors = isRegularized ? REG_COLORS : holidayName ? HOLIDAY_COLORS : bucket ? BUCKET_COLORS[bucket] : null;
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === today;
            return (
              <button
                type="button"
                key={dateStr}
                onClick={() => selectDate(dateStr)}
                title={holidayName}
                style={{
                  minHeight: '3.75rem',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid #334155' : `1px solid ${colors ? colors.border : '#e2e8f0'}`,
                  background: colors ? colors.bg : '#fff',
                  color: colors ? colors.text : '#334155',
                  fontWeight: isToday ? 700 : 500,
                  fontSize: '0.9375rem',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.15rem',
                  padding: '0.4rem',
                }}
              >
                <span>{day}</span>
                {isToday && <span style={{ fontSize: '0.625rem', fontWeight: 600 }}>Today</span>}
                {!isToday && holidayName && <span style={{ fontSize: '0.625rem', fontWeight: 600 }}>Holiday</span>}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <LegendDot color={HOLIDAY_COLORS.bg} border={HOLIDAY_COLORS.border} label="Holiday" />
          <LegendDot color={BUCKET_COLORS['on-time'].bg} border={BUCKET_COLORS['on-time'].border} label={BUCKET_LABEL['on-time']} />
          <LegendDot color={BUCKET_COLORS.grace.bg} border={BUCKET_COLORS.grace.border} label={BUCKET_LABEL.grace} />
          <LegendDot color={BUCKET_COLORS['short-leave'].bg} border={BUCKET_COLORS['short-leave'].border} label={BUCKET_LABEL['short-leave']} />
          <LegendDot color={BUCKET_COLORS['half-day'].bg} border={BUCKET_COLORS['half-day'].border} label={BUCKET_LABEL['half-day']} />
          <LegendDot color={BUCKET_COLORS.absent.bg} border={BUCKET_COLORS.absent.border} label={BUCKET_LABEL.absent} />
          <LegendDot color={REG_COLORS.bg} border={REG_COLORS.border} label="Regularization requested" />
        </div>
      </div>
    </div>
  );
}
