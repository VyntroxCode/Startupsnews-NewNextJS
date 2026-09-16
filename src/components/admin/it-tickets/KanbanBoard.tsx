'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCorners,
  useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { STATUS_COLUMNS, STATUS_META } from './constants';
import TicketCard from './TicketCard';
import { PlusIcon } from './TicketIcons';
import { BTN_GHOST } from './ui';
import type { ItTicket, ItTicketStatus } from './types';

const subscribeNoop = () => () => {};

interface KanbanBoardProps {
  ticketsByStatus: Record<string, ItTicket[]>;
  canManage: boolean;
  onOpenTicket: (ticket: ItTicket) => void;
  onMoveTicket: (id: string, status: ItTicketStatus) => void;
  /** Column footer "+ Create" — managers get the column's status (the page re-checks the policy). */
  onCreate: (status?: ItTicketStatus) => void;
  /** Shared status policy, e.g. only Admin moves tickets into or out of Blocked. */
  canMove: (from: ItTicketStatus, to: ItTicketStatus) => boolean;
  /** A drop the policy refuses — the page shows why. The card stays where it was. */
  onMoveDenied: (ticket: ItTicket, to: ItTicketStatus) => void;
}

function DraggableCard({ ticket, onOpen, disabled }: { ticket: ItTicket; onOpen: () => void; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: ticket.id, disabled });
  // With a 6px activation distance a plain click never starts a drag, and after a real drag the
  // pointer is released over another element so no click fires — the ref is belt-and-braces for a
  // click dispatched in the same task as the drop. It must be cleared right after the drag ends:
  // when a drop is refused (e.g. IT Support → Blocked) the card stays mounted, and a flag left set
  // would silently swallow the next genuine click on it.
  const wasDragging = useRef(false);
  useEffect(() => {
    if (isDragging) {
      wasDragging.current = true;
      return;
    }
    if (!wasDragging.current) return;
    const t = window.setTimeout(() => { wasDragging.current = false; }, 0);
    return () => window.clearTimeout(t);
  }, [isDragging]);

  return (
    // The card itself is NOT translated — the DragOverlay ghost moves instead, which is what lets
    // the dragged card escape the column's overflow-y-auto and the board's overflow-x-auto.
    <div ref={setNodeRef}>
      <TicketCard
        ticket={ticket}
        isDragging={isDragging}
        onOpen={() => {
          if (wasDragging.current) {
            wasDragging.current = false;
            return;
          }
          onOpen();
        }}
        dragHandleProps={disabled ? undefined : ({ ...attributes, ...listeners } as React.HTMLAttributes<HTMLDivElement>)}
      />
    </div>
  );
}

/** Stays droppable even when the policy forbids the move, so the drop reaches onDragEnd and the
 * viewer gets a reason (a disabled droppable would make the drop silently vanish). */
