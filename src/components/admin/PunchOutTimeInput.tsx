'use client';

import type { CSSProperties } from 'react';
import { DEFAULT_PUNCH_WINDOWS } from '@/modules/hr-tool/utils/regularization-policy';
import { hhmmToMinutes } from '@/modules/hr-tool/utils/lateness';

/**
 * Punch Out time picker for regularization requests. A regularized punch-out must fall inside the
 * Punch Out window from hr_rules (`from`–`to`, default 3:00 PM – 11:59 PM — see PunchWindows), so
 * the employee picks only hour and minute, with a fixed "PM" label instead of an AM/PM choice
 * (the window always starts at or after 12:00). Only hours/minutes inside the window are offered.
 * Emits the same 24h "HH:MM" string a native <input type="time"> would, e.g. 6:30 PM → "18:30";
 * '' until an hour is picked. The server enforces the same window
 * (HrToolService.submitEmployeeRegularization).
 */
const pad = (n: number) => String(n).padStart(2, '0');

export default function PunchOutTimeInput({ value, onChange, selectStyle, selectClassName, from = DEFAULT_PUNCH_WINDOWS.punchOutFrom, to = DEFAULT_PUNCH_WINDOWS.punchOutTo }: {
  value: string;
  onChange: (value: string) => void;
  selectStyle?: CSSProperties;
  /** Tailwind classes for the two selects (AttendanceWidget); `selectStyle` stays for the HR tool. */
  selectClassName?: string;
  /** Punch Out window, "HH:MM" 24h (hr_rules punchOutFrom / punchOutTo). */
  from?: string;
  to?: string;
}) {
  const fromM = Math.max(12 * 60, hhmmToMinutes(from));
  const toM = Math.max(fromM, hhmmToMinutes(to));
  const hours24 = Array.from({ length: Math.floor(toM / 60) - Math.floor(fromM / 60) + 1 }, (_, i) => Math.floor(fromM / 60) + i);
  const minutesFor = (h24: number) => Array.from({ length: 60 }, (_, m) => m).filter((m) => h24 * 60 + m >= fromM && h24 * 60 + m <= toM).map(pad);

  const [h24Str, minute = ''] = value ? value.split(':') : [];
  const h24 = h24Str ? Number(h24Str) : null;

  const emit = (hour: number | null, min: string) => {
    if (hour === null) { onChange(''); return; }
    const allowed = minutesFor(hour);
    onChange(`${pad(hour)}:${allowed.includes(min) ? min : allowed[0]}`);
  };
  const minuteOptions = h24 === null ? [] : minutesFor(h24);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <select aria-label="Hour" value={h24 ?? ''} onChange={(e) => emit(e.target.value ? Number(e.target.value) : null, minute)} style={selectStyle} className={selectClassName}>
        <option value="">--</option>
        {hours24.map((h) => <option key={h} value={h}>{h % 12 || 12}</option>)}
      </select>
      <span>:</span>
      <select aria-label="Minute" value={minute} onChange={(e) => emit(h24, e.target.value)} disabled={h24 === null} style={selectStyle} className={selectClassName}>
        {h24 === null && <option value="">--</option>}
        {minuteOptions.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <span style={{ fontWeight: 600 }}>PM</span>
    </span>
  );
}
