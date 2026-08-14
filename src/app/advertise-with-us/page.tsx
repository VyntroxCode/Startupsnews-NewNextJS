"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
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
			{/* Eyebrow */}
			<div className="px-5 sm:px-8 lg:px-10 pt-6 text-center">
				<h1 className="text-[28px] sm:text-[36px] font-bold tracking-[0.04em] uppercase text-adv-ink">
					Advertise with us
				</h1>
			</div>

			{/* HERO */}
			<section className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-7 lg:gap-[72px] items-center px-5 sm:px-8 lg:px-10 py-6 sm:py-10 lg:py-[52px]">
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
				<div className="relative flex flex-col gap-0.5 min-w-0">
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
				</div>
			</section>

			{/* REACH THE MOST ENGAGED AUDIENCE */}
			<section className="grid grid-cols-1 lg:grid-cols-2 gap-7 lg:gap-[72px] items-start px-5 sm:px-8 lg:px-10 py-9 sm:py-14 lg:py-[88px] bg-adv-panel border-t border-adv-line">
				<h2 className="text-adv-ink text-[26px] sm:text-[34px] lg:text-[44px] font-extrabold tracking-[-0.02em] leading-[1.14] uppercase max-w-[18ch]">
					Reach the most engaged startup &amp; tech audience
				</h2>
				<div className="flex flex-col gap-7 items-start min-w-0">
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
				</div>
			</section>

			{/* STATS */}
			<section className="px-5 sm:px-8 lg:px-10 py-9 sm:py-14 lg:py-[88px]">
				<span className="text-xs font-bold tracking-[0.16em] uppercase text-adv-red">
					Reach that matters
				</span>
				<h2 className="text-adv-ink mt-3.5 text-[26px] sm:text-[34px] lg:text-[44px] font-extrabold tracking-[-0.02em] leading-[1.16] max-w-[26ch]">
					StartupNews&apos;s unparalleled scale across India&apos;s most trusted media
					platforms
				</h2>
				<div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-px bg-adv-line border border-adv-line rounded-[20px] overflow-hidden">
					{STATS.map((s) => (
						<div key={s.label} className="bg-white px-6 py-[30px] flex flex-col gap-1.5 min-w-0">
							<span className="text-[26px] sm:text-[32px] lg:text-[38px] font-black tracking-[-0.03em] text-adv-red">
								{s.value}
							</span>
							<span className="text-[13px] font-semibold text-adv-muted leading-[1.4]">
								{s.label}
							</span>
						</div>
					))}
				</div>
			</section>

			{/* WAYS TO WORK WITH US */}
			<section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-20 items-center px-5 sm:px-8 lg:px-10 py-12 lg:py-[104px] bg-adv-panel border-t border-adv-line">
				<div className="min-w-0">
					<h2 className="text-adv-ink text-[34px] sm:text-[48px] lg:text-[62px] font-black tracking-[-0.035em] leading-[1.02] uppercase">
						Ways to work
						<br />
						<span className="text-adv-red">with us</span>
					</h2>
					<ul className="list-none p-0 mt-10 grid gap-0">
						{WAYS.map((w, i) => (
							<li
								key={w}
								className={`grid grid-cols-[44px_1fr] gap-4 items-baseline py-5 border-t border-adv-line-2 ${
									i === WAYS.length - 1 ? "border-b" : ""
								}`}
							>
								<span className="text-[13px] font-extrabold text-adv-red tracking-[0.08em]">
									{String(i + 1).padStart(2, "0")}
								</span>
								<span className="text-base sm:text-lg lg:text-xl font-bold tracking-[-0.01em] uppercase leading-[1.35]">
									{w}
								</span>
							</li>
						))}
					</ul>
					<a
						href="#sn-form"
						className="inline-block mt-8 bg-adv-red hover:bg-adv-red-deep !text-white text-[15px] font-bold px-8 py-[15px] rounded-full"
					>
						Learn More
					</a>
				</div>
				<div className="relative h-[380px] sm:h-[460px] lg:h-[600px] min-w-0 rounded-[24px] overflow-hidden">
					<Image
						src="https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=1400&q=80&auto=format&fit=crop"
						alt="Ways to work with StartupNews.fyi"
						fill
						sizes="(min-width: 1024px) 40vw, 100vw"
						className="object-cover"
					/>
				</div>
			</section>

			{/* WHY CHOOSE STARTUPNEWS */}
			<section className="px-5 sm:px-8 lg:px-10 py-12 lg:py-[104px] bg-adv-ink text-white">
				<h2 className="text-white text-[34px] sm:text-[48px] lg:text-[62px] font-black tracking-[-0.035em] leading-[1.02] uppercase">
					Why choose <span className="text-adv-red">StartupNews?</span>
				</h2>
				<p className="mt-5 text-lg leading-[1.65] text-[#a8aeb6] max-w-[62ch]">
					India&apos;s most credible media powerhouse, offering unmatched reach, precision,
					and performance. Experience the difference with our comprehensive media solutions
					and expert guidance.
				</p>
				<div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
					{WHY_CARDS.map((c) => (
						<article
							key={c.title}
							className="border border-[#23272e] rounded-[20px] p-[30px] flex flex-col gap-3.5 min-w-0"
						>
							<span className="text-[30px] sm:text-[38px] lg:text-[46px] font-black tracking-[-0.04em] leading-none text-[#3d434c]">
								{c.label}
							</span>
							<h3 className="text-white text-[22px] font-extrabold tracking-[-0.02em] leading-[1.35]">{c.title}</h3>
							<p className="text-base leading-[1.6] text-[#a8aeb6]">{c.body}</p>
						</article>
					))}
				</div>
			</section>

			{/* ENQUIRY FORM */}
			<section
				id="sn-form"
				className="grid grid-cols-1 lg:grid-cols-[0.75fr_1.25fr] gap-8 lg:gap-[72px] items-start px-5 sm:px-8 lg:px-10 py-12 lg:py-[104px]"
			>
				<div className="min-w-0">
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
				</div>

				<div className="min-w-0 border border-adv-line rounded-[24px] p-6 sm:p-8">
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
							<Turnstile
								ref={turnstileRef}
								siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
								onSuccess={(token) => setTurnstileToken(token)}
								onExpire={() => setTurnstileToken(null)}
								onError={() => setTurnstileToken(null)}
							/>
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
				</div>
			</section>
		</div>
	);
}
