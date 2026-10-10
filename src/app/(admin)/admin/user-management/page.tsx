'use client';

import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import FundingCardsPage from '@/components/admin/user-management/FundingCardsPage';

/** /admin/user-management — settings for the reader (user) panel; for now the Funding sponsor
 * cards (super admin only; see ADMIN_ONLY_PATHS). */
export default function AdminUserManagementPage() {
  return (
    <AdminErrorBoundary>
      <FundingCardsPage />
    </AdminErrorBoundary>
  );
}
