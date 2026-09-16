'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import { statusDenialMessage } from '@/modules/it-tickets/domain/status-policy';
import { useTicketsApi, type TicketPatch } from './api';
import { PROJECT_NAME, STATUS_LABELS } from './constants';
import FilterBar from './FilterBar';
import KanbanBoard from './KanbanBoard';
import { describeFilters } from './reports';
import { DownloadIcon, PieChartIcon, PlusIcon } from './TicketIcons';
import TicketDetailPanel from './TicketDetailPanel';
import TicketReports from './TicketReports';
import TicketFormModal from './TicketFormModal';
import TicketListTable from './TicketListTable';
import {
  ADMIN_TICKETS_CONFIG, TicketsClientProvider, useTicketsClient, type TicketsClientConfig,
} from './TicketsClientContext';
import { ToastViewport, useToasts } from './Toast';
import { BTN_PRIMARY, BTN_SECONDARY, ERROR_BANNER } from './ui';
import { useItTicketsData } from './useItTicketsData';
import type { ItTicket, ItTicketStatus, TicketDraft, TicketSort, TicketViewMode } from './types';

interface ItTicketsPageProps {
  /** Which API + session the page talks to. Defaults to the admin panel; the employee portal passes
   * EMPLOYEE_TICKETS_CONFIG (src/lib/employee-it-tickets.ts). */
  config?: TicketsClientConfig;
  title?: string;
  subtitle?: string;
}

export default function ItTicketsPage({ config = ADMIN_TICKETS_CONFIG, title, subtitle }: ItTicketsPageProps) {
  return (
    <TicketsClientProvider config={config}>
      <ItTicketsPageInner title={title} subtitle={subtitle} />
    </TicketsClientProvider>
  );
}

