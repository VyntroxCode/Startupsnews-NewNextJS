'use client';

import { motion, useReducedMotion } from 'motion/react';

interface Cat { id: number; name: string; slug: string; color: string; }

export default function CategoryCard({ cat, index }: { cat: Cat; index: number }) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: reducedMotion ? 0 : Math.min(index * 0.045, 0.4), ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '13px 14px',
        borderRadius: 13,
        border: '1.5px solid #e5e7eb',
        background: '#fff',
        boxSizing: 'border-box',
        boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
      }}
    >
      <span
        style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${cat.color}18`, color: cat.color,
          fontWeight: 800, fontSize: '0.8125rem',
        }}
      >
        {cat.name.charAt(0).toUpperCase()}
      </span>

      <span style={{ minWidth: 0, flex: 1, fontSize: '0.875rem', fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {cat.name}
      </span>
    </motion.div>
  );
}
