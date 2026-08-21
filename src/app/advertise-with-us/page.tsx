"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { trackEvent } from "@/lib/analytics";

const SITE_FONT_FAMILY = '"Garnett", Helvetica, Arial, sans-serif';

const STATS = [
	{ value: "90.3M", label: "Google search impressions" },
	{ value: "10M+", label: "Monthly impressions" },
	{ value: "15M+", label: "Instagram organic reach" },
	{ value: "445K+", label: "Instagram followers" },
	{ value: "22K+", label: "WhatsApp community members" },
	{ value: "24", label: "Countries reached" },
	{ value: "250+", label: "Global media partners" },
	{ value: "100's", label: "Advertisers who trust us" },
];

const WAYS = [
	"Original, sponsored editorial content",
	"Press release publishing and distribution",
	"Targeted ad campaigns across sectors",
	"Event sponsorship and media partnership",
	"Social and WhatsApp community amplification",
];

const WHY_CARDS = [
	{
		label: "TARGET",
		title: "Precise Targeting",
		body: "Reach the right audience using geo-demo segmentation across TV and digital.",
	},
	{
		label: "STRATEGY",
		title: "Expert Media Strategy",
		body: "Get comprehensive campaign planning and advertising guidance across our premium portfolio.",
	},
	{
		label: "ANALYSIS",
		title: "Professional Consultation",
		body: "Comprehensive media consultation and post-campaign performance analysis.",
	},
	{
		label: "SUPPORT",
		title: "Expert Guidance",
		body: "Dedicated Relationship Managers for personalised planning and support.",
	},
];

const FIELD_LABEL = "block text-[13px] font-semibold text-adv-ink mb-2";

const FIELD_INPUT =
	"block w-full font-[inherit] text-[15px] leading-[1.4] px-4 py-3 border border-adv-line-2 rounded-xl bg-white text-adv-ink placeholder:text-adv-muted-2 transition-colors focus:outline-none focus:border-adv-red focus:ring-2 focus:ring-adv-red/15";

