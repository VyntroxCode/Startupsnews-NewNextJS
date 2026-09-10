'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { MailIcon } from './icons';

export default function NewsletterHeader({ isMobile }: { isMobile: boolean }) {
  const reducedMotion = useReducedMotion();

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <motion.div
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12, fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        <Link href="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none' }}>Dashboard</Link>
        <span>/</span>
        <span style={{ color: '#64748b', fontWeight: 500 }}>Newsletter</span>
      </motion.div>

      <motion.span
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, delay: reducedMotion ? 0 : 0.06, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: '#fde8f0', color: '#ee1761', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}
      >
        <MailIcon width={11} height={11} />
        Morning Signal
      </motion.span>

      <motion.h1
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
        style={{ fontSize: isMobile ? '1.5rem' : '1.875rem', fontWeight: 800, color: '#0f172a', margin: '0 0 10px', letterSpacing: '-0.02em' }}
      >
        Newsletter Preferences
      </motion.h1>

      <motion.p
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: reducedMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
        style={{ color: '#64748b', fontSize: '0.9rem', margin: 0, lineHeight: 1.6 }}
      >
        Pick up to <strong style={{ color: '#0f172a' }}>3 newsletter categories</strong> and your Morning Signal briefing will be curated just for you.
      </motion.p>
    </div>
  );
}
