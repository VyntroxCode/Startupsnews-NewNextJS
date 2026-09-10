import type { SVGProps } from "react";

/** Icon set for /sponsor-event.
 *
 * Brand marks are the official glyph paths this site's footer already ships, so the discovery
 * section shows real recognisable icons rather than text stand-ins. UI icons are stroked line
 * icons drawn on the same 24px grid at the same weight. */
type Icon = (props: SVGProps<SVGSVGElement>) => React.ReactElement;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* ── Brand marks ──────────────────────────────────────────────────────────── */

export const InstagramIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

export const LinkedInIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export const XIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const FacebookIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export const WhatsAppIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.896 9.83 9.83 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 0 0-3.48-8.413Z" />
  </svg>
);

export const GoogleIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989z" />
  </svg>
);

/* ── UI icons ─────────────────────────────────────────────────────────────── */

export const SiteIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M3 12h18M12 2.8c2.4 2.5 3.6 5.6 3.6 9.2s-1.2 6.7-3.6 9.2c-2.4-2.5-3.6-5.6-3.6-9.2S9.6 5.3 12 2.8z" />
  </svg>
);

export const MailIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true" {...props}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </svg>
);

export const FounderIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true" {...props}>
    <circle cx="12" cy="7.6" r="3.4" />
    <path d="M4.8 20.4c1.3-3.9 4-5.9 7.2-5.9s5.9 2 7.2 5.9" />
  </svg>
);

export const InvestorIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true" {...props}>
    <path d="M3.5 17.5 9 11l3.6 3.4 7.9-8.4" />
    <path d="M15.6 5.6h4.9v4.9" />
    <path d="M3.5 20.5h17" />
  </svg>
);

export const BuilderIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true" {...props}>
    <path d="m8.6 8.4-4.2 3.7 4.2 3.7M15.4 8.4l4.2 3.7-4.2 3.7M13.4 5.4l-2.8 13.2" />
  </svg>
);

export const TeamIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true" {...props}>
    <circle cx="8.4" cy="8.6" r="2.8" />
    <circle cx="16.4" cy="9.6" r="2.2" />
    <path d="M3.4 18.6c.9-2.9 2.7-4.4 5-4.4s4.1 1.5 5 4.4M15 14.6c1.9.2 3.2 1.5 3.9 3.6" />
  </svg>
);

export const CommunityIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true" {...props}>
    <circle cx="12" cy="12" r="2.5" />
    <circle cx="5" cy="6.6" r="2" />
    <circle cx="19" cy="6.6" r="2" />
    <circle cx="5" cy="17.4" r="2" />
    <circle cx="19" cy="17.4" r="2" />
    <path d="m6.7 7.9 3.1 2.5M17.3 7.9 14.2 10.4M6.7 16.1l3.1-2.5M17.3 16.1 14.2 13.6" />
  </svg>
);

export const MediaIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true" {...props}>
    <rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2" />
    <path d="M6.4 9.4h6v5h-6zM15.2 9.4h2.6M15.2 12.4h2.6M15.2 15.4h2.6" />
  </svg>
);

export const SparkIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true" {...props}>
    <path d="M12 3.2 13.8 9l5.8 1.8-5.8 1.8L12 18.4 10.2 12.6 4.4 10.8 10.2 9z" />
  </svg>
);

export const MicIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true" {...props}>
    <rect x="9.2" y="2.8" width="5.6" height="10.8" rx="2.8" />
    <path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0M12 17.8v3.4" />
  </svg>
);

export const HandshakeIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true" {...props}>
    <path d="m2.8 12.4 3.6-3.6 3 .9 2.6-1.6 2.6 1.6 3-.9 3.6 3.6" />
    <path d="m8.2 13.4 2.4 2.4a1.7 1.7 0 0 0 2.4 0l3.4-3.4" />
    <path d="M6.4 8.8v6.6M17.6 8.8v6.6" />
  </svg>
);

export const PenIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...stroke} aria-hidden="true" {...props}>
    <path d="M4 20h4L19.4 8.6a2.1 2.1 0 0 0-3-3L5 17z" />
    <path d="m14.8 4.2 3 3" />
  </svg>
);

export const CheckIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} aria-hidden="true" {...props}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const ArrowRightIcon: Icon = (props) => (
  <svg viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} aria-hidden="true" {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
