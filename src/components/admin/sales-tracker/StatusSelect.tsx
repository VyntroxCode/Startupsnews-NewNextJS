'use client';

import { STATUSES, STATUS_COLORS } from './constants';

export default function StatusSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const colors = STATUS_COLORS[value] || ['#F1EFE8', '#5F5E5A'];
  return (
    <select className="inline-cell" value={value} style={{ background: colors[0], color: colors[1], borderColor: colors[1], fontWeight: 700 }}
      onChange={(e) => onChange(e.target.value)} onClick={(e) => e.stopPropagation()}>
      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
