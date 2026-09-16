'use client';

import Avatar from './Avatar';
import { AttachmentIcon, CommentIcon, PriorityIcon, TypeIcon } from './TicketIcons';
import { formatDate, isOverdue } from './utils';
import type { ItTicket } from './types';

interface TicketCardProps {
  ticket: ItTicket;
  onOpen?: () => void;
  /** dnd-kit attributes + listeners; absent for read-only users. */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  /** The original card while its ghost is being dragged. */
  isDragging?: boolean;
  /** The ghost rendered inside DragOverlay. */
  overlay?: boolean;
}

/** Jira-style board card: summary on top, then a footer row of type icon · key · priority · due,
 * with the assignee avatar bottom-right. */
export default function TicketCard({ ticket, onOpen, dragHandleProps, isDragging, overlay }: TicketCardProps) {
  const overdue = isOverdue(ticket);
  const due = ticket.dueDate ? formatDate(ticket.dueDate) : '';

  const shell = overlay
    ? 'rotate-2 shadow-xl ring-1 ring-indigo-300 cursor-grabbing'
    : `shadow-sm hover:shadow-md hover:-translate-y-px ${isDragging ? 'opacity-40' : ''} ${onOpen ? 'cursor-pointer' : ''}`;

  return (
    <div
      data-ticket-key={ticket.ticketKey}
      data-testid="ticket-card"
      className={`group select-none rounded-md border border-slate-200 bg-white p-3 transition-[box-shadow,transform] duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${shell}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (onOpen && e.key === 'Enter') {
          e.preventDefault();
          onOpen();
        }
      }}
      {...dragHandleProps}
    >
      <div
        className="overflow-hidden text-[13.5px] font-medium leading-snug text-slate-900 [-webkit-box-orient:vertical] [-webkit-line-clamp:3] [display:-webkit-box] [overflow-wrap:anywhere] group-hover:text-[#4F46E5]"
        title={ticket.title}
      >
        {ticket.title}
      </div>

      {(due || ticket.commentCount > 0 || ticket.attachmentCount > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {due && (
            <span
              className={`inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[11px] font-semibold ${overdue ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-slate-100 text-slate-600'}`}
              title={overdue ? `Overdue — was due ${due}` : `Due ${due}`}
            >
              {overdue ? 'Overdue' : 'Due'} {due}
            </span>
          )}
          {ticket.commentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500" title={`${ticket.commentCount} comment${ticket.commentCount === 1 ? '' : 's'}`}>
              <CommentIcon /> {ticket.commentCount}
            </span>
          )}
          {ticket.attachmentCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500" title={`${ticket.attachmentCount} attachment${ticket.attachmentCount === 1 ? '' : 's'}`}>
              <AttachmentIcon /> {ticket.attachmentCount}
            </span>
          )}
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-2">
        <TypeIcon type={ticket.type} />
        <span className="text-xs font-semibold tracking-wide text-slate-500">{ticket.ticketKey}</span>
        <PriorityIcon priority={ticket.priority} />
        <span className="ml-auto">
          <Avatar name={ticket.assigneeName} title={ticket.assigneeName ? `Assignee: ${ticket.assigneeName}` : 'Unassigned'} />
        </span>
      </div>
    </div>
  );
}
