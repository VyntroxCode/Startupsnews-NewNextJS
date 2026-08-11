'use client';

import { AdminErrorBoundary } from '@/components/admin/ErrorBoundary';

interface AdminIframeToolProps {
  /** URL serving the tool's own index.html — see /api/admin-tools/[tool]/[file] */
  src: string;
  title: string;
}

// Shared wrapper for standalone html/css/js admin tools (Sales Tracker, HR Tool, ...) whose
// source lives under src/modules/admin-tools/<name> and is served via the
// /api/admin-tools/<tool>/<file> route handler (Next can't serve files under src/ directly —
// only /public is served verbatim). Each tool keeps its own styles, kept separate from the
// app's until folded into globals.css later, and is embedded here via iframe.
export default function AdminIframeTool({ src, title }: AdminIframeToolProps) {
  return (
    <AdminErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
        <div style={{ flex: 1, background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <iframe
            src={src}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
            title={title}
          />
        </div>
      </div>
    </AdminErrorBoundary>
  );
}
