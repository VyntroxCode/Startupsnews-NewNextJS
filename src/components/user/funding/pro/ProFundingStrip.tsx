import { Sparkles } from 'lucide-react';

/** Shown in the top row until the sector names load (or if they fail to). */
const DATA_POINTS = ['Sectors', 'Stages', 'Cities', 'Investors', 'Lead Investors', 'Round Sizes', 'Business Models', 'Monthly Trends'];

/** Bottom row: the round stages the Funding section sorts deals into. */
const STAGES = ['Pre-Seed', 'Seed', 'Pre-Series A', 'Series A', 'Series B', 'Series C', 'Growth', 'Debt', 'Bridge'];

/** Repeats a short list until it is long enough to fill the row. */
function fill(items: string[], min = 12): string[] {
  const out: string[] = [];
  while (out.length < min) out.push(...items);
  return out;
}

/**
 * One sliding row of chips. The track holds the list twice and slides by half its own width, so
 * the loop has no seam; each chip carries its own right margin (not a flex gap) to keep the two
 * halves identical. Pauses while the mouse is on the strip; still under reduced motion.
 */
function ChipRow({ items, direction, chipCls }: { items: string[]; direction: 'ltr' | 'rtl'; chipCls: string }) {
  const list = fill(items);
  return (
    <div className="overflow-hidden">
      <div className={`flex w-max group-hover:[animation-play-state:paused] motion-reduce:animate-none ${direction === 'ltr' ? 'animate-ec-marquee-ltr' : 'animate-ec-marquee-rtl'}`}>
        {[...list, ...list].map((label, i) => (
          <span key={i} className={`mr-2 whitespace-nowrap rounded-full border border-solid px-3 py-1.5 text-[12.5px] font-semibold ${chipCls}`}>{label}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Bottom of the page, full width: a dark closing strip. Text on the left; on the right two rows of
 * chips slide in opposite directions: the sectors with funding this year (live, from the Funding
 * dashboard's own data) above the round stages.
 */
export default function ProFundingStrip({ sectors }: { sectors: string[] }) {
  return (
    <section
      aria-labelledby="pro-strip-h"
      data-pro="block"
      className="group relative box-border flex min-w-0 flex-col gap-5 overflow-hidden rounded-[20px] bg-fi-ink px-5 py-6 text-white shadow-[0_18px_44px_rgba(21,19,26,0.18)] sm:px-7 md:flex-row md:items-center md:gap-8 lg:col-span-2"
    >
      <span aria-hidden className="pointer-events-none absolute -left-16 -top-24 size-64 rounded-full bg-fi-primary/45 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-28 right-1/4 size-64 rounded-full bg-fi-ai/40 blur-3xl" />

      <div className="relative min-w-0 md:w-[44%] md:shrink-0">
        <span data-pro="item" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11.5px] font-bold tracking-[0.04em] text-white">
          <Sparkles size={13} aria-hidden /> Inside Funding
        </span>
        <h2 id="pro-strip-h" data-pro="item" className="m-0 mt-2.5 text-[20px] font-bold leading-snug tracking-[-0.01em] text-white sm:text-[23px]">
          Every Indian Startup Funding Round We Track, In One Place.
        </h2>
        <p data-pro="item" className="m-0 mt-1.5 max-w-[52ch] text-[13.5px] leading-relaxed text-white/70">
          Who raised, how much, at which stage and from which investors.
        </p>
      </div>

      {/* Decorative: the same names are reachable inside the Funding section. */}
      <div aria-hidden data-pro="item" className="relative flex min-w-0 flex-1 flex-col gap-2.5 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <ChipRow items={sectors.length ? sectors : DATA_POINTS} direction="rtl" chipCls="border-white/15 bg-white/10 text-white" />
        <ChipRow items={STAGES} direction="ltr" chipCls="border-fi-primary/40 bg-fi-primary/15 text-white/90" />
      </div>
    </section>
  );
}
