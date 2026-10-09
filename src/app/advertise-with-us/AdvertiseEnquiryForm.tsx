"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { trackEvent } from "@/lib/analytics";
import { PhoneField } from "@/components/ui/PhoneField";
import { CountryCityFields } from "@/components/submit-event/CountryCityFields";
import { composePhone, resolveCity, resolveCountry } from "@/components/lead-forms/shared/compose";
import { validateCity, validateCountry, validatePhone } from "@/components/lead-forms/shared/validation";
import { BUDGET_RANGE_MAX_LENGTH, validateBudgetRange } from "@/modules/advertise-submissions/domain/budget";
import { TELL_US_MORE_MAX_LENGTH } from "@/modules/sales-tracker/domain/types";

const FIELD_LABEL = "block text-[13px] font-semibold text-adv-ink mb-2";

/* `box-border` is required: this page loads Tailwind without preflight, so inputs default to
 * content-box and `w-full` plus padding made each field wider than its grid cell (they overlapped). */
const FIELD_INPUT =
	"block box-border w-full m-0 font-[inherit] text-[15px] leading-[1.4] px-4 py-3 border border-solid border-adv-line-2 rounded-xl bg-white text-adv-ink placeholder:text-adv-muted-2 transition-colors focus:outline-none focus:border-adv-red focus:ring-2 focus:ring-adv-red/15";

const FIELD_ERROR = "mt-1.5 text-[13px] font-medium text-adv-red-deep";

/** Tailwind skin for the shared `PhoneField` and `CountryCityFields` — the same controls every other
 * lead form uses. Their markup carries plain class names (`.field`, `.phone-row`,
 * `.custom-select-*`, `.field-error`) that globals.css only styles under `.snf-page` / `.fys-page`
 * and friends, so on this Tailwind page they are styled from here to match FIELD_LABEL /
 * FIELD_INPUT. A select fills its column; the phone's country-code select is sized to its code
 * (`--phone-code-w`, set by PhoneField) and its list is wider than the box. */
