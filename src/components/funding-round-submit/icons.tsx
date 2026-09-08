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

export function DeckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 2.5h9l3 3V21a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" />
      <path d="M14.5 2.5V6h3.5" />
      <path d="M8 13h8M8 16.5h8M8 9.5h4" />
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
