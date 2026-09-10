'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ArrowRightIcon } from './icons';

export default function InfoItem({
  label,
  value,
  icon,
  index = 0,
  direction = 'left',
  emptyText = 'Not added yet',
  onAddClick,
}: {
  label: string;
  value?: string | number | null;
  icon: React.ReactNode;
  index?: number;
  direction?: 'left' | 'right';
  emptyText?: string;
  onAddClick?: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const isEmpty = value === undefined || value === null || value === '';
  const clickable = isEmpty && !!onAddClick;
  const fromX = direction === 'left' ? -46 : 46;
  // Spread the whole column's reveal across ~2-3s (per-row delay) rather than a quick
  // fraction-of-a-second stagger, per an explicit ask for a slower, more deliberate entrance.
  const delay = 0.15 + index * 0.55;

  return (
    <motion.div
      className="up-info-item"
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onAddClick : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAddClick?.(); } } : undefined}
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: fromX }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.7, delay: reducedMotion ? 0 : delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '10px 12px', borderRadius: 10, cursor: clickable ? 'pointer' : 'default',
      }}
    >
      <span className="up-info-icon">{icon}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p className="up-info-label">{label}</p>
        {isEmpty ? (
          <p className="up-info-value up-info-empty">
            {emptyText}
            {clickable && <span className="up-info-add">Add<ArrowRightIcon /></span>}
          </p>
        ) : (
          <p className="up-info-value" title={String(value)}>{value}</p>
        )}
      </div>

      <style jsx>{`
        .up-info-item { transition: background 0.2s ease; }
        .up-info-item:hover, .up-info-item:focus-visible { background: #f8fafc; outline: none; }
        .up-info-item:focus-visible { box-shadow: 0 0 0 2px #fde8f0; }
        .up-info-icon {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
          background: #f8fafc; color: #94a3b8; border: 1px solid #f1f5f9;
          transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        }
        .up-info-item:hover .up-info-icon { color: #ee1761; background: #fde8f0; border-color: #fbcfe0; transform: translateX(1px); }
        .up-info-label {
          margin: 0 0 4px; font-size: 0.75rem; font-weight: 700; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 0.05em;
        }
        .up-info-value {
          margin: 0; font-size: 1.0625rem; font-weight: 700; color: #0f172a;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .up-info-empty { color: #cbd5e1; font-weight: 500; display: flex; align-items: center; gap: 6px; white-space: normal; }
        .up-info-add {
          display: inline-flex; align-items: center; gap: 3px; font-size: 0.75rem; font-weight: 700;
          color: #ee1761; opacity: 0; transform: translateX(-4px);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .up-info-item:hover .up-info-add, .up-info-item:focus-visible .up-info-add { opacity: 1; transform: translateX(0); }
      `}</style>
    </motion.div>
  );
}
