'use client';

import { motion, useReducedMotion } from 'motion/react';

export default function ProfileCompletion({ percent }: { percent: number }) {
  const reducedMotion = useReducedMotion();
  const complete = percent >= 100;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155' }}>Profile completion</span>
        <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: complete ? '#16a34a' : '#ee1761' }}>{percent}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 5, background: '#f1f5f9', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: reducedMotion ? `${percent}%` : '0%' }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: reducedMotion ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            height: '100%', borderRadius: 5,
            background: complete ? '#16a34a' : 'linear-gradient(90deg, #ee1761, #f97316)',
          }}
        />
      </div>
      <p style={{ margin: '8px 0 0', fontSize: '0.8125rem', color: '#94a3b8' }}>
        {complete ? 'Your profile is fully set up.' : 'Complete your profile to help people discover you.'}
      </p>
    </div>
  );
}
