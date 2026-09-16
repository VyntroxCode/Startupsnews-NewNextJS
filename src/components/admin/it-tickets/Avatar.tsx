'use client';

import { avatarColor, initials } from './utils';

type AvatarSize = 'xs' | 'sm' | 'md';

const SIZES: Record<AvatarSize, string> = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
};

interface AvatarProps {
  /** `null`/empty renders the grey "unassigned" silhouette. */
  name: string | null | undefined;
  size?: AvatarSize;
  title?: string;
  className?: string;
}

export default function Avatar({ name, size = 'sm', title, className = '' }: AvatarProps) {
  const trimmed = (name ?? '').trim();
  const label = title ?? (trimmed || 'Unassigned');

  if (!trimmed) {
    return (
      <span
        title={label}
        aria-label={label}
        role="img"
        className={`inline-flex flex-shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-400 ${SIZES[size]} ${className}`}
      >
        <svg width="60%" height="60%" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <circle cx="8" cy="5.5" r="3" />
          <path d="M2.5 14a5.5 5.5 0 0 1 11 0z" />
        </svg>
      </span>
    );
  }

  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={`inline-flex flex-shrink-0 select-none items-center justify-center rounded-full font-bold leading-none ${avatarColor(trimmed)} ${SIZES[size]} ${className}`}
    >
      {initials(trimmed)}
    </span>
  );
}