const SHARED_CONTROLS = [
	"[&_.field]:min-w-0",
	"[&_label]:block [&_label]:text-[13px] [&_label]:font-semibold [&_label]:text-adv-ink [&_label]:mb-2",
	"[&_.phone-row]:flex [&_.phone-row]:gap-2.5",
	"[&_.custom-select-wrap]:relative [&_.custom-select-wrap]:text-[15px]",
	"[&_.phone-row_.custom-select-wrap]:w-[calc(var(--phone-code-w,3.4em)+36px)] [&_.phone-row_.custom-select-wrap]:shrink-0",
	"[&_.custom-select-btn]:flex [&_.custom-select-btn]:items-center [&_.custom-select-btn]:justify-between [&_.custom-select-btn]:gap-1 [&_.custom-select-btn]:box-border [&_.custom-select-btn]:w-full [&_.custom-select-btn]:m-0 [&_.custom-select-btn]:px-4 [&_.custom-select-btn]:py-3 [&_.custom-select-btn]:border [&_.custom-select-btn]:border-solid [&_.custom-select-btn]:border-adv-line-2 [&_.custom-select-btn]:rounded-xl [&_.custom-select-btn]:bg-white [&_.custom-select-btn]:font-[inherit] [&_.custom-select-btn]:text-[15px] [&_.custom-select-btn]:leading-[1.4] [&_.custom-select-btn]:text-adv-ink [&_.custom-select-btn]:text-left [&_.custom-select-btn]:cursor-pointer [&_.custom-select-btn]:transition-colors",
	"[&_.phone-row_.custom-select-btn]:h-full [&_.phone-row_.custom-select-btn]:px-2.5 [&_.phone-row_.custom-select-btn]:py-0",
	"[&_.custom-select-btn.is-combobox]:cursor-text",
	"[&_.custom-select-btn:focus-within]:border-adv-red [&_.custom-select-btn:focus-within]:ring-2 [&_.custom-select-btn:focus-within]:ring-adv-red/15 [&_.custom-select-btn:focus]:outline-none [&_.custom-select-btn:focus]:border-adv-red",
	"[&_.custom-select-btn.is-disabled]:opacity-60 [&_.custom-select-btn.is-disabled]:cursor-not-allowed",
	"[&_.cs-label]:min-w-0 [&_.cs-label]:truncate [&_.cs-placeholder]:text-adv-muted-2",
	"[&_.cs-input]:block [&_.cs-input]:w-full [&_.cs-input]:min-w-0 [&_.cs-input]:m-0 [&_.cs-input]:p-0 [&_.cs-input]:border-0 [&_.cs-input]:bg-transparent [&_.cs-input]:font-[inherit] [&_.cs-input]:text-[15px] [&_.cs-input]:leading-[1.4] [&_.cs-input]:text-adv-ink [&_.cs-input]:outline-none [&_.cs-input]:placeholder:text-adv-muted-2",
	"[&_.caret]:shrink-0 [&_.caret]:text-[10px] [&_.caret]:text-adv-muted",
	"[&_.custom-select-list]:hidden [&_.custom-select-list.open]:block [&_.custom-select-list]:absolute [&_.custom-select-list]:left-0 [&_.custom-select-list]:top-[calc(100%+6px)] [&_.custom-select-list]:z-30 [&_.custom-select-list]:box-border [&_.custom-select-list]:w-full [&_.custom-select-list]:max-h-60 [&_.custom-select-list]:overflow-y-auto [&_.custom-select-list]:m-0 [&_.custom-select-list]:p-1.5 [&_.custom-select-list]:list-none [&_.custom-select-list]:border [&_.custom-select-list]:border-solid [&_.custom-select-list]:border-adv-line-2 [&_.custom-select-list]:rounded-xl [&_.custom-select-list]:bg-white [&_.custom-select-list]:shadow-lg",
	"[&_.phone-row_.custom-select-list]:w-[260px] [&_.phone-row_.custom-select-list]:max-w-[80vw]",
	"[&_li]:m-0 [&_li]:px-3 [&_li]:py-2 [&_li]:rounded-lg [&_li]:list-none [&_li]:text-[14px] [&_li]:leading-[1.4] [&_li]:text-adv-ink [&_li]:cursor-pointer [&_li.active]:bg-adv-red/10 [&_li.selected]:font-bold [&_li.selected]:text-adv-red-deep [&_li.cs-empty]:italic [&_li.cs-empty]:text-adv-muted [&_li.cs-empty]:cursor-default",
	"[&_.cs-detail]:ml-2 [&_.cs-detail]:font-normal [&_.cs-detail]:text-adv-muted",
	// The phone number box, and the "Enter city name" box CountryCityFields shows under "Others".
	"[&_input[type=tel]]:block [&_input[type=tel]]:flex-1 [&_input[type=tel]]:min-w-0 [&_input[type=tel]]:box-border [&_input[type=tel]]:m-0 [&_input[type=tel]]:font-[inherit] [&_input[type=tel]]:text-[15px] [&_input[type=tel]]:leading-[1.4] [&_input[type=tel]]:px-4 [&_input[type=tel]]:py-3 [&_input[type=tel]]:border [&_input[type=tel]]:border-solid [&_input[type=tel]]:border-adv-line-2 [&_input[type=tel]]:rounded-xl [&_input[type=tel]]:bg-white [&_input[type=tel]]:text-adv-ink [&_input[type=tel]]:transition-colors [&_input[type=tel]]:placeholder:text-adv-muted-2 [&_input[type=tel]]:focus:outline-none [&_input[type=tel]]:focus:border-adv-red [&_input[type=tel]]:focus:ring-2 [&_input[type=tel]]:focus:ring-adv-red/15",
	"[&_.field>input[type=text]]:block [&_.field>input[type=text]]:w-full [&_.field>input[type=text]]:box-border [&_.field>input[type=text]]:font-[inherit] [&_.field>input[type=text]]:text-[15px] [&_.field>input[type=text]]:leading-[1.4] [&_.field>input[type=text]]:px-4 [&_.field>input[type=text]]:py-3 [&_.field>input[type=text]]:border [&_.field>input[type=text]]:border-solid [&_.field>input[type=text]]:border-adv-line-2 [&_.field>input[type=text]]:rounded-xl [&_.field>input[type=text]]:bg-white [&_.field>input[type=text]]:text-adv-ink [&_.field>input[type=text]]:placeholder:text-adv-muted-2 [&_.field>input[type=text]]:focus:outline-none [&_.field>input[type=text]]:focus:border-adv-red",
	"[&_.has-error_input[type=tel]]:border-adv-red [&_.has-error_.custom-select-btn]:border-adv-red",
	"[&_.hint]:mt-1.5 [&_.hint]:text-[13px] [&_.hint]:text-adv-muted",
	"[&_.field-error]:hidden [&_.field-error.visible]:block [&_.field-error]:mt-1.5 [&_.field-error]:text-[13px] [&_.field-error]:font-medium [&_.field-error]:text-adv-red-deep",
].join(" ");

