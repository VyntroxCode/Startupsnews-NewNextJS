'use client';

import type { CSSProperties } from 'react';

/**
 * Punch Out time picker for regularization requests. The office closes in the evening, so a
 * punch-out is always PM: the employee picks only hour (12, 1–11) and minute, with a fixed "PM"
 * label instead of an AM/PM choice. Emits the same 24h "HH:MM" string a native <input type="time">
 * would, e.g. 6:30 PM → "18:30"; '' until an hour is picked. The server enforces PM as well
 * (HrToolService.submitEmployeeRegularization).
 */
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

export default function PunchOutTimeInput({ value, onChange, selectStyle, selectClassName }: {
  value: string;
  onChange: (value: string) => void;
  selectStyle?: CSSProperties;
  /** Tailwind classes for the two selects (AttendanceWidget); `selectStyle` stays for the HR tool. */
  selectClassName?: string;
}) {
  const [h24, minute = '00'] = value ? value.split(':') : [];
  const hour12 = h24 ? (Number(h24) % 12 || 12) : '';

  const emit = (hour: number | '', min: string) => {
    if (hour === '') { onChange(''); return; }
    onChange(`${String(hour === 12 ? 12 : hour + 12).padStart(2, '0')}:${min}`);
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <select aria-label="Hour" value={hour12} onChange={(e) => emit(e.target.value ? Number(e.target.value) : '', minute)} style={selectStyle} className={selectClassName}>
        <option value="">--</option>
        {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <span>:</span>
      <select aria-label="Minute" value={minute} onChange={(e) => emit(hour12, e.target.value)} disabled={hour12 === ''} style={selectStyle} className={selectClassName}>
        {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <span style={{ fontWeight: 600 }}>PM</span>
    </span>
  );
}
