"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { PHONE_RULES } from "@/components/ui/constants/phone";
import {
	DEFAULT_PHONE_CODE,
	DIAL_CODE_OPTIONS,
	EMAIL_RE,
	GOOGLE_CLIENT_ID,
	GOOGLE_GSI_SRC,
	fetchGeo,
	hasReaderSession,
	queueWelcome,
	saveReaderSession,
	useGoogleSignIn,
	type AuthMethod,
	type AuthUser,
} from "./readerAuth";

type Tab = "register" | "login";

/** Animated artwork in the right-hand media panel (desktop), on S3. Line art on white, shown uncropped. */
const LOGIN_MEDIA_URL =
	"https://startupnews-media-2026.s3.us-east-1.amazonaws.com/startupnews-in/uploads/2026/10/admin-login-media-1791143582494.gif";

const serif = "[font-family:Georgia,'Times_New_Roman',serif]";

// No Preflight on the isolated Tailwind sheet: every padded full-width control carries box-border,
// and buttons/inputs reset their own border and font.
const inputCls =
	"box-border h-12 w-full rounded-xl border border-solid border-[#e3e3e8] bg-white px-4 text-[15px] text-[#111111] outline-none transition-colors placeholder:text-[#9ca3af] hover:border-[#cfcfd6] focus:border-[#E72262] focus:ring-4 focus:ring-[#E72262]/10 [font-family:inherit]";

const googleButtonCls =
	"box-border flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-solid border-[#e3e3e8] bg-white px-5 text-[15px] font-semibold text-[#111111] transition-colors hover:border-[#cfcfd6] hover:bg-[#f7f7f9] [font-family:inherit]";

/**
 * /login — full-screen reader sign-in / sign-up. Opened from the slide-up popup's "Login / Sign up"
 * button (same tab). Every option lives here: Google, email registration, email sign-in. After a
 * success it saves the session, queues the welcome card and sends the reader to the homepage,
 * where AuthModal shows "Welcome to StartupNews".
 */
