'use client';

import { STATUS_COLUMNS, STATUS_META } from './constants';
import { ChevronDownIcon } from './TicketIcons';
import type { ItTicketStatus } from './types';

interface StatusLozengeProps {
  status: ItTicketStatus;
  /** When provided (and not disabled) the lozenge becomes a native <select> styled as a Jira status
   * button — native so keyboard, screen readers and Playwright's selectOption all just work. */
  onChange?: (status: ItTicketStatus) => void;
  /** Status policy for the viewer. Disallowed targets render as disabled "(Admin only)" options;
   * if no other status is allowed at all, the lozenge is read-only with an explanatory tooltip. */
  isAllowed?: (to: ItTicketStatus) => boolean;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

const SIZE_CLASSES = {
  sm: 'h-6 px-2 text-[11px]',
  md: 'h-8 px-3 text-xs',
};

export default function StatusLozenge({ status, onChange, isAllowed, disabled, size = 'sm', className = '', ...rest }: StatusLozengeProps) {
  const meta = STATUS_META[status];
  const lozenge = meta?.lozenge ?? 'bg-slate-200 text-slate-700';
  const label = meta?.label ?? status;
  const shape = `inline-flex items-center rounded-[3px] font-bold uppercase tracking-wide ${SIZE_CLASSES[size]} ${lozenge}`;

  const options = STATUS_COLUMNS.map((s) => ({ ...s, allowed: s.key === status || !isAllowed || isAllowed(s.key) }));
  const canChangeAnything = options.some((o) => o.key !== status && o.allowed);

  if (!onChange || disabled || !canChangeAnything) {
    const lockedTitle = onChange && !disabled && !canChangeAnything
      ? (status === 'blocked' ? 'Only an Admin can move a ticket out of Blocked' : 'You can’t change this status')
      : undefined;
    return (
      <span className={`${shape} gap-1 ${className}`} data-status={status} data-locked={lockedTitle ? 'true' : undefined} title={lockedTitle}>
        {label}
        {lockedTitle && (
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <rect x="3.5" y="7" width="9" height="6.5" rx="1.25" />
            <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
          </svg>
        )}
      </span>
    );
  }

  return (
    <span className={`relative inline-flex ${className}`} data-status={status}>
      <select
        aria-label={rest['aria-label'] ?? 'Status'}
        value={status}
        onChange={(e) => onChange(e.target.value as ItTicketStatus)}
        className={`${shape} cursor-pointer appearance-none border-0 pr-7 transition-[filter] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-indigo-500/40`}
      >
        {options.map((s) => (
          <option key={s.key} value={s.key} disabled={!s.allowed}>
            {s.allowed ? s.label : `${s.label} (Admin only)`}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 opacity-70" />
    </span>
  );
}
