import Image from "next/image";
import Link from "next/link";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { PageHeading } from "@/components/PageHeading";
import { Reveal, StatsSection } from "@/components/marketing/Reveal";
import { getPromotedCityOptions } from "@/lib/data-adapter";
import { LEAD_FONT_FAMILY, leadPageFont } from "@/lib/lead-page-font";
import { AdvertiseEnquiryForm } from "./AdvertiseEnquiryForm";

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

// Fetched here rather than in the client form, as the other lead pages do: the enquiry form's City
// dropdown is then complete on first paint. Re-read every 5 minutes, the list's own cache window.
export const revalidate = 300;

export default async function AdvertisePage() {
	const promotedCities = await getPromotedCityOptions();
	return (
		<div className={`bg-white text-adv-ink overflow-x-hidden ${leadPageFont.variable}`} style={{ fontFamily: LEAD_FONT_FAMILY }}>
			{/* Breadcrumb + page title — aligned to the site's standard 1200px nav width */}
			<div className="mvp-main-box event-by-country-container">
				<PageBreadcrumb current="Advertise With Us" />
			</div>
			<PageHeading title="Advertise With Us" />

			{/* Everything below is capped at the site's standard 1200px width instead of
			    stretching edge-to-edge on wide screens. */}
			<div className="max-w-[1200px] mx-auto">

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
					<span className="relative text-[clamp(48px,8.2vw,100px)] font-black tracking-[-0.045em] leading-[0.94] text-adv-ink">
						Make
					</span>
					<span className="relative text-[clamp(48px,8.2vw,100px)] font-black tracking-[-0.045em] leading-[0.94] text-adv-ink">
						Your Brand
					</span>
					<span className="relative text-[clamp(48px,8.2vw,100px)] font-black tracking-[-0.045em] leading-[0.94] text-adv-red">
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
						StartupNews.fyi connects your brand with 10M+ monthly readers: founders,
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
				</Reveal>
			</section>

			{/* STATS */}
			<StatsSection
				stats={STATS}
				className="px-5 sm:px-8 lg:px-10 py-8 sm:py-10 lg:py-14"
				valueClassName="text-adv-red"
				labelClassName="text-adv-muted"
			>
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
			</StatsSection>

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
								className="grid grid-cols-[22px_1fr] gap-4 items-baseline py-5 border-t border-adv-line-2"
							>
								{/* Marker, not a counter — these five are alternatives to pick from, and numbering
								    them implied an order or a ranking that doesn't exist. A glyph rather than an
								    SVG so it shares the label's baseline for free: `items-baseline` would align an
								    SVG by its bottom edge, needing a hand-tuned nudge that drifts at other sizes.
								    aria-hidden so the item still reads as just its text. */}
								<span className="text-adv-red text-xl font-bold leading-none" aria-hidden="true">
									&rarr;
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
							<article className="border border-[#23272e] rounded-[20px] p-[30px] flex flex-col gap-3.5 min-w-0 h-full overflow-hidden transition-transform duration-300 hover:-translate-y-1.5">
								<span className="block text-[26px] sm:text-[30px] font-black tracking-[-0.04em] leading-none text-[#3d434c] whitespace-nowrap">
									{c.label}
								</span>
								<h3 className="text-white text-[22px] font-extrabold tracking-[-0.02em] leading-[1.35]">{c.title}</h3>
								<p className="text-base leading-[1.6] text-[#a8aeb6]">{c.body}</p>
							</article>
						</Reveal>
					))}
				</div>
			</section>

			{/* ENQUIRY FORM — scroll-mt so the sticky nav doesn't cover the top fields when
			    "#sn-form" links (Learn More / Submit Your Advertising Enquiry) jump here.
			    Stacked, not side by side: the form needs the full 1200px row for its three columns. */}
			<section
				id="sn-form"
				className="flex flex-col gap-8 lg:gap-10 px-5 sm:px-8 lg:px-10 pt-10 sm:pt-12 lg:pt-16 pb-6 sm:pb-8 lg:pb-10 scroll-mt-24"
			>
				<Reveal direction="left" className="min-w-0">
					<h2 className="text-adv-ink text-[30px] sm:text-[40px] lg:text-[52px] font-black tracking-[-0.035em] leading-[1.05]">
						Ready to start your advertising journey?
					</h2>
					<p className="mt-5 text-lg leading-[1.65] text-adv-muted max-w-[720px]">
						Tell us about your brand and campaign goals. Our team will get back to you
						within 24 hours with a custom media plan.
					</p>
					<p className="mt-3 text-[15px] leading-[1.6] text-adv-muted-2 max-w-[720px]">
						Submit your advertising requirements and get expert media guidance across
						StartupNews&apos;s premium media portfolio.
					</p>
				</Reveal>

				<Reveal direction="right" delay={150} className="min-w-0 border border-adv-line rounded-[24px] p-6 sm:p-8">
					<AdvertiseEnquiryForm promotedCities={promotedCities} />
				</Reveal>
			</section>
			</div>
		</div>
	);
}
