'use client';

import PolicySummaryWidget from '@/components/admin/PolicySummaryWidget';
import { getEmployeeAuthHeaders } from '@/lib/employee-auth';

export default function EmployeeRulesPolicyPage() {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Rules &amp; Policy
        </h2>
        <p style={{ color: '#64748b', fontSize: '1rem', margin: '0.5rem 0 0' }}>
          The shift, regularization, and leave policy HR has set for you.
        </p>
      </div>

      <PolicySummaryWidget apiBase="/api/employee/attendance" getHeaders={getEmployeeAuthHeaders} />
    </div>
  );
}
