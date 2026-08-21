'use client';

import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import LeaveWidget from '@/components/admin/LeaveWidget';

export default function LeavePage() {
  return (
    <AdminErrorBoundary>
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontSize: '2.25rem',
            fontWeight: '700',
            marginTop: '1rem',
            color: '#0f172a',
            letterSpacing: '-0.02em',
          }}>
            Leave
          </h2>
          <p style={{
            color: '#64748b',
            fontSize: '1rem',
            margin: 0,
            marginTop: '1rem',
          }}>
            Apply for leave in advance and track your requests.
          </p>
        </div>

        <LeaveWidget />
      </div>
    </AdminErrorBoundary>
  );
}
