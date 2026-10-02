import { LogoGrid, RevealSection, ScrollToLink } from "./EcosystemPartnersClient";

const SITE_FONT_FAMILY = '"Garnett", Helvetica, Arial, sans-serif';

const GRADIENT = "linear-gradient(120deg,#E91E63,#667EEA)";

type Country = {
	id: string;
	flag: string;
	name: string;
	subtitle: string;
	blurb: string;
	logoCount: number;
};

const COUNTRIES: Country[] = [
	{
		id: "usa",
		flag: "🇺🇸",
		name: "United States",
		subtitle: "Media & ecosystem partners across the US",
		blurb: "Coverage and collaboration spanning US startup hubs, from biotech expos to mobility and robotics events.",
		logoCount: 6,
	},
	{
		id: "uae",
		flag: "🇦🇪",
		name: "United Arab Emirates",
		subtitle: "Dubai & Abu Dhabi ecosystem partners",
		blurb: "Trusted media relationships with Gulf innovation summits, fintech showcases and business councils.",
		logoCount: 5,
	},
	{
		id: "uk",
		flag: "🇬🇧",
		name: "United Kingdom",
		subtitle: "London-based ecosystem & media partners",
		blurb: "Supporting the UK's mobility, fintech and biotech innovation community.",
		logoCount: 4,
	},
	{
		id: "singapore",
		flag: "🇸🇬",
		name: "Singapore",
		subtitle: "Southeast Asia ecosystem partners",
		blurb: "Connected to Singapore's fintech week and sustainability-focused startup events.",
		logoCount: 3,
	},
	{
		id: "india",
		flag: "🇮🇳",
		name: "India",
		subtitle: "Ecosystem & media partners across Indian startup hubs",
		blurb:
			"From IIT & IIM e-cells to accelerators, VC funds and founder mixers in Bengaluru, Mumbai, Delhi NCR, Ahmedabad and Pune — one of our most active partner networks.",
		logoCount: 10,
	},
	{
		id: "egypt",
		flag: "🇪🇬",
		name: "Egypt",
		subtitle: "North Africa ecosystem partners",
		blurb: "Official media partner relationships with North Africa's banking & fintech summits.",
		logoCount: 2,
	},
	{
		id: "kenya",
		flag: "🇰🇪",
		name: "Kenya",
		subtitle: "East Africa ecosystem partners",
		blurb: "Backing East Africa's food-tech and digital economy showcases.",
		logoCount: 2,
	},
	{
		id: "hongkong",
		flag: "🇭🇰",
		name: "Hong Kong",
		subtitle: "East Asia ecosystem partners",
		blurb: "Aligned with Asia's medtech and healthcare innovation circuit.",
		logoCount: 2,
	},
	{
		id: "more",
		flag: "🌍",
		name: "More Regions",
		subtitle: "Our footprint keeps growing — this section scales automatically",
		blurb:
			"Duplicate this section and rename it for the next country we partner in — the grid below reflows on its own as logos are added.",
		logoCount: 0,
	},
];

const STATS = [
	{ value: "24+", label: "Countries" },
	{ value: "150+", label: "Ecosystem Partners" },
	{ value: "2M+", label: "Monthly Readers" },
];

