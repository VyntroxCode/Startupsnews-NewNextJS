'use client';

import type { ReactNode } from 'react';

/** Cards across one row of the desktop grid, and the gap between them (page.tsx uses the same). */
const COLUMNS = 4;
const GAP = 18;
/** Seconds one card takes to cross its own width; the loop time grows with the number of cards. */
const SECONDS_PER_CARD = 9;

interface ReportsMarqueeProps {
  items: { key: string; node: ReactNode }[];
}

/**
 * The last row of the /dashboard/reports grid as a right-to-left marquee. The track holds two
 * copies of the row and slides by half its width (`fi-ticker`), so the loop has no seam. Each card
 * is sized in container units to match a grid column exactly. Pauses while hovered or focused so a
 * card can be clicked; stands still for readers who ask for reduced motion.
 */
export default function ReportsMarquee({ items }: ReportsMarqueeProps) {
  // A short row is repeated until one copy fills the visible width, or the loop would show a gap.
  const row = Array.from({ length: Math.ceil(COLUMNS / items.length) }, () => items).flat();

  return (
    // The padding (cancelled by the margins) leaves room for the cards' hover lift and shadow,
    // which overflow-hidden would otherwise cut off.
    <div className="@container -mb-6 overflow-hidden pb-6 pt-1" style={{ marginTop: GAP - 4 }}>
      <div
        className="flex w-max animate-fi-ticker hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ animationDuration: `${row.length * SECONDS_PER_CARD}s` }}
      >
        {[...row, ...row].map((item, i) => (
          // The gap is padding inside the slot, so both halves of the track are exactly equal.
          <div
            key={`${item.key}-${i}`}
            className="box-border shrink-0"
            style={{ width: `calc((100cqw - ${(COLUMNS - 1) * GAP}px) / ${COLUMNS} + ${GAP}px)`, paddingRight: GAP }}
          >
            {item.node}
          </div>
        ))}
      </div>
    </div>
  );
}
