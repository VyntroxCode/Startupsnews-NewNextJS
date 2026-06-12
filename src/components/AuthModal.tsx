"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
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
}

export default function AuthModal() {
	const pathname = usePathname();
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

						const res = await fetch("/api/public-auth/google-verify", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({ accessToken: response.access_token, country, city }),
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

	/* ── Welcome overlay auto-dismiss ───────────────────────── */
	useEffect(() => {
		if (!showWelcome) return;
		const t = setTimeout(() => setShowWelcome(false), 3000);
		return () => clearTimeout(t);
	}, [showWelcome]);

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

		const showModal = () => {
			if (loggedInRef.current) return;
			setError("");
			setSuccess("");
			setOpen(true);
		};

		// Show after 15s from page load, then every 15s while not logged in
		let interval: ReturnType<typeof setInterval> | null = null;
		const initial = setTimeout(() => {
			showModal();
			interval = setInterval(showModal, 15000);
		}, 15000);

		return () => {
			clearTimeout(initial);
			if (interval) clearInterval(interval);
		};
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
		// no-op: cooldown removed, modal recurs every 15s
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

			{/* Floating sign-in button */}
			{!open && !loggedIn && (
				<button
					onClick={() => {
						setError("");
						setSuccess("");
						setOpen(true);
					}}
					title="Sign in / Register"
					style={{
						position: "fixed",
						bottom: 24,
						right: 24,
						zIndex: 9998,
						display: "flex",
						alignItems: "center",
						gap: 10,
						background: "#fff",
						border: "1.5px solid #e5e7eb",
						borderRadius: 50,
						padding: "7px 18px 7px 10px",
						boxShadow: "0 4px 20px rgba(0,0,0,0.13)",
						cursor: "pointer",
						transition: "box-shadow 0.2s, transform 0.2s",
					}}
					onMouseEnter={(e) => {
						(e.currentTarget as HTMLButtonElement).style.boxShadow =
							"0 8px 28px rgba(0,0,0,0.2)";
						(e.currentTarget as HTMLButtonElement).style.transform =
							"translateY(-2px)";
					}}
					onMouseLeave={(e) => {
						(e.currentTarget as HTMLButtonElement).style.boxShadow =
							"0 4px 20px rgba(0,0,0,0.13)";
						(e.currentTarget as HTMLButtonElement).style.transform = "none";
					}}
				>
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={GOOGLE_ICON}
						alt="Google"
						width={22}
						height={22}
						style={{ borderRadius: "50%", objectFit: "contain" }}
					/>
					<span
						style={{
							fontSize: 13,
							fontWeight: 600,
							color: "#374151",
							whiteSpace: "nowrap",
						}}
					>
						Login/Sign in
					</span>
				</button>
			)}

			{/* Bottom sheet */}
			{open && !loggedIn && (
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
							animation: "authSlideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)",
							border: `1px solid ${modalTheme.line}`,
							pointerEvents: "auto",
							maxHeight: isMobileBanner ? "82vh" : "none",
							overflowY: isMobileBanner ? "auto" : "hidden",
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
								padding: isMobileBanner
									? "14px 14px 12px"
									: "22px 56px 20px 96px",
							}}
						>
							<div
								style={{
									display: "flex",
									flexDirection: isMobileBanner ? "column" : "row",
									flexWrap: "wrap",
									alignItems: isMobileBanner ? "stretch" : "center",
									justifyContent: "space-between",
									gap: isMobileBanner ? 10 : 20,
								}}
							>
								<div
									style={{
										flex: isMobileBanner ? "0 0 auto" : "1 1 320px",
										minWidth: 0,
										maxWidth: isMobileBanner ? "100%" : 650,
										paddingRight: isMobileBanner ? 34 : 0,
									}}
								>
									<Image
										src="/logo.png"
										alt="StartupNews.fyi"
										width={130}
										height={44}
										style={{
											objectFit: "contain",
											height: isMobileBanner ? 24 : 34,
											width: "auto",
											marginBottom: isMobileBanner ? 6 : 10,
										}}
									/>
									{loggedIn && user ? (
										<p
											style={{
												fontSize: 14,
												color: modalTheme.inkSoft,
												margin: 0,
											}}
										>
											You&apos;re signed in
										</p>
									) : (
										<>
											<p
												style={{
													fontSize: isMobileBanner ? 12 : 14,
													lineHeight: 1.2,
													fontWeight: 700,
													color: modalTheme.brand,
													margin: "0 0 4px",
													letterSpacing: "0.08em",
													textTransform: "uppercase",
												}}
											>
												Keep reading
											</p>
											<p
												style={{
													fontSize: isMobileBanner ? 18 : 34,
													lineHeight: isMobileBanner ? 1.08 : 1.05,
													fontWeight: 800,
													color: modalTheme.ink,
													margin: "0 0 6px",
													display: "-webkit-box",
													WebkitLineClamp: isMobileBanner ? 2 : "unset",
													WebkitBoxOrient: "vertical",
													overflow: isMobileBanner ? "hidden" : "visible",
												}}
											>
												Sign-In for Free
											</p>
											<p
												style={{
													fontSize: isMobileBanner ? 13 : 18,
													lineHeight: isMobileBanner ? 1.3 : 1.4,
													color: modalTheme.inkSoft,
													margin: 0,
												}}
											>
												<span style={{ display: "block", whiteSpace: isMobileBanner ? "normal" : "nowrap" }}>
													Unlock unlimited access to News, Articles, Special Reports,
												</span>
												<span style={{ display: "block", whiteSpace: isMobileBanner ? "normal" : "nowrap" }}>
													Curated News Letters build for You & Your Business.
												</span>
											</p>
										</>
									)}
								</div>

								{loggedIn && user ? (
									<div
										style={{
											flex: "0 1 320px",
											minWidth: 260,
											textAlign: "center",
										}}
									>
										<div
											style={{
												width: 64,
												height: 64,
												borderRadius: "50%",
												background: modalTheme.brand,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												color: "#fff",
												fontWeight: 700,
												fontSize: 26,
												margin: "0 auto 12px",
											}}
										>
											{user.name.charAt(0).toUpperCase()}
										</div>
										<p
											style={{
												fontWeight: 700,
												fontSize: 17,
												color: modalTheme.ink,
												margin: "0 0 4px",
											}}
										>
											{user.name}
										</p>
										<p
											style={{
												fontSize: 13,
												color: modalTheme.inkSoft,
												margin: "0 0 20px",
											}}
										>
											{user.email}
										</p>
										<button
											onClick={handleLogout}
											style={{
												width: "100%",
												padding: "10px 0",
												borderRadius: 14,
												border: "1.5px solid rgba(233,30,99,0.18)",
												background: modalTheme.brandSoft,
												color: modalTheme.brand,
												fontWeight: 600,
												fontSize: 14,
												cursor: "pointer",
											}}
										>
											Sign Out
										</button>
									</div>
								) : (
									<div
										style={{
											flex: isMobileBanner ? "0 0 auto" : "1 1 420px",
											minWidth: isMobileBanner ? 0 : 300,
											maxWidth: isMobileBanner ? "100%" : 420,
											width: isMobileBanner ? "100%" : "auto",
											marginTop: isMobileBanner ? 0 : 18,
											paddingRight: isMobileBanner ? 0 : 36,
										}}
									>
										{error && (
											<div
												style={{
													background: "#fff1f2",
													border: "1px solid #fecdd3",
													borderRadius: 14,
													padding: "10px 14px",
													marginBottom: 14,
													fontSize: 13,
													color: "#b42318",
													display: "flex",
													gap: 8,
													alignItems: "flex-start",
												}}
											>
												<span style={{ flexShrink: 0, marginTop: 1 }}>⚠</span>
												{error}
											</div>
										)}
										{success && (
											<div
												style={{
													background: "#f0fdf4",
													border: "1px solid #bbf7d0",
													borderRadius: 14,
													padding: "10px 14px",
													marginBottom: 14,
													fontSize: 13,
													color: "#15803d",
													display: "flex",
													gap: 8,
													alignItems: "flex-start",
												}}
											>
												<span style={{ flexShrink: 0, marginTop: 1 }}>✓</span>
												{success}
											</div>
										)}

										<div
											style={{
												display: "flex",
												justifyContent: "center",
												width: "100%",
											}}
										>
											{/* Unified Button Style: onClick directly triggers Google sign-in */}
											<div
												onClick={handleGoogleButtonClick}
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													gap: 14,
													width: "100%",
													maxWidth: isMobileBanner ? "100%" : 340,
													height: 54,
													borderRadius: 14,
													background: "#ffffff",
													boxShadow:
														"0 1px 4px rgba(0,0,0,0.12), 0 0 0 1.5px #dadce0",
													fontSize: 15,
													fontWeight: 700,
													color: "#3c4043",
													fontFamily:
														"'Google Sans', Roboto, Arial, sans-serif",
													letterSpacing: "0.3px",
													cursor: "pointer",
													transition: "background-color 0.2s, box-shadow 0.2s",
												}}
												onMouseEnter={(e) => {
													e.currentTarget.style.backgroundColor = "#f8f9fa";
													e.currentTarget.style.boxShadow =
														"0 2px 6px rgba(0,0,0,0.16), 0 0 0 1.5px #dadce0";
												}}
												onMouseLeave={(e) => {
													e.currentTarget.style.backgroundColor = "#ffffff";
													e.currentTarget.style.boxShadow =
														"0 1px 4px rgba(0,0,0,0.12), 0 0 0 1.5px #dadce0";
												}}
											>
												{/* Google icon container */}
												<div
													style={{
														width: 30,
														height: 30,
														borderRadius: "50%",
														background: "#f1f3f4",
														display: "flex",
														alignItems: "center",
														justifyContent: "center",
														flexShrink: 0,
													}}
												>
													<svg
														xmlns="http://www.w3.org/2000/svg"
														viewBox="0 0 48 48"
														width="18"
														height="18"
													>
														<path
															fill="#EA4335"
															d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
														/>
														<path
															fill="#4285F4"
															d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
														/>
														<path
															fill="#FBBC05"
															d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
														/>
														<path
															fill="#34A853"
															d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
														/>
														<path fill="none" d="M0 0h48v48H0z" />
													</svg>
												</div>
												<span>Continue with Google</span>
											</div>
										</div>

										{/* LinkedIn sign-in — temporarily disabled
                <div style={{ display: 'flex', justifyContent: isMobileBanner ? 'center' : 'flex-start', width: '100%' }}>
                  <a
                    href="/api/public-auth/linkedin/login"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                      width: isMobileBanner ? 290 : 320, maxWidth: '100%', height: 40,
                      padding: '0 12px', borderRadius: 999,
                      border: '1px solid #dadce0', background: '#ffffff',
                      fontSize: 14, fontWeight: 500, color: '#3c4043',
                      textDecoration: 'none', cursor: 'pointer', boxSizing: 'border-box',
                      fontFamily: "'Google Sans', Roboto, Arial, sans-serif",
                      letterSpacing: '0.25px',
                      transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLAnchorElement).style.background = '#f7f8f9';
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = '#d2d3d4';
                      (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLAnchorElement).style.background = '#ffffff';
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = '#dadce0';
                      (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <rect width="24" height="24" rx="3" fill="#0A66C2"/>
                      <path d="M7.5 9.5H5v9h2.5v-9zm-1.25-4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM19 18.5h-2.5v-4.5c0-1.1-.4-1.8-1.35-1.8-.74 0-1.15.5-1.35 1-.07.17-.09.4-.09.64v4.66H11s.03-7.57 0-8.96H13.7v1.27c.33-.52.93-1.26 2.27-1.26 1.65 0 2.89 1.08 2.89 3.4l.14 5.55z" fill="#fff"/>
                    </svg>
                    <span>Sign in with LinkedIn</span>
                  </a>
                </div>
                */}
									</div>
								)}
							</div>

							{/* Footer */}
							{!loggedIn && (
								<p
									style={{
										textAlign: "center",
										fontSize: isMobileBanner ? 11 : 13,
										lineHeight: isMobileBanner ? 1.35 : 1.5,
										color: modalTheme.inkSoft,
										marginTop: isMobileBanner ? 10 : 18,
										marginBottom: 0,
										paddingRight: isMobileBanner ? 18 : 0,
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
							)}
						</div>
					</div>
				</div>
			)}

			<style>{`
        @keyframes authSlideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)     scale(1);    }
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