/** The country-code select opens on India, as it does on every other lead form. */
const EMPTY_FORM = {
	name: "",
	companyName: "",
	email: "",
	phone: "",
	phoneCode: "+91",
	phoneCodeCustom: "",
	phoneNumber: "",
	country: "",
	countryOther: "",
	city: "",
	cityOther: "",
	budgetRange: "",
	campaignGoal: "",
	tellUsMore: "",
};

type FormState = typeof EMPTY_FORM;
type CheckedField = "phone" | "country" | "city" | "budgetRange";

/** The fields native `required` cannot check: the two custom selects, the per-country phone rule
 * and the budget format. In form order, so the first problem found is the first on screen. */
const CHECKS: Array<{ field: CheckedField; focusId: string; validate: (d: FormState) => string }> = [
	{ field: "phone", focusId: "f-adv-phone-number", validate: validatePhone },
	{ field: "country", focusId: "field-country", validate: validateCountry },
	{ field: "city", focusId: "f-city", validate: validateCity },
	{ field: "budgetRange", focusId: "adv-budget", validate: (d) => validateBudgetRange(d.budgetRange) },
];

/** The enquiry form is the only interactive part of Advertise With Us — kept as a client
 * island so the rest of the page renders on the server. Posts to /api/advertise, which saves the
 * enquiry, adds it to the admin Sales Tracker as an "Advertise Page Leads" lead and emails the
 * office. Phone, Country and City are the same shared controls the other lead forms use, so an
 * Advertise lead fills the tracker's Contact / Country / City columns the same way. */
