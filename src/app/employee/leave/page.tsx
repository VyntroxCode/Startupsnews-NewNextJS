'use client';

import LeaveWidget from '@/components/admin/LeaveWidget';
import { getEmployeeAuthHeaders } from '@/lib/employee-auth';

export default function EmployeeLeavePage() {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Leave
        </h2>
        <p style={{ color: '#64748b', fontSize: '1rem', margin: '0.5rem 0 0' }}>
          Apply for leave in advance and track your requests.
        </p>
      </div>

      <LeaveWidget apiBase="/api/employee/leave-requests" getHeaders={getEmployeeAuthHeaders} />
    </div>
  );
}
