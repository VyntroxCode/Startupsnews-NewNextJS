"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { CheckCircle2, ChevronDown, Send } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { CONTACT_TOPICS } from "./topics";

const FIELD_LABEL = "block text-[13px] font-semibold text-cr-ink mb-2";

const FIELD_INPUT =
	"block w-full box-border m-0 font-[inherit] text-[15px] leading-[1.4] px-4 py-3 border border-cr-line rounded-xl bg-white text-cr-ink placeholder:text-cr-muted-2 transition-colors focus:outline-none focus:border-cr-pink focus:ring-2 focus:ring-cr-pink/15";

const EMPTY_FORM = {
	name: "",
	email: "",
	phone: "",
	company: "",
	topic: CONTACT_TOPICS[0] as string,
	message: "",
};

/** "Get in touch" form on /contact-us. Posts to /api/contact, which emails office@startupnews.fyi
 * with the sender as reply-to. */
export function ContactForm() {
	const [formData, setFormData] = useState(EMPTY_FORM);
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [sentTo, setSentTo] = useState<string | null>(null);
	const turnstileRef = useRef<TurnstileInstance>(null);

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({ ...prev, [name]: value }));
	};

	const resetCaptcha = () => {
		turnstileRef.current?.reset();
		setTurnstileToken(null);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!turnstileToken) {
			setError("Please complete the security check.");
			return;
		}

		setSubmitting(true);
		const response = await fetch("/api/contact", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...formData, turnstileToken }),
		}).catch(() => null);
		const result = await response?.json().catch(() => null);
		setSubmitting(false);

		if (!response?.ok || !result?.success) {
			setError(result?.error || "We couldn't send your message. Please try again.");
			resetCaptcha();
			return;
		}

		trackEvent("generate_lead", { form: "contact_us" });
		setSentTo(formData.email);
		setFormData(EMPTY_FORM);
		resetCaptcha();
	};

	if (sentTo) {
		return (
			<div className="flex flex-col items-center text-center gap-4 py-12 px-4">
				<CheckCircle2 className="w-14 h-14 text-cr-pink" strokeWidth={1.6} aria-hidden />
				<h3 className="text-[22px] font-bold text-cr-ink m-0">Thanks, your message is on its way</h3>
				<p className="text-[15px] leading-[1.6] text-cr-muted max-w-[420px] m-0">
					Our team will reply to <span className="font-semibold text-cr-ink">{sentTo}</span>, usually
					within one working day.
				</p>
				<button
					type="button"
					onClick={() => setSentTo(null)}
					className="mt-2 font-[inherit] text-[14px] font-semibold px-6 py-3 rounded-full border border-cr-line bg-white text-cr-ink hover:border-cr-pink hover:text-cr-pink cursor-pointer transition-colors"
				>
					Send another message
				</button>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
			<div className="min-w-0">
				<label htmlFor="cu-name" className={FIELD_LABEL}>
					Your Name *
				</label>
				<input
					id="cu-name"
					name="name"
					required
					maxLength={120}
					value={formData.name}
					onChange={handleChange}
					placeholder="Jane Doe"
					className={FIELD_INPUT}
				/>
			</div>
			<div className="min-w-0">
				<label htmlFor="cu-email" className={FIELD_LABEL}>
					Email *
				</label>
				<input
					id="cu-email"
					type="email"
					name="email"
					required
					maxLength={200}
					value={formData.email}
					onChange={handleChange}
					placeholder="you@company.com"
					className={FIELD_INPUT}
				/>
			</div>
			<div className="min-w-0">
				<label htmlFor="cu-phone" className={FIELD_LABEL}>
					Phone / WhatsApp
				</label>
				<input
					id="cu-phone"
					type="tel"
					name="phone"
					maxLength={40}
					value={formData.phone}
					onChange={handleChange}
					placeholder="+91 98765 43210"
					className={FIELD_INPUT}
				/>
			</div>
			<div className="min-w-0">
				<label htmlFor="cu-company" className={FIELD_LABEL}>
					Company
				</label>
				<input
					id="cu-company"
					name="company"
					maxLength={160}
					value={formData.company}
					onChange={handleChange}
					placeholder="Acme Inc."
					className={FIELD_INPUT}
				/>
			</div>
			<div className="min-w-0 sm:col-span-2">
				<label htmlFor="cu-topic" className={FIELD_LABEL}>
					What is this about? *
				</label>
				<div className="relative">
					<select
						id="cu-topic"
						name="topic"
						required
						value={formData.topic}
						onChange={handleChange}
						className={`${FIELD_INPUT} h-auto appearance-none pr-11 cursor-pointer`}
					>
						{CONTACT_TOPICS.map((t) => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
					<ChevronDown
						className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cr-muted"
						aria-hidden
					/>
				</div>
			</div>
			<div className="min-w-0 sm:col-span-2">
				<label htmlFor="cu-message" className={FIELD_LABEL}>
					Message *
				</label>
				<textarea
					id="cu-message"
					name="message"
					required
					maxLength={5000}
					value={formData.message}
					onChange={handleChange}
					placeholder="How can we help?"
					rows={5}
					className={`${FIELD_INPUT} min-h-[140px] resize-y`}
				/>
			</div>
			<div className="min-w-0 sm:col-span-2 flex flex-col items-start gap-4 pt-1">
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
				{error && (
					<p role="alert" className="m-0 text-[14px] font-medium text-cr-pink-deep">
						{error}
					</p>
				)}
				<button
					type="submit"
					disabled={submitting || !turnstileToken}
					className="inline-flex items-center gap-2 font-[inherit] text-[15px] font-bold px-8 py-[15px] rounded-full border-0 bg-cr-pink hover:bg-cr-pink-deep disabled:bg-cr-muted-2 text-white cursor-pointer disabled:cursor-not-allowed transition-colors"
				>
					<Send className="w-4 h-4" aria-hidden />
					{submitting ? "Sending..." : "Send Message"}
				</button>
			</div>
			<p className="sm:col-span-2 m-0 text-[13px] leading-[1.6] text-cr-muted-2">
				By submitting this form, I agree to StartupNews.fyi contacting me about this message, as
				described in our{" "}
				<Link href="/privacy-policy" className="text-cr-pink hover:text-cr-pink-deep">
					Privacy Policy
				</Link>
				.
			</p>
		</form>
	);
}
