import { useMemo } from 'react';
import { useTicketsClient, type TicketsClientConfig } from './TicketsClientContext';
import type {
  ItTicket, ItTicketComment, ItTicketAttachment, ItTicketExport, TicketAssignee, TicketDraft, TicketFilters,
  ItTicketStatus,
} from './types';

export type TicketPatch = Partial<Omit<TicketDraft, 'dueDate'> & { status: ItTicketStatus; dueDate: string | null }>;

type ApiConfig = Pick<TicketsClientConfig, 'apiBase' | 'presignUrl' | 'getHeaders'>;

function buildQuery(filters: TicketFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.type) params.set('type', filters.type);
  // Assignee identity is the (id, role) pair.
  if (filters.assigneeId && filters.assigneeRole) {
    params.set('assigneeId', String(filters.assigneeId));
    params.set('assigneeRole', filters.assigneeRole);
  }
  if (filters.search) params.set('search', filters.search);
  if (filters.mine) params.set('mine', '1');
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** Uses XHR (not fetch) so onProgress gets real byte-level upload progress, matching the
 * upload pattern already used elsewhere in the admin panel (e.g. DocumentsWidget). */
function uploadWithProgress(uploadUrl: string, file: File, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) onProgress(Math.round((evt.loaded / evt.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload to storage failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Upload to storage failed — network error.'));
    xhr.send(file);
  });
}

/**
 * Typed client for one IT-ticket API surface. Admin and employee routes share response shapes, so
 * the same methods work against either base; the employee surface simply has no delete-ticket or
 * assignees route (the UI never calls those without admin/IT Support permissions).
 */
export function createTicketsApi(config: ApiConfig) {
  const base = config.apiBase.replace(/\/+$/, '');

  async function request<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { ...init, headers: { ...config.getHeaders(), ...(init?.headers || {}) } });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      const err = new Error(json?.error || `Request failed (${res.status})`) as Error & { status?: number };
      err.status = res.status;
      throw err;
    }
    return json.data as T;
  }

  function recordAttachment(
    ticketId: string,
    data: { fileName: string; fileUrl: string; fileSize?: number; mimeType?: string }
  ): Promise<ItTicketAttachment> {
    return request(`${base}/${ticketId}/attachments`, { method: 'POST', body: JSON.stringify(data) });
  }

  return {
    fetchTickets(filters: TicketFilters = {}, signal?: AbortSignal): Promise<ItTicket[]> {
      return request(`${base}${buildQuery(filters)}`, { signal });
    },

    /** `idOrKey` may be the uuid or the human key (`IT-12`) — deep links use the key. */
    fetchTicket(idOrKey: string): Promise<ItTicket> {
      return request(`${base}/${encodeURIComponent(idOrKey)}`);
    },

    createTicket(draft: Partial<TicketDraft> & { title: string }): Promise<ItTicket> {
      return request(base, {
        method: 'POST',
        body: JSON.stringify({
          title: draft.title,
          description: draft.description || undefined,
          status: draft.status,
          priority: draft.priority,
          type: draft.type,
          dueDate: draft.dueDate || null,
          // Name is resolved server-side from (id, role); non-managers' assignee/status are dropped.
          assigneeId: draft.assigneeId ?? null,
          assigneeRole: draft.assigneeRole ?? null,
        }),
      });
    },

    updateTicket(id: string, patch: TicketPatch): Promise<ItTicket> {
      return request(`${base}/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
    },

    deleteTicket(id: string): Promise<void> {
      return request(`${base}/${id}`, { method: 'DELETE' });
    },

    fetchComments(ticketId: string): Promise<ItTicketComment[]> {
      return request(`${base}/${ticketId}/comments`);
    },

    addComment(ticketId: string, body: string): Promise<ItTicketComment> {
      return request(`${base}/${ticketId}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
    },

    deleteComment(ticketId: string, commentId: string): Promise<void> {
      return request(`${base}/${ticketId}/comments/${commentId}`, { method: 'DELETE' });
    },

    fetchAttachments(ticketId: string): Promise<ItTicketAttachment[]> {
      return request(`${base}/${ticketId}/attachments`);
    },

    recordAttachment,

    deleteAttachment(ticketId: string, attachmentId: string): Promise<void> {
      return request(`${base}/${ticketId}/attachments/${attachmentId}`, { method: 'DELETE' });
    },

    /** Excel export data for the current filters (admin surface, managers only). */
    exportTickets(filters: TicketFilters = {}): Promise<ItTicketExport> {
      return request(`${base}/export${buildQuery(filters)}`);
    },

    fetchAssignees(): Promise<TicketAssignee[]> {
      return request(`${base}/assignees`);
    },

    /** Presign → PUT to S3 → record metadata. */
    async uploadTicketAttachment(ticketId: string, file: File, onProgress?: (pct: number) => void): Promise<ItTicketAttachment> {
      const sanitized = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const { uploadUrl, fileUrl } = await request<{ uploadUrl: string; fileUrl: string }>(config.presignUrl, {
        method: 'POST',
        body: JSON.stringify({ filename: sanitized, contentType: file.type || 'application/octet-stream' }),
      });
      await uploadWithProgress(uploadUrl, file, onProgress);
      return recordAttachment(ticketId, { fileName: file.name, fileUrl, fileSize: file.size, mimeType: file.type });
    },
  };
}

export type TicketsApi = ReturnType<typeof createTicketsApi>;

/** The API client for whichever surface (admin / employee) the nearest TicketsClientProvider sets. */
export function useTicketsApi(): TicketsApi {
  const client = useTicketsClient();
  return useMemo(() => createTicketsApi(client), [client]);
}
