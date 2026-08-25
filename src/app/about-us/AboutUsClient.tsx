"use client";

import { useEffect, useRef, useState } from "react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { PageHeading } from "@/components/PageHeading";

const SITE_FONT_FAMILY = '"Garnett", Helvetica, Arial, sans-serif';

interface GlobalStat {
	target: number;
	suffix: string;
	label: string;
}

const GLOBAL_STATS: GlobalStat[] = [
	{ target: 4, suffix: "+", label: "years tracking global startups & tech" },
	{ target: 10, suffix: "+", label: "industries covered" },
	{ target: 30, suffix: "mn+", label: "monthly impressions" },
	{ target: 22, suffix: "+", label: "countries" },
];

/** Fires `inView` once the element scrolls into the viewport, then stops watching — used so the
 * stats band's count-up plays while it's actually on screen instead of finishing off-screen
 * before the visitor scrolls down to it. */
function useInView<T extends HTMLElement>(threshold = 0.3) {
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

/** Counts up from 0 to `target` once `active` flips true. */
function useCountUp(target: number, active: boolean, durationMs = 1400) {
	const [value, setValue] = useState(0);

	useEffect(() => {
		if (!active) return;
		let raf = 0;
		const start = performance.now();
		const tick = (now: number) => {
			const progress = Math.min(1, (now - start) / durationMs);
			const eased = 1 - Math.pow(1 - progress, 3);
			setValue(Math.round(target * eased));
			if (progress < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [active, target, durationMs]);

	return value;
}

function GlobalStatTile({ stat, index, active }: { stat: GlobalStat; index: number; active: boolean }) {
	const value = useCountUp(stat.target, active);
	return (
		<div
			className={`transition-all duration-700 ease-out ${
				active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
			}`}
			style={{ transitionDelay: `${150 + index * 120}ms` }}
		>
			<div className="text-[28px] sm:text-[38px] lg:text-[50px] font-extrabold text-au-pink leading-none tabular-nums">
				{value}
				{stat.suffix}
			</div>
			<div className="text-[11.5px] sm:text-[13px] lg:text-[14px] text-au-muted mt-2 leading-[1.4] px-1">{stat.label}</div>
		</div>
	);
}

/** Full-width intelligence strip — replaces the old right-hand stats column and the hero image.
 * Heading + a 4-across row of stats, centered, with a count-up that plays once it scrolls into
 * view. */
function IntelligenceStrip() {
	const { ref, inView } = useInView<HTMLDivElement>();
	return (
		<div ref={ref} className="px-5 md:px-10 pt-4 sm:pt-6 lg:pt-8 pb-12 sm:pb-16 lg:pb-20 text-center">
			<h3
				className={`text-[21px] sm:text-[28px] lg:text-[38px] font-extrabold leading-snug mb-8 sm:mb-10 lg:mb-12 transition-all duration-700 ease-out ${
					inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
				}`}
			>
				Delivering Global Media Intelligence, <span className="text-au-pink">Daily!</span>
			</h3>
			<div className="mx-auto grid max-w-[980px] grid-cols-2 gap-y-8 gap-x-4 sm:gap-y-12 sm:gap-x-8 sm:grid-cols-4">
				{GLOBAL_STATS.map((s, i) => (
					<GlobalStatTile key={s.label} stat={s} index={i} active={inView} />
				))}
			</div>
		</div>
	);
}

/** Lead statement — sits below the intelligence strip, full width, sliding in from the left. */
function TaglineHero() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const raf = requestAnimationFrame(() => setVisible(true));
		return () => cancelAnimationFrame(raf);
	}, []);

	return (
		<div className="px-5 md:px-10 pt-10 sm:pt-12 lg:pt-14 pb-4 sm:pb-6 lg:pb-8 overflow-hidden">
			<div
				className={`w-full text-center text-[22px] sm:text-[30px] lg:text-[40px] leading-[1.3] font-extrabold transition-all duration-700 ease-out ${
					visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-16"
				}`}
			>
				As a startup media platform, we help founders{" "}
				<span className="text-au-fade font-semibold">
					get discovered, get funded, and get their story told right.
				</span>
			</div>
		</div>
	);
}

const ABOUT_PARAGRAPHS = [
	"StartupNews.fyi is a global intelligence platform chronicling the people, capital, and ideas shaping the world's technology economy. Since 2023, we have grown into a trusted source for founders, investors, and operators navigating an industry that moves faster than the news cycle delivering sharp reporting, original analysis, and timely dispatches from startup ecosystems across North America, Europe, and Asia.",
	"We track everything from early-stage funding rounds to the strategic shifts redefining entire industries. We've reported on the deals before they made headlines elsewhere, and our insights are regularly researched. Reaching over 30 million impressions monthly, SNFYI has become a daily habit for professionals who need to know what's happening and why it matters before everyone else does.",
	"Beyond reporting, we work with companies and ecosystem partners to produce research, data-driven insights, and branded content that speaks directly to a global audience of builders and decision-makers. As the technology landscape continues to shift at pace, our mission remains constant: to be the clearest, fastest, and most reliable lens on the startups defining what comes next.",
];

/** Centered "About Us" heading + company copy — full width, between the Row 1 grid and the
 * video thumbnail below. Heading fades up first; the copy below it either renders the admin's
 * rich-text content (Inner Pages → About Us) as one fade-up block, or — when nothing's been set
 * there yet — the built-in default paragraphs, each sliding in on its own from alternating sides. */
function AboutSection({ contentHtml }: { contentHtml: string }) {
	const { ref, inView } = useInView<HTMLDivElement>();

	return (
		<section ref={ref} className="px-5 md:px-10 py-12 sm:py-16 lg:py-20 text-center overflow-hidden">
			<h2
				className={`text-[28px] sm:text-[38px] lg:text-[48px] font-extrabold text-au-ink leading-tight transition-all duration-700 ease-out ${
					inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
				}`}
			>
				About Us
			</h2>

			<div className="mx-auto mt-8 sm:mt-10 w-full text-[14px] sm:text-[15px] lg:text-[16px] leading-[1.75] sm:leading-[1.8] text-au-muted">
				{contentHtml ? (
					<div
						className={`text-left sm:text-center [&_p]:mb-5 sm:[&_p]:mb-7 lg:[&_p]:mb-8 [&_p:last-child]:mb-0 transition-all duration-700 ease-out ${
							inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
						}`}
						style={{ transitionDelay: "200ms" }}
						dangerouslySetInnerHTML={{ __html: contentHtml }}
					/>
				) : (
					ABOUT_PARAGRAPHS.map((text, i) => {
						const fromLeft = i % 2 === 0;
						return (
							<p
								key={i}
								className={`mb-5 sm:mb-7 lg:mb-8 last:mb-0 transition-all duration-700 ease-out ${
									inView
										? "opacity-100 translate-x-0"
										: `opacity-0 ${fromLeft ? "-translate-x-20" : "translate-x-20"}`
								}`}
								style={{ transitionDelay: `${200 + i * 220}ms` }}
							>
								{text}
							</p>
						);
					})
				)}
			</div>
		</section>
	);
}

interface Offering {
	title: string;
	body: string;
	badge?: string;
	icon: React.ReactNode;
}

const OFFERINGS: Offering[] = [
	{
		title: "Brand Stories",
		body: "Original, narrative-driven content that helps brands connect authentically with our audience of founders, operators, and decision-makers.",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
				<path d="M3 11v2a2 2 0 0 0 2 2h1l4 4V5L6 9H5a2 2 0 0 0-2 2z" />
				<path d="M15 8a4 4 0 0 1 0 8" />
				<path d="M18 5a8 8 0 0 1 0 14" />
			</svg>
		),
	},
	{
		title: "Global Funding Report",
		body: "Our flagship research series tracking capital flows, deal activity, and investment trends shaping startups worldwide.",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
				<circle cx="12" cy="12" r="9" />
				<path d="M3 12h18" />
				<path d="M12 3a14 14 0 0 1 0 18" />
				<path d="M12 3a14 14 0 0 0 0 18" />
			</svg>
		),
	},
	{
		title: "AI Newsletter",
		body: "A regular briefing on the tools, trends, and breakthroughs redefining how startups build and scale.",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
				<rect x="2.5" y="6" width="15" height="12" rx="2" />
				<path d="M2.5 8l7.5 5 7.5-5" />
				<path d="M18.5 3.5l0.9 1.8 1.8 0.9-1.8 0.9-0.9 1.8-0.9-1.8-1.8-0.9 1.8-0.9z" />
			</svg>
		),
	},
	{
		title: "Event IP",
		body: "Signature conferences and gatherings bringing together startup and business leaders from across the world's leading tech ecosystems.",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
				<rect x="3" y="4" width="18" height="17" rx="2" />
				<path d="M3 9h18M8 2v4M16 2v4" />
				<circle cx="12" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
			</svg>
		),
	},
	{
		title: "International Delegation",
		body: "Curated trips and exchange programs connecting founders and investors with startup ecosystems and opportunities abroad.",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
				<path d="M2 16l20-7-7 20-3-8-8-3z" />
			</svg>
		),
	},
	{
		title: "SNFYI GPT",
		body: "An AI-powered assistant built to help founders and investors navigate startup news, data, and insight faster.",
		badge: "Coming Soon",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
				<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
				<path d="M12 8v4M12 15h.01" />
			</svg>
		),
	},
];

