'use client';

import { STATUS_COLORS } from './constants';

/** A lead's status in the All leads table — read-only. It used to be an inline dropdown that saved
 * on change, which made a stray click an unreviewed edit; status now changes only through the lead
 * window's Edit lead button, like every other field. */
export default function StatusBadge({ value }: { value: string }) {
  const colors = STATUS_COLORS[value] || ['#F1EFE8', '#5F5E5A'];
  return (
    <span className="badge" style={{ background: colors[0], color: colors[1], whiteSpace: 'nowrap' }}>
      {value || '—'}
    </span>
  );
}