export default function LoginPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "signin" ? "login" : "register");
	const [form, setForm] = useState({ name: "", email: "", phoneCode: DEFAULT_PHONE_CODE, phone: "", password: "" });
	const [showPassword, setShowPassword] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");

	// Already signed in → nothing to do here.
	useEffect(() => {
		if (hasReaderSession()) router.replace("/");
	}, [router]);

	const finish = useCallback(
		(token: string, user: AuthUser, isNew: boolean, method: AuthMethod) => {
			saveReaderSession(token, user, isNew, method);
			queueWelcome(user);
			router.replace("/");
		},
		[router]
	);

	const onGoogleSuccess = useCallback(
		(token: string, user: AuthUser, isNew: boolean) => finish(token, user, isNew, "google"),
		[finish]
	);
	// No spinner on the Google button: if the reader closes Google's account chooser, GIS never
	// calls back, so a "busy" state could get stuck.
	const startGoogle = useGoogleSignIn({ onSuccess: onGoogleSuccess, onError: setError });

	const switchTab = (next: Tab) => {
		setTab(next);
		setError("");
	};

	const phoneRule = PHONE_RULES[form.phoneCode] || PHONE_RULES.other;
	const isRegister = tab === "register";

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (submitting) return;
		setError("");

		const email = form.email.trim();
		if (isRegister && form.name.trim().length < 2) return setError("Please enter your full name.");
		if (!EMAIL_RE.test(email)) return setError("Please enter a valid email address.");
		if (isRegister && !phoneRule.pattern.test(form.phone)) {
			return setError(form.phone ? phoneRule.message : "Please enter your mobile number.");
		}
		if (form.password.length < (isRegister ? 6 : 1)) {
			return setError(isRegister ? "Password must be at least 6 characters." : "Please enter your password.");
		}

		setSubmitting(true);
		try {
			const body = isRegister
				? { name: form.name.trim(), email, phone: `${form.phoneCode} ${form.phone}`, password: form.password, ...(await fetchGeo()) }
				: { email, password: form.password };
			const res = await fetch(isRegister ? "/api/public-auth/register" : "/api/public-auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const d = (await res.json()) as { success: boolean; data?: { token: string; user: AuthUser }; error?: string };
			if (d.success && d.data) {
				finish(d.data.token, d.data.user, isRegister, "email");
				return;
			}
			setError(d.error || (isRegister ? "Registration failed. Try again." : "Sign-in failed. Try again."));
		} catch {
			setError(isRegister ? "Registration failed. Try again." : "Sign-in failed. Try again.");
		}
		setSubmitting(false);
	};

	return (
		// Fixed full-viewport layer: the page is a bare route (no site header/footer), and this also
		// keeps it clear of the legacy body-wrap padding and any floating site widgets.
		<div className="fixed inset-0 z-[60] overflow-y-auto bg-[#f7f6f3] text-[#111111] antialiased">
			{GOOGLE_CLIENT_ID && (
				<Script
					src={GOOGLE_GSI_SRC}
					strategy="afterInteractive"
					onError={() => setError("Failed to load Google Sign-In SDK. If you are using an adblocker or private browsing mode, please disable it and refresh the page.")}
				/>
			)}

			<div className="box-border mx-auto grid min-h-full w-full max-w-[1600px] grid-cols-1 gap-8 px-5 py-6 sm:px-10 lg:grid-cols-2 lg:gap-12 lg:px-14 lg:py-10 xl:px-20">
				{/* Left: logo, headline, auth card (centred) */}
				<div className="flex min-w-0 flex-col">
					<div className="flex flex-1 flex-col items-center justify-center py-6">
						<Link href="/" className="mb-8 inline-flex sm:mb-10" aria-label="StartupNews.fyi home">
							<Image src="/logo.png" alt="StartupNews.fyi" width={300} height={60} className="h-11 w-auto sm:h-14" priority />
						</Link>
						{/* Headings carry explicit colours: legacy site CSS colours h1/h2. */}
						<h1 className={`m-0 text-center ${serif} text-[38px] font-normal leading-[1.08] tracking-[-0.02em] text-[#111111] sm:text-[52px] xl:text-[60px]`}>
							Know what&apos;s next
						</h1>
						<p className={`m-0 mt-4 text-center ${serif} text-[17px] text-[#4b5563] sm:text-[19px]`}>
							Startup news, funding and analysis, free for readers
						</p>

						<div className="mt-9 box-border w-full max-w-[460px] rounded-3xl border border-solid border-[#ececf0] bg-white p-5 shadow-[0_24px_60px_rgba(17,17,17,0.08)] sm:p-8">
							<div className="flex gap-1 rounded-xl bg-[#f1f1f4] p-1" role="tablist">
								{(["register", "login"] as const).map((t) => (
									<button
										key={t}
										type="button"
										role="tab"
										aria-selected={tab === t}
										onClick={() => switchTab(t)}
										className={`flex-1 cursor-pointer rounded-lg border-0 px-3 py-2.5 text-[14px] font-semibold transition-colors [font-family:inherit] ${tab === t ? "bg-white text-[#E72262] shadow-[0_2px_8px_rgba(17,17,17,0.08)]" : "bg-transparent text-[#6b7280] hover:text-[#111111]"}`}
									>
										{t === "register" ? "Sign up" : "Log in"}
									</button>
								))}
							</div>

							<button type="button" onClick={startGoogle} className={`mt-5 ${googleButtonCls}`}>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width={18} height={18} aria-hidden className="shrink-0">
									<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
									<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
									<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
									<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
								</svg>
								Continue with Google
							</button>

							<p className="m-0 my-4 text-center text-[12px] font-medium uppercase tracking-[0.1em] text-[#9ca3af]">or</p>

							<form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
								{isRegister && (
									<input type="text" autoComplete="name" placeholder="Full name" aria-label="Full name" className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
								)}
								<input type="email" autoComplete="email" placeholder="Enter your email" aria-label="Email" className={inputCls} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
								{isRegister && (
									<div className="flex gap-2">
										{/* Code box shows "IN +91 ▾"; a transparent native select on top opens the device's own list. */}
										<div className="relative box-border flex h-12 w-[108px] shrink-0 items-center justify-between rounded-xl border border-solid border-[#e3e3e8] bg-white px-3 text-[14.5px] font-semibold text-[#111111] focus-within:border-[#E72262] focus-within:ring-4 focus-within:ring-[#E72262]/10">
											<span className="whitespace-nowrap">
												{(DIAL_CODE_OPTIONS.find((c) => c.code === form.phoneCode)?.iso || "").toUpperCase()} {form.phoneCode}
											</span>
											<ChevronDown size={15} className="text-[#6b7280]" aria-hidden />
											<select
												aria-label="Country code"
												value={form.phoneCode}
												onChange={(e) => {
													const code = e.target.value;
													const max = (PHONE_RULES[code] || PHONE_RULES.other).maxLen;
													setForm((f) => ({ ...f, phoneCode: code, phone: f.phone.slice(0, max) }));
												}}
												className="absolute inset-0 h-full w-full cursor-pointer opacity-0 text-[16px]"
											>
												{DIAL_CODE_OPTIONS.map((c) => (
													<option key={c.code} value={c.code}>{c.name} ({c.code})</option>
												))}
											</select>
										</div>
										<input
											type="tel"
											autoComplete="tel-national"
											inputMode="numeric"
											placeholder="Mobile number"
											aria-label="Mobile number"
											maxLength={phoneRule.maxLen}
											className={`${inputCls} min-w-0 flex-1`}
											value={form.phone}
											onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, phoneRule.maxLen) }))}
										/>
									</div>
								)}
								<div className="relative">
									<input
										type={showPassword ? "text" : "password"}
										autoComplete={isRegister ? "new-password" : "current-password"}
										placeholder={isRegister ? "Create a password (min 6 characters)" : "Password"}
										aria-label="Password"
										className={`${inputCls} pr-11`}
										value={form.password}
										onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
									/>
									<button
										type="button"
										aria-label={showPassword ? "Hide password" : "Show password"}
										onClick={() => setShowPassword((v) => !v)}
										className="absolute right-2 top-1/2 flex -translate-y-1/2 cursor-pointer border-0 bg-transparent p-1.5 text-[#6b7280] hover:text-[#111111]"
									>
										{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
									</button>
								</div>

								{error && (
									<p role="alert" className="m-0 rounded-xl border border-solid border-[#fecdd3] bg-[#fff1f2] px-3.5 py-2.5 text-[13.5px] leading-snug text-[#be123c]">
										{error}
									</p>
								)}

								<button
									type="submit"
									disabled={submitting}
									className="mt-1 box-border flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 bg-[#E72262] px-5 text-[15px] font-semibold text-white shadow-[0_10px_24px_rgba(231,34,98,0.28)] transition-colors hover:bg-[#c81852] disabled:cursor-wait disabled:opacity-75 [font-family:inherit]"
								>
									{submitting && <Loader2 size={18} className="animate-spin" aria-hidden />}
									{submitting
										? isRegister ? "Creating your account…" : "Logging you in…"
										: isRegister ? "Continue with email" : "Log in with email"}
								</button>
							</form>

							<p className="m-0 mt-5 text-center text-[13px] leading-relaxed text-[#6b7280]">
								By continuing you agree to our{" "}
								<a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="font-medium text-[#111111] underline visited:text-[#111111] hover:text-[#E72262]">Terms</a>{" "}
								and{" "}
								<a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-medium text-[#111111] underline visited:text-[#111111] hover:text-[#E72262]">Privacy Policy</a>.
							</p>
						</div>

						<Link
							href="/"
							className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-[#374151] no-underline visited:text-[#374151] hover:text-[#E72262]"
						>
							<ArrowLeft size={16} aria-hidden /> Back to homepage
						</Link>
					</div>
				</div>

				{/* Right: media panel — desktop only */}
				<div className="relative hidden min-h-[560px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_rgba(17,17,17,0.06)] ring-1 ring-[#ececf0] lg:block">
					<Image src={LOGIN_MEDIA_URL} alt="" fill unoptimized priority sizes="50vw" className="object-contain p-6 xl:p-10" />
				</div>
			</div>
		</div>
	);
}
