'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error?.message, error?.digest, error?.stack);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', color: '#b91c1c', marginBottom: '1rem' }}>
            Internal Server Error
          </h1>
          {isDev && error?.message && (
            <pre
              style={{
                maxWidth: '100%',
                overflow: 'auto',
                padding: '1rem',
                background: '#fef2f2',
                borderRadius: '8px',
                fontSize: '0.875rem',
                textAlign: 'left',
                marginBottom: '1rem',
              }}
            >
              {error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              background: '#ed8936',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
