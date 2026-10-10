'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import type { ReaderSponsorCard } from '@/modules/funding-sponsor-cards/domain/types';
import { fundingGet } from './api';

// Icon tile colours for cards saved without an image, by position.
const FALLBACK_COLORS = ['bg-[#E91E8C]', 'bg-[#00B140]', 'bg-[#1E2A5E]'];

/**
 * Sponsor cards at the top of the Funding Dashboard. The cards (up to 3) are the ones switched on
 * in Admin › User Management; each opens its own link in a new tab. With none switched on, or if
 * they fail to load, the row is not rendered at all.
 */
export default function SponsoredStrip() {
  const [cards, setCards] = useState<ReaderSponsorCard[]>([]);

  useEffect(() => {
    const ctrl = new AbortController();
    fundingGet<{ data: ReaderSponsorCard[] }>('/api/funding/sponsor-cards', ctrl.signal)
      .then((json) => setCards(Array.isArray(json.data) ? json.data : []))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 lg:flex-row">
      {cards.map((c, i) => (
        <a
          key={c.id}
          href={c.linkUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="relative flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-solid border-fi-line bg-fi-surface px-3.5 py-3 text-fi-ink no-underline shadow-fi visited:text-fi-ink hover:border-fi-ink-faint"
        >
          <span className="absolute right-[9px] top-1.5 text-[9.5px] font-semibold tracking-[0.01em] text-fi-ink-faint">Sponsored</span>
          {c.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.imageUrl} alt="" className="h-[46px] w-[46px] shrink-0 rounded-[10px] border border-solid border-fi-line bg-white object-contain" />
          ) : (
            <span className={`flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[10px] text-white ${FALLBACK_COLORS[i % FALLBACK_COLORS.length]}`}>
              <Megaphone size={20} aria-hidden />
            </span>
          )}
          <span className="min-w-0 pr-12">
            <span className="block text-[12.5px] font-bold">{c.title}</span>
            {c.subtitle && <span className="mt-px block text-[11px] text-fi-ink-faint">{c.subtitle}</span>}
          </span>
        </a>
      ))}
    </div>
  );
}
