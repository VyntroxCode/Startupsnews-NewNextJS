"use client";

import { usePathname, useRouter } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

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

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const GOOGLE_ICON =
	"https://techdocs.akamai.com/identity-cloud/img/social-login/identity-providers/iconfinder-new-google-favicon-682665.png";
const LINKEDIN_ICON =
	"https://yt3.googleusercontent.com/i6KNxiy3gME-BulL4WnuGkTGqHuSYF8jl1WRn0rXftcJdSYK7dHKcJ3gLAaPc-KfhmLSYPwf824=s900-c-k-c0x00ffffff-no-rj";

interface NLCategory {
	id: number;
	name: string;
	slug: string;
	color: string;
}

const modalTheme = {
	brand: "#e91e63",
	brandSoft: "#fce4ec",
	brandGlow: "#fce4ec",
	ink: "#111111",
	inkSoft: "#4b5563",
	line: "rgba(17,17,17,0.1)",
	panel: "#ffffff",
	panelStrong: "#fff7fb",
};

interface AuthUser {
	id: number;
	name: string;
	email: string;
	phone?: string;
	country?: string;
	city?: string;
	linkedin_url?: string;
	newsletter_category_slugs?: string | null;
}

export default function AuthModal() {
	const pathname = usePathname();
	const router = useRouter();
	const isAdmin =
		pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard");

	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);
	const [loggedIn, setLoggedIn] = useState(false);
	const [user, setUser] = useState<AuthUser | null>(null);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const [showWelcome, setShowWelcome] = useState(false);
	const [welcomeUser, setWelcomeUser] = useState<AuthUser | null>(null);
	const [isMobileBanner, setIsMobileBanner] = useState(false);

	const [scrollSlideY, setScrollSlideY] = useState(100);
	const [scrollVisible, setScrollVisible] = useState(false);

	const [showCategoryPicker, setShowCategoryPicker] = useState(false);
	const [nlCategories, setNlCategories] = useState<NLCategory[]>([]);
	const [selectedCats, setSelectedCats] = useState<string[]>([]);
	const [catSaving, setCatSaving] = useState(false);
	const [morningSignalEnabled, setMorningSignalEnabled] = useState(false);

	/* ── Google OAuth2 ──────────────────────────────────────── */
	const initGIS = useCallback(() => {
		// Script loaded successfully
	}, []);

	const handleGoogleScriptError = useCallback(() => {
		setError("Failed to load Google Sign-In SDK. If you are using an adblocker or private browsing mode, please disable it and refresh the page.");
	}, []);

	const handleGoogleButtonClick = useCallback(() => {
		if (!GOOGLE_CLIENT_ID) {
			setError("Google Sign-In is not configured on this server (Missing Client ID).");
			return;
		}
		if (!window.google) {
			setError("Google Sign-In is still loading or has been blocked by your adblocker. Please check your connection or disable adblockers and try again.");
			return;
		}
		setError("");
		try {
			const client = window.google.accounts.oauth2.initTokenClient({
				client_id: GOOGLE_CLIENT_ID,
				scope: "openid email profile",
				callback: async (response) => {
					if (!response.access_token) {
						setError("Google sign-in failed. Try again.");
						return;
					}
					setError("");
					try {
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
						if (d.success && d.data) {
							localStorage.setItem("pub_auth_token", d.data.token);
							localStorage.setItem("pub_auth_user", JSON.stringify(d.data.user));
							setUser(d.data.user);
							setLoggedIn(true);
							setOpen(false);
							setWelcomeUser(d.data.user);
							setShowWelcome(true);
							window.dispatchEvent(new Event("pub-auth-changed"));
							// Pre-fetch categories + morning signal status; picker only shows if enabled and user has no prefs
							try {
								const catRes = await fetch("/api/newsletter/categories", { cache: "no-store" });
								const catData = await catRes.json();
								if (catData.success && catData.data?.length) {
									setNlCategories(catData.data);
									setMorningSignalEnabled(catData.morningSignalEnabled === true);
									setSelectedCats([]);
								}
							} catch { /* categories optional */ }
						} else {
							setError(d.error || "Google sign-in failed");
						}
					} catch {
						setError("Google sign-in failed. Try again.");
					}
				},
			});
			client.requestAccessToken({ prompt: "select_account" });
		} catch (err: any) {
			console.error("Error creating Google Token Client:", err);
			setError("Google Sign-In initialization failed: " + (err.message || err));
		}
	}, []);

	/* ── Welcome overlay auto-dismiss → show picker only if no categories saved ── */
	useEffect(() => {
		if (!showWelcome) return;
		const t = setTimeout(() => {
			setShowWelcome(false);
			// Only show picker if morning signal is enabled and user hasn't selected categories yet
			const hasCategories = user?.newsletter_category_slugs
				? user.newsletter_category_slugs.split(',').filter(Boolean).length > 0
				: false;
			if (!hasCategories && nlCategories.length > 0 && morningSignalEnabled) {
				setShowCategoryPicker(true);
			} else {
				router.push("/dashboard");
			}
		}, 3000);
		return () => clearTimeout(t);
	}, [showWelcome, nlCategories, user, morningSignalEnabled, router]);

	/* ── Mount & session check ──────────────────────────────── */
	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (!mounted) return;

		const syncViewport = () => {
			setIsMobileBanner(window.innerWidth <= 767);
		};

		syncViewport();
		window.addEventListener("resize", syncViewport);
		return () => window.removeEventListener("resize", syncViewport);
	}, [mounted]);

	useEffect(() => {
		if (!mounted) return;
		const syncAuth = () => {
			const token = localStorage.getItem("pub_auth_token");
			const raw = localStorage.getItem("pub_auth_user");
			if (token && raw) {
				try {
					setUser(JSON.parse(raw));
					setLoggedIn(true);
					return;
				} catch {}
			}
			setUser(null);
			setLoggedIn(false);
		};

		syncAuth();
		window.addEventListener("pub-auth-changed", syncAuth);
		return () => window.removeEventListener("pub-auth-changed", syncAuth);
	}, [mounted]);

	/* ── Listen for external open-auth-modal event ──────────── */
	useEffect(() => {
		if (!mounted) return;
		const handler = () => {
			setError("");
			setSuccess("");
			setOpen(true);
		};
		window.addEventListener("open-auth-modal", handler);
		return () => window.removeEventListener("open-auth-modal", handler);
	}, [mounted]);

	const loggedInRef = useRef(loggedIn);
	useEffect(() => {
		loggedInRef.current = loggedIn;
	}, [loggedIn]);

	useEffect(() => {
		if (!mounted || isAdmin) return;

		const searchParams = new URLSearchParams(window.location.search);
		if (searchParams.get("auth") === "login") return;

		const onScroll = () => {
			if (loggedInRef.current) return;
			const scrolled = window.scrollY;

			if (scrolled < 50) {
				setScrollVisible(false);
				setScrollSlideY(100);
				return;
			}

			setScrollVisible(true);
			// 50px → 600px of scroll = full reveal
			const progress = Math.min(1, (scrolled - 50) / 550);
			setScrollSlideY(Math.round((1 - progress) * 100));

			if (progress >= 1) {
				setScrollVisible(false);
				setError("");
				setSuccess("");
				setOpen(true);
				window.removeEventListener("scroll", onScroll);
			}
		};

		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, [mounted, isAdmin]);

	const handleLogout = () => {
		localStorage.removeItem("pub_auth_token");
		localStorage.removeItem("pub_auth_user");
		setUser(null);
		setLoggedIn(false);
		setOpen(false);
		setError("");
		setSuccess("");
		window.dispatchEvent(new Event("pub-auth-changed"));
	};

	const closeModal = () => {
		setOpen(false);
		setError("");
		setSuccess("");
	};

	if (!mounted || isAdmin) return null;

	/* ─────────────── SINGLE RETURN ─────────────── */
	return (
		<>
			{GOOGLE_CLIENT_ID && (
				<Script
					src="https://accounts.google.com/gsi/client"
					onLoad={initGIS}
					onError={handleGoogleScriptError}
					strategy="afterInteractive"
				/>
			)}

			{/* Welcome overlay — rendered independently of open/close state */}
			{showWelcome && welcomeUser && (
				<div
					style={{
						position: "fixed",
						inset: 0,
						zIndex: 10000,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						background: "rgba(10,10,20,0.55)",
						backdropFilter: "blur(10px)",
						pointerEvents: "none",
					}}
				>
					<div
						style={{
							animation: "welcomeCardIn 0.5s cubic-bezier(0.34,1.56,0.64,1)",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							background: "#fff",
							borderRadius: 28,
							padding: "44px 52px 40px",
							boxShadow: "0 32px 80px rgba(0,0,0,0.22)",
							maxWidth: 400,
							width: "calc(100vw - 48px)",
							textAlign: "center",
							position: "relative",
							overflow: "hidden",
						}}
					>
						{/* Pink top glow bar */}
						<div
							style={{
								position: "absolute",
								top: 0,
								left: 0,
								right: 0,
								height: 5,
								background: "linear-gradient(90deg, #e91e63 0%, #f97316 100%)",
								borderRadius: "28px 28px 0 0",
							}}
						/>

						{/* Congratulations heading */}
						<p
							style={{
								margin: "0 0 28px",
								fontSize: 22,
								fontWeight: 800,
								color: "#e91e63",
								letterSpacing: "-0.01em",
							}}
						>
							Congratulations!!
						</p>

						{/* Avatar ring */}
						<div style={{ position: "relative", marginBottom: 20 }}>
							<div
								style={{
									width: 88,
									height: 88,
									borderRadius: "50%",
									background:
										"linear-gradient(135deg, #e91e63 0%, #f97316 100%)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "#fff",
									fontWeight: 800,
									fontSize: 34,
									boxShadow: "0 8px 32px rgba(233,30,99,0.35)",
									animation:
										"avatarPop 0.6s 0.15s cubic-bezier(0.34,1.56,0.64,1) both",
								}}
							>
								{welcomeUser.name.charAt(0).toUpperCase()}
							</div>
							{/* Pulse ring */}
							<div
								style={{
									position: "absolute",
									inset: -6,
									borderRadius: "50%",
									border: "2.5px solid rgba(233,30,99,0.25)",
									animation: "pulseRing 1.5s ease-out 0.3s infinite",
								}}
							/>
						</div>

						{/* Greeting */}
						<p
							style={{
								margin: "0 0 6px",
								fontSize: 13,
								fontWeight: 600,
								color: "#e91e63",
								letterSpacing: "0.1em",
								textTransform: "uppercase",
							}}
						>
							You&apos;re in!
						</p>
						<p
							style={{
								margin: "0 0 8px",
								fontSize: 24,
								fontWeight: 800,
								color: "#111",
								letterSpacing: "-0.02em",
								lineHeight: 1.15,
							}}
						>
							Welcome to
							<br />
							StartupNews.fyi
						</p>
						<p
							style={{
								margin: "0 0 28px",
								fontSize: 14,
								color: "#6b7280",
								fontWeight: 400,
								lineHeight: 1.5,
							}}
						>
							You now have access to startup news,
							<br />
							funding insights &amp; exclusive reports.
						</p>

						{/* Name badge */}
						<div
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 8,
								background: "#fff7fb",
								border: "1px solid rgba(233,30,99,0.15)",
								borderRadius: 50,
								padding: "7px 18px",
								fontSize: 14,
								fontWeight: 600,
								color: "#e91e63",
							}}
						>
							<span
								style={{
									width: 8,
									height: 8,
									borderRadius: "50%",
									background: "#e91e63",
									display: "inline-block",
									animation: "dotBlink 1.2s ease-in-out infinite",
								}}
							/>
							{welcomeUser.name}
						</div>
					</div>
				</div>
			)}

			{/* Newsletter category picker — shown after sign-in */}
			{showCategoryPicker && (
				<div
					style={{
						position: "fixed",
						left: 0,
						right: 0,
						bottom: 0,
						zIndex: 9999,
						display: "flex",
						justifyContent: "center",
						alignItems: "flex-end",
						padding: isMobileBanner ? "0 10px 10px" : "0 12px 12px",
						boxSizing: "border-box",
						pointerEvents: "none",
					}}
				>
					<div
						onClick={(e) => e.stopPropagation()}
						style={{
							background: `linear-gradient(0deg, #fff6ee 0%, ${modalTheme.panelStrong} 34%, ${modalTheme.panel} 100%)`,
							borderRadius: isMobileBanner ? 18 : 22,
							width: "100%",
							maxWidth: 1180,
							boxShadow: "0 -4px 18px rgba(17,17,17,0.08)",
							overflow: "hidden",
							position: "relative",
							animation: "authSlideUp 1.2s cubic-bezier(0.16,1,0.3,1)",
							border: `1px solid ${modalTheme.line}`,
							pointerEvents: "auto",
							maxHeight: isMobileBanner ? "88vh" : "none",
							overflowY: isMobileBanner ? "auto" : "visible",
						}}
					>
						<div
							aria-hidden
							style={{
								position: "absolute",
								inset: 0,
								background:
									"linear-gradient(0deg, rgba(255,220,226,0.55) 0%, rgba(252,228,236,0.22) 18%, rgba(255,255,255,0) 40%)",
								pointerEvents: "none",
							}}
						/>

						{/* Skip button */}
						<button
							onClick={() => {
								setShowCategoryPicker(false);
								router.push("/dashboard");
							}}
							style={{
								position: "absolute",
								top: isMobileBanner ? 8 : 14,
								right: isMobileBanner ? 8 : 14,
								padding: "5px 14px",
								borderRadius: 20,
								border: `1px solid ${modalTheme.line}`,
								background: "rgba(255,255,255,0.92)",
								cursor: "pointer",
								color: modalTheme.inkSoft,
								fontSize: 12,
								fontWeight: 600,
								zIndex: 1,
							}}
						>
							Skip
						</button>

						<div style={{ padding: isMobileBanner ? "14px 14px 16px" : "22px 56px 24px 96px" }}>
							{/* Header row */}
							<div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: isMobileBanner ? 12 : 16, flexWrap: "wrap" }}>
								<div style={{ flex: 1, minWidth: 0 }}>
									<p style={{ fontSize: isMobileBanner ? 12 : 13, fontWeight: 700, color: modalTheme.brand, letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 4px" }}>
										Almost there!
									</p>
									<p style={{ fontSize: isMobileBanner ? 18 : 26, fontWeight: 800, color: modalTheme.ink, margin: "0 0 4px", lineHeight: 1.1 }}>
										Pick your interests
									</p>
									<p style={{ fontSize: isMobileBanner ? 12 : 14, color: modalTheme.inkSoft, margin: 0 }}>
										Choose{" "}
										<strong>1–3 categories</strong>{" "}
										to personalise your newsletter feed.
										{selectedCats.length > 0 && (
											<span style={{ marginLeft: 8, color: modalTheme.brand, fontWeight: 700 }}>
												{selectedCats.length}/3 selected
											</span>
										)}
									</p>
								</div>

								{/* Continue button — desktop inline */}
								{!isMobileBanner && (
									<button
										onClick={async () => {
											if (selectedCats.length === 0) return;
											setCatSaving(true);
											try {
												const token = localStorage.getItem("pub_auth_token");
												if (token) {
													await fetch("/api/public-auth/newsletter-preferences", {
														method: "POST",
														headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
														body: JSON.stringify({ categories: selectedCats }),
													});
												}
											} catch { /* best-effort */ }
											setCatSaving(false);
											setShowCategoryPicker(false);
											router.push("/dashboard");
										}}
										disabled={selectedCats.length === 0 || catSaving}
										style={{
											padding: "11px 28px",
											background: selectedCats.length === 0
												? "#e2e8f0"
												: "linear-gradient(135deg, #e91e63 0%, #f97316 100%)",
											color: selectedCats.length === 0 ? "#94a3b8" : "#fff",
											border: "none",
											borderRadius: 12,
											fontWeight: 700,
											fontSize: 15,
											cursor: selectedCats.length === 0 ? "not-allowed" : "pointer",
											whiteSpace: "nowrap",
											flexShrink: 0,
											alignSelf: "flex-end",
											transition: "background 0.2s",
										}}
									>
										{catSaving ? "Saving…" : "Continue →"}
									</button>
								)}
							</div>

							{/* Category chips */}
							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: isMobileBanner ? 7 : 10,
									marginBottom: isMobileBanner ? 14 : 0,
								}}
							>
								{[...nlCategories].sort((a, b) => a.name.localeCompare(b.name)).map((cat) => {
									const isSelected = selectedCats.includes(cat.slug);
									const maxReached = selectedCats.length >= 3 && !isSelected;
									return (
										<button
											key={cat.slug}
											type="button"
											disabled={maxReached}
											onClick={() => {
												setSelectedCats((prev) =>
													isSelected
														? prev.filter((s) => s !== cat.slug)
														: [...prev, cat.slug]
												);
											}}
											style={{
												display: "inline-flex",
												alignItems: "center",
												gap: 6,
												padding: isMobileBanner ? "6px 12px" : "8px 16px",
												borderRadius: 999,
												border: isSelected
													? `2px solid ${cat.color}`
													: "2px solid #e2e8f0",
												background: isSelected
													? cat.color + "18"
													: maxReached
													? "#f8fafc"
													: "#fff",
												color: isSelected
													? cat.color
													: maxReached
													? "#cbd5e1"
													: "#374151",
												fontWeight: isSelected ? 700 : 500,
												fontSize: isMobileBanner ? 12 : 13,
												cursor: maxReached ? "not-allowed" : "pointer",
												transition: "all 0.15s",
												opacity: maxReached ? 0.5 : 1,
												whiteSpace: "nowrap",
											}}
										>
											{isSelected && (
												<span style={{ fontSize: 11, fontWeight: 800 }}>✓</span>
											)}
											<span
												style={{
													width: 8,
													height: 8,
													borderRadius: "50%",
													background: isSelected ? cat.color : "#cbd5e1",
													flexShrink: 0,
													display: "inline-block",
												}}
											/>
											{cat.name}
										</button>
									);
								})}
							</div>

							{/* Continue button — mobile below chips */}
							{isMobileBanner && (
								<button
									onClick={async () => {
										if (selectedCats.length === 0) return;
										setCatSaving(true);
										try {
											const token = localStorage.getItem("pub_auth_token");
											if (token) {
												await fetch("/api/public-auth/newsletter-preferences", {
													method: "POST",
													headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
													body: JSON.stringify({ categories: selectedCats }),
												});
											}
										} catch { /* best-effort */ }
										setCatSaving(false);
										setShowCategoryPicker(false);
										router.push("/dashboard");
									}}
									disabled={selectedCats.length === 0 || catSaving}
									style={{
										width: "100%",
										padding: "13px 0",
										background: selectedCats.length === 0
											? "#e2e8f0"
											: "linear-gradient(135deg, #e91e63 0%, #f97316 100%)",
										color: selectedCats.length === 0 ? "#94a3b8" : "#fff",
										border: "none",
										borderRadius: 12,
										fontWeight: 700,
										fontSize: 15,
										cursor: selectedCats.length === 0 ? "not-allowed" : "pointer",
										transition: "background 0.2s",
									}}
								>
									{catSaving ? "Saving…" : "Continue →"}
								</button>
							)}
						</div>
					</div>
				</div>
			)}

			{/* Bottom sheet */}
			{(open || scrollVisible) && !loggedIn && (
				<div
					style={{
						position: "fixed",
						left: 0,
						right: 0,
						bottom: 0,
						zIndex: 9999,
						display: "flex",
						justifyContent: "center",
						alignItems: "flex-end",
						padding: 0,
						boxSizing: "border-box",
						pointerEvents: "none",
					}}
				>
					<div
						onClick={(e) => e.stopPropagation()}
						style={{
							background: `linear-gradient(90deg, #f2b8cc 0%, ${modalTheme.brandSoft} 30%, ${modalTheme.panel} 50%, ${modalTheme.brandSoft} 72%, #f2b8cc 100%)`,
							borderRadius: "12px 12px 0 0",
							width: "100%",
							maxWidth: isMobileBanner ? 1200 : "none",
							boxShadow: "0 -4px 18px rgba(17,17,17,0.08)",
							overflow: "hidden",
							position: "relative",
							animation: scrollVisible ? "none" : "authSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
							transform: scrollVisible ? `translateY(${scrollSlideY}%)` : undefined,
							border: `1px solid ${modalTheme.line}`,
							pointerEvents: "auto",
							maxHeight: isMobileBanner ? "82vh" : "none",
							overflowY: isMobileBanner ? "auto" : "hidden",
						}}
					>
						{/* Dot pattern decoration, fading from the left edge into the content */}
						{!isMobileBanner && (
							<div
								aria-hidden
								style={{
									position: "absolute",
									top: 0,
									bottom: 0,
									left: 0,
									width: 300,
									backgroundImage:
										"radial-gradient(rgba(0,0,0,0.85) 2px, transparent 2px)",
									backgroundSize: "17px 17px",
									backgroundPosition: "20px 20px",
									WebkitMaskImage:
										"linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)",
									maskImage:
										"linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)",
									pointerEvents: "none",
								}}
							/>
						)}
						<div
							aria-hidden
							style={{
								position: "absolute",
								inset: 0,
								background:
									"radial-gradient(120% 140% at 15% 0%, rgba(255,220,226,0.55) 0%, rgba(255,255,255,0) 55%)",
								pointerEvents: "none",
							}}
						/>

						<button
							onClick={closeModal}
							style={{
								position: "absolute",
								top: isMobileBanner ? 8 : 14,
								right: isMobileBanner ? 8 : 14,
								width: isMobileBanner ? 28 : 36,
								height: isMobileBanner ? 28 : 36,
								borderRadius: "50%",
								border: `1px solid ${modalTheme.line}`,
								background: "rgba(255,255,255,0.92)",
								cursor: "pointer",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								color: modalTheme.ink,
								fontSize: isMobileBanner ? 16 : 20,
								lineHeight: 1,
								zIndex: 1,
							}}
						>
							×
						</button>

						<div
							style={{
								padding: isMobileBanner ? "22px 20px 20px" : "26px 60px 24px",
								position: "relative",
								textAlign: "center",
							}}
						>
							<p
								style={{
									fontFamily: "Georgia, 'Times New Roman', serif",
									fontWeight: 700,
									fontSize: isMobileBanner ? 20 : 34,
									lineHeight: 1.2,
									color: modalTheme.ink,
									margin: "0 auto 8px",
									maxWidth: isMobileBanner ? 640 : "none",
									whiteSpace: isMobileBanner ? "normal" : "nowrap",
								}}
							>
								Sign-In for Free
							</p>
							<p
								style={{
									fontSize: isMobileBanner ? 14.5 : 17,
									fontWeight: 700,
									lineHeight: 1.45,
									color: modalTheme.inkSoft,
									margin: isMobileBanner ? "0 auto 10px" : "0 auto 16px",
									maxWidth: isMobileBanner ? 520 : "none",
									whiteSpace: isMobileBanner ? "normal" : "nowrap",
								}}
							>
								Unlock unlimited access to News, Articles, Special Reports, Curated Newsletters built for You & Your Business.
							</p>

							{error && (
								<div
									style={{
										background: "rgba(255,255,255,0.94)",
										border: "1px solid #fecdd3",
										borderRadius: 14,
										padding: "10px 14px",
										marginBottom: 16,
										fontSize: 13,
										color: "#b42318",
										display: "inline-flex",
										gap: 8,
										alignItems: "flex-start",
										maxWidth: 380,
									}}
								>
									<span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
									{error}
								</div>
							)}
							{success && (
								<div
									style={{
										background: "rgba(255,255,255,0.94)",
										border: "1px solid #bbf7d0",
										borderRadius: 14,
										padding: "10px 14px",
										marginBottom: 16,
										fontSize: 13,
										color: "#15803d",
										display: "inline-flex",
										gap: 8,
										alignItems: "flex-start",
										maxWidth: 380,
									}}
								>
									<span style={{ flexShrink: 0, marginTop: 1 }}>✓</span>
									{success}
								</div>
							)}

							<div
								onClick={handleGoogleButtonClick}
								style={{
									display: "inline-flex",
									alignItems: "center",
									justifyContent: "center",
									gap: 16,
									padding: isMobileBanner ? "11px 30px" : "18px 58px",
									borderRadius: 999,
									background: modalTheme.ink,
									color: "#fff",
									fontWeight: 700,
									fontSize: isMobileBanner ? 14 : 22,
									letterSpacing: "0.01em",
									cursor: "pointer",
									boxShadow: "0 8px 22px rgba(0,0,0,0.3)",
									transition: "transform 0.15s, box-shadow 0.15s",
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.transform = "translateY(-1px)";
									e.currentTarget.style.boxShadow = "0 10px 26px rgba(0,0,0,0.36)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.transform = "translateY(0)";
									e.currentTarget.style.boxShadow = "0 8px 22px rgba(0,0,0,0.3)";
								}}
							>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width={isMobileBanner ? 18 : 28} height={isMobileBanner ? 18 : 28} style={{ flexShrink: 0 }}>
									<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
									<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
									<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
									<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
									<path fill="none" d="M0 0h48v48H0z" />
								</svg>
								Continue with Google
							</div>

							{/* Footer */}
							<p
								style={{
									textAlign: isMobileBanner ? "center" : "right",
									fontSize: isMobileBanner ? 11 : 10,
									lineHeight: isMobileBanner ? 1.35 : 1.5,
									color: modalTheme.inkSoft,
									marginTop: isMobileBanner ? 10 : 0,
									marginBottom: 0,
									...(isMobileBanner
										? {}
										: { position: "absolute", right: 60, bottom: 20 }),
								}}
							>
								By continuing you agree to our{" "}
								<a
									href="/terms-and-conditions"
									target="_blank"
									rel="noopener noreferrer"
									style={{
										color: modalTheme.ink,
										textDecoration: "underline",
										fontWeight: 600,
									}}
								>
									Terms
								</a>{" "}
								&{" "}
								<a
									href="/privacy-policy"
									target="_blank"
									rel="noopener noreferrer"
									style={{
										color: modalTheme.ink,
										textDecoration: "underline",
										fontWeight: 600,
									}}
								>
									Privacy Policy
								</a>
							</p>
						</div>
					</div>
				</div>
			)}

			<style>{`
        @keyframes authSlideUp {
          from { transform: translateY(110%); }
          to   { transform: translateY(0);    }
        }
        @keyframes welcomeCardIn {
          from { opacity: 0; transform: translateY(32px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        @keyframes avatarPop {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1);   }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1);    opacity: 0.7; }
          100% { transform: scale(1.55); opacity: 0;   }
        }
        @keyframes dotBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
      `}</style>
		</>
	);
}
