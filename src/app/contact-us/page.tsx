import Link from "next/link";
import { MapPin, Phone, Mail, Megaphone, Briefcase, MessageCircle, ArrowUpRight } from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { PageHeading } from "@/components/PageHeading";
import { getInnerPageContent } from "@/lib/data-adapter";
import { ContactForm } from "./ContactForm";

export const revalidate = 60;

const SITE_FONT_FAMILY = '"Garnett", Helvetica, Arial, sans-serif';

const ADDRESS_LINES = ["1553 A-8, West Rohtash Nagar", "Shahdara, Delhi - 110032"];
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
	"1553 A-8, West Rohtash Nagar, Shahdara, Delhi 110032"
)}`;
const PHONE_DISPLAY = "+91-96259 52588";
const PHONE_HREF = "tel:+919625952588";

const TEAMS = [
	{
		icon: Megaphone,
		title: "Press",
		body: "Press enquiries and press releases",
		linkLabel: "publishing@startupnews.fyi",
		href: "mailto:publishing@startupnews.fyi",
	},
	{
		icon: Briefcase,
		title: "Careers",
		body: "See open roles and how to apply",
		linkLabel: "Careers page",
		href: "/careers",
	},
	{
		icon: MessageCircle,
		title: "Quick support",
		body: "Chat with us using the widget at the bottom right of this page",
		linkLabel: null,
		href: null,
	},
];

const CARD = "rounded-[20px] border border-cr-line bg-white p-5 sm:p-6";
const ICON_BOX =
	"flex items-center justify-center w-11 h-11 shrink-0 rounded-xl bg-cr-panel text-cr-pink";
const LINK = "text-cr-pink hover:text-cr-pink-deep font-semibold no-underline";

export default async function ContactUsPage() {
	// Optional extra copy an admin can add from Inner Pages → Contact Us; shown under the form.
	const contentHtml = await getInnerPageContent("contact-us");

	return (
		<div className="bg-white text-cr-ink overflow-x-hidden" style={{ fontFamily: SITE_FONT_FAMILY }}>
			<div className="mvp-main-box event-by-country-container">
				<PageBreadcrumb current="Contact Us" />
			</div>
			<PageHeading title="Contact Us" />

			<div className="max-w-[1200px] mx-auto px-4 sm:px-8 lg:px-10 pb-16 sm:pb-20">
				<p className="text-center text-[16px] sm:text-[17px] leading-[1.7] text-cr-muted max-w-[640px] mx-auto mt-2 mb-10 sm:mb-14">
					Have a story, a question or an idea to work together? Send us a message and our team will
					get back to you, or reach us directly using the details below.
				</p>

				<div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8 lg:gap-12 items-start">
					{/* Direct contact details */}
					<aside className="flex flex-col gap-4 min-w-0">
						<div className={CARD}>
							<div className="flex gap-4">
								<span className={ICON_BOX}>
									<MapPin className="w-5 h-5" aria-hidden />
								</span>
								<div className="min-w-0">
									<h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-cr-muted m-0 mb-1.5">
										Registered Address
									</h2>
									<address className="not-italic text-[15px] leading-[1.6] text-cr-ink">
										{ADDRESS_LINES.map((line) => (
											<span key={line} className="block">
												{line}
											</span>
										))}
									</address>
									<a
										href={MAPS_URL}
										target="_blank"
										rel="noopener noreferrer"
										className={`${LINK} inline-flex items-center gap-1 mt-2 text-[14px]`}
									>
										Open in Google Maps
										<ArrowUpRight className="w-4 h-4" aria-hidden />
									</a>
								</div>
							</div>
						</div>

						<div className={CARD}>
							<div className="flex gap-4">
								<span className={ICON_BOX}>
									<Phone className="w-5 h-5" aria-hidden />
								</span>
								<div className="min-w-0">
									<h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-cr-muted m-0 mb-1.5">
										Contact No.
									</h2>
									<a href={PHONE_HREF} className={`${LINK} text-[17px]`}>
										{PHONE_DISPLAY}
									</a>
								</div>
							</div>
						</div>

						<div className={CARD}>
							<div className="flex gap-4">
								<span className={ICON_BOX}>
									<Mail className="w-5 h-5" aria-hidden />
								</span>
								<div className="min-w-0">
									<h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-cr-muted m-0 mb-1.5">
										Email
									</h2>
									<a href="mailto:office@startupnews.fyi" className={`${LINK} text-[17px] break-all`}>
										office@startupnews.fyi
									</a>
								</div>
							</div>
						</div>

						<div className="rounded-[20px] bg-cr-panel p-5 sm:p-6 mt-2">
							<h2 className="text-[16px] font-bold text-cr-ink m-0 mb-4">Reach a specific team</h2>
							<ul className="list-none m-0 p-0 flex flex-col gap-4">
								{TEAMS.map(({ icon: Icon, title, body, linkLabel, href }) => (
									<li key={title} className="flex gap-3">
										<Icon className="w-5 h-5 mt-0.5 shrink-0 text-cr-pink" aria-hidden />
										<div className="min-w-0 text-[14px] leading-[1.6]">
											<span className="block font-semibold text-cr-ink">{title}</span>
											<span className="block text-cr-muted">{body}</span>
											{href &&
												(href.startsWith("/") ? (
													<Link href={href} className={LINK}>
														{linkLabel}
													</Link>
												) : (
													<a href={href} className={`${LINK} break-all`}>
														{linkLabel}
													</a>
												))}
										</div>
									</li>
								))}
							</ul>
						</div>
					</aside>

					{/* Get in touch form */}
					<section
						id="get-in-touch"
						className="min-w-0 rounded-[24px] border border-cr-line bg-white p-5 sm:p-8 lg:p-10 shadow-[0_20px_60px_-30px_rgba(20,19,26,0.25)]"
					>
						<span className="inline-block text-[12px] font-bold uppercase tracking-[0.12em] text-cr-pink mb-2">
							Get in touch
						</span>
						<h2 className="text-[26px] sm:text-[30px] leading-[1.2] font-bold text-cr-ink m-0 mb-2">
							Send us a message
						</h2>
						<p className="text-[15px] leading-[1.6] text-cr-muted m-0 mb-7">
							Fill in the form and it lands straight in our office inbox. We usually reply within one
							working day.
						</p>
						<ContactForm />
					</section>
				</div>

				{contentHtml && (
					<section
						className="mt-12 sm:mt-16 text-[15px] leading-[1.7] text-cr-ink"
						dangerouslySetInnerHTML={{ __html: contentHtml }}
					/>
				)}
			</div>
		</div>
	);
}
