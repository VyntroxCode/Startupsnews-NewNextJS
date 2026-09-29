'use client';

import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import ExitWidget from '@/components/offboarding/ExitWidget';
import { getAuthHeaders } from '@/lib/admin-auth';

export default function AdminMyExitPage() {
  return (
    <AdminErrorBoundary>
      <div>
        <h2 className="m-0 mt-4 text-4xl font-bold tracking-tight text-slate-900">Resignation</h2>
        <p className="mb-0 mt-4 text-base text-slate-500">Submit your resignation and follow it through to your last day.</p>
        <ExitWidget apiBase="/api/admin/my-exit" getHeaders={getAuthHeaders} />
      </div>
    </AdminErrorBoundary>
  );
}
