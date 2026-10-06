/**
 * Shared furniture for the funding dashboard. Two visual tiers:
 *   primary    — the chart a section is about: shadowed card, roomy padding.
 *   supporting — rankings/tables beside it: flat card, tighter padding, smaller title.
 * Literal class strings so the isolated Tailwind sheet (@source components/user/funding) sees them.
 */

export const primaryCard = 'box-border min-w-0 rounded-[14px] border border-solid border-fi-line bg-fi-surface p-4 shadow-fi sm:p-6';
export const supportCard = 'box-border min-w-0 rounded-[12px] border border-solid border-fi-line bg-fi-surface p-4';
export const supportTitle = 'm-0 font-(family-name:--font-fi-space) text-[13.5px] font-semibold text-fi-ink';
export const supportSub = 'm-0 mt-0.5 text-[11.5px] text-fi-ink-faint';
export const mono = 'font-(family-name:--font-fi-plex)';

/** A story section: eyebrow + h2 + one-line question, then its cards. */
export function Section({
  id,
  eyebrow,
  title,
  sub,
  right,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  sub: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-h`} data-reveal className="mt-10 sm:mt-12">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-fi-primary">{eyebrow}</div>
          <h2 id={`${id}-h`} className="m-0 mt-1 font-(family-name:--font-fi-space) text-[19px] font-bold tracking-[-0.015em] text-fi-ink sm:text-[22px]">{title}</h2>
          <p className="m-0 mt-1 max-w-[640px] text-[12.5px] leading-normal text-fi-ink-soft">{sub}</p>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

/** A chart with an accessible text summary (the chart itself is aria-hidden canvas/SVG). */
export function ChartFigure({ label, summary, height, className = '', children }: { label: string; summary: string; height: number | string; className?: string; children: React.ReactNode }) {
  return (
    <figure aria-label={label} className={`relative m-0 w-full min-w-0 ${className}`} style={{ height }}>
      <div aria-hidden className="h-full w-full">{children}</div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
}

export function ChartSkeleton({ height }: { height: number | string }) {
  return <div className="w-full animate-pulse rounded-[10px] bg-fi-bg motion-reduce:animate-none" style={{ height }} aria-hidden />;
}

export function EmptyNote({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full min-h-[120px] items-center justify-center px-4 text-center text-[12.5px] text-fi-ink-faint">{children}</div>;
}

/** Floating tooltip used by the SVG (Recharts) charts so it matches AG's white card. */
export function FloatTip({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 box-border min-w-[160px] max-w-[260px] rounded-lg border border-solid border-fi-line bg-fi-surface px-3 py-2 text-[12px] text-fi-ink shadow-[0_8px_24px_rgba(21,19,26,0.12)]"
      style={{ left: x, top: y, transform: 'translate(-50%, calc(-100% - 12px))' }}
    >
      {children}
    </div>
  );
}

export function TipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 leading-[1.6]">
      <span className="text-fi-ink-soft">{label}</span>
      <b className={`${mono} text-[11.5px] font-semibold`}>{value}</b>
    </div>
  );
}

export function pct(n: number | null | undefined, digits = 0): string {
  return n === null || n === undefined || Number.isNaN(n) ? '—' : `${n.toFixed(digits)}%`;
}
