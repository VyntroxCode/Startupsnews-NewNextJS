'use client';

import { useEffect } from 'react';
import { getEmployeeUser } from '@/lib/employee-auth';
import { canEmployeeUseContent } from '@/modules/hr-credentials/domain/content-access';
import { clearAllAdminApiCache } from '@/hooks/useAdminData';

const ADMIN_DATA_UPDATED_EVENT = 'admin:data-updated';

/** The admin panel's Posts / Reports / Brand Stories screens, mounted in the employee portal for the
 * Employee IDs in CONTENT_EMPLOYEE_CODES, with full access. The API re-checks the allow-list
 * (requireContentAccess), so this guard only keeps others from seeing an empty shell. */
export default function EmployeeContentLayout({ children }: { children: React.ReactNode }) {
  const allowed = canEmployeeUseContent(getEmployeeUser()?.employeeCode);

  // The admin layout does this for these screens in the admin panel: after a successful write, drop
  // the cached lists and tell any mounted list to refetch. Uploads and Content Studio's read-only
  // POSTs are left out, as they are there.
  useEffect(() => {
    if (!allowed) return;
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
      const isWrite = method !== 'GET' && url.includes('/api/admin/') && !url.includes('/api/admin/presign') && !url.includes('/api/admin/content-studio');
      if (response.ok && isWrite) {
        clearAllAdminApiCache();
        window.dispatchEvent(new CustomEvent(ADMIN_DATA_UPDATED_EVENT, { detail: { method, url, timestamp: Date.now() } }));
      }
      return response;
    };
    return () => { window.fetch = originalFetch; };
  }, [allowed]);

  if (!allowed) {
    return <div className="rounded-xl border border-solid border-slate-200 bg-white p-6 text-sm text-slate-600">You do not have access to this section.</div>;
  }
  return <>{children}</>;
}
