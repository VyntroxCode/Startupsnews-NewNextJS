'use client';

import Avatar from './Avatar';
import { PRIORITIES, TYPES } from './constants';
import { ChevronDownIcon, PriorityIcon, TypeIcon } from './TicketIcons';
import { FIELD_INPUT, FIELD_INPUT_COMPACT, LINK } from './ui';
import type { ItTicketPriority, ItTicketType, TicketAssignee } from './types';

/** Native selects with the matching Jira-style icon rendered in front — used by the create dialog
 * (`variant="field"`) and the issue view's details sidebar (`variant="compact"`). */

type Variant = 'field' | 'compact';

function selectClass(variant: Variant): string {
  return `${variant === 'field' ? FIELD_INPUT : FIELD_INPUT_COMPACT} appearance-none cursor-pointer pl-8 pr-8`;
}

const ICON_SLOT = 'pointer-events-none absolute left-2 top-1/2 -translate-y-1/2';
const CHEVRON_SLOT = 'pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400';

interface PrioritySelectProps {
  value: ItTicketPriority;
  onChange: (value: ItTicketPriority) => void;
  disabled?: boolean;
  variant?: Variant;
  id?: string;
}

export function PrioritySelect({ value, onChange, disabled, variant = 'field', id }: PrioritySelectProps) {
  return (
    <span className="relative block">
      <PriorityIcon priority={value} className={ICON_SLOT} />
      <select id={id} aria-label="Priority" className={selectClass(variant)} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as ItTicketPriority)}>
        {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
      {!disabled && <ChevronDownIcon className={CHEVRON_SLOT} />}
    </span>
  );
}

interface TypeSelectProps {
  value: ItTicketType;
  onChange: (value: ItTicketType) => void;
  disabled?: boolean;
  variant?: Variant;
  id?: string;
}

export function TypeSelect({ value, onChange, disabled, variant = 'field', id }: TypeSelectProps) {
  return (
    <span className="relative block">
      <TypeIcon type={value} className={ICON_SLOT} />
      <select id={id} aria-label="Issue type" className={selectClass(variant)} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as ItTicketType)}>
        {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
      </select>
      {!disabled && <ChevronDownIcon className={CHEVRON_SLOT} />}
    </span>
  );
}

interface AssigneeSelectProps {
  assignees: TicketAssignee[];
  /** Identity is the (id, role) pair. */
  value: { id: number | null; role: string | null; name: string | null };
  onChange: (assignee: TicketAssignee | null) => void;
  /** The signed-in user, for the "Assign to me" shortcut (only shown when they are in `assignees`). */
  currentUser?: { id: number; role: string } | null;
  /** Render the "Assign to me" link under the select. Off when the caller puts it in its label row. */
  showAssignToMe?: boolean;
  disabled?: boolean;
  variant?: Variant;
  id?: string;
}

export function AssigneeSelect({ assignees, value, onChange, currentUser, showAssignToMe = true, disabled, variant = 'field', id }: AssigneeSelectProps) {
  const encoded = value.id != null && value.role ? `${value.role}:${value.id}` : '';
  const me = currentUser ? assignees.find((a) => a.id === currentUser.id && a.role === currentUser.role) : undefined;
  const isMe = !!me && encoded === `${me.role}:${me.id}`;

  function handle(raw: string) {
    if (!raw) {
      onChange(null);
      return;
    }
    const [role, idStr] = raw.split(':');
    const found = assignees.find((a) => a.role === role && String(a.id) === idStr);
    onChange(found ?? null);
  }

  return (
    <div>
      <span className="relative block">
        <Avatar name={value.name} size="xs" className={ICON_SLOT} />
        <select id={id} aria-label="Assignee" className={selectClass(variant)} value={encoded} disabled={disabled} onChange={(e) => handle(e.target.value)}>
          <option value="">Unassigned</option>
          {assignees.map((a) => (
            <option key={`${a.role}-${a.id}`} value={`${a.role}:${a.id}`}>{a.name}</option>
          ))}
        </select>
        {!disabled && <ChevronDownIcon className={CHEVRON_SLOT} />}
      </span>
      {showAssignToMe && me && !disabled && !isMe && (
        <button type="button" className={`${LINK} mt-1.5 px-2`} onClick={() => onChange(me)}>
          Assign to me
        </button>
      )}
    </div>
  );
}