/** "Our ecosystem" card grid — replaces the old bordered PILLARS icon grid. Pink-tinted rounded
 * cards, gradient icon badges, staggered reveal + hover lift. */
function OfferingsSection() {
	const { ref, inView } = useInView<HTMLDivElement>();

	return (
		<section ref={ref} className="px-5 md:px-10 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-10 lg:pb-12">
			<div className="text-center">
				<h2
					className={`text-[24px] sm:text-[30px] lg:text-[36px] font-extrabold text-au-ink leading-tight transition-all duration-700 ease-out ${
						inView ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95"
					}`}
				>
					What We Offer
				</h2>
				<p
					className={`mx-auto mt-3 max-w-[620px] text-[13.5px] sm:text-[15px] text-au-muted leading-relaxed transition-all duration-700 ease-out ${
						inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
					}`}
					style={{ transitionDelay: "180ms" }}
				>
					A growing ecosystem built to inform, connect, and empower the people shaping the global startup economy.
				</p>
			</div>

			<div className="mt-10 sm:mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
				{OFFERINGS.map((o, i) => (
					<div
						key={o.title}
						className={`group rounded-2xl border border-au-line bg-au-panel p-6 sm:p-8 text-center transition-all duration-700 ease-out hover:-translate-y-1.5 hover:border-au-pink/40 hover:shadow-xl hover:shadow-au-pink/10 ${
							inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
						}`}
						style={{ transitionDelay: `${150 + i * 90}ms` }}
					>
						<div className="mx-auto mb-5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-au-pink to-au-pink-deep text-white shadow-lg shadow-au-pink/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
							<div className="h-6 w-6 sm:h-7 sm:w-7">{o.icon}</div>
						</div>
						<h3 className="text-[16px] sm:text-[17px] font-extrabold text-au-ink mb-1.5">{o.title}</h3>
						{o.badge && (
							<span className="mb-2 inline-block rounded-full bg-au-pink/10 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-au-pink-deep">
								{o.badge}
							</span>
						)}
						<p className="mt-2 text-[13px] sm:text-[13.5px] leading-[1.65] text-au-muted">{o.body}</p>
					</div>
				))}
			</div>
		</section>
	);
}

export default function AboutUsClient({ contentHtml }: { contentHtml: string }) {
	return (
		<div className="bg-white py-2">
			<div
				className="max-w-[1200px] mx-auto mt-6 sm:mt-10 mb-2 sm:mb-4 bg-white text-au-ink"
				style={{ fontFamily: SITE_FONT_FAMILY }}
			>
				<div className="page-intro-animate">
					<div className="px-5 md:px-10">
						<PageBreadcrumb current="About Us" />
					</div>
					<PageHeading title="About Us" />
				</div>

				{/* HERO — image removed; lead statement, then the intelligence strip below it */}
				<TaglineHero />
				<IntelligenceStrip />

				<AboutSection contentHtml={contentHtml} />

				<OfferingsSection />
			</div>
		</div>
	);
}
