'use client';

import { motion, useReducedMotion } from 'motion/react';
import SectionDivider from './SectionDivider';

interface Founder { name?: string; role?: string; linkedin_url?: string; }
interface FundingRound { round_type?: string; amount?: string; lead_investor?: string; round_date?: string; }

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: value ? '#0f172a' : '#cbd5e1' }}>{value || 'Not set'}</p>
    </div>
  );
}

export default function CategoryDetailsCard({
  isMobile, title, details, founders, fundingRounds,
}: {
  isMobile: boolean;
  title: string;
  details: [string, string | number][];
  founders: Founder[];
  fundingRounds: FundingRound[];
}) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}
    >
      <div style={{ padding: isMobile ? '1.25rem 1.25rem' : '1.5rem 2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: '#0f172a' }}>{title} details</h2>
      </div>
      <SectionDivider />
      {details.length > 0 && (
        <div style={{ padding: isMobile ? '1.25rem' : '1.5rem 2rem', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.25rem' }}>
          {details.map(([k, v]) => <DetailField key={k} label={k} value={v} />)}
        </div>
      )}

      {founders.length > 0 && (
        <div style={{ padding: isMobile ? '0 1.25rem 1.25rem' : '0 2rem 1.5rem' }}>
          <p style={{ margin: '0 0 10px', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Founders</p>
          {founders.map((f, i) => (
            <p key={i} style={{ margin: '0 0 6px', fontSize: '0.875rem', color: '#0f172a' }}>
              <strong>{f.name}</strong>{f.role ? ` · ${f.role}` : ''}
            </p>
          ))}
        </div>
      )}

      {fundingRounds.length > 0 && (
        <div style={{ padding: isMobile ? '0 1.25rem 1.25rem' : '0 2rem 1.5rem' }}>
          <p style={{ margin: '0 0 10px', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Funding history</p>
          {fundingRounds.map((r, i) => (
            <p key={i} style={{ margin: '0 0 6px', fontSize: '0.875rem', color: '#0f172a' }}>
              <strong>{r.round_type || 'Round'}</strong>{r.amount ? ` · ${r.amount}` : ''}{r.lead_investor ? ` · ${r.lead_investor}` : ''}
            </p>
          ))}
        </div>
      )}
    </motion.div>
  );
}
