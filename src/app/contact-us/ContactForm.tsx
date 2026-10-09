"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { CheckCircle2, ChevronDown, Send } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { PhoneField } from "@/components/ui/PhoneField";
import { PHONE_RULES } from "@/components/ui/constants/phone";
import { CONTACT_TOPICS } from "./topics";

const FIELD_LABEL = "block text-[13px] font-semibold text-cr-ink mb-2";

const FIELD_INPUT =
	"block w-full box-border m-0 font-[inherit] text-[15px] leading-[1.4] px-4 py-3 border border-cr-line rounded-xl bg-white text-cr-ink placeholder:text-cr-muted-2 transition-colors focus:outline-none focus:border-cr-pink focus:ring-2 focus:ring-cr-pink/15";

/** Tailwind skin for the shared `PhoneField` (country-code select + number), the same control
 * /feature-your-startup uses. Its markup carries plain class names (`.phone-row`,
 * `.custom-select-*`, `.field-error`) that globals.css only styles under `.snf-page` / `.fys-page`,
 * so on this Tailwind page they are styled from here to match FIELD_LABEL / FIELD_INPUT. */
const PHONE_FIELD = [
	"[&_label]:block [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-cr-ink [&_label]:mb-2",
	"[&_.phone-row]:flex [&_.phone-row]:gap-2.5",
	"[&_.custom-select-wrap]:relative [&_.custom-select-wrap]:w-[calc(var(--phone-code-w,3.4em)+36px)] [&_.custom-select-wrap]:text-[15px] [&_.custom-select-wrap]:shrink-0",
	"[&_.custom-select-btn]:flex [&_.custom-select-btn]:items-center [&_.custom-select-btn]:gap-1 [&_.custom-select-btn]:box-border [&_.custom-select-btn]:h-full [&_.custom-select-btn]:px-2.5 [&_.custom-select-btn]:border [&_.custom-select-btn]:border-solid [&_.custom-select-btn]:border-cr-line [&_.custom-select-btn]:rounded-xl [&_.custom-select-btn]:bg-white [&_.custom-select-btn]:cursor-text [&_.custom-select-btn]:transition-colors",
	"[&_.custom-select-btn:focus-within]:border-cr-pink [&_.custom-select-btn:focus-within]:ring-2 [&_.custom-select-btn:focus-within]:ring-cr-pink/15",
	"[&_.cs-input]:block [&_.cs-input]:w-full [&_.cs-input]:min-w-0 [&_.cs-input]:m-0 [&_.cs-input]:p-0 [&_.cs-input]:border-0 [&_.cs-input]:bg-transparent [&_.cs-input]:font-[inherit] [&_.cs-input]:text-[15px] [&_.cs-input]:leading-[1.4] [&_.cs-input]:text-cr-ink [&_.cs-input]:outline-none [&_.cs-input]:placeholder:text-cr-muted-2",
	"[&_.caret]:shrink-0 [&_.caret]:text-[10px] [&_.caret]:text-cr-muted",
	"[&_.custom-select-list]:hidden [&_.custom-select-list.open]:block [&_.custom-select-list]:absolute [&_.custom-select-list]:left-0 [&_.custom-select-list]:top-[calc(100%+6px)] [&_.custom-select-list]:z-30 [&_.custom-select-list]:box-border [&_.custom-select-list]:w-[260px] [&_.custom-select-list]:max-w-[80vw] [&_.custom-select-list]:max-h-60 [&_.custom-select-list]:overflow-y-auto [&_.custom-select-list]:m-0 [&_.custom-select-list]:p-1.5 [&_.custom-select-list]:list-none [&_.custom-select-list]:border [&_.custom-select-list]:border-solid [&_.custom-select-list]:border-cr-line [&_.custom-select-list]:rounded-xl [&_.custom-select-list]:bg-white [&_.custom-select-list]:shadow-lg",
	"[&_li]:m-0 [&_li]:px-3 [&_li]:py-2 [&_li]:rounded-lg [&_li]:list-none [&_li]:text-[14px] [&_li]:leading-[1.4] [&_li]:text-cr-ink [&_li]:cursor-pointer [&_li.active]:bg-cr-pink/10 [&_li.selected]:font-bold [&_li.selected]:text-cr-pink-deep [&_li.cs-empty]:italic [&_li.cs-empty]:text-cr-muted [&_li.cs-empty]:cursor-default",
	"[&_.cs-detail]:ml-2 [&_.cs-detail]:font-normal [&_.cs-detail]:text-cr-muted",
	"[&_input[type=tel]]:block [&_input[type=tel]]:flex-1 [&_input[type=tel]]:min-w-0 [&_input[type=tel]]:box-border [&_input[type=tel]]:m-0 [&_input[type=tel]]:font-[inherit] [&_input[type=tel]]:text-[15px] [&_input[type=tel]]:leading-[1.4] [&_input[type=tel]]:px-4 [&_input[type=tel]]:py-3 [&_input[type=tel]]:border [&_input[type=tel]]:border-solid [&_input[type=tel]]:border-cr-line [&_input[type=tel]]:rounded-xl [&_input[type=tel]]:bg-white [&_input[type=tel]]:text-cr-ink [&_input[type=tel]]:transition-colors [&_input[type=tel]]:placeholder:text-cr-muted-2 [&_input[type=tel]]:focus:outline-none [&_input[type=tel]]:focus:border-cr-pink [&_input[type=tel]]:focus:ring-2 [&_input[type=tel]]:focus:ring-cr-pink/15",
	"[&_.has-error_input[type=tel]]:border-cr-pink [&_.has-error_.custom-select-btn]:border-cr-pink",
	"[&_.field-error]:hidden [&_.field-error.visible]:block [&_.field-error]:mt-1.5 [&_.field-error]:text-[13px] [&_.field-error]:font-medium [&_.field-error]:text-cr-pink-deep",
].join(" ");

