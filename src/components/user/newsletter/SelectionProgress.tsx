'use client';

import { motion } from 'motion/react';

export default function SelectionProgress({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {Array.from({ length: max }).map((_, i) => {
          const filled = count > i;
          return (
            <motion.span
              key={i}
              animate={{
                backgroundColor: filled ? '#ee1761' : '#e2e8f0',
                scale: filled ? 1 : 0.85,
              }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: 9, height: 9, borderRadius: '50%', display: 'inline-block' }}
            />
          );
        })}
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: count > 0 ? '#ee1761' : '#94a3b8', whiteSpace: 'nowrap' }}>
        {count} / {max} selected
      </span>
    </div>
  );
}
