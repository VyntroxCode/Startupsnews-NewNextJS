'use client';

import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import MyLeadsPage from '@/components/employee/my-leads/MyLeadsPage';
import { getAuthHeaders } from '@/lib/admin-auth';

/** /admin/my-leads — the same My Leads page as /employee/leads, for Event / Publisher Admins, who
 * log in to the admin panel rather than the employee panel. */
export default function AdminMyLeadsPage() {
  return (
    <AdminErrorBoundary>
      <div className="mt-4">
        <MyLeadsPage endpoint="/api/admin/my-leads" getHeaders={getAuthHeaders} />
      </div>
    </AdminErrorBoundary>
  );
}
