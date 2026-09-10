'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';

export default function UnsubscribeCard() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: '#fff8f8', borderRadius: 18, border: '1px solid #fde4e4', padding: '1.125rem' }}
    >
      <p style={{ margin: '0 0 4px', fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>Stop receiving emails?</p>
      <p style={{ margin: '0 0 12px', fontSize: '0.78rem', color: '#94a3b8', lineHeight: 1.5 }}>You can unsubscribe from Morning Signal at any time.</p>
      <Link
        href="/unsubscribe"
        className="nl-unsub-link"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 0', borderRadius: 8, background: '#fff', color: '#b42318', border: '1px solid #fecdd3', textDecoration: 'none', fontSize: '0.8125rem', fontWeight: 700 }}
      >
        Unsubscribe
      </Link>

      <style jsx>{`
        .nl-unsub-link { transition: background 0.2s ease, border-color 0.2s ease; }
        .nl-unsub-link:hover { background: #fff1f1; border-color: #fca5a5; }
        .nl-unsub-link:active { transform: scale(0.98); }
        .nl-unsub-link:focus-visible { outline: none; box-shadow: 0 0 0 3px #fee2e2; }
      `}</style>
    </motion.div>
  );
}
