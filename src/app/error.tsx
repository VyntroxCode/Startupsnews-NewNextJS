'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error?.message, error?.digest, error?.stack);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';
  const message = error?.message || 'Something went wrong';

  return (
    <div
      style={{
        minHeight: '40vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: '1.5rem', color: '#b91c1c', marginBottom: '1rem' }}>
        Internal Server Error
      </h1>
      {isDev && (
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
          {message}
        </pre>
      )}
      <p style={{ color: '#64748b', marginBottom: '1rem' }}>
        {isDev
          ? 'Check the terminal or browser console for the full error.'
          : 'Please try again later.'}
      </p>
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
  );
}
