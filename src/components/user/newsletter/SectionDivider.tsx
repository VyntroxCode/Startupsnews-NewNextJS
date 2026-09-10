'use client';

import { motion, useReducedMotion } from 'motion/react';

/** Thin rule that draws itself left→right once on mount — separates the newsletter card's
 * category grid from its footer actions without a heavy hard border. */
export default function SectionDivider() {
  const reducedMotion = useReducedMotion();
  return (
    <div style={{ height: 1, background: '#f1f5f9', overflow: 'hidden' }}>
      <motion.div
        style={{ height: 1, background: 'linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)', transformOrigin: '0% 50%' }}
        initial={reducedMotion ? { scaleX: 1 } : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, delay: reducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
