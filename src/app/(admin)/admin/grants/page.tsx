'use client';

import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import GrantsPage from '@/components/admin/grants/GrantsPage';

/** /admin/grants — IncubatX startup dossiers (super admin only; see ADMIN_ONLY_PATHS). */
export default function AdminGrantsPage() {
  return (
    <AdminErrorBoundary>
      <GrantsPage />
    </AdminErrorBoundary>
  );
}
