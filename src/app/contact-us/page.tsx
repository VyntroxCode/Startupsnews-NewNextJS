import { MapPin, Phone, Mail, Megaphone, MessageCircle } from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { PageHeading } from "@/components/PageHeading";
import { getInnerPageContent } from "@/lib/data-adapter";
import { ContactForm } from "./ContactForm";

export const revalidate = 60;

const SITE_FONT_FAMILY = '"Garnett", Helvetica, Arial, sans-serif';

const ADDRESS_LINES = ["1553 A-8, West Rohtash Nagar", "Shahdara, Delhi - 110032"];

// Shown top to bottom in this order; every card is the same size.
const CONTACT_CARDS = [
	{
		icon: Mail,
		title: "Email",
		linkLabel: "office@startupnews.fyi",
		href: "mailto:office@startupnews.fyi",
	},
	{
		icon: Phone,
		title: "Contact No.",
		linkLabel: "+91-96259 52588",
		href: "tel:+919625952588",
	},
	{
		icon: MessageCircle,
		title: "WhatsApp",
		linkLabel: "+91-96259 52588",
		href: "https://wa.me/919625952588",
	},
	{
		icon: Megaphone,
		title: "Press",
		linkLabel: "publishing@startupnews.fyi",
		href: "mailto:publishing@startupnews.fyi",
	},
];

const CARD =
	"box-border flex items-center gap-4 rounded-[20px] border border-cr-line bg-white p-5 sm:p-6";
const CARD_LABEL =
	"text-[13px] font-semibold uppercase tracking-[0.08em] text-cr-muted m-0 mb-1.5";
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
					<aside className="grid grid-cols-1 auto-rows-fr gap-4 min-w-0">
						{CONTACT_CARDS.map(({ icon: Icon, title, linkLabel, href }) => (
							<div key={title} className={CARD}>
								<span className={ICON_BOX}>
									<Icon className="w-5 h-5" aria-hidden />
								</span>
								<div className="min-w-0">
									<h2 className={CARD_LABEL}>{title}</h2>
									<a
										href={href}
										className={`${LINK} text-[17px] break-all`}
										{...(href.startsWith("https://") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
									>
										{linkLabel}
									</a>
								</div>
							</div>
						))}

						<div className={CARD}>
							<span className={ICON_BOX}>
								<MapPin className="w-5 h-5" aria-hidden />
							</span>
							<div className="min-w-0">
								<h2 className={CARD_LABEL}>Office</h2>
								<address className="not-italic text-[15px] leading-[1.6] text-cr-ink">
									{ADDRESS_LINES.map((line) => (
										<span key={line} className="block">
											{line}
										</span>
									))}
								</address>
							</div>
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
