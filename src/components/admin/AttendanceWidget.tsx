'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { getAuthHeaders } from '@/lib/admin-auth';

interface AttendanceHistoryRow { emp: string; date: string; status: string; inTime: string; outTime: string; }
interface AttendanceMeData {
  linked: boolean;
  employeeCode?: string;
  name?: string;
  today?: { inTime: string | null; outTime: string | null };
  history?: AttendanceHistoryRow[];
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
const tdStyle: CSSProperties = { padding: '0.6rem 0.9rem', borderBottom: '1px solid #f1f5f9', color: '#0f172a' };

function punchButtonStyle(color1: string, color2: string, disabled: boolean): CSSProperties {
  return {
    padding: '0.75rem 1.5rem',
    background: disabled ? '#cbd5e1' : `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
    color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.9375rem',
    cursor: disabled ? 'not-allowed' : 'pointer', transition: 'opacity 0.15s',
  };
}

interface AttendanceWidgetProps {
  /** Base path for the attendance API — defaults to the Publisher/Event Admin routes. */
  apiBase?: string;
  /** Auth header provider — defaults to the admin panel's session. */
  getHeaders?: () => HeadersInit;
}

/** Punch In / Punch Out card — resolves the caller's HR identity and writes into the same
 * hr_attendance/hr_punch_log tables the Founder's HR Tool Attendance view already reads.
 * Reused as-is by both the Publisher/Event Admin dashboard (default props) and the plain
 * employee dashboard (apiBase="/api/employee/attendance", getHeaders=getEmployeeAuthHeaders). */
export default function AttendanceWidget({ apiBase = '/api/admin/attendance', getHeaders = getAuthHeaders }: AttendanceWidgetProps) {
  const [data, setData] = useState<AttendanceMeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [punching, setPunching] = useState<'in' | 'out' | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/me`, { headers: getHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to load attendance');
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record punch');
    } finally {
      setPunching(null);
    }
  }

  if (loading) {
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

  const punchedIn = !!data.today?.inTime;
  const punchedOut = !!data.today?.outTime;
  const statusText = !punchedIn
    ? 'Not punched in yet'
    : !punchedOut
      ? `Punched in at ${data.today?.inTime}`
      : `Punched in at ${data.today?.inTime} · Punched out at ${data.today?.outTime}`;

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>Attendance</h2>
          <p style={{ color: '#64748b', fontSize: '0.9375rem', margin: '0.25rem 0 0' }}>
            {data.name} · <span style={{ fontFamily: 'monospace' }}>{data.employeeCode}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" onClick={() => punch('in')} disabled={punchedIn || punching !== null} style={punchButtonStyle('#48bb78', '#38a169', punchedIn || punching !== null)}>
            {punching === 'in' ? 'Punching in…' : `⏱ Punch In${punchedIn ? ` — ${data.today?.inTime}` : ''}`}
          </button>
          <button type="button" onClick={() => punch('out')} disabled={punchedOut || punching !== null} style={punchButtonStyle('#f56565', '#e53e3e', punchedOut || punching !== null)}>
            {punching === 'out' ? 'Punching out…' : `⏱ Punch Out${punchedOut ? ` — ${data.today?.outTime}` : ''}`}
          </button>
        </div>
      </div>

      <p style={{ fontWeight: 600, color: punchedIn ? '#166534' : '#334155', fontSize: '0.9375rem', margin: '1rem 0 0' }}>{statusText}</p>
      {note && <p style={{ color: '#b45309', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>{note}</p>}
      {error && <p style={{ color: '#b91c1c', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>{error}</p>}

      {!!data.history?.length && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Your recent attendance</h3>
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>In</th>
                  <th style={thStyle}>Out</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((row) => (
                  <tr key={row.date}>
                    <td style={tdStyle}>{row.date}</td>
                    <td style={tdStyle}>{row.status}</td>
                    <td style={tdStyle}>{row.inTime}</td>
                    <td style={tdStyle}>{row.outTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
