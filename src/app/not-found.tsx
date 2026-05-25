import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '404 — Page Not Found',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function NotFound() {
  return (
    <div style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '80px 20px',
      background: '#fff',
    }}>

      <p style={{
        fontSize: 'clamp(100px, 20vw, 200px)',
        fontWeight: 900,
        lineHeight: 1,
        color: '#f0f0f0',
        margin: '0 0 -16px',
        letterSpacing: '-4px',
        userSelect: 'none',
      }}>
        404
      </p>

      <div style={{ width: 48, height: 3, background: '#ee1761', margin: '0 auto 24px' }} />

      <h1 style={{ fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, color: '#111', margin: '0 0 12px' }}>
        Page not found
      </h1>

      <p style={{ fontSize: '15px', color: '#777', maxWidth: 360, lineHeight: 1.7, margin: '0 0 32px' }}>
        This page doesn&apos;t exist or may have been removed.
      </p>

      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '12px 32px',
          background: '#111',
          color: '#fff',
          borderRadius: '4px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '0.3px',
        }}
      >
        Go to Homepage
      </Link>

    </div>
  );
}
