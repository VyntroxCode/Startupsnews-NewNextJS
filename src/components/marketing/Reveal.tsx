"use client";

import { useEffect, useRef, useState } from "react";

/** Fires `inView` once the element scrolls into the viewport, then stops watching. */
export function useInView<T extends HTMLElement>(threshold = 0.2) {
	const ref = useRef<T | null>(null);
	const [inView, setInView] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setInView(true);
					observer.disconnect();
				}
			},
			{ threshold }
		);
		observer.observe(el);
		// Safety net: if the observer never fires (stale bundle, hydration hiccup, etc.),
		// don't leave this content permanently invisible — force it visible after a few
		// seconds regardless, so a JS failure can never hide real content forever.
		const fallback = setTimeout(() => setInView(true), 4000);
		return () => {
			observer.disconnect();
			clearTimeout(fallback);
		};
	}, [threshold]);

	return { ref, inView };
}

/** Counts up from 0 to `target` (as a float — callers round/format) once `active` flips true. */
function useCountUp(target: number, active: boolean, durationMs = 1400) {
	const [value, setValue] = useState(0);

	useEffect(() => {
		if (!active) return;
		let raf = 0;
		const start = performance.now();
		const tick = (now: number) => {
			const progress = Math.min(1, (now - start) / durationMs);
			const eased = 1 - Math.pow(1 - progress, 3);
			setValue(target * eased);
			if (progress < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [active, target, durationMs]);

	return value;
}

/** Reveal-on-scroll wrapper for the marketing pages (Careers, Advertise With Us) — fades in
 * while sliding from the left, right, or up. A client island, so the page around it (and the
 * children passed in) stay server-rendered. */
export function Reveal({
	children,
	className = "",
	direction = "up",
	delay = 0,
	threshold = 0.2,
	as: Tag = "div",
}: {
	children: React.ReactNode;
	className?: string;
	direction?: "up" | "left" | "right";
	delay?: number;
	threshold?: number;
	as?: "div" | "span" | "li";
}) {
	const { ref, inView } = useInView<HTMLDivElement>(threshold);
	const hiddenTransform =
		direction === "left" ? "-translate-x-16" : direction === "right" ? "translate-x-16" : "translate-y-8";
	return (
		<Tag
			ref={ref as never}
			className={`transition-all duration-700 ease-out ${
				inView ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${hiddenTransform}`
			} ${className}`}
			style={{ transitionDelay: `${delay}ms` }}
		>
			{children}
		</Tag>
	);
}

/** Parses a display string like "90.3M", "445K+", "24", or "100's" into a numeric count-up
 * target, how many decimal places to preserve, and the trailing suffix to re-append. */
function parseStatValue(raw: string): { target: number; decimals: number; suffix: string } {
	const match = raw.match(/^([\d.]+)(.*)$/);
	if (!match) return { target: 0, decimals: 0, suffix: raw };
	const [, numStr, suffix] = match;
	const decimals = numStr.includes(".") ? numStr.split(".")[1]?.length || 0 : 0;
	return { target: parseFloat(numStr), decimals, suffix };
}

type Stat = { value: string; label: string };

function StatTile({
	stat,
	index,
	active,
	valueClassName,
	labelClassName,
}: {
	stat: Stat;
	index: number;
	active: boolean;
	valueClassName: string;
	labelClassName: string;
}) {
	const { target, decimals, suffix } = parseStatValue(stat.value);
	const value = useCountUp(target, active);
	const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();

	return (
		<div
			className={`text-center transition-all duration-700 ease-out ${
				active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
			}`}
			style={{ transitionDelay: `${150 + index * 90}ms` }}
		>
			<div
				className={`text-[30px] sm:text-[36px] lg:text-[42px] font-black tracking-[-0.03em] leading-none tabular-nums ${valueClassName}`}
			>
				{display}
				{suffix}
			</div>
			<div className={`mt-2.5 text-[13px] font-semibold leading-[1.4] px-1 ${labelClassName}`}>{stat.label}</div>
		</div>
	);
}

/** Stats `<section>` whose tiles count up once the section scrolls into view. `children` is the
 * (server-rendered) heading block shown above the tile grid. */
export function StatsSection({
	stats,
	className,
	valueClassName,
	labelClassName,
	children,
}: {
	stats: Stat[];
	className: string;
	valueClassName: string;
	labelClassName: string;
	children: React.ReactNode;
}) {
	const { ref, inView } = useInView<HTMLElement>(0.15);
	return (
		<section ref={ref} className={className}>
			{children}
			<div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-y-10 gap-x-6 sm:gap-x-8 max-w-[1100px] mx-auto">
				{stats.map((s, i) => (
					<StatTile
						key={s.label}
						stat={s}
						index={i}
						active={inView}
						valueClassName={valueClassName}
						labelClassName={labelClassName}
					/>
				))}
			</div>
		</section>
	);
}
