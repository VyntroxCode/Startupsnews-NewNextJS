"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { trackEvent } from "@/lib/analytics";

const FIELD_LABEL = "block text-[13px] font-semibold text-adv-ink mb-2";

const FIELD_INPUT =
	"block w-full font-[inherit] text-[15px] leading-[1.4] px-4 py-3 border border-adv-line-2 rounded-xl bg-white text-adv-ink placeholder:text-adv-muted-2 transition-colors focus:outline-none focus:border-adv-red focus:ring-2 focus:ring-adv-red/15";

/** The enquiry form is the only interactive part of Advertise With Us — kept as a client
 * island so the rest of the page renders on the server. */
export function AdvertiseEnquiryForm() {
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
	);
}
