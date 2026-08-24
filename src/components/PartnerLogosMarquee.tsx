"use client";

import { PartnerLogoTile } from "@/components/PartnerLogoTile";
import type { PartnerLogo } from "@/modules/inner-pages/domain/types";

/**
 * One continuously auto-scrolling logo row — the track's content is duplicated once so the
 * CSS animation can loop seamlessly (translateX by exactly -50%, i.e. one full copy's width,
 * then snap back to 0 with nothing visibly changing). `overflow: hidden` on the outer row means
 * there's no scrollable element here at all — no native scrollbar can ever appear, and nothing
 * for a mouse/touch drag to hijack; it's purely a decorative animated strip. Hovering the row
 * pauses the animation (same "settle down when the cursor's on it" courtesy as the /events
 * carousel), and it's disabled outright for prefers-reduced-motion (see globals.css).
 */
function MarqueeRow({ logos, direction }: { logos: PartnerLogo[]; direction: "left" | "right" }) {
  if (logos.length === 0) return null;
  const looped = [...logos, ...logos];
  // Roughly constant perceived speed regardless of how many logos are in the row.
  const durationSec = Math.max(18, logos.length * 3.5);

  return (
    <div className="partners-marquee-row">
      <div
        className={`partners-marquee-track partners-marquee-${direction}`}
        style={{ animationDuration: `${durationSec}s` }}
      >
        {looped.map((logo, i) => (
          <PartnerLogoTile key={`${logo.id}-${i}`} imageUrl={logo.imageUrl} linkUrl={logo.linkUrl} />
        ))}
      </div>
    </div>
  );
}

/**
 * Splits one category's logos into two counter-scrolling rows — first logo added goes to row
 * one, the second to row two, the third back to row one, and so on (plain index alternation),
 * so both rows stay roughly balanced no matter how many logos a category ends up with. Row one
 * flows rightward, row two leftward, for the "one row comes from the left, the other from the
 * right" effect.
 */
export function PartnerLogosMarquee({ logos }: { logos: PartnerLogo[] }) {
  if (logos.length === 0) return null;
  const rowA = logos.filter((_, i) => i % 2 === 0);
  const rowB = logos.filter((_, i) => i % 2 === 1);

  return (
    <div className="partners-marquee-group">
      <MarqueeRow logos={rowA} direction="right" />
      <MarqueeRow logos={rowB} direction="left" />
    </div>
  );
}
