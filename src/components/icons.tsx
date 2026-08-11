import type { SVGProps } from "react";

/**
 * Lightweight inline SVG replacements for the Font Awesome glyphs previously
 * used across the site. Sized at 1em so they inherit the font-size/color of
 * their parent, matching how the FA icon fonts behaved.
 */

function OutlineIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: "inline-block", verticalAlign: "middle" }}
      {...props}
    />
  );
}

export function ChevronLeftIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <OutlineIcon {...props}>
      <polyline points="15 18 9 12 15 6" />
    </OutlineIcon>
  );
}

export function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <OutlineIcon {...props}>
      <polyline points="9 18 15 12 9 6" />
    </OutlineIcon>
  );
}

export function AngleUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <OutlineIcon {...props}>
      <polyline points="18 15 12 9 6 15" />
    </OutlineIcon>
  );
}

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <OutlineIcon {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </OutlineIcon>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <OutlineIcon {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </OutlineIcon>
  );
}

export function MinusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <OutlineIcon {...props}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </OutlineIcon>
  );
}

export function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <OutlineIcon {...props}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </OutlineIcon>
  );
}

export function HeadphonesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <OutlineIcon {...props}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2" y="14" width="4" height="7" rx="1.5" />
      <rect x="18" y="14" width="4" height="7" rx="1.5" />
    </OutlineIcon>
  );
}

function BrandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="currentColor"
      style={{ display: "inline-block", verticalAlign: "middle" }}
      {...props}
    />
  );
}

export function FacebookFIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <BrandIcon {...props}>
      <path d="M15.997 3.985h2.191V.169C17.81.117 16.51 0 14.994 0c-3.163 0-5.328 1.987-5.328 5.639V9H6.187v4.266h3.479V24h4.274V13.267h3.338l.529-4.266h-3.868V6.062c0-1.233.333-2.077 2.058-2.077z" />
    </BrandIcon>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <BrandIcon {...props}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </BrandIcon>
  );
}

export function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <BrandIcon {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </BrandIcon>
  );
}

export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <BrandIcon {...props}>
      <path d="M13.982 10.622 20.54 3h-1.554l-5.693 6.618L8.745 3H3l6.876 10.007L3 21h1.554l6.012-6.989L15.316 21H21l-7.018-10.378Zm-2.128 2.474-.697-.997-5.543-7.93h2.387l4.474 6.4.697.996 5.815 8.318h-2.387l-4.746-6.787Z" />
    </BrandIcon>
  );
}