/** Fires `inView` once the element scrolls into the viewport, then stops watching. */
function useInView<T extends HTMLElement>(threshold = 0.2) {
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

/** Reveal-on-scroll wrapper shared by every text/image block on this page — fades in while
 * sliding from the left, right, or up, so the page reads as animated rather than static. */
function Reveal({
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

function StatTile({ stat, index, active }: { stat: { value: string; label: string }; index: number; active: boolean }) {
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
			<div className="text-[30px] sm:text-[36px] lg:text-[42px] font-black tracking-[-0.03em] text-adv-red leading-none tabular-nums">
				{display}
				{suffix}
			</div>
			<div className="mt-2.5 text-[13px] font-semibold text-adv-muted leading-[1.4] px-1">{stat.label}</div>
		</div>
	);
}

export default function AdvertisePage() {
	const [formData, setFormData] = useState({
		firstName: "",
		companyName: "",
		email: "",
		phone: "",
		budgetRate: "",
		campaignGoal: "",
		objective: "",
	});
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const turnstileRef = useRef<TurnstileInstance>(null);

	const { ref: statsRef, inView: statsInView } = useInView<HTMLDivElement>(0.15);

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!turnstileToken) {
			alert("Please complete the CAPTCHA verification.");
			return;
		}

		setSubmitting(true);
		const response = await fetch("/api/advertise", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...formData, turnstileToken }),
		});

		const result = await response.json().catch(() => null);
		setSubmitting(false);

		if (!response.ok || !result?.success) {
			const errorMessage = result?.error || "Failed to send your enquiry. Please try again.";
			alert(errorMessage);
			turnstileRef.current?.reset();
			setTurnstileToken(null);
			return;
		}

		trackEvent("generate_lead", { form: "advertise_enquiry" });
		alert("Thank you for your enquiry. Your message has been sent to office@startupnews.fyi.");
		setFormData({
			firstName: "",
			companyName: "",
			email: "",
			phone: "",
			budgetRate: "",
			campaignGoal: "",
			objective: "",
		});
		turnstileRef.current?.reset();
		setTurnstileToken(null);
	};

	return (
		<div className="bg-white text-adv-ink overflow-x-hidden" style={{ fontFamily: SITE_FONT_FAMILY }}>
			{/* Breadcrumb */}
			<div className="px-5 sm:px-8 lg:px-10">
				<nav className="event-by-country-breadcrumb" aria-label="Breadcrumb">
					<Link href="/" className="event-by-country-breadcrumb-link">Home</Link>
					<span className="event-by-country-breadcrumb-separator" aria-hidden="true">/</span>
					<span className="event-by-country-breadcrumb-current" aria-current="page">Advertise With Us</span>
				</nav>
			</div>

			{/* Eyebrow */}
			<div className="px-5 sm:px-8 lg:px-10 pt-1 pb-4 text-center">
				<h1 className="text-[26px] sm:text-[32px] font-bold tracking-[-0.01em] text-adv-ink">
					Advertise With Us
				</h1>
			</div>

			{/* HERO */}
			<section className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-7 lg:gap-[72px] items-center px-5 sm:px-8 lg:px-10 py-6 sm:py-8 lg:py-12">
				<Reveal direction="left">
					<div className="relative h-[380px] sm:h-[480px] lg:h-[620px] min-w-0 rounded-[24px] overflow-hidden">
						<Image
							src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&q=80&auto=format&fit=crop"
							alt="StartupNews.fyi advertising and media team"
							fill
							sizes="(min-width: 1024px) 45vw, 100vw"
							className="object-cover"
							priority
						/>
					</div>
				</Reveal>
				<Reveal direction="right" delay={120} className="relative flex flex-col gap-0.5 min-w-0">
					<div className="absolute -top-[54px] right-[6%] w-[116px] h-[116px] rounded-full bg-[#ffe8e8] pointer-events-none" />
					<div className="absolute -bottom-10 right-[2%] w-[72px] h-[72px] rounded-full border-[10px] border-adv-ink pointer-events-none" />
					<span className="relative text-[clamp(48px,8.2vw,128px)] font-black tracking-[-0.045em] leading-[0.94] text-adv-ink">
						Make
					</span>
					<span className="relative text-[clamp(48px,8.2vw,128px)] font-black tracking-[-0.045em] leading-[0.94] text-adv-ink">
						Your Brand
					</span>
					<span className="relative text-[clamp(48px,8.2vw,128px)] font-black tracking-[-0.045em] leading-[0.94] text-adv-red">
						Stand Out.
					</span>
				</Reveal>
			</section>

			{/* REACH THE MOST ENGAGED AUDIENCE */}
			<section className="grid grid-cols-1 lg:grid-cols-2 gap-7 lg:gap-[72px] items-start px-5 sm:px-8 lg:px-10 py-8 sm:py-10 lg:py-14 bg-adv-panel">
				<Reveal direction="left">
					<h2 className="text-adv-ink text-[26px] sm:text-[34px] lg:text-[44px] font-extrabold tracking-[-0.02em] leading-[1.14] uppercase max-w-[18ch]">
						Reach the most engaged startup &amp; tech audience
					</h2>
				</Reveal>
				<Reveal direction="right" delay={120} className="flex flex-col gap-7 items-start min-w-0">
					<p className="text-lg leading-[1.65] text-adv-muted max-w-[58ch]">
						StartupNews.fyi connects your brand with 10M+ monthly readers — founders,
						investors, and tech decision-makers across India and 24 countries. AI-curated,
						founder-first, globally distributed.
					</p>
					<div className="flex flex-wrap gap-3.5">
						<a
							href="#sn-form"
							className="bg-adv-red hover:bg-adv-red-deep !text-white text-[15px] font-bold px-8 py-[15px] rounded-full"
						>
							Submit Your Advertising Enquiry
						</a>
						<Link
							href="/contact-us"
							className="border-[1.5px] border-adv-ink text-adv-ink text-[15px] font-bold px-8 py-[15px] rounded-full"
						>
							Contact Us
						</Link>
					</div>
					<p className="text-sm text-adv-muted">
						Takes 5–7 minutes · Get expert media consultation within 24 hours
					</p>
				</Reveal>
			</section>

			{/* STATS */}
			<section ref={statsRef} className="px-5 sm:px-8 lg:px-10 py-8 sm:py-10 lg:py-14">
				<div className="text-center max-w-[720px] mx-auto">
					<Reveal>
						<span className="text-xs font-bold tracking-[0.16em] uppercase text-adv-red">
							Reach that matters
						</span>
					</Reveal>
					<Reveal delay={100}>
						<h2 className="text-adv-ink mt-3.5 text-[26px] sm:text-[34px] lg:text-[44px] font-extrabold tracking-[-0.02em] leading-[1.16]">
							StartupNews&apos;s unparalleled scale across India&apos;s most trusted media
							platforms
						</h2>
					</Reveal>
				</div>
				<div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-y-10 gap-x-6 sm:gap-x-8 max-w-[1100px] mx-auto">
					{STATS.map((s, i) => (
						<StatTile key={s.label} stat={s} index={i} active={statsInView} />
					))}
				</div>
			</section>

			{/* WAYS TO WORK WITH US */}
			<section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-20 items-center px-5 sm:px-8 lg:px-10 py-10 sm:py-12 lg:py-16 bg-adv-panel">
				<div className="min-w-0">
					<Reveal direction="left">
						<h2 className="text-adv-ink text-[34px] sm:text-[48px] lg:text-[62px] font-black tracking-[-0.035em] leading-[1.02] uppercase">
							Ways to work
							<br />
							<span className="text-adv-red">with us</span>
						</h2>
					</Reveal>
					<ul className="list-none p-0 mt-10 grid gap-0">
						{WAYS.map((w, i) => (
							<Reveal
								key={w}
								as="li"
								direction="left"
								delay={150 + i * 100}
								className="grid grid-cols-[44px_1fr] gap-4 items-baseline py-5 border-t border-adv-line-2"
							>
								<span className="text-[13px] font-extrabold text-adv-red tracking-[0.08em]">
									{String(i + 1).padStart(2, "0")}
								</span>
								<span className="text-base sm:text-lg lg:text-xl font-bold tracking-[-0.01em] uppercase leading-[1.35]">
									{w}
								</span>
							</Reveal>
						))}
					</ul>
					<Reveal delay={150 + WAYS.length * 100 + 100}>
						<a
							href="#sn-form"
							className="inline-block mt-8 bg-adv-red hover:bg-adv-red-deep !text-white text-[15px] font-bold px-8 py-[15px] rounded-full"
						>
							Learn More
						</a>
					</Reveal>
				</div>
				<Reveal direction="right" delay={120}>
					<div className="relative h-[380px] sm:h-[460px] lg:h-[600px] min-w-0 rounded-[24px] overflow-hidden">
						<Image
							src="https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=1400&q=80&auto=format&fit=crop"
							alt="Ways to work with StartupNews.fyi"
							fill
							sizes="(min-width: 1024px) 40vw, 100vw"
							className="object-cover"
						/>
					</div>
				</Reveal>
			</section>

			{/* WHY CHOOSE STARTUPNEWS */}
			<section className="px-5 sm:px-8 lg:px-10 py-10 sm:py-12 lg:py-16 bg-adv-ink text-white">
				<Reveal direction="left">
					<h2 className="text-white text-[34px] sm:text-[48px] lg:text-[62px] font-black tracking-[-0.035em] leading-[1.02] uppercase">
						Why choose <span className="text-adv-red">StartupNews?</span>
					</h2>
				</Reveal>
				<Reveal delay={120}>
					<p className="mt-5 text-lg leading-[1.65] text-[#a8aeb6] max-w-[900px]">
						India&apos;s most credible media powerhouse, offering unmatched reach, precision,
						and performance. Experience the difference with our comprehensive media solutions
						and expert guidance.
					</p>
				</Reveal>
				<div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
					{WHY_CARDS.map((c, i) => (
						<Reveal key={c.title} delay={150 + i * 100}>
							<article className="border border-[#23272e] rounded-[20px] p-[30px] flex flex-col gap-3.5 min-w-0 h-full transition-transform duration-300 hover:-translate-y-1.5">
								<span className="text-[30px] sm:text-[38px] lg:text-[46px] font-black tracking-[-0.04em] leading-none text-[#3d434c]">
									{c.label}
								</span>
								<h3 className="text-white text-[22px] font-extrabold tracking-[-0.02em] leading-[1.35]">{c.title}</h3>
								<p className="text-base leading-[1.6] text-[#a8aeb6]">{c.body}</p>
							</article>
						</Reveal>
					))}
				</div>
			</section>

			{/* ENQUIRY FORM */}
			<section
				id="sn-form"
				className="grid grid-cols-1 lg:grid-cols-[0.75fr_1.25fr] gap-8 lg:gap-[72px] items-start px-5 sm:px-8 lg:px-10 pt-10 sm:pt-12 lg:pt-16 pb-8 sm:pb-10 lg:pb-12"
			>
				<Reveal direction="left" className="min-w-0">
					<h2 className="text-adv-ink text-[30px] sm:text-[40px] lg:text-[52px] font-black tracking-[-0.035em] leading-[1.05]">
						Ready to start your advertising journey?
					</h2>
					<p className="mt-5 text-lg leading-[1.65] text-adv-muted max-w-[46ch]">
						Tell us about your brand and campaign goals. Our team will get back to you
						within 24 hours with a custom media plan.
					</p>
					<p className="mt-6 text-[15px] leading-[1.6] text-adv-muted-2 max-w-[46ch]">
						Submit your advertising requirements and get expert media guidance across
						StartupNews&apos;s premium media portfolio.
					</p>
				</Reveal>

				<Reveal direction="right" delay={150} className="min-w-0 border border-adv-line rounded-[24px] p-6 sm:p-8">
					<form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
						<div className="min-w-0">
							<label htmlFor="firstName" className={FIELD_LABEL}>
								Your Name *
							</label>
							<input
								id="firstName"
								name="firstName"
								required
								value={formData.firstName}
								onChange={handleChange}
								placeholder="Jane Doe"
								className={FIELD_INPUT}
							/>
						</div>
						<div className="min-w-0">
							<label htmlFor="companyName" className={FIELD_LABEL}>
								Company Name *
							</label>
							<input
								id="companyName"
								name="companyName"
								required
								value={formData.companyName}
								onChange={handleChange}
								placeholder="Acme Inc."
								className={FIELD_INPUT}
							/>
						</div>
						<div className="min-w-0">
							<label htmlFor="email" className={FIELD_LABEL}>
								Email *
							</label>
							<input
								id="email"
								type="email"
								name="email"
								required
								value={formData.email}
								onChange={handleChange}
								placeholder="you@company.com"
								className={FIELD_INPUT}
							/>
						</div>
						<div className="min-w-0">
							<label htmlFor="phone" className={FIELD_LABEL}>
								Phone / WhatsApp *
							</label>
							<input
								id="phone"
								type="tel"
								name="phone"
								required
								value={formData.phone}
								onChange={handleChange}
								placeholder="+1 555 000 0000"
								className={FIELD_INPUT}
							/>
						</div>
						<div className="min-w-0">
							<label htmlFor="budgetRate" className={FIELD_LABEL}>
								Budget Range *
							</label>
							<input
								id="budgetRate"
								name="budgetRate"
								required
								value={formData.budgetRate}
								onChange={handleChange}
								placeholder="$5,000 – $10,000"
								className={FIELD_INPUT}
							/>
						</div>
						<div className="min-w-0">
							<label htmlFor="campaignGoal" className={FIELD_LABEL}>
								Campaign Goal *
							</label>
							<input
								id="campaignGoal"
								name="campaignGoal"
								required
								value={formData.campaignGoal}
								onChange={handleChange}
								placeholder="Brand awareness"
								className={FIELD_INPUT}
							/>
						</div>
						<div className="min-w-0 sm:col-span-2 lg:col-span-3">
							<label htmlFor="objective" className={FIELD_LABEL}>
								Tell us more *
							</label>
							<textarea
								id="objective"
								name="objective"
								required
								value={formData.objective}
								onChange={handleChange}
								placeholder="Share campaign details, timelines, and goals..."
								rows={5}
								className={`${FIELD_INPUT} min-h-[130px] resize-y`}
							/>
						</div>
						<div className="min-w-0 sm:col-span-2 lg:col-span-3 flex flex-col items-start gap-4 pt-1">
							<div className="w-full max-w-[360px]">
								<label className={FIELD_LABEL}>Security Verification *</label>
								<Turnstile
									ref={turnstileRef}
									siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
									options={{ theme: "light", size: "flexible" }}
									onSuccess={(token) => setTurnstileToken(token)}
									onExpire={() => setTurnstileToken(null)}
									onError={() => setTurnstileToken(null)}
								/>
							</div>
							<button
								type="submit"
								disabled={submitting || !turnstileToken}
								className="font-[inherit] text-[15px] font-bold px-8 py-[15px] rounded-full border-0 bg-adv-red hover:bg-adv-red-deep disabled:bg-adv-muted-2 text-white cursor-pointer disabled:cursor-not-allowed transition-colors"
							>
								{submitting ? "Sending..." : "Submit Your Enquiry Today"}
							</button>
						</div>
						<p className="sm:col-span-2 lg:col-span-3 text-[13px] leading-[1.6] text-adv-muted-2">
							By submitting this form, I agree to StartupNews.fyi contacting me in
							relation to this enquiry, as described in our{" "}
							<Link href="/privacy-policy" className="text-adv-red hover:text-adv-red-deep">
								Privacy Policy
							</Link>
							.
						</p>
					</form>
				</Reveal>
			</section>
		</div>
	);
}
