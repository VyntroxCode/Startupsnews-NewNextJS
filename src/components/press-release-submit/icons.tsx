import type { SVGProps } from "react";

/** Small line icons for this page. Deliberately drawn here rather than imported from
 * feature-startup/icons.tsx — these are stroked to match this page's hairline editorial weight,
 * and the two pages should be able to change independently.
 *
 * Two groups: the discovery surfaces at the bottom of the file, and the five editorial-standards
 * marks below, which replaced that section's 01–05 numbering. Each mark has to read as *that
 * principle* at a glance, since it is now the only thing distinguishing one row from the next
 * besides its heading. */
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** News — a newspaper, folded. */
export function NewsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="2.6" y="4.5" width="14.4" height="15" rx="1.2" />
      <path d="M17 9h3.2a1 1 0 0 1 1 1v7.8a1.7 1.7 0 0 1-3.4 0V9z" />
      <path d="M5.6 8.6h8.2M5.6 12.2h8.2M5.6 15.8h5.4" />
    </svg>
  );
}

/** Relevance — a target: does this land with our readers. */
export function RelevanceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="4.4" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Context — layers: what sits under the announcement. */
export function ContextIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.2 3.2 7.9 12 12.6l8.8-4.7L12 3.2z" />
      <path d="M3.2 12.4 12 17.1l8.8-4.7" />
      <path d="M3.2 16.6 12 21.3l8.8-4.7" />
    </svg>
  );
}

/** People — who is behind it. */
export function PeopleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="9.2" cy="8.4" r="3.3" />
      <path d="M3.4 19.6c0-3.1 2.6-5.2 5.8-5.2s5.8 2.1 5.8 5.2" />
      <path d="M16.4 5.5a3.3 3.3 0 0 1 0 5.9" />
      <path d="M17.8 14.8c1.9.7 3.2 2.4 3.2 4.6" />
    </svg>
  );
}

/** Evidence — a document that checks out. */
export function EvidenceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M6 2.8h7.2l5 5v13.4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.8a1 1 0 0 1 1-1z" />
      <path d="M12.9 3V8.2h5.2" />
      <path d="M8.4 14.6l2.5 2.5 4.7-4.9" />
    </svg>
  );
}

export function SiteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3z" />
    </svg>
  );
}

export function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M7.5 10.5V17M7.5 7.4v.1M11.4 17v-3.6a2 2 0 0 1 4 0V17" />
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="M17.2 6.9v.1" />
    </svg>
  );
}

export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 4l16 16M20 4L4 20" />
    </svg>
  );
}

export function NewsletterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6 8.5-6" />
    </svg>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </svg>
  );
}
