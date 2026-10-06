"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { countrySectionId } from "@/modules/events/utils/region-country.utils";

export type CountryCircle = { name: string; iso: string; flagUrl: string };

/** Seconds one circle takes to travel its own width — keeps the row at the same speed
 * whatever its length. */
const SECONDS_PER_CIRCLE = 3;

function scrollToCountry(e: MouseEvent<HTMLAnchorElement>, country: string) {
  const target = document.getElementById(countrySectionId(country));
  // No section on the page (e.g. a search is showing results instead) — leave the plain hash link.
  if (!target) return;
  e.preventDefault();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // The section's scroll-margin-top keeps its heading clear of the sticky site header.
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.replaceState(null, "", `#${target.id}`);
}

function CountryItem({ country, duplicate }: { country: CountryCircle; duplicate?: boolean }) {
  return (
    <li className="shrink-0">
      <a
        href={`#${countrySectionId(country.name)}`}
        onClick={(e) => scrollToCountry(e, country.name)}
        tabIndex={duplicate ? -1 : undefined}
        className="group flex w-24 flex-col items-center gap-2 no-underline sm:w-32"
      >
        <span className="relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-sm font-semibold uppercase text-neutral-600 shadow-sm ring-1 ring-black/10 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-2 group-hover:ring-[#E62E69] sm:size-28">
          {/* Initials sit under the flag and only show if the flag has no file in S3 yet. */}
          {country.iso || country.name.slice(0, 2)}
          {country.flagUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- tiny SVG from S3; next/image refuses SVG without dangerouslyAllowSVG
            <img
              src={country.flagUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
              onError={(e) => { e.currentTarget.hidden = true; }}
            />
          )}
        </span>
        <span className="text-center text-sm font-medium leading-tight text-neutral-800 group-hover:text-[#E62E69]">
          {country.name}
        </span>
      </a>
    </li>
  );
}

/**
 * One row of flag circles. When the circles overflow the row they loop endlessly (two copies of
 * the list on a track that slides by half its width), pausing on hover, touch or keyboard focus;
 * when they fit they simply sit still, centred. Reduced-motion visitors get a still row they can
 * swipe instead.
 */
function MarqueeRow({ countries, direction }: { countries: CountryCircle[]; direction: "ltr" | "rtl" }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const row = rowRef.current;
    const list = listRef.current;
    if (!row || !list) return;
    const measure = () => setOverflowing(list.offsetWidth > row.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [countries]);

  const listClass = "m-0 flex shrink-0 list-none gap-4 p-0 pr-4 sm:gap-6 sm:pr-6";

  return (
    <div
      ref={rowRef}
      className={
        overflowing
          ? "overflow-hidden py-1 [mask-image:linear-gradient(to_right,transparent,#000_40px,#000_calc(100%-40px),transparent)] motion-reduce:overflow-x-auto motion-reduce:[mask-image:none]"
          : "overflow-hidden py-1"
      }
    >
      <div
        className={
          overflowing
            ? `flex w-max ${direction === "ltr" ? "animate-ec-marquee-ltr" : "animate-ec-marquee-rtl"} hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] active:[animation-play-state:paused] motion-reduce:animate-none`
            : "flex justify-center"
        }
        style={overflowing ? { animationDuration: `${countries.length * SECONDS_PER_CIRCLE}s` } : undefined}
      >
        <ul ref={listRef} className={listClass}>
          {countries.map((country) => (
            <CountryItem key={country.name} country={country} />
          ))}
        </ul>
        {overflowing && (
          <ul aria-hidden="true" className={`${listClass} motion-reduce:hidden`}>
            {countries.map((country) => (
              <CountryItem key={country.name} country={country} duplicate />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * "Explore by Country" on /events, just below the breadcrumb: every country A–Z in one row sliding
 * left → right (busy and quiet countries were two rows until 2026-10-06). Online and Cohort get no
 * circle. Clicking a circle scrolls to that country's section in EventsByCountryList.
 */
export function EventsCountryStrip({ countries }: { countries: CountryCircle[] }) {
  if (countries.length === 0) return null;
  return (
    <section aria-labelledby="explore-by-country-heading" className="mt-4 mb-8">
      <h2 id="explore-by-country-heading" className="mb-5 text-2xl font-bold text-neutral-900">
        Explore by Country
      </h2>
      <MarqueeRow countries={countries} direction="ltr" />
    </section>
  );
}
