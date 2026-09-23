'use client';

import { motion, useReducedMotion } from 'motion/react';
import { CalendarIcon, MailboxIcon, TargetIcon } from './icons';

const STEPS = [
  { icon: <CalendarIcon />, text: 'Your Morning Signal arrives daily at 8 AM in your timezone.' },
  { icon: <TargetIcon />, text: 'Pick up to 3 newsletter categories, only matching stories are included.' },
  { icon: <MailboxIcon />, text: 'Change your preferences anytime; it takes effect next send.' },
];

export default function HowItWorksCard() {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: '1.25rem', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}
    >
      <h3 style={{ margin: '0 0 14px', fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>How it works</h3>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {STEPS.map((item, i) => (
          <motion.div
            key={i}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: reducedMotion ? 0 : 0.4 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '10px 0',
              borderTop: i > 0 ? '1px solid #f1f5f9' : 'none',
            }}
          >
            <span style={{
              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
              background: '#fde8f0', color: '#ee1761',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {item.icon}
            </span>
            <p style={{ margin: '5px 0 0', fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5 }}>{item.text}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
