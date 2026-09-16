'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { getAdminUser, getAuthHeaders } from '@/lib/admin-auth';
import type { TicketViewMode } from './types';

/** The signed-in person as the ticket UI needs them. Identity is the (id, role) pair. */
export interface TicketViewer {
  id: number;
  role: string;
  name: string;
}

/**
 * Everything that differs between the two places the IT Tickets UI is mounted:
 * the admin panel (`/admin/it-tickets`, admin JWT) and the employee portal (`/employee/it-tickets`,
 * isolated employee token). The components never import an auth helper or hard-code an API path
 * themselves — they read this config.
 */
export interface TicketsClientConfig {
  variant: 'admin' | 'employee';
  /** Base of the ticket API, e.g. `/api/admin/it-tickets`. */
  apiBase: string;
  /** Presign route used for attachment uploads. */
  presignUrl: string;
  getHeaders: () => HeadersInit;
  /** Synchronous for admin (sessionStorage) so permissions are right on first render; async for
   * employees (GET /me), since their session doesn't store a credential id. */
  loadViewer: () => TicketViewer | null | Promise<TicketViewer | null>;
  /** Page path used for share links (`?ticket=IT-12`). */
  pagePath: string;
  /** sessionStorage key remembering Board vs List. */
  viewStorageKey: string;
  defaultView: TicketViewMode;
}

export const ADMIN_TICKETS_CONFIG: TicketsClientConfig = {
  variant: 'admin',
  apiBase: '/api/admin/it-tickets',
  presignUrl: '/api/admin/presign',
  getHeaders: getAuthHeaders,
  loadViewer: () => {
    const user = getAdminUser();
    return user ? { id: user.id, role: user.role, name: user.name } : null;
  },
  pagePath: '/admin/it-tickets',
  viewStorageKey: 'it-tickets:view',
  defaultView: 'board',
};

const TicketsClientContext = createContext<TicketsClientConfig>(ADMIN_TICKETS_CONFIG);

/** Pass a module-level constant as `config` — its identity keys the memoised API client. */
export function TicketsClientProvider({ config, children }: { config: TicketsClientConfig; children: ReactNode }) {
  return <TicketsClientContext.Provider value={config}>{children}</TicketsClientContext.Provider>;
}

export function useTicketsClient(): TicketsClientConfig {
  return useContext(TicketsClientContext);
}
