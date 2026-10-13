'use client';

import { Suspense } from 'react';
import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import UserManagementPage from '@/components/admin/user-management/UserManagementPage';

/** /admin/user-management — settings for the reader (user) panel, split into Funding (sponsor
 * cards) and Reports sections (super admin only; see ADMIN_ONLY_PATHS). */
export default function AdminUserManagementPage() {
  return (
    <AdminErrorBoundary>
      {/* useSearchParams (opening ?section=) needs a Suspense boundary. */}
      <Suspense fallback={null}>
        <UserManagementPage />
      </Suspense>
    </AdminErrorBoundary>
  );
}
