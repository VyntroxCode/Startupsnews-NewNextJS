'use client';

import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';
import DocumentsWidget from '@/components/admin/DocumentsWidget';
import KycDocumentsWidget from '@/components/admin/KycDocumentsWidget';

export default function DocumentsPage() {
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
            Documents
          </h2>
          <p style={{
            color: '#64748b',
            fontSize: '1rem',
            margin: 0,
            marginTop: '1rem',
          }}>
            Upload the documents your HR team has asked for. You can replace any of these anytime.
          </p>
        </div>

        <DocumentsWidget />
        <KycDocumentsWidget apiBase="/api/admin/kyc" presignEndpoint="/api/admin/presign" />
      </div>
    </AdminErrorBoundary>
  );
}