export default function EcosystemPartnersPage() {
	return (
		<div className="bg-white text-[#1E293B]" style={{ fontFamily: SITE_FONT_FAMILY }}>
			{/* TOP BAR */}
			<header className="sticky top-0 z-40 flex items-center justify-center px-4 sm:px-7 py-4 sm:py-5 bg-white/92 backdrop-blur-md border-b border-[#E6E9F0]">
				<ScrollToLink
					targetId="partner-cta"
					className="text-[22px] sm:text-[28px] font-bold text-[#1E293B] tracking-[-0.02em] whitespace-nowrap transition-colors hover:text-[#E91E63]"
				>
					Become a Partner
				</ScrollToLink>
			</header>

			{/* HERO */}
			<section
				className="relative px-4 sm:px-6 pt-11 sm:pt-16 pb-9 sm:pb-12 text-center overflow-hidden"
				style={{
					backgroundImage:
						"radial-gradient(ellipse 60% 90% at 15% 0%, rgba(233,30,99,0.07), transparent 60%), radial-gradient(ellipse 60% 90% at 85% 0%, rgba(102,126,234,0.08), transparent 60%)",
				}}
			>
				<span className="inline-flex items-center gap-2 text-[18px] sm:text-[22px] font-bold tracking-[0.08em] uppercase text-[#E91E63] mb-[18px]">
					Ecosystem Partners
				</span>
				<h1
					className={`text-[30px] sm:text-[40px] lg:text-[48px] leading-[1.08] tracking-[-0.03em] font-bold max-w-[820px] mx-auto mb-4`}
				>
					<span className="text-[#1E293B]">One newsroom,</span>{" "}
					<span className="text-[#E91E63]">every startup ecosystem</span>
				</h1>
				<p className="max-w-[600px] mx-auto text-[#475569] text-[16.5px] leading-[1.6]">
					StartupNews.fyi covers founders, funding and innovation wherever it&apos;s happening — with no single
					market at the centre. These are the organisations we stand alongside, market by market.
				</p>
				<div className="flex flex-wrap justify-center gap-3.5 mt-9">
					{STATS.map((s) => (
						<div
							key={s.label}
							className="bg-white border border-[#E6E9F0] rounded-xl px-[18px] sm:px-[26px] py-3.5 sm:py-4 min-w-[100px] sm:min-w-[130px] shadow-[0_6px_18px_rgba(30,41,59,0.06)]"
						>
							<b className={`block text-2xl font-bold`}>{s.value}</b>
							<span className="text-[12.5px] text-[#64748B] font-semibold uppercase tracking-[0.04em]">
								{s.label}
							</span>
						</div>
					))}
				</div>
			</section>

			{/* COUNTRY SECTIONS */}
			{COUNTRIES.map((c, idx) => (
				<RevealSection
					key={c.id}
					id={c.id}
					className={`px-4 sm:px-6 py-9 sm:py-[52px] max-w-[1180px] mx-auto scroll-mt-[120px] transition-all duration-700 ease-out motion-reduce:!transition-none motion-reduce:!opacity-100 motion-reduce:!translate-y-0 ${
						idx % 2 === 1 ? "bg-[#F8F9FC]" : ""
					}`}
				>
					<div className="flex items-center gap-4 flex-wrap mb-1.5">
						<div className="w-11 h-11 sm:w-[52px] sm:h-[52px] rounded-full border-2 border-dashed border-[#E91E63] flex items-center justify-center text-xl sm:text-2xl -rotate-6 bg-white shrink-0">
							{c.flag}
						</div>
						<div>
							<h2 className={`text-2xl font-bold tracking-[-0.01em] m-0`}>{c.name}</h2>
						</div>
					</div>
					<p className="text-[#475569] text-[14.5px] leading-[1.6] max-w-[640px] mt-3.5 mb-[26px]">{c.blurb}</p>
					<LogoGrid count={c.logoCount} sectionId={c.id} />
				</RevealSection>
			))}

			{/* CTA */}
			<section id="partner-cta" className="text-center px-4 sm:px-6 py-16 bg-[#1E293B] text-white">
				<h3 className={`text-[26px] tracking-[-0.02em] mb-2.5`}>Want to see your logo here?</h3>
				<p className="text-[#B9C2D0] max-w-[480px] mx-auto mb-[26px] text-[15px] leading-[1.6]">
					Partner with StartupNews.fyi as a media, ecosystem or community partner for your next startup event.
				</p>
				<div className="flex gap-3 justify-center flex-wrap">
					<a
						href="https://startupnews.fyi/contact-us"
						className="px-[26px] py-3 rounded-full font-semibold text-[14.5px] text-white transition-opacity hover:opacity-90"
						style={{ backgroundImage: GRADIENT }}
					>
						Get in Touch
					</a>
					<a
						href="https://startupnews.fyi/advertise-with-us"
						className="px-[26px] py-3 rounded-full font-semibold text-[14.5px] border-[1.5px] border-[#47536A] text-white transition-colors hover:border-white"
					>
						Advertise With Us
					</a>
				</div>
			</section>

		</div>
	);
}
