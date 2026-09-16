'use client';

import { PRIORITY_META, TYPE_META } from './constants';
import type { ItTicketPriority, ItTicketType } from './types';

interface IconProps {
  size?: number;
  className?: string;
  title?: string;
}

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
});

/* ---------- Issue-type tiles (Jira issue-type icon style: filled rounded square, white glyph) ---------- */

function TypeGlyph({ type }: { type: ItTicketType }) {
  switch (type) {
    case 'hardware':
      return (
        <>
          <rect x="2.5" y="3.5" width="11" height="7" rx="1" />
          <path d="M5.5 13h5M8 10.5V13" />
        </>
      );
    case 'software':
      return <path d="M6 4.5 3 8l3 3.5M10 4.5 13 8l-3 3.5" />;
    case 'access':
      return (
        <>
          <circle cx="6" cy="6.5" r="2.75" />
          <path d="M8.2 8.2 13 13M11 11l1.5-1.5M9.6 9.6l1.4-1.4" />
        </>
      );
    case 'network':
      return (
        <>
          <circle cx="8" cy="8" r="5.5" />
          <path d="M2.5 8h11M8 2.5c2 2 2 9 0 11M8 2.5c-2 2-2 9 0 11" />
        </>
      );
    default:
      return (
        <>
          <circle cx="4" cy="8" r="1" fill="currentColor" stroke="none" />
          <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
        </>
      );
  }
}

export function TypeIcon({ type, size = 16, className = '', title }: IconProps & { type: ItTicketType }) {
  const meta = TYPE_META[type] ?? TYPE_META.other;
  return (
    <span
      title={title ?? meta.label}
      aria-label={meta.label}
      role="img"
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-[4px] text-white ${meta.tileClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg {...base(size - 4)} strokeWidth={2}>
        <TypeGlyph type={type} />
      </svg>
    </span>
  );
}

/* ---------- Priority arrows (Jira: double-up red, up orange, equals amber, down green) ---------- */

function PriorityGlyph({ priority }: { priority: ItTicketPriority }) {
  switch (priority) {
    case 'urgent':
      return <path d="M4 7.5 8 3.5l4 4M4 12.5l4-4 4 4" />;
    case 'high':
      return <path d="M3.5 10 8 5.5l4.5 4.5" strokeWidth={2.25} />;
    case 'medium':
      return <path d="M3.5 6h9M3.5 10h9" strokeWidth={2.25} />;
    default:
      return <path d="M3.5 6 8 10.5 12.5 6" strokeWidth={2.25} />;
  }
}

export function PriorityIcon({ priority, size = 16, className = '', title }: IconProps & { priority: ItTicketPriority }) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.medium;
  return (
    <span title={title ?? `${meta.label} priority`} aria-label={`${meta.label} priority`} role="img" className={`inline-flex flex-shrink-0 ${meta.iconClass} ${className}`}>
      <svg {...base(size)}>
        <PriorityGlyph priority={priority} />
      </svg>
    </span>
  );
}

/* ---------- Plain UI glyphs ---------- */

export function SearchIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.5 10.5 3 3" />
    </svg>
  );
}

export function CommentIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" />
    </svg>
  );
}

export function AttachmentIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m10.5 5.5-4.6 4.6a1.6 1.6 0 0 1-2.3-2.3l5-5a2.7 2.7 0 0 1 3.8 3.8l-5.2 5.2a3.8 3.8 0 0 1-5.4-5.4L6.5 2.5" />
    </svg>
  );
}

export function LinkIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6.5 9.5a3 3 0 0 0 4.2 0l2-2a3 3 0 0 0-4.2-4.2l-1 1" />
      <path d="M9.5 6.5a3 3 0 0 0-4.2 0l-2 2a3 3 0 0 0 4.2 4.2l1-1" />
    </svg>
  );
}

export function CloseIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m4 4 8 8M12 4l-8 8" />
    </svg>
  );
}

export function TrashIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3 4.5h10M6.5 4.5v-1h3v1M4.5 4.5l.6 8.5h5.8l.6-8.5M6.8 7v4M9.2 7v4" />
    </svg>
  );
}

export function PlusIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M8 3.5v9M3.5 8h9" />
    </svg>
  );
}

export function ChevronDownIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

export function CalendarIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 7h11M5.5 2v3M10.5 2v3" />
    </svg>
  );
}

export function CheckIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m3.5 8.5 3 3 6-6.5" />
    </svg>
  );
}

export function UploadIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M8 10.5v-7M5 6.5l3-3 3 3M3 12.5h10" />
    </svg>
  );
}

export function FileIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 2.5h5l3 3v8H4z" />
      <path d="M9 2.5v3h3" />
    </svg>
  );
}

export function DownloadIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M8 2.5v8M5 7.5l3 3 3-3M3 13.5h10" />
    </svg>
  );
}

export function PieChartIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M8 2.5a5.5 5.5 0 1 0 5.5 5.5H8z" />
      <path d="M10 1.5a4.5 4.5 0 0 1 4.5 4.5H10z" />
    </svg>
  );
}

export function ImageIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
      <circle cx="6" cy="6.5" r="1.25" />
      <path d="m3 12 3.5-3.5 2.5 2.5 2-2 2.5 2.5" />
    </svg>
  );
}