export function AdvertiseEnquiryForm({ promotedCities }: { promotedCities?: Record<string, string[]> }) {
	const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
	// The shared controls validate straight after a change, in the same tick — before `formData`
	// has re-rendered. Validating against this ref (always the latest values) avoids a stale error.
	const dataRef = useRef<FormState>(EMPTY_FORM);
	const [errors, setErrors] = useState<Partial<Record<CheckedField, string>>>({});
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const turnstileRef = useRef<TurnstileInstance>(null);

	function check(field: CheckedField) {
		const entry = CHECKS.find((c) => c.field === field);
		if (!entry) return;
		const message = entry.validate(dataRef.current);
		setErrors((prev) => ({ ...prev, [field]: message }));
	}

	/** Applies a change, and re-checks `field` only if it is already showing an error — so the
	 * message clears as soon as the fix lands, without nagging while the visitor is still typing. */
	function update(patch: Partial<FormState>, field?: CheckedField) {
		const next = { ...dataRef.current, ...patch };
		dataRef.current = next;
		setFormData(next);
		if (field && errors[field]) check(field);
	}

	const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		const { name, value } = e.target;
		update({ [name]: value } as Partial<FormState>, name === "budgetRange" ? "budgetRange" : undefined);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const data = dataRef.current;
		const found: Partial<Record<CheckedField, string>> = {};
		let firstBad: string | null = null;
		for (const { field, focusId, validate } of CHECKS) {
			found[field] = validate(data);
			if (found[field] && !firstBad) firstBad = focusId;
		}
		setErrors(found);
		if (firstBad) {
			const el = document.getElementById(firstBad);
			el?.scrollIntoView({ behavior: "smooth", block: "center" });
			if (el instanceof HTMLInputElement) el.focus({ preventScroll: true });
			return;
		}

		if (!turnstileToken) {
			alert("Please complete the CAPTCHA verification.");
			return;
		}

		setSubmitting(true);
		const response = await fetch("/api/advertise", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: data.name.trim(),
				companyName: data.companyName.trim(),
				email: data.email.trim(),
				// One string, "+91 9876543210", and the resolved country / city — the same shape the
				// other lead forms send.
				phone: composePhone(data),
				country: resolveCountry(data),
				city: resolveCity(data),
				budgetRange: data.budgetRange.trim(),
				campaignGoal: data.campaignGoal.trim(),
				tellUsMore: data.tellUsMore.trim(),
				turnstileToken,
			}),
		}).catch(() => null);

		const result = await response?.json().catch(() => null);
		setSubmitting(false);

		if (!response?.ok || !result?.success) {
			const errorMessage = result?.error || "Failed to send your enquiry. Please try again.";
			alert(errorMessage);
			turnstileRef.current?.reset();
			setTurnstileToken(null);
			return;
		}

		trackEvent("generate_lead", { form: "advertise_enquiry" });
		alert("Thank you for your enquiry. Our team will get back to you within 24 hours.");
		dataRef.current = EMPTY_FORM;
		setFormData(EMPTY_FORM);
		setErrors({});
		turnstileRef.current?.reset();
		setTurnstileToken(null);
	};

	return (
		<form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
			<div className="min-w-0">
				<label htmlFor="adv-name" className={FIELD_LABEL}>
					Your Name *
				</label>
				<input
					id="adv-name"
					name="name"
					required
					maxLength={255}
					value={formData.name}
					onChange={handleChange}
					placeholder="Jane Doe"
					className={FIELD_INPUT}
				/>
			</div>
			<div className="min-w-0">
				<label htmlFor="adv-company" className={FIELD_LABEL}>
					Company Name *
				</label>
				<input
					id="adv-company"
					name="companyName"
					required
					maxLength={255}
					value={formData.companyName}
					onChange={handleChange}
					placeholder="Acme Inc."
					className={FIELD_INPUT}
				/>
			</div>
			<div className="min-w-0">
				<label htmlFor="adv-email" className={FIELD_LABEL}>
					Email *
				</label>
				<input
					id="adv-email"
					type="email"
					name="email"
					required
					maxLength={255}
					value={formData.email}
					onChange={handleChange}
					placeholder="you@company.com"
					className={FIELD_INPUT}
				/>
			</div>
			<div className={`min-w-0 ${SHARED_CONTROLS}`}>
				<PhoneField
					id="adv-phone"
					label="Phone / WhatsApp"
					phoneCode={formData.phoneCode}
					phoneCodeCustom={formData.phoneCodeCustom}
					phoneNumber={formData.phoneNumber}
					error={errors.phone}
					onChangeCode={(v) => update({ phoneCode: v }, "phone")}
					onChangeCustomCode={(v) => update({ phoneCodeCustom: v }, "phone")}
					onChangeNumber={(v) => update({ phoneNumber: v }, "phone")}
					onBlurValidate={() => check("phone")}
				/>
			</div>
			{/* `contents` twice (this wrapper, and the `.field-row` CountryCityFields renders) so
			    Country and City each take a column of the form grid, next to Phone. */}
			<div className={`contents [&>.field-row]:contents ${SHARED_CONTROLS}`}>
				<CountryCityFields
					cityAsText
					cityOptional
					country={formData.country}
					countryOther={formData.countryOther}
					city={formData.city}
					cityOther={formData.cityOther}
					promotedCities={promotedCities}
					countryError={errors.country}
					cityError={errors.city}
					onChangeCountry={(v) => update({ country: v }, "country")}
					onChangeCountryOther={(v) => update({ countryOther: v })}
					onChangeCity={(v) => update({ city: v }, "city")}
					onChangeCityOther={(v) => update({ cityOther: v }, "city")}
					onBlurCountry={() => check("country")}
					onBlurCity={() => check("city")}
				/>
			</div>
			<div className="min-w-0">
				<label htmlFor="adv-budget" className={FIELD_LABEL}>
					Budget Range *
				</label>
				<input
					id="adv-budget"
					name="budgetRange"
					required
					maxLength={BUDGET_RANGE_MAX_LENGTH}
					value={formData.budgetRange}
					onChange={handleChange}
					onBlur={() => check("budgetRange")}
					placeholder="$5,000 – $10,000"
					aria-invalid={!!errors.budgetRange}
					aria-describedby={errors.budgetRange ? "err-adv-budget" : undefined}
					className={`${FIELD_INPUT}${errors.budgetRange ? " border-adv-red" : ""}`}
				/>
				{errors.budgetRange ? (
					<p id="err-adv-budget" role="alert" className={`m-0 ${FIELD_ERROR}`}>
						{errors.budgetRange}
					</p>
				) : null}
			</div>
			<div className="min-w-0 lg:col-span-2">
				<label htmlFor="adv-goal" className={FIELD_LABEL}>
					Campaign Goal *
				</label>
				<input
					id="adv-goal"
					name="campaignGoal"
					required
					maxLength={255}
					value={formData.campaignGoal}
					onChange={handleChange}
					placeholder="Brand awareness"
					className={FIELD_INPUT}
				/>
			</div>
			<div className="min-w-0 sm:col-span-2 lg:col-span-3">
				<label htmlFor="adv-tell-us-more" className={FIELD_LABEL}>
					Tell Us More <span className="font-normal text-adv-muted-2">(optional)</span>
				</label>
				<textarea
					id="adv-tell-us-more"
					name="tellUsMore"
					maxLength={TELL_US_MORE_MAX_LENGTH}
					value={formData.tellUsMore}
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
