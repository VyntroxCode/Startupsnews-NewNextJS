import { Check, Crown, Infinity as InfinityIcon, LayoutDashboard, WalletCards } from 'lucide-react';

const HEADING = ['Unlock', 'The', 'Full', 'Funding', 'Picture.'];
const HEADING_ACCENT = ['Pay', 'Once,', 'Keep', 'It', 'For', 'Life.'];

const CHIPS = [
  { icon: InfinityIcon, label: 'Lifetime Access' },
  { icon: WalletCards, label: 'One-Time Payment' },
  { icon: LayoutDashboard, label: 'The Full Funding Section' },
];

/** Heights of the bars in the mini chart beside the membership card. */
const BARS = ['h-[36%]', 'h-[58%]', 'h-[44%]', 'h-[76%]', 'h-full'];

/** One heading word inside its own clipped box, so it can rise into view (see motion.ts). */
function Word({ children, className = '' }: { children: string; className?: string }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.14em] align-bottom">
      <span data-pro="word" className={`inline-block ${className}`}>{children}</span>
    </span>
  );
}

/**
 * Hero card: artwork on the left, heading and chips on the right. The artwork is drawn with
 * Tailwind + Lucide (a Pro membership card with two small cards around it) and stands in until a
 * real hero image is supplied.
 */
export default function ProHero({ memberName }: { memberName: string }) {
  return (
    <section
      aria-labelledby="pro-hero-h"
      data-pro="hero"
      className="relative box-border grid items-center gap-6 overflow-hidden rounded-[20px] border border-solid border-fi-primary-soft bg-linear-to-br from-fi-surface via-fi-primary-light to-fi-ai-light px-5 py-7 shadow-fi sm:px-8 sm:py-9 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)] md:gap-10"
    >
      {/* Decorative rings, behind everything. */}
      <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border border-solid border-fi-primary/10" />
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-44 rounded-full border border-solid border-fi-ai/10" />

      {/* Artwork */}
      <div aria-hidden data-pro="stage" className="relative mx-auto h-[196px] w-full max-w-[320px] [perspective:900px] sm:h-[224px] md:max-w-none">
        <div data-pro="visual" className="absolute inset-0 flex items-center justify-center">
          <div className="-rotate-3">
            <div
              data-pro="tilt"
              className="relative box-border flex h-[150px] w-[240px] flex-col justify-between overflow-hidden rounded-[18px] bg-linear-to-br from-fi-ink via-[#3B1030] to-fi-primary-dark p-4 text-white shadow-[0_24px_48px_rgba(168,15,62,0.32)] sm:h-[164px] sm:w-[264px]"
            >
              <span className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-white/10" />
              <span className="relative flex items-center justify-between">
                <span className="text-[12px] font-bold tracking-[0.02em] text-white/85">StartupNews.fyi</span>
                <span className="flex size-8 items-center justify-center rounded-[10px] bg-fi-gold text-white"><Crown size={16} /></span>
              </span>
              <span className="relative text-[30px] font-bold leading-none tracking-[0.18em]">PRO</span>
              <span className="relative flex items-end justify-between gap-3 text-[11px]">
                <span className="min-w-0">
                  <span className="block text-white/55">Member</span>
                  <span className="block truncate text-[12.5px] font-bold">{memberName}</span>
                </span>
                <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 font-semibold">Lifetime</span>
              </span>
            </div>
          </div>
        </div>

        <div data-pro="float" className="absolute right-0 top-0 sm:right-1">
          <div data-pro="drift" className="box-border w-[112px] rounded-[12px] border border-solid border-fi-line bg-fi-surface p-2.5 shadow-fi">
            <span className="block text-[10px] font-bold text-fi-ink-faint">Funding Over Time</span>
            <span className="mt-1.5 flex h-9 items-end gap-1.5">
              {BARS.map((h) => (
                <span key={h} data-pro="bar" className={`flex-1 rounded-t-[3px] bg-linear-to-t from-fi-primary to-fi-ai ${h}`} />
              ))}
            </span>
          </div>
        </div>
        <div data-pro="float" className="absolute bottom-0 left-0 sm:left-1">
          <div data-pro="drift" className="flex items-center gap-2 rounded-[12px] border border-solid border-fi-line bg-fi-surface px-2.5 py-2 shadow-fi">
            <span className="flex size-6 items-center justify-center rounded-full bg-fi-green-light text-fi-green"><Check size={14} strokeWidth={3} /></span>
            <span className="text-[11.5px] font-bold text-fi-ink">Every Deal, One Place</span>
          </div>
        </div>
      </div>

      {/* Text */}
      <div className="relative min-w-0">
        <span data-pro="hero-text" className="inline-flex items-center gap-1.5 rounded-full border border-solid border-fi-primary-soft bg-fi-surface px-3 py-1 text-[12px] font-bold tracking-[0.02em] text-fi-primary">
          <Crown size={13} aria-hidden /> StartupNews.fyi Pro
        </span>
        <h1 id="pro-hero-h" className="m-0 mt-3 text-[30px] font-bold leading-[1.08] tracking-[-0.02em] text-fi-ink sm:text-[40px] lg:text-[44px]">
          {HEADING.map((w) => <span key={w}><Word>{w}</Word>{' '}</span>)}
          <br className="hidden sm:block" />
          {HEADING_ACCENT.map((w) => <span key={w}><Word className="text-fi-primary">{w}</Word>{' '}</span>)}
        </h1>
        <p data-pro="hero-text" className="m-0 mt-3 max-w-[58ch] text-[15px] leading-relaxed text-fi-ink-soft sm:text-[16px]">
          Pro covers the whole Funding section of StartupNews.fyi: live numbers, every deal, market analysis and a 12-month outlook.
        </p>
        <ul className="m-0 mt-5 flex list-none flex-wrap gap-2 p-0">
          {CHIPS.map(({ icon: Icon, label }) => (
            <li key={label} data-pro="chip" className="inline-flex items-center gap-1.5 rounded-full border border-solid border-fi-line bg-fi-surface px-3 py-1.5 text-[12.5px] font-semibold text-fi-ink">
              <Icon size={14} aria-hidden className="text-fi-primary" /> {label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
