'use client';

import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import PolicySummaryWidget from '@/components/admin/PolicySummaryWidget';

export default function RulesPolicyPage() {
  return (
    <AdminErrorBoundary>
      <div>
        <div className="mb-6 mt-4">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900">Admin Rules</h2>
          <p className="mt-4 text-base text-slate-500">The shift, attendance and regularization rules HR has set — this is what applies to you.</p>
        </div>

        <PolicySummaryWidget />
      </div>
    </AdminErrorBoundary>
  );
}
