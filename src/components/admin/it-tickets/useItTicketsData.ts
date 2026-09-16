'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { canSetTicketStatus } from '@/modules/it-tickets/domain/status-policy';
import { useTicketsApi, type TicketPatch } from './api';
import { DELETE_ROLES, MANAGE_ROLES } from './constants';
import { useTicketsClient, type TicketViewer } from './TicketsClientContext';
import type { ItTicket, ItTicketStatus, TicketAssignee, TicketDraft, TicketFilters } from './types';

export function useItTicketsData() {
  const client = useTicketsClient();
  const api = useTicketsApi();

  const [tickets, setTickets] = useState<ItTicket[]>([]);
  const [assignees, setAssignees] = useState<TicketAssignee[]>([]);
  const [filters, setFilters] = useState<TicketFilters>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Who is looking. Admin resolves synchronously from sessionStorage (so canManage is right on the very
  // first render and assignees load straight away); the employee portal resolves via GET /me.
  const [initialViewer] = useState(() => {
    const v = client.loadViewer();
    return v instanceof Promise
      ? { viewer: null as TicketViewer | null, pending: v as Promise<TicketViewer | null> | null }
      : { viewer: v, pending: null as Promise<TicketViewer | null> | null };
  });
  const [viewer, setViewer] = useState<TicketViewer | null>(initialViewer.viewer);
  const [viewerLoaded, setViewerLoaded] = useState(!initialViewer.pending);
  useEffect(() => {
    const pending = initialViewer.pending;
    if (!pending) return;
    let cancelled = false;
    pending
      .then((v) => { if (!cancelled) setViewer(v); })
      .catch(() => { /* viewer stays null: no ownership-based actions shown; the API still enforces */ })
      .finally(() => { if (!cancelled) setViewerLoaded(true); });
    return () => { cancelled = true; };
  }, [initialViewer]);

  const role = viewer?.role || '';
  const canManage = MANAGE_ROLES.includes(role);
  const canDelete = DELETE_ROLES.includes(role);
  /** Shared status policy (e.g. only Admin moves tickets into or out of Blocked). */
  const canSetStatus = useCallback(
    (from: ItTicketStatus | null, to: ItTicketStatus) => canSetTicketStatus(role, from, to),
    [role]
  );

  // A filter change while a slower earlier request is still in flight must not let the stale
  // response land last and overwrite the fresh one.
  const inflight = useRef<AbortController | null>(null);
  const filtersKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    try {
      setError(null);
      const [ticketList, assigneeList] = await Promise.all([
        api.fetchTickets(JSON.parse(filtersKey) as TicketFilters, controller.signal),
        canManage ? api.fetchAssignees() : Promise.resolve([]),
      ]);
      if (controller.signal.aborted) return;
      setTickets(ticketList);
      setAssignees(assigneeList);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : 'Failed to load tickets');
    } finally {
      if (!controller.signal.aborted) setLoaded(true);
    }
  }, [api, filtersKey, canManage]);

  useEffect(() => {
    load();
    return () => inflight.current?.abort();
  }, [load]);

  async function createTicket(draft: TicketDraft): Promise<ItTicket> {
    const ticket = await api.createTicket(draft);
    setTickets((prev) => [ticket, ...prev]);
    return ticket;
  }

  /** Returns the server's row so callers render real updatedAt/resolvedAt/assigneeName, not the patch. */
  async function updateTicket(id: string, patch: TicketPatch): Promise<ItTicket> {
    const updated = await api.updateTicket(id, patch);
    setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
    return updated;
  }

  /** Optimistic status change for the Kanban drag — rolls back on failure. Callers check
   * canSetStatus first, so a policy refusal never reaches here. */
  async function moveTicketStatus(id: string, status: ItTicketStatus): Promise<void> {
    const previous = tickets.find((t) => t.id === id);
    if (!previous || previous.status === status) return;
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    try {
      const updated = await api.updateTicket(id, { status });
      setTickets((prev) => prev.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      setTickets((prev) => prev.map((t) => (t.id === id ? previous : t)));
      throw e;
    }
  }

  async function deleteTicket(id: string): Promise<void> {
    await api.deleteTicket(id);
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }

  /** Local-only patch (comment/attachment count badges) — no request, no refetch. */
  const patchLocal = useCallback((id: string, partial: Partial<ItTicket>) => {
    setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, ...partial } : t)));
  }, []);

  /** Insert-or-replace a ticket fetched outside the list (deep link to a ticket the current filters hide). */
  const upsertLocal = useCallback((ticket: ItTicket) => {
    setTickets((prev) => (prev.some((t) => t.id === ticket.id)
      ? prev.map((t) => (t.id === ticket.id ? ticket : t))
      : [ticket, ...prev]));
  }, []);

  const ticketsByStatus = useMemo(() => {
    const map: Record<string, ItTicket[]> = {};
    for (const t of tickets) {
      (map[t.status] ||= []).push(t);
    }
    return map;
  }, [tickets]);

  return {
    tickets, ticketsByStatus, assignees, filters, setFilters,
    loaded: loaded && viewerLoaded, error,
    viewer, role, canManage, canDelete, canSetStatus,
    createTicket, updateTicket, moveTicketStatus, deleteTicket, patchLocal, upsertLocal, reload: load,
  };
}
