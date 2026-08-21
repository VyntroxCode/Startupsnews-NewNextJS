'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { getAuthHeaders } from '@/lib/admin-auth';

interface PolicyData {
  shiftStartTime: string;
  shiftEndTime: string;
  shiftGraceMinutes: number;
  regularizationWindowDays: number;
  regularizationMonthlyQuota: number;
  shortLeaveMaxHours: number;
  shortLeaveMonthlyQuota: number;
  halfDayThresholdHours: number;
  halfDayMinWorkedHours: number;
  shortLeaveMinWorkedHours: number;
  fullDayMinWorkedHours: number;
}

const cardStyle: CSSProperties = {
  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
  padding: '2rem',
  borderRadius: '12px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)',
  border: '1px solid rgba(0, 0, 0, 0.04)',
  marginTop: '1.5rem',
};

const rowStyle: CSSProperties = {
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem',
  padding: '0.9rem 0', borderBottom: '1px solid #f1f5f9',
};
const labelStyle: CSSProperties = { fontWeight: 600, color: '#334155', fontSize: '0.9375rem' };
const descStyle: CSSProperties = { color: '#94a3b8', fontSize: '0.8125rem', marginTop: '0.15rem' };
const valueStyle: CSSProperties = { fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem', whiteSpace: 'nowrap' };

function Row({ label, desc, value }: { label: string; desc: string; value: string }) {
  return (
    <div style={rowStyle}>
      <div>
        <div style={labelStyle}>{label}</div>
        <div style={descStyle}>{desc}</div>
      </div>
      <div style={valueStyle}>{value}</div>
    </div>
  );
}

interface PolicySummaryWidgetProps {
  /** Base path for the attendance API — defaults to the Publisher/Event Admin routes. */
  apiBase?: string;
  /** Auth header provider — defaults to the admin panel's session. */
  getHeaders?: () => HeadersInit;
}

/** Read-only summary of the shift, regularization, and short-leave policy the admin has set
 * under HR Management → Rules & Org Structure — so employees always know exactly what applies
 * to them without having to ask. Reused as-is by both the Publisher/Event Admin dashboard
 * (default props) and the plain employee dashboard (apiBase="/api/employee/attendance",
 * getHeaders=getEmployeeAuthHeaders). */
export default function PolicySummaryWidget({ apiBase = '/api/admin/attendance', getHeaders = getAuthHeaders }: PolicySummaryWidgetProps) {
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${apiBase}/policy`, { headers: getHeaders() });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load policy details');
        setPolicy(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load policy details');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div style={cardStyle}>
        <p style={{ color: '#64748b', margin: 0 }}>Loading policy details…</p>
      </div>
    );
  }

  if (error || !policy) {
    return (
      <div style={cardStyle}>
        <p style={{ color: '#b91c1c', margin: 0 }}>{error || 'Failed to load policy details.'}</p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>Rules &amp; Policy</h2>
      <p style={{ color: '#64748b', fontSize: '0.9375rem', margin: '0.25rem 0 1rem' }}>
        Set by HR under Rules &amp; Organisation Structure — this is what applies to you.
      </p>

      <Row label="Shift timings" desc="Official punch-in and punch-out time." value={`${policy.shiftStartTime} – ${policy.shiftEndTime}`} />
      <Row label="Grace period" desc="Minutes after shift start before a punch-in counts as late." value={`${policy.shiftGraceMinutes} min`} />
      <Row label="Regularization window" desc="How many days after an attendance date you may still request regularization." value={`${policy.regularizationWindowDays} days`} />
      <Row label="Regularization monthly limit" desc="How many regularization requests you may submit per calendar month." value={`${policy.regularizationMonthlyQuota} / month`} />
      <Row label="Short leave — punch-in cutoff" desc="Punch in later than the grace period but within this many hours of shift start, and it's a Short Leave. Every 3rd one costs half a day's pay — leftovers carry into the next payroll cycle rather than resetting." value={`${policy.shortLeaveMaxHours} hrs after shift start`} />
      <Row label="Short leave — monthly quota" desc="How many Short Leaves you may take per calendar month." value={`${policy.shortLeaveMonthlyQuota} / month`} />
      <Row label="Half day — punch-in cutoff" desc="Punch in later than the Short Leave cutoff but within this many hours of shift start, and it's a Half Day — half a day's pay. Later than this is Absent." value={`${policy.halfDayThresholdHours} hrs after shift start`} />
      <Row label="Hours worked — secondary rule" desc="Your day's status is the WORSE of arrival time (above) and total hours worked, punch-out minus punch-in. Below the first number is Absent, up to the second is Half Day, up to the third is Short Leave, above it is a full day." value={`${policy.halfDayMinWorkedHours} / ${policy.shortLeaveMinWorkedHours} / ${policy.fullDayMinWorkedHours} hrs`} />
    </div>
  );
}
