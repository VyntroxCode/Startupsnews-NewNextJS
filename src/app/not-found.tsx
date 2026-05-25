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
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h1 style={{ fontSize: '72px', fontWeight: 700, margin: 0, color: '#111' }}>404</h1>
      <p style={{ fontSize: '20px', color: '#555', margin: '16px 0 32px' }}>
        Page not found
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '12px 28px',
          background: '#111',
          color: '#fff',
          borderRadius: '4px',
          textDecoration: 'none',
          fontSize: '16px',
        }}
      >
        Go to Homepage
      </Link>
    </div>
  );
}
