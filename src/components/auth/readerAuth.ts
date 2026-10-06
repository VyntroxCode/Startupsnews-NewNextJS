"use client";

/**
 * Reader (public site) sign-in pieces shared by the slide-up popup (`components/AuthModal.tsx`)
 * and the full-screen `/login` page (`components/auth/LoginPage.tsx`): Google Identity Services
 * token flow, best-effort geo for new accounts, the saved session, and the "show the welcome card
 * on the homepage" hand-off used after `/login` redirects to `/`.
 */

import { useCallback } from "react";
import { COUNTRY_CODE_OPTIONS } from "@/components/ui/constants/phone";
import { trackEvent } from "@/lib/analytics";

declare global {
	interface Window {
		google?: {
			accounts: {
				id: {
					initialize: (cfg: {
						client_id: string;
						callback: (r: { credential: string }) => void;
						auto_select?: boolean;
					}) => void;
					renderButton: (el: HTMLElement, opts: object) => void;
				};
				oauth2: {
					initTokenClient: (cfg: {
						client_id: string;
						scope: string;
						callback: (response: { access_token?: string; error?: string }) => void;
					}) => { requestAccessToken: (opts?: { prompt?: string }) => void };
				};
			};
		};
	}
}

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
export const GOOGLE_GSI_SRC = "https://accounts.google.com/gsi/client";

export interface AuthUser {
	id: number;
	name: string;
	email: string;
	phone?: string;
	country?: string;
	city?: string;
	linkedin_url?: string;
	newsletter_category_slugs?: string | null;
}

export type AuthMethod = "google" | "email";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Same dial-code list and per-country digit rules as the profile wizard's phone field;
// India pinned first and pre-selected, everything else alphabetical.
export const DEFAULT_PHONE_CODE = "+91";
export const DIAL_CODE_OPTIONS = COUNTRY_CODE_OPTIONS.filter((c) => c.code !== "other").sort(
	(a, b) => Number(b.code === DEFAULT_PHONE_CODE) - Number(a.code === DEFAULT_PHONE_CODE)
);

/* Best-effort location for new accounts (Google + email sign-up). */
export async function fetchGeo(): Promise<{ country?: string; city?: string; timezone?: string }> {
	let country: string | undefined;
	let city: string | undefined;
	try {
		const geoRes = await fetch("https://ipapi.co/json/", {
			signal: AbortSignal.timeout(3000),
		});
		if (geoRes.ok) {
			const geo = (await geoRes.json()) as {
				country_name?: string;
				city?: string;
			};
			country = geo.country_name || undefined;
			city = geo.city || undefined;
		}
	} catch { /* geo is best-effort */ }
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
	return { country, city, timezone };
}

/** Store the reader session and tell the rest of the page (header, dashboard links) about it. */
export function saveReaderSession(token: string, user: AuthUser, isNew: boolean, method: AuthMethod) {
	localStorage.setItem("pub_auth_token", token);
	localStorage.setItem("pub_auth_user", JSON.stringify(user));
	sessionStorage.removeItem("pending_profile_dismissed");
	window.dispatchEvent(new Event("pub-auth-changed"));
	trackEvent(isNew ? "sign_up" : "login", { method });
}

export function hasReaderSession(): boolean {
	try {
		return Boolean(localStorage.getItem("pub_auth_token") && localStorage.getItem("pub_auth_user"));
	} catch {
		return false;
	}
}

/* ── Welcome hand-off: /login → homepage welcome card ───────────────── */

const WELCOME_KEY = "pub_auth_welcome";

/** Called by /login just before it redirects home, so AuthModal shows the welcome card there. */
export function queueWelcome(user: AuthUser) {
	try {
		sessionStorage.setItem(WELCOME_KEY, JSON.stringify(user));
	} catch { /* storage blocked — no welcome card, login still works */ }
}

/** Read-and-clear the queued welcome (once per login). */
export function takeQueuedWelcome(): AuthUser | null {
	try {
		const raw = sessionStorage.getItem(WELCOME_KEY);
		if (!raw) return null;
		sessionStorage.removeItem(WELCOME_KEY);
		return JSON.parse(raw) as AuthUser;
	} catch {
		return null;
	}
}

/* ── Google Identity Services token flow ─────────────────────────────── */

/**
 * Returns a click handler that opens Google's account chooser, verifies the token server-side
 * (`/api/public-auth/google-verify`, which creates the account on first sign-in) and calls
 * `onSuccess`. The GSI script must be loaded on the page (`GOOGLE_GSI_SRC`).
 */
export function useGoogleSignIn({
	onSuccess,
	onError,
}: {
	onSuccess: (token: string, user: AuthUser, isNew: boolean) => void;
	onError: (message: string) => void;
}) {
	return useCallback(() => {
		if (!GOOGLE_CLIENT_ID) {
			onError("Google Sign-In is not configured on this server (Missing Client ID).");
			return;
		}
		if (!window.google) {
			onError("Google Sign-In is still loading or has been blocked by your adblocker. Please check your connection or disable adblockers and try again.");
			return;
		}
		onError("");
		try {
			const client = window.google.accounts.oauth2.initTokenClient({
				client_id: GOOGLE_CLIENT_ID,
				scope: "openid email profile",
				callback: async (response) => {
					if (!response.access_token) {
						onError("Google sign-in failed. Try again.");
						return;
					}
					try {
						const { country, city, timezone } = await fetchGeo();
						const res = await fetch("/api/public-auth/google-verify", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ accessToken: response.access_token, country, city, timezone }),
						});
						const d = (await res.json()) as {
							success: boolean;
							data?: { token: string; user: AuthUser; isNew: boolean };
							error?: string;
						};
						if (d.success && d.data) onSuccess(d.data.token, d.data.user, d.data.isNew);
						else onError(d.error || "Google sign-in failed");
					} catch {
						onError("Google sign-in failed. Try again.");
					}
				},
			});
			client.requestAccessToken({ prompt: "select_account" });
		} catch (err: unknown) {
			console.error("Error creating Google Token Client:", err);
			onError("Google Sign-In initialization failed: " + (err instanceof Error ? err.message : String(err)));
		}
	}, [onSuccess, onError]);
}