/** The country-code select opens on India, as it does on /feature-your-startup. */
const DEFAULT_PHONE_CODE = "+91";

const EMPTY_FORM = {
	name: "",
	email: "",
	phoneCode: DEFAULT_PHONE_CODE,
	phoneNumber: "",
	company: "",
	topic: CONTACT_TOPICS[0] as string,
	message: "",
};

/** Phone is optional here, so an empty number passes; a typed one must fit the picked country's
 * rule — the same per-country check /feature-your-startup applies. */
function validatePhone(phoneCode: string, phoneNumber: string): string {
	if (!phoneNumber) return "";
	const rule = PHONE_RULES[phoneCode] || PHONE_RULES.other;
	return rule.pattern.test(phoneNumber) ? "" : rule.message;
}

/** "Get in touch" form on /contact-us. Posts to /api/contact, which emails office@startupnews.fyi
 * with the sender as reply-to. */
export function ContactForm() {
	const [formData, setFormData] = useState(EMPTY_FORM);
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [phoneError, setPhoneError] = useState("");
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

		const phoneProblem = validatePhone(formData.phoneCode, formData.phoneNumber);
		setPhoneError(phoneProblem);
		if (phoneProblem) {
			document.getElementById("f-cu-phone-number")?.focus();
			return;
		}

		if (!turnstileToken) {
			setError("Please complete the security check.");
			return;
		}

		setSubmitting(true);
		const response = await fetch("/api/contact", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: formData.name,
				email: formData.email,
				// One string, "+91 9876543210", which is what /api/contact has always received.
				phone: formData.phoneNumber ? `${formData.phoneCode} ${formData.phoneNumber}` : "",
				company: formData.company,
				topic: formData.topic,
				message: formData.message,
				turnstileToken,
			}),
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
			<div className={`min-w-0 ${PHONE_FIELD}`}>
				<PhoneField
					id="cu-phone"
					label="Phone / WhatsApp"
					required={false}
					phoneCode={formData.phoneCode}
					phoneCodeCustom=""
					phoneNumber={formData.phoneNumber}
					error={phoneError}
					onChangeCode={(v) => {
						setFormData((prev) => ({ ...prev, phoneCode: v }));
						// Re-check against the new country only once an error is already showing.
						if (phoneError) setPhoneError(validatePhone(v, formData.phoneNumber));
					}}
					onChangeCustomCode={() => {}}
					onChangeNumber={(v) => {
						setFormData((prev) => ({ ...prev, phoneNumber: v }));
						if (phoneError) setPhoneError(validatePhone(formData.phoneCode, v));
					}}
					onBlurValidate={() => {}}
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
