import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import { noteCls } from './ui';

const SLOTS = [
  { initial: 'A', color: 'bg-[#E91E8C]', title: 'Your brand here', sub: 'Reach founders and investors' },
  { initial: 'B', color: 'bg-[#00B140]', title: 'Your brand here', sub: 'Sponsored slot — funding readers' },
  { initial: 'C', color: 'bg-[#1E2A5E]', title: 'Your brand here', sub: 'Advertise with StartupNews.fyi' },
];

/**
 * Preview .sponsored-strip — three sponsor cards. Real ad slots need an ad network or direct deals,
 * so for now each card is an "advertise here" slot (no third-party brand names).
 */
export default function SponsoredStrip() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {SLOTS.map((s, i) => (
          <Link
            key={i}
            href="/advertise-with-us"
            className="relative flex items-center gap-3 rounded-xl border border-solid border-fi-line bg-fi-surface px-3.5 py-3 text-fi-ink no-underline shadow-fi visited:text-fi-ink hover:border-fi-ink-faint"
          >
            <span className="absolute right-[9px] top-1.5 text-[8.5px] font-bold uppercase tracking-[0.04em] text-fi-ink-faint">Sponsored</span>
            <span className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] text-[16px] font-bold text-white ${s.color}`}>
              <Megaphone size={17} aria-hidden />
            </span>
            <span>
              <span className="block text-[12.5px] font-bold">{s.title}</span>
              <span className="mt-px block text-[11px] text-fi-ink-faint">{s.sub}</span>
            </span>
          </Link>
        ))}
      </div>
      <div className={noteCls}><span>⚠️</span><div><b className="text-[#6B4308]">Coming soon:</b> sponsor slots. Want one? Each card links to Advertise with us.</div></div>
    </div>
  );
}
