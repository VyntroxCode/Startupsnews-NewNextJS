"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import "./nav-events-cta-tailwind.css";

/* Navbar EVENTS item drawn as a pill CTA with a line of light running around its border, led by a
   small star that rides the tip of the line.

   How it works: the pill's grey rim is plain CSS (1.5px padding over a grey background), so it is in
   the server HTML. Once mounted, the pill is measured (ResizeObserver — the width follows the label
   font) and an SVG overlay draws one path tracing the rim's centre line. Both moving parts follow that
   same path, so they stay joined:
     comet  five dashes of the path (pathLength 100) whose heads share one point, each shorter and
            more opaque than the last, so the line fades out behind its head; SMIL <animate> slides
            their dash offsets once round every LAP.
     star   a four-point sparkle moved along the path by <animateMotion> with the same duration; both
            go at constant speed from the path start, so the star always sits on the comet's head.
            It also turns and twinkles.
   Reduced motion: no <animate> elements are rendered, the comet and star are drawn still at the
   pill's top-right.

   Styling: Tailwind with the `nv:` prefix (./nav-events-cta-tailwind.css). The legacy menu rules
   (`.startupnews-menu ul li a`) still set the link's text colour, size, weight and uppercase, so the
   label matches its neighbours. `.mvp-nav-menu ul li a` (style.css) pads every menu link 18px 12px and
   floats it, so the pill overrides padding and float with `!`. `span { margin: 0 auto }` from the theme
   reset is why spans set `nv:m-0`. The hover wash is a background-image over the opaque page colour
   because the dark-theme wash is translucent. */

const LAP = "3.2s";
const STROKE = 1.5;
/* [length, opacity] in pathLength units (100 = once round the pill). */
const COMET: [number, number][] = [
  [28, 0.12],
  [20, 0.2],
  [13, 0.35],
  [7, 0.6],
  [3, 1],
];
/* Where the still comet's head sits for reduced motion (just past the top-right curve). */
const STILL_HEAD = 30;
const STAR = "M0,-4.5C0.6,-1.2 1.2,-0.6 4.5,0C1.2,0.6 0.6,1.2 0,4.5C-0.6,1.2 -1.2,0.6 -4.5,0C-1.2,-0.6 -0.6,-1.2 0,-4.5Z";

/** Pill outline through the middle of the rim, clockwise from the top centre. */
function pillPath(w: number, h: number) {
  const i = STROKE / 2;
  const r = (h - STROKE) / 2;
  const cx = w / 2;
  return (
    `M${cx},${i}H${w - i - r}A${r},${r} 0 0 1 ${w - i - r},${h - i}` +
    `H${i + r}A${r},${r} 0 0 1 ${i + r},${i}H${cx}`
  );
}

export function NavEventsCta({ href, label }: { href: string; label: string }) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [reduced, setReduced] = useState(false);
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const pathId = `nv-path-${uid}`;
  const gradId = `nv-grad-${uid}`;

  useEffect(() => {
    const el = linkRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => setReduced(mq.matches);
    onMotion();
    mq.addEventListener("change", onMotion);
    return () => {
      ro.disconnect();
      mq.removeEventListener("change", onMotion);
    };
  }, []);

  return (
    <Link
      ref={linkRef}
      href={href}
      className="nv:group nv:relative nv:isolate nv:inline-flex nv:items-center nv:float-none! nv:rounded-full nv:p-[1.5px]! nv:align-middle nv:outline-none! nv:focus-visible:outline-2! nv:focus-visible:outline-offset-2 nv:focus-visible:outline-[var(--sn-focus,#7c4dff)]!"
    >
      {/* Faint full rim, so the pill reads as a button even where the comet isn't. */}
      <span aria-hidden className="nv:absolute nv:inset-0 nv:m-0 nv:rounded-full nv:bg-[var(--sn-line-strong,#e6e6e6)]" />
      <span className="nv:relative nv:m-0 nv:inline-flex nv:items-center nv:gap-1.5 nv:rounded-full nv:bg-[color:var(--sn-bg,#fff)] nv:py-[6px] nv:pr-3 nv:pl-3.5 nv:leading-none nv:transition-colors nv:duration-300 nv:group-hover:bg-[image:linear-gradient(var(--sn-wash-pink,#fdeef4),var(--sn-wash-pink,#fdeef4))]">
        <span aria-hidden className="nv:m-0 nv:block nv:size-1.5 nv:shrink-0 nv:rounded-full nv:bg-[var(--sn-accent,#e91e63)]" />
        <span className="nv:m-0">{label}</span>
        <ArrowUpRight
          aria-hidden
          strokeWidth={2.5}
          className="nv:size-3 nv:shrink-0 nv:text-[var(--sn-pink-ink,#e91e63)] nv:transition-transform nv:duration-300 nv:group-hover:[transform:translate(1.5px,-1.5px)]"
        />
      </span>

      {size && size.w > size.h && (
        <svg
          aria-hidden
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          className="nv:pointer-events-none nv:absolute nv:top-0 nv:left-0 nv:overflow-visible"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" className="nv:[stop-color:var(--sn-violet-ink,#7c4dff)]" />
              <stop offset="1" className="nv:[stop-color:var(--sn-accent,#e91e63)]" />
            </linearGradient>
            <path id={pathId} d={pillPath(size.w, size.h)} pathLength={100} />
          </defs>

          {COMET.map(([len, opacity]) => (
            <use
              key={len}
              href={`#${pathId}`}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={STROKE}
              // Round caps on the faint dashes add a bright dot at every seam; only the head is rounded.
              strokeLinecap={opacity === 1 ? "round" : "butt"}
              strokeDasharray={`${len} ${100 - len}`}
              strokeDashoffset={reduced ? len - STILL_HEAD : len}
              opacity={opacity}
            >
              {/* Head moves 0 → 100 along the path: offset = len − head. */}
              {!reduced && (
                <animate attributeName="stroke-dashoffset" from={len} to={len - 100} dur={LAP} repeatCount="indefinite" />
              )}
            </use>
          ))}

          <g className="nv:drop-shadow-[0_0_2.5px_rgb(233_30_99/0.85)]">
            {reduced ? (
              <StillStar pathId={pathId} d={pillPath(size.w, size.h)} />
            ) : (
              <g>
                <animateMotion dur={LAP} repeatCount="indefinite">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
                <g>
                  <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur={LAP} repeatCount="indefinite" />
                  <path d={STAR} className="nv:fill-[var(--sn-accent,#e91e63)]">
                    <animateTransform
                      attributeName="transform"
                      type="scale"
                      values="0.8;1.2;0.8"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </path>
                </g>
              </g>
            )}
          </g>
        </svg>
      )}
    </Link>
  );
}

/** Reduced motion: the star parked where the still comet's head is. */
function StillStar({ pathId, d }: { pathId: string; d: string }) {
  const ref = useRef<SVGGElement>(null);
  useEffect(() => {
    const path = document.getElementById(pathId) as SVGPathElement | null;
    const g = ref.current;
    if (!path || !g) return;
    const p = path.getPointAtLength((path.getTotalLength() * STILL_HEAD) / 100);
    g.setAttribute("transform", `translate(${p.x},${p.y})`);
  }, [pathId, d]);
  return (
    <g ref={ref}>
      <path d={STAR} className="nv:fill-[var(--sn-accent,#e91e63)]" />
    </g>
  );
}
