'use client';

import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import PayslipsWidget from '@/components/admin/PayslipsWidget';
import { getAuthHeaders } from '@/lib/admin-auth';

export default function AdminMyPayslipsPage() {
  return (
    <AdminErrorBoundary>
      <div>
        <h2 className="m-0 mt-4 text-4xl font-bold tracking-tight text-slate-900">My Payslips</h2>
        <p className="mb-6 mt-4 text-base text-slate-500">Your final salary slips. A month appears here once HR freezes that month&apos;s payroll.</p>
        <PayslipsWidget apiBase="/api/admin/my-payslips" getHeaders={getAuthHeaders} />
      </div>
    </AdminErrorBoundary>
  );
}