function ItTicketsPageInner({ title = 'IT Tickets', subtitle }: Omit<ItTicketsPageProps, 'config'>) {
  const client = useTicketsClient();
  const api = useTicketsApi();
  const {
    tickets, ticketsByStatus, assignees, filters, setFilters, loaded, error,
    viewer, canManage, canDelete, canSetStatus,
    createTicket, updateTicket, moveTicketStatus, deleteTicket, patchLocal, upsertLocal,
  } = useItTicketsData();
  const { toasts, push: notify, dismiss } = useToasts();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [view, setView] = useState<TicketViewMode>(client.defaultView);
  // Reports panel (admin panel, managers only) — open by default, remembered per browser session.
  const [showReports, setShowReports] = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportsKey = `${client.viewStorageKey}:reports`;
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(client.viewStorageKey);
      if (saved === 'list' || saved === 'board') setView(saved);
      if (sessionStorage.getItem(reportsKey) === 'hidden') setShowReports(false);
    } catch { /* private mode etc. — keep the default */ }
  }, [client.viewStorageKey, reportsKey]);
  function changeView(next: TicketViewMode) {
    setView(next);
    try { sessionStorage.setItem(client.viewStorageKey, next); } catch { /* ignore */ }
  }
  function toggleReports() {
    setShowReports((prev) => {
      try { sessionStorage.setItem(reportsKey, prev ? 'hidden' : 'shown'); } catch { /* ignore */ }
      return !prev;
    });
  }

  const [sort, setSort] = useState<TicketSort>({ key: 'created', dir: 'desc' });
  const [creating, setCreating] = useState<{ open: boolean; status?: ItTicketStatus }>({ open: false });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Single source of truth: the open dialog always shows the row from `tickets`, so every save
  // (which replaces that row with the server's) is reflected immediately.
  const activeTicket = activeId ? tickets.find((t) => t.id === activeId) ?? null : null;

  // ---- Deep link: ?ticket=IT-12 ----
  const requestedKey = searchParams.get('ticket');
  const resolvedKey = useRef<string | null>(null);

  const setTicketParam = useCallback((key: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key) params.set('ticket', key);
    else params.delete('ticket');
    const qs = params.toString();
    // Same pathname → the surrounding layout's auth effect (keyed on pathname) does not re-run.
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  useEffect(() => {
    if (!loaded || !requestedKey) return;
    if (resolvedKey.current === requestedKey) return;
    resolvedKey.current = requestedKey;
    const inList = tickets.find((t) => t.ticketKey.toUpperCase() === requestedKey.toUpperCase());
    if (inList) {
      setActiveId(inList.id);
      return;
    }
    let cancelled = false;
    api.fetchTicket(requestedKey)
      .then((ticket) => {
        if (cancelled) return;
        upsertLocal(ticket);
        setActiveId(ticket.id);
      })
      .catch((e: Error & { status?: number }) => {
        if (cancelled) return;
        notify('error', e.status === 403 ? `You don't have access to ${requestedKey}` : e.status === 404 ? `${requestedKey} was not found` : e.message);
        setTicketParam(null);
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, requestedKey]);

  function openTicket(ticket: ItTicket) {
    setActiveId(ticket.id);
    resolvedKey.current = ticket.ticketKey;
    setTicketParam(ticket.ticketKey);
  }

  function closeTicket() {
    setActiveId(null);
    resolvedKey.current = null;
    setTicketParam(null);
  }

  // ---- Actions ----
  async function handleCreate(draft: TicketDraft): Promise<ItTicket> {
    return createTicket(draft);
  }

  async function handleUpdate(patch: TicketPatch): Promise<ItTicket> {
    if (!activeTicket) throw new Error('No ticket selected');
    return updateTicket(activeTicket.id, patch);
  }

  async function handleDelete() {
    if (!activeTicket) return;
    if (!confirm(`Delete ${activeTicket.ticketKey}? Its comments and attachments go with it. This cannot be undone.`)) return;
    const key = activeTicket.ticketKey;
    try {
      await deleteTicket(activeTicket.id);
      closeTicket();
      notify('success', `${key} deleted`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete ticket');
    }
  }

  function denyMove(ticket: ItTicket, to: ItTicketStatus) {
    notify('error', statusDenialMessage(viewer?.role, ticket.status, to));
  }

  async function handleMove(id: string, status: ItTicketStatus) {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket || ticket.status === status) return;
    if (!canSetStatus(ticket.status, status)) {
      denyMove(ticket, status);
      return;
    }
    setActionError(null);
    try {
      await moveTicketStatus(id, status);
      notify('success', `${ticket.ticketKey} moved to ${STATUS_LABELS[status]}`);
    } catch (e) {
      notify('error', e instanceof Error ? e.message : 'Failed to move ticket');
    }
  }

  function openCreate(status?: ItTicketStatus) {
    // "+ Create" in a column only preselects that status if the viewer may create straight into it.
    setCreating({ open: true, status: status && canSetStatus(null, status) ? status : undefined });
  }

  // Reports + Excel export are for the people who run the queue, in the admin panel only.
  const canReport = client.variant === 'admin' && canManage;
  const filterSummary = describeFilters(filters, assignees);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await api.exportTickets(filters);
      if (data.tickets.length === 0) {
        notify('info', 'No tickets match these filters — nothing to export.');
        return;
      }
      // Loaded on demand: exceljs + jszip never ship with the board itself.
      const { downloadTicketsWorkbook } = await import('./excel-export');
      await downloadTicketsWorkbook(data, {
        filterSummary,
        exportedBy: viewer?.name ?? '',
        pageUrl: `${window.location.origin}${client.pagePath}`,
      });
      notify('success', `Exported ${data.tickets.length} ticket${data.tickets.length === 1 ? '' : 's'} to Excel`);
    } catch (e) {
      notify('error', e instanceof Error ? `Export failed: ${e.message}` : 'Export failed');
    } finally {
      setExporting(false);
    }
  }

  const defaultSubtitle = `${PROJECT_NAME} · ${canManage ? 'Triage and manage the support queue' : 'Raise a request and track your own tickets'}`;

  return (
    <AdminErrorBoundary>
      {/* Same page head as the other admin tools (Sales Tracker etc.): 26px title, 13.5px sub-line,
          primary action on the right. No max-width: like Posts / Newsletter, the page fills the
          content area and grows when the sidebar collapses. */}
      <div className="it-tickets-scope w-full text-slate-900" data-testid="it-tickets-page" data-variant={client.variant}>
        <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="m-0 mb-1 text-[26px] font-bold leading-tight tracking-[-0.02em] text-slate-900">{title}</h1>
            <p className="m-0 text-[13.5px] text-slate-600">
              {subtitle ?? defaultSubtitle}
              {!loaded ? ' · loading…' : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {canReport && (
              <>
                <button
                  type="button"
                  className={BTN_SECONDARY}
                  onClick={toggleReports}
                  aria-pressed={showReports}
                  data-testid="toggle-reports"
                >
                  <PieChartIcon size={14} /> {showReports ? 'Hide reports' : 'Reports'}
                </button>
                <button
                  type="button"
                  className={BTN_SECONDARY}
                  onClick={handleExport}
                  disabled={exporting || !loaded}
                  title={`Download an Excel report of the tickets matching the current filters (${filterSummary})`}
                  data-testid="export-excel"
                >
                  <DownloadIcon size={14} /> {exporting ? 'Preparing…' : 'Export Excel'}
                </button>
              </>
            )}
            <button type="button" className={BTN_PRIMARY} onClick={() => openCreate()} data-testid="create-ticket">
              <PlusIcon size={14} /> Create ticket
            </button>
          </div>
        </div>

        {(error || actionError) && (
          <div className={`${ERROR_BANNER} mb-4`} role="alert">
            {error || actionError}
          </div>
        )}

        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          view={view}
          onViewChange={changeView}
          assignees={assignees}
          canManage={canManage}
          count={tickets.length}
          loaded={loaded}
        />

        {canReport && showReports && (
          <TicketReports tickets={tickets} loaded={loaded} filterSummary={filterSummary} />
        )}

        {view === 'board' ? (
          <KanbanBoard
            ticketsByStatus={ticketsByStatus}
            canManage={canManage}
            onOpenTicket={openTicket}
            onMoveTicket={handleMove}
            onCreate={openCreate}
            canMove={canSetStatus}
            onMoveDenied={denyMove}
          />
        ) : (
          <TicketListTable
            tickets={tickets}
            canManage={canManage}
            sort={sort}
            onSortChange={setSort}
            onOpenTicket={openTicket}
            onStatusChange={handleMove}
            canSetStatus={canSetStatus}
            hideReporter={client.variant === 'employee'}
            showEmployeeTag={client.variant === 'admin'}
          />
        )}

        {creating.open && (
          <TicketFormModal
            assignees={assignees}
            canManage={canManage}
            currentUser={viewer}
            initialStatus={creating.status}
            onClose={() => setCreating({ open: false })}
            onSave={handleCreate}
            onAttached={(id, count) => {
              const t = tickets.find((x) => x.id === id);
              patchLocal(id, { attachmentCount: (t?.attachmentCount ?? 0) + count });
            }}
            onNotify={notify}
          />
        )}

        {activeTicket && (
          <TicketDetailPanel
            ticket={activeTicket}
            assignees={assignees}
            canManage={canManage}
            canDelete={canDelete}
            canSetStatus={canSetStatus}
            currentUser={viewer}
            onClose={closeTicket}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onLocalPatch={(partial) => patchLocal(activeTicket.id, partial)}
            onNotify={notify}
          />
        )}

        <ToastViewport toasts={toasts} onDismiss={dismiss} />
      </div>
    </AdminErrorBoundary>
  );
}
