"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/** Fires `inView` once the element scrolls into the viewport, then stops watching.
 *
 * Extracted from the copies in about-us / advertise-with-us / ecosystem-partners so new pages
 * stop growing a fourth one. Those three still carry their own local copy — left alone
 * deliberately rather than refactored under an unrelated change. */
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
		// Safety net: if the observer never fires (stale bundle, hydration hiccup, etc.), don't
		// leave this content permanently invisible — force it visible after a few seconds
		// regardless, so a JS failure can never hide real content forever.
		const fallback = setTimeout(() => setInView(true), 4000);
		return () => {
			observer.disconnect();
			clearTimeout(fallback);
		};
	}, [threshold]);

	return { ref, inView };
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
	const mq = window.matchMedia(REDUCED_MOTION_QUERY);
	mq.addEventListener("change", onChange);
	return () => mq.removeEventListener("change", onChange);
}

/** True when the visitor has asked the OS for reduced motion, and stays true to the setting if
 * they change it mid-visit. `useSyncExternalStore` rather than state-in-an-effect: matchMedia is
 * exactly the external store it exists for, and it gives a clean server snapshot (false, then
 * corrected at hydration) instead of a cascading re-render on mount. */
export function usePrefersReducedMotion() {
	return useSyncExternalStore(
		subscribeReducedMotion,
		() => window.matchMedia(REDUCED_MOTION_QUERY).matches,
		() => false
	);
}

type RevealTag = "div" | "span" | "p" | "li" | "ul" | "h2" | "h3" | "section" | "header" | "article";

export type RevealDirection = "up" | "left" | "right";

const REVEAL_DURATION_MS = 700;

/**
 * The reveal's hidden/visible styling, as INLINE STYLE rather than Tailwind utility classes.
 *
 * This is the whole reason the animation works at all. Tailwind is not global in this project:
 * `isolated-tailwind.css` is imported by only four route layouts and scoped with `source(none)`
 * plus an explicit `@source` list. This component is on neither list, and `/editorial-policy`
 * loads no Tailwind at all — so the previous `opacity-0 translate-y-6 duration-700` classes
 * generated no CSS whatsoever and every element simply rendered static and fully visible.
 * Inline styles need no build-time class generation, so this works on any route.
 */
export function revealStyle(
	inView: boolean,
	{ direction = "up", delayMs = 0, distance = 24 }: { direction?: RevealDirection; delayMs?: number; distance?: number } = {}
): React.CSSProperties {
	const hidden =
		direction === "left"
			? `translateX(-${distance * 2}px)`
			: direction === "right"
				? `translateX(${distance * 2}px)`
				: `translateY(${distance}px)`;
	return {
		opacity: inView ? 1 : 0,
		transform: inView ? "none" : hidden,
		transition: `opacity ${REVEAL_DURATION_MS}ms ease-out, transform ${REVEAL_DURATION_MS}ms ease-out`,
		transitionDelay: `${delayMs}ms`,
	};
}

/** Reveal-on-scroll wrapper — fades in while sliding from the left, right, or up, so a page
 * reads as animated rather than static. Under prefers-reduced-motion the content is simply
 * shown: no fade, no travel, and no transition delay holding it back. */
export function Reveal({
	children,
	className = "",
	style,
	direction = "up",
	delay = 0,
	threshold = 0.2,
	as: Tag = "div",
}: {
	children: React.ReactNode;
	className?: string;
	/** Merged with the transition delay, so callers keep their own layout styles. */
	style?: React.CSSProperties;
	direction?: "up" | "left" | "right";
	delay?: number;
	threshold?: number;
	as?: RevealTag;
}) {
	const { ref, inView } = useInView<HTMLElement>(threshold);
	const reduced = usePrefersReducedMotion();

	if (reduced) {
		return (
			<Tag ref={ref as never} className={className} style={style}>
				{children}
			</Tag>
		);
	}

	return (
		<Tag
			ref={ref as never}
			className={className}
			// Caller styles first so the reveal's own opacity/transform win — a caller passing
			// margins keeps them, but cannot accidentally cancel the animation.
			style={{ ...style, ...revealStyle(inView, { direction, delayMs: delay }) }}
		>
			{children}
		</Tag>
	);
}
