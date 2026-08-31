'use client';

import KycDocumentsWidget from '@/components/admin/KycDocumentsWidget';
import { getEmployeeAuthHeaders } from '@/lib/employee-auth';

export default function EmployeeDocumentsPage() {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
          Documents
        </h2>
        <p style={{ color: '#64748b', fontSize: '1rem', margin: '0.5rem 0 0' }}>
          Upload the documents your HR team has asked for. You can replace any of these anytime.
        </p>
      </div>

      <KycDocumentsWidget apiBase="/api/employee/kyc" getHeaders={getEmployeeAuthHeaders} presignEndpoint="/api/employee/documents/presign" />
    </div>
  );
}
