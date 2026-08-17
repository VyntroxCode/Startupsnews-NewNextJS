'use client';

import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import PolicySummaryWidget from '@/components/admin/PolicySummaryWidget';

export default function RulesPolicyPage() {
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
            Rules &amp; Policy
          </h2>
          <p style={{
            color: '#64748b',
            fontSize: '1rem',
            margin: 0,
            marginTop: '1rem',
          }}>
            The shift, regularization, and leave policy HR has set for you.
          </p>
        </div>

        <PolicySummaryWidget />
      </div>
    </AdminErrorBoundary>
  );
}
