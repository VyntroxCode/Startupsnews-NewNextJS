'use client';

import { motion, useReducedMotion } from 'motion/react';
import CategoryCard from './CategoryCard';
import CategorySkeleton from './CategorySkeleton';
import { AlertIcon, MailIcon, RefreshIcon } from './icons';

interface NLCategory { id: number; name: string; slug: string; color: string; }

export default function NewsletterCard({
  isMobile,
  categories,
  categoriesLoading,
  categoriesError,
  onRetryCategories,
}: {
  isMobile: boolean;
  categories: NLCategory[];
  categoriesLoading: boolean;
  categoriesError: boolean;
  onRetryCategories: () => void;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: reducedMotion ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}
    >
      {/* Card header */}
      <div style={{ padding: isMobile ? '1.125rem 1.25rem' : '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg, #fde8f0, #fff0f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid #fecdd3' }}>
            <MailIcon width={18} height={18} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Newsletter Categories</h2>
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.78rem' }}>All categories covered by the Morning Signal</p>
          </div>
        </div>
        {!categoriesLoading && !categoriesError && (
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', borderRadius: 999, padding: '4px 10px' }}>
            {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </span>
        )}
      </div>

      <div style={{ padding: isMobile ? '1.125rem 1.25rem' : '1.375rem 1.5rem' }}>
        {categoriesError ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '2.5rem 1rem' }}>
            <span style={{ color: '#cbd5e1' }}><AlertIcon /></span>
            <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#334155' }}>Couldn&apos;t load categories</p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8' }}>Please try again.</p>
            <button
              type="button"
              onClick={onRetryCategories}
              className="nl-retry-btn"
              style={{
                marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff',
                color: '#374151', fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <RefreshIcon /> Try again
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: isMobile ? 10 : 12,
            }}
          >
            {categoriesLoading ? (
              <CategorySkeleton count={6} />
            ) : (
              categories.map((cat, i) => <CategoryCard key={cat.slug} cat={cat} index={i} />)
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .nl-retry-btn { transition: border-color 0.2s ease, color 0.2s ease; }
        .nl-retry-btn:hover { border-color: #cbd5e1; color: #0f172a; }
        .nl-retry-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px #fde8f0; }
      `}</style>
    </motion.div>
  );
}
