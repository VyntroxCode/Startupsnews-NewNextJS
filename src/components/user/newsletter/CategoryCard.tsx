'use client';

import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { CheckIcon } from './icons';

interface Cat { id: number; name: string; slug: string; color: string; }

export default function CategoryCard({
  cat, isSelected, disabled, index, onToggle,
}: {
  cat: Cat;
  isSelected: boolean;
  disabled: boolean;
  index: number;
  onToggle: () => void;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={isSelected}
      aria-label={cat.name}
      disabled={disabled}
      onClick={onToggle}
      initial={reducedMotion ? { opacity: disabled ? 0.45 : 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: disabled ? 0.45 : 1, y: 0 }}
      transition={{
        y: { duration: 0.35, delay: reducedMotion ? 0 : Math.min(index * 0.045, 0.4), ease: [0.22, 1, 0.36, 1] },
        opacity: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
      }}
      whileHover={disabled || reducedMotion ? undefined : { y: -2 }}
      whileTap={disabled || reducedMotion ? undefined : { scale: 0.98 }}
      className="nl-cat-card"
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '13px 14px',
        borderRadius: 13,
        border: isSelected ? `1.5px solid ${cat.color}` : '1.5px solid #e5e7eb',
        background: isSelected ? `${cat.color}0f` : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        width: '100%',
        boxSizing: 'border-box',
        boxShadow: isSelected ? `0 2px 10px ${cat.color}22` : '0 1px 2px rgba(15,23,42,0.03)',
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

      <span style={{ minWidth: 0, flex: 1, fontSize: '0.875rem', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#0f172a' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {cat.name}
      </span>

      <AnimatePresence>
        {isSelected && (
          <motion.span
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{
              width: 19, height: 19, borderRadius: '50%', flexShrink: 0,
              background: cat.color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <CheckIcon width={11} height={11} />
          </motion.span>
        )}
      </AnimatePresence>

      <style jsx>{`
        .nl-cat-card { transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease; }
        .nl-cat-card:not(:disabled):hover { box-shadow: 0 6px 16px rgba(15,23,42,0.08); }
        .nl-cat-card:focus-visible { outline: none; box-shadow: 0 0 0 3px ${cat.color}33; }
      `}</style>
    </motion.button>
  );
}