function DroppableColumn({ status, forbidden, children }: { status: ItTicketStatus; forbidden: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const tone = isOver
    ? (forbidden ? 'bg-red-50/80 ring-2 ring-inset ring-red-300' : 'bg-indigo-50/70 ring-2 ring-inset ring-indigo-300')
    : '';
  return (
    <div
      ref={setNodeRef}
      data-column={status}
      data-forbidden={forbidden ? 'true' : undefined}
      className={`flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2 transition-colors ${tone}`}
    >
      {isOver && forbidden && (
        <div className="sticky top-0 z-[1] rounded-md bg-red-600 px-2 py-1 text-center text-[11px] font-semibold text-white">
          Admin only
        </div>
      )}
      {children}
    </div>
  );
}

export default function KanbanBoard({ ticketsByStatus, canManage, onOpenTicket, onMoveTicket, onCreate, canMove, onMoveDenied }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // false on the server / first hydration pass, true once we can portal into document.body.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const sensors = useSensors(
    // distance: a click (no movement) opens the ticket; only a real drag (≥ 6px) picks it up.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Space picks up / drops, arrows move, Escape cancels — Enter is left free to open the card.
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] } })
  );

  const allTickets = Object.values(ticketsByStatus).flat();
  const activeTicket = activeId ? allTickets.find((t) => t.id === activeId) ?? null : null;
  // A manager who can't use Blocked (IT Support) sees it labelled up front, not only on a refused drop.
  const blockedLocked = canManage && !canMove('open', 'blocked');

  // Any status not in STATUS_COLUMNS (the DB column is a plain VARCHAR) still gets a home.
  const knownKeys = new Set<string>(STATUS_COLUMNS.map((c) => c.key));
  const strays = Object.keys(ticketsByStatus).filter((k) => !knownKeys.has(k) && ticketsByStatus[k].length > 0);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const to = over.id as ItTicketStatus;
    const ticket = allTickets.find((t) => t.id === String(active.id));
    if (!ticket || ticket.status === to) return;
    if (!canMove(ticket.status, to)) {
      onMoveDenied(ticket, to);
      return;
    }
    onMoveTicket(ticket.id, to);
  }

  const board = (
    <div className="flex items-start gap-3 overflow-x-auto pb-4" data-testid="kanban-board">
      {STATUS_COLUMNS.map((col) => {
        const items = ticketsByStatus[col.key] || [];
        const forbidden = !!activeTicket && activeTicket.status !== col.key && !canMove(activeTicket.status, col.key);
        const locked = col.key === 'blocked' && blockedLocked;
        return (
          <div
            key={col.key}
            className="flex max-h-[calc(100vh-330px)] min-h-[200px] min-w-[232px] flex-1 basis-0 flex-col rounded-[14px] border border-slate-200/80 bg-slate-100/70"
            data-testid={`column-${col.key}`}
          >
            <div className={`flex items-center gap-2 px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-wide ${col.column}`}>
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: col.color }} />
              {col.label}
              <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200" data-testid={`count-${col.key}`}>
                {items.length}
              </span>
              {locked && (
                <span
                  className="ml-auto whitespace-nowrap rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-slate-500 ring-1 ring-slate-200"
                  title="Only an Admin can move tickets into or out of Blocked"
                  data-testid="blocked-admin-only"
                >
                  Admin only
                </span>
              )}
            </div>
            <DroppableColumn status={col.key} forbidden={forbidden}>
              {items.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 px-2 py-5 text-center text-xs text-slate-400">
                  {!canManage ? 'No tickets' : locked ? 'An Admin moves tickets here' : 'Drop tickets here'}
                </div>
              ) : (
                items.map((t) => (
                  <DraggableCard key={t.id} ticket={t} onOpen={() => onOpenTicket(t)} disabled={!canManage} />
                ))
              )}
            </DroppableColumn>
            <div className="px-2 pb-2">
              <button
                type="button"
                className={`${BTN_GHOST} w-full justify-start`}
                onClick={() => onCreate(canManage ? col.key : undefined)}
                data-testid={`create-in-${col.key}`}
              >
                <PlusIcon size={14} /> Create
              </button>
            </div>
          </div>
        );
      })}

      {strays.map((key) => (
        <div key={key} className="flex max-h-[calc(100vh-330px)] min-w-[232px] flex-1 basis-0 flex-col rounded-[14px] bg-amber-50 ring-1 ring-amber-200">
          <div className="flex items-center gap-2 px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-wide text-amber-700">
            {STATUS_META[key as ItTicketStatus]?.label ?? key}
            <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">{ticketsByStatus[key].length}</span>
          </div>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
            {ticketsByStatus[key].map((t) => (
              <TicketCard key={t.id} ticket={t} onOpen={() => onOpenTicket(t)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (!canManage) return board; // read-only: no DndContext, cards render without drag handles

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
      {board}
      {/* Portaled to <body> with zIndex above the admin header (1000) / sidebar (999). */}
      {mounted && createPortal(
        <DragOverlay dropAnimation={null} zIndex={1300}>
          {/* The ghost lives outside the page root, so it needs the feature scope (font, box-sizing) itself. */}
          {activeTicket ? <div className="it-tickets-scope"><TicketCard ticket={activeTicket} overlay /></div> : null}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
