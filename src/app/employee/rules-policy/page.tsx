'use client';

import PolicySummaryWidget from '@/components/admin/PolicySummaryWidget';
import { getEmployeeAuthHeaders } from '@/lib/employee-auth';

export default function EmployeeRulesPolicyPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Admin Rules</h2>
        <p className="mt-2 text-base text-slate-500">The shift, attendance and regularization rules HR has set — this is what applies to you.</p>
      </div>

      <PolicySummaryWidget apiBase="/api/employee/attendance" getHeaders={getEmployeeAuthHeaders} />
    </div>
  );
}
