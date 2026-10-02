'use client';

import {
  Calendar,
  ChartPie,
  Check,
  ChevronDown,
  ChevronsUp,
  ChevronUp,
  CodeXml,
  Download,
  Ellipsis,
  Equal,
  File,
  Globe,
  Image,
  KeyRound,
  Link,
  MessageSquare,
  Monitor,
  Paperclip,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from 'lucide-react';
import { PRIORITY_META, TYPE_META } from './constants';
import type { ItTicketPriority, ItTicketType } from './types';

interface IconProps {
  size?: number;
  className?: string;
  title?: string;
}

/* ---------- Issue-type tiles (Jira issue-type icon style: filled rounded square, white glyph) ---------- */

const TYPE_GLYPHS: Record<ItTicketType, LucideIcon> = {
  hardware: Monitor,
  software: CodeXml,
  access: KeyRound,
  network: Globe,
  other: Ellipsis,
};

export function TypeIcon({ type, size = 16, className = '', title }: IconProps & { type: ItTicketType }) {
  const meta = TYPE_META[type] ?? TYPE_META.other;
  const Glyph = TYPE_GLYPHS[type] ?? Ellipsis;
  return (
    <span
      title={title ?? meta.label}
      aria-label={meta.label}
      role="img"
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-[4px] text-white ${meta.tileClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <Glyph size={size - 4} strokeWidth={2.5} aria-hidden />
    </span>
  );
}

/* ---------- Priority arrows (Jira: double-up red, up orange, equals amber, down green) ---------- */

const PRIORITY_GLYPHS: Record<ItTicketPriority, LucideIcon> = {
  urgent: ChevronsUp,
  high: ChevronUp,
  medium: Equal,
  low: ChevronDown,
};

export function PriorityIcon({ priority, size = 16, className = '', title }: IconProps & { priority: ItTicketPriority }) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.medium;
  const Glyph = PRIORITY_GLYPHS[priority] ?? Equal;
  return (
    <span title={title ?? `${meta.label} priority`} aria-label={`${meta.label} priority`} role="img" className={`inline-flex flex-shrink-0 ${meta.iconClass} ${className}`}>
      <Glyph size={size} strokeWidth={2.5} aria-hidden />
    </span>
  );
}

/* ---------- Plain UI glyphs (thin wrappers so call sites keep their `size` defaults) ---------- */

function wrap(Glyph: LucideIcon, defaultSize: number) {
  function WrappedIcon({ size = defaultSize, className }: IconProps) {
    return <Glyph size={size} className={className} aria-hidden />;
  }
  return WrappedIcon;
}

export const SearchIcon = wrap(Search, 16);
export const CommentIcon = wrap(MessageSquare, 14);
export const AttachmentIcon = wrap(Paperclip, 14);
export const LinkIcon = wrap(Link, 16);
export const CloseIcon = wrap(X, 16);
export const TrashIcon = wrap(Trash2, 16);
export const PlusIcon = wrap(Plus, 16);
export const ChevronDownIcon = wrap(ChevronDown, 14);
export const CalendarIcon = wrap(Calendar, 14);
export const CheckIcon = wrap(Check, 14);
export const UploadIcon = wrap(Upload, 16);
export const FileIcon = wrap(File, 16);
export const DownloadIcon = wrap(Download, 16);
export const PieChartIcon = wrap(ChartPie, 16);
export const ImageIcon = wrap(Image, 16);
