"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const SITE_FONT_FAMILY = '"Garnett", Helvetica, Arial, sans-serif';

const STATS = [
	{ num: "4+", label: "years tracking startups" },
	{ num: "500+", label: "startups covered" },
	{ num: "50K+", label: "monthly readers" },
	{ num: "4", label: "platforms live" },
];

const PILLARS = [
	{
		title: "Funding\nTracker",
		body: "Real-time coverage of India's funding rounds, from pre-seed to IPO.",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
				<path d="M12 2v20M17 5.5c0-1.9-2.2-3.5-5-3.5s-5 1.6-5 3.5S9.2 9 12 9s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5" />
			</svg>
		),
	},
	{
		title: "Founder\nStories",
		body: "In-depth interviews and profiles of the builders behind the headlines.",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
				<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
			</svg>
		),
	},
	{
		title: "Sector\nDeep-Dives",
		body: "Fintech, SaaS, D2C, DeepTech — mapped, analyzed, explained.",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
				<rect x="3" y="3" width="7" height="7" />
				<rect x="14" y="3" width="7" height="7" />
				<rect x="3" y="14" width="7" height="7" />
				<rect x="14" y="14" width="7" height="7" />
			</svg>
		),
	},
	{
		title: "AI\nSpotlight",
		body: "Tracking India's AI startups and the tools reshaping industries.",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
				<path d="M12 2l1.8 5.6L19 9l-5.2 1.4L12 16l-1.8-5.6L5 9l5.2-1.4z" />
			</svg>
		),
	},
	{
		title: "Events\nCoverage",
		body: "On-ground reporting from demo days, summits, and meetups.",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
				<rect x="3" y="4" width="18" height="17" rx="1" />
				<path d="M3 9h18M8 2v4M16 2v4" />
			</svg>
		),
	},
	{
		title: "Press &\nReports",
		body: "A distribution engine to reach India's tech ecosystem.",
		icon: (
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
				<path d="M14 2v6h6M9 13h6M9 17h6" />
			</svg>
		),
	},
];

// Icon-grid cell borders replicate the reference's hand-placed left/top-column and
// last-row rules exactly (6 fixed items — same approach the reference itself takes rather
// than a generic nth-child system, since a generic Tailwind equivalent isn't worth the
// abstraction for a fixed 6-cell grid).
function iconItemClass(i: number) {
	const rightCol = i % 2 === 1;
	const lastRow = i >= 4;
	return [
		"px-0 pb-[26px] pr-6",
		i < 2 ? "pt-[34px]" : "pt-[26px]", // uniform across breakpoints, matches the reference's own non-responsive inline style
		rightCol ? "border-t border-au-line md:border-t-0 md:border-l md:pl-7" : "pl-10",
		lastRow ? (i === 5 ? "border-b-0" : "border-b border-au-line md:border-b-0") : "border-b border-au-line",
	].join(" ");
}

export default function AboutPage() {
	const [activeDot, setActiveDot] = useState(0);

	return (
		<div className="bg-white py-2">
			<div
				className="max-w-[1200px] mx-auto my-10 bg-white border border-au-line text-au-ink"
				style={{ fontFamily: SITE_FONT_FAMILY }}
			>
				{/* HERO */}
				<div className="relative h-[260px] w-full bg-[#DAD2BF]">
					<Image
						src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1400&q=80&auto=format&fit=crop"
						alt="StartupNews.fyi team at work"
						fill
						sizes="1000px"
						className="object-cover object-[center_20%]"
						priority
					/>
				</div>

				{/* MAIN GRID */}
				<div className="grid grid-cols-1 md:grid-cols-[1.75fr_1fr]">
					{/* Row 1 */}
					<div className="p-5 py-[34px] md:px-10 md:border-r border-au-line border-b">
						<div className="text-2xl leading-[1.42] font-extrabold max-w-[480px]">
							As a startup media platform, we help founders{" "}
							<span className="text-au-fade font-semibold">
								get discovered, get funded, and get their story told right.
							</span>
						</div>
					</div>
					<div className="p-5 py-[34px] md:px-10 border-b border-au-line">
						<h3 className="text-[13px] font-bold mb-7">About Us</h3>
						<div className="grid grid-cols-2 gap-y-[30px] gap-x-4">
							{STATS.map((s) => (
								<div key={s.label}>
									<div className="text-[26px] font-extrabold text-au-pink leading-none">{s.num}</div>
									<div className="text-[11.5px] text-au-muted mt-1.5 leading-[1.35]">{s.label}</div>
								</div>
							))}
						</div>
					</div>

					{/* Row 2 */}
					<div className="p-5 py-[34px] md:px-10 md:border-r border-au-line border-b">
						<div className="relative h-[230px] cursor-pointer">
							<Image
								src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=900&q=80&auto=format&fit=crop"
								alt="Founder's note video thumbnail"
								fill
								sizes="600px"
								className="object-cover"
							/>
							<div className="absolute top-4 left-4 w-[34px] h-[34px] rounded-full bg-white/92 flex items-center justify-center">
								<span className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[10px] border-l-au-pink-deep ml-0.5" />
							</div>
						</div>
					</div>
					<div className="p-5 py-[34px] md:px-10 border-b border-au-line">
						<h2 className="text-[19px] font-extrabold leading-[1.3] mb-3.5">Get to know us better</h2>
						<p className="text-[12.5px] text-au-muted leading-[1.6] mb-9">
							Watch a one-minute video about how we got started and where we&apos;re headed next.
						</p>
						<div className="flex gap-2">
							{[0, 1, 2].map((i) => (
								<button
									key={i}
									aria-label={`Slide ${i + 1}`}
									onClick={() => setActiveDot(i)}
									className={`w-[9px] h-[9px] rounded-full bg-au-pink border-0 cursor-pointer p-0 ${
										activeDot === i ? "opacity-100" : "opacity-35"
									}`}
								/>
							))}
						</div>
					</div>

					{/* Row 3 */}
					<div className="md:border-r border-au-line">
						<div className="grid grid-cols-1 md:grid-cols-2">
							{PILLARS.map((p, i) => (
								<div key={p.title} className={iconItemClass(i)}>
									<div className="w-6 h-6 text-au-ink mb-3.5">{p.icon}</div>
									<h4 className="text-[14.5px] font-bold mb-2 leading-[1.3] whitespace-pre-line">{p.title}</h4>
									<p className="text-xs text-au-muted leading-[1.55] m-0">{p.body}</p>
								</div>
							))}
						</div>
					</div>
					<div className="p-5 py-[34px] md:px-10">
						<h3 className="text-[13px] font-bold mb-4">What We Do</h3>
						<p className="text-[12.5px] text-au-muted leading-[1.65] mb-10">
							We&apos;re the media engine for India&apos;s startup ecosystem, publishing across Instagram,
							LinkedIn, WhatsApp and web every day.
						</p>
						<Link
							href="/advertise-with-us"
							className="inline-block bg-au-pink hover:bg-au-pink-deep !text-white px-[22px] py-[11px] rounded-[5px] text-[13px] font-bold no-underline"
						>
							Partner with us
						</Link>
					</div>
				</div>

				{/* FOOTER */}
				<div className="px-10 py-5 text-[11.5px] text-au-muted border-t border-au-line flex flex-wrap gap-2">
					<span>Bengaluru · India</span>
				</div>
			</div>
		</div>
	);
}
