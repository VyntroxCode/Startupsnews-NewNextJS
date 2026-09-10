'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';

export default function ProfileHeader({ isMobile }: { isMobile: boolean }) {
  const reducedMotion = useReducedMotion();

  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <motion.div
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 18, fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        <Link href="/dashboard" style={{ color: '#94a3b8', textDecoration: 'none' }}>Dashboard</Link>
        <span>/</span>
        <span style={{ color: '#64748b', fontWeight: 500 }}>Profile</span>
      </motion.div>

      <motion.h1
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: reducedMotion ? 0 : 0.05, ease: [0.22, 1, 0.36, 1] }}
        style={{ fontSize: isMobile ? '1.75rem' : '2.375rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.03em' }}
      >
        My Profile
      </motion.h1>

      <motion.p
        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.15, ease: [0.22, 1, 0.36, 1] }}
        style={{ color: '#64748b', fontSize: '0.9375rem', margin: 0 }}
      >
        View &amp; update your profile details.
      </motion.p>
    </div>
  );
}
