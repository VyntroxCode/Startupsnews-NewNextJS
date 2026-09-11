import type { SVGProps } from "react";

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function DetailsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-4 4.2-6 7.5-6s6.1 2 7.5 6" />
    </svg>
  );
}

export function ContactPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.4" />
    </svg>
  );
}

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

export function RocketIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2.5c2.8 1.6 4.5 4.7 4.5 8.3 0 2-.5 3.8-1.4 5.4l-3.1 3.3-3.1-3.3C7.9 14.6 7.4 12.8 7.4 10.8c0-3.6 1.7-6.7 4.6-8.3z" />
      <circle cx="12" cy="10.5" r="1.9" />
      <path d="M8.3 15.8 5.5 17.4c-.5 1.7-.4 3.1-.4 3.1s1.4.1 3.1-.4l1.6-2.8" />
      <path d="M15.7 15.8 18.5 17.4c.5 1.7.4 3.1.4 3.1s-1.4.1-3.1-.4l-1.6-2.8" />
    </svg>
  );
}

/* ---------------------------------------------------------------------------
 * Redesign icon set: one mark per story card, per round stage and per discovery
 * surface. All stroked, all on the same 24-unit grid and the same 1.8 weight as
 * the originals above, so a row of them reads as one family at 22–30px.
 * ------------------------------------------------------------------------- */

const stroke: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/** Capital — stacked reserves rather than a currency glyph. */
export function CapitalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <ellipse cx="12" cy="6.4" rx="7" ry="2.6" />
      <path d="M5 6.4v5.2c0 1.44 3.13 2.6 7 2.6s7-1.16 7-2.6V6.4" />
      <path d="M5 11.6v5.2c0 1.44 3.13 2.6 7 2.6s7-1.16 7-2.6v-5.2" />
    </svg>
  );
}

/** Conviction — a mark of belief: a check inside a shield. */
export function ConvictionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M12 3l7 2.6v5.6c0 4.2-2.9 7.6-7 8.8-4.1-1.2-7-4.6-7-8.8V5.6L12 3z" />
      <path d="M8.8 11.8l2.2 2.2 4.2-4.4" />
    </svg>
  );
}

/** Growth — a rising line over an axis. */
export function GrowthIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M7.5 15.5l3.4-3.8 2.7 2.2L19 7.6" />
      <path d="M15.4 7.6H19v3.5" />
    </svg>
  );
}

/** Expansion — one square opening out into a wider field. */
export function ExpansionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <rect x="3.5" y="12.5" width="8" height="8" rx="1.4" />
      <path d="M12.5 3.5h8v8" />
      <path d="M20.5 3.5l-9 9" />
    </svg>
  );
}

/** Momentum — motion lines behind a leading edge. */
export function MomentumIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M3 8h8M3 12h11M3 16h6" />
      <path d="M15.5 6.5L21 12l-5.5 5.5" />
    </svg>
  );
}

/** Round stages — a seed, a sprout, a tree, a network, an institution. */
export function SeedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <circle cx="12" cy="14" r="5.5" />
      <path d="M12 8.5V4M12 4c1.9 0 3.4 1.2 3.4 2.6" />
    </svg>
  );
}

export function SproutIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M12 20v-7" />
      <path d="M12 13c0-3 2.2-5.2 5.4-5.2 0 3-2.2 5.2-5.4 5.2z" />
      <path d="M12 15.4C12 12.9 10 11 7.2 11c0 2.5 2 4.4 4.8 4.4z" />
    </svg>
  );
}

export function LadderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M4 20h4v-5H4zM10 20h4V10h-4zM16 20h4V5h-4z" />
    </svg>
  );
}

export function NetworkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <circle cx="12" cy="12" r="2.6" />
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <circle cx="5" cy="18" r="2" />
      <path d="M6.6 7.4l3.6 3.2M17.4 7.4l-3.6 3.2M17.4 16.6l-3.6-3.2M6.6 16.6l3.6-3.2" />
    </svg>
  );
}

export function InstitutionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M3.5 9.5L12 4.5l8.5 5" />
      <path d="M6 10.5v7M10 10.5v7M14 10.5v7M18 10.5v7" />
      <path d="M4 20.5h16" />
    </svg>
  );
}

export function HandshakeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M3 9.5l3.5-3 3.5 2.4 2-1.4 2 1.4 3.5-2.4 3.5 3" />
      <path d="M6.5 6.5v8.2l4 3.3 3-2.4 3 2 2.5-2.6V6.5" />
    </svg>
  );
}

export function GrantIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <circle cx="12" cy="9.5" r="5" />
      <path d="M9 14l-1.5 6L12 18l4.5 2-1.5-6" />
    </svg>
  );
}

export function CompassIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.2 8.8l-1.8 4.6-4.6 1.8 1.8-4.6z" />
    </svg>
  );
}

/** Discovery surfaces — mirrored from the press desk's set so a reader who has seen both pages
 * recognises the same channel marks. */
export function SiteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3z" />
    </svg>
  );
}

export function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M7.5 10.5V17M7.5 7.4v.1M11.4 17v-3.6a2 2 0 0 1 4 0V17" />
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="M17.2 6.9v.1" />
    </svg>
  );
}

export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M4 4l16 16M20 4L4 20" />
    </svg>
  );
}

export function NewsletterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6 8.5-6" />
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}

export function CommunityIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <circle cx="9" cy="9" r="3.2" />
      <circle cx="17" cy="10.5" r="2.4" />
      <path d="M3.5 19c.9-3 3-4.6 5.5-4.6s4.6 1.6 5.5 4.6" />
      <path d="M16 15.2c2 .3 3.4 1.6 4 3.8" />
    </svg>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M4.5 12.6l5 5L19.5 7" />
    </svg>
  );
}

export function PencilIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20h4.2L19 9.2a2.1 2.1 0 0 0 0-3L17.8 5a2.1 2.1 0 0 0-3 0L4 15.8V20z" />
      <path d="M14.4 5.6l4 4" />
    </svg>
  );
}
