"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { isBareRoute } from "@/components/ConditionalLayout";
import { takeQueuedWelcome, type AuthUser } from "@/components/auth/readerAuth";

const GOOGLE_ICON =
	"https://techdocs.akamai.com/identity-cloud/img/social-login/identity-providers/iconfinder-new-google-favicon-682665.png";
const LINKEDIN_ICON =
	"https://yt3.googleusercontent.com/i6KNxiy3gME-BulL4WnuGkTGqHuSYF8jl1WRn0rXftcJdSYK7dHKcJ3gLAaPc-KfhmLSYPwf824=s900-c-k-c0x00ffffff-no-rj";

const modalTheme = {
	brand: "#E72262",
	brandSoft: "#fce4ec",
	brandGlow: "#fce4ec",
	ink: "#111111",
	inkSoft: "#4b5563",
	line: "rgba(17,17,17,0.1)",
	panel: "#ffffff",
	panelStrong: "#fff7fb",
};

/* The popup's single "Login / Sign up" button. */
const authButtonBase = (mobile: boolean): CSSProperties => ({
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 12,
	width: mobile ? "100%" : 300,
	height: mobile ? 46 : 58,
	padding: "0 24px",
	boxSizing: "border-box",
	borderRadius: 999,
	fontWeight: 700,
	fontSize: mobile ? 14.5 : 17,
	letterSpacing: "0.01em",
	cursor: "pointer",
	fontFamily: "inherit",
	transition: "transform 0.15s, box-shadow 0.15s, border-color 0.15s, color 0.15s",
});

export default function AuthModal() {
	const pathname = usePathname();
	const router = useRouter();
	// Staff panels (admin + employee) and the member dashboard never get the reader login popup.
	const isAdmin =
		pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard") || pathname?.startsWith("/employee");
	// Bare event-landing pages (currently /expand-north-star) bring their own header, CTAs and
	// closing form; a site-wide login popup sliding up mid-scroll is off-brand there and competes
	// with the page's own registration form for attention. Shares ConditionalLayout's route list
	// (the same pages that already render without the site header/banner/footer) rather than
	// keeping a second list that could drift out of step.
	const suppressed = isAdmin || isBareRoute(pathname);

	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);
	const [loggedIn, setLoggedIn] = useState(false);
	const [user, setUser] = useState<AuthUser | null>(null);

	const [showWelcome, setShowWelcome] = useState(false);
	const [welcomeUser, setWelcomeUser] = useState<AuthUser | null>(null);
	const [isMobileBanner, setIsMobileBanner] = useState(false);

	const [scrollVisible, setScrollVisible] = useState(false);
	const [openedByScroll, setOpenedByScroll] = useState(false);
	const sheetRef = useRef<HTMLDivElement>(null);
	const rafRef = useRef<number | null>(null);

	/* ── Mount & session check ──────────────────────────────── */
	useEffect(() => {
		setMounted(true);
	}, []);

	/* /login sends the reader home after a successful sign-in/up and queues the welcome card here. */
	useEffect(() => {
		if (!mounted || suppressed) return;
		const frame = requestAnimationFrame(() => {
			const queued = takeQueuedWelcome();
			if (queued) {
				setWelcomeUser(queued);
				setShowWelcome(true);
			}
		});
		return () => cancelAnimationFrame(frame);
	}, [mounted, suppressed]);

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
			setOpenedByScroll(false);
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
		if (!mounted || suppressed) return;

		const searchParams = new URLSearchParams(window.location.search);
		if (searchParams.get("auth") === "login") return;

		const applySlide = (scrolled: number) => {
			if (scrolled < 50) {
				setScrollVisible(false);
				return;
			}

			setScrollVisible(true);
			// Reveal over 50px → 600px of scroll, but never later than the actual
			// bottom of the page — on short pages scrollY may never reach 600.
			const maxScroll = Math.max(
				1,
				document.documentElement.scrollHeight - window.innerHeight
			);
			const revealEnd = Math.min(600, maxScroll);
			const progress =
				scrolled >= maxScroll - 1
					? 1
					: Math.min(1, (scrolled - 50) / Math.max(1, revealEnd - 50));
			if (sheetRef.current) {
				sheetRef.current.style.transform = `translateY(${(1 - progress) * 100}%)`;
			}

			if (progress >= 1) {
				setScrollVisible(false);
				setOpenedByScroll(true);
				setOpen(true);
				window.removeEventListener("scroll", onScroll);
			}
		};

		const onScroll = () => {
			if (loggedInRef.current) return;
			if (rafRef.current !== null) return;
			rafRef.current = requestAnimationFrame(() => {
				rafRef.current = null;
				applySlide(window.scrollY);
			});
		};

		window.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", onScroll);
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
		};
	}, [mounted, suppressed]);

	const handleLogout = () => {
		localStorage.removeItem("pub_auth_token");
		localStorage.removeItem("pub_auth_user");
		sessionStorage.removeItem("pending_profile_dismissed");
		setUser(null);
		setLoggedIn(false);
		setOpen(false);
		setOpenedByScroll(false);
		window.dispatchEvent(new Event("pub-auth-changed"));
	};

	const closeModal = () => {
		setOpen(false);
		setOpenedByScroll(false);
	};

	/* ── Broadcast auth-flow visibility so other UI (e.g. the PWA install
	   card) can stay sequenced behind it. `false` only fires after a `true`
	   was sent, so unrelated listeners never see a spurious close. ──────── */
	const authFlowVisible = (open || scrollVisible || showWelcome) && !suppressed;
	const wasAuthFlowVisibleRef = useRef(false);
	const everAuthFlowVisibleRef = useRef(false);
	useEffect(() => {
		if (!mounted) return;
		if (authFlowVisible === wasAuthFlowVisibleRef.current) return;
		wasAuthFlowVisibleRef.current = authFlowVisible;
		if (authFlowVisible) {
			everAuthFlowVisibleRef.current = true;
			window.dispatchEvent(new CustomEvent("auth-modal-state", { detail: { open: true } }));
		} else if (everAuthFlowVisibleRef.current) {
			window.dispatchEvent(new CustomEvent("auth-modal-state", { detail: { open: false } }));
		}
	}, [mounted, authFlowVisible]);

	if (!mounted || suppressed) return null;

	/* ─────────────── SINGLE RETURN ─────────────── */
	return (
		<>
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
								background: "#E72262",
								borderRadius: "28px 28px 0 0",
							}}
						/>

						{/* Congratulations heading */}
						<p
							style={{
								margin: "0 0 28px",
								fontSize: 22,
								fontWeight: 800,
								color: "#E72262",
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
									background: "#E72262",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									color: "#fff",
									fontWeight: 800,
									fontSize: 34,
									boxShadow: "0 8px 32px rgba(231,34,98,0.35)",
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
									border: "2.5px solid rgba(231,34,98,0.25)",
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
								color: "#E72262",
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
								border: "1px solid rgba(231,34,98,0.15)",
								borderRadius: 50,
								padding: "7px 18px",
								fontSize: 14,
								fontWeight: 600,
								color: "#E72262",
							}}
						>
							<span
								style={{
									width: 8,
									height: 8,
									borderRadius: "50%",
									background: "#E72262",
									display: "inline-block",
									animation: "dotBlink 1.2s ease-in-out infinite",
								}}
							/>
							{welcomeUser.name}
						</div>

						{/* Continue actions */}
						<div style={{ display: "flex", gap: 10, width: "100%", marginTop: 28 }}>
							<button
								type="button"
								onClick={() => {
									setShowWelcome(false);
									router.push("/dashboard/reports");
								}}
								style={{
									flex: 1,
									padding: "12px 10px",
									borderRadius: 12,
									border: "1.5px solid rgba(231,34,98,0.25)",
									background: "#fff",
									color: "#E72262",
									fontWeight: 700,
									fontSize: 13.5,
									cursor: "pointer",
									fontFamily: "inherit",
									transition: "background 0.15s, border-color 0.15s",
								}}
								onMouseEnter={(e) => { e.currentTarget.style.background = "#fff7fb"; e.currentTarget.style.borderColor = "#E72262"; }}
								onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "rgba(231,34,98,0.25)"; }}
							>
								Continue to Reports
							</button>
							<button
								type="button"
								onClick={() => {
									setShowWelcome(false);
									router.push("/news");
								}}
								style={{
									flex: 1,
									padding: "12px 10px",
									borderRadius: 12,
									border: "none",
									background: "#E72262",
									color: "#fff",
									fontWeight: 700,
									fontSize: 13.5,
									cursor: "pointer",
									fontFamily: "inherit",
									boxShadow: "0 6px 16px rgba(231,34,98,0.3)",
									transition: "transform 0.12s, box-shadow 0.12s",
								}}
								onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(231,34,98,0.4)"; }}
								onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(231,34,98,0.3)"; }}
							>
								Continue to News
							</button>
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
						ref={sheetRef}
						onClick={(e) => e.stopPropagation()}
						style={{
							background: `linear-gradient(90deg, #f2b8cc 0%, ${modalTheme.brandSoft} 30%, ${modalTheme.panel} 50%, ${modalTheme.brandSoft} 72%, #f2b8cc 100%)`,
							width: "100%",
							maxWidth: isMobileBanner ? 1200 : "none",
							boxShadow: "0 -4px 18px rgba(17,17,17,0.08)",
							overflow: "hidden",
							position: "relative",
							animation:
								scrollVisible || openedByScroll
									? "none"
									: "authSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
							transform: scrollVisible
								? "translateY(100%)"
								: openedByScroll
								? "translateY(0)"
								: undefined,
							transition:
								scrollVisible || openedByScroll
									? "transform 0.45s cubic-bezier(0.16,1,0.3,1)"
									: undefined,
							willChange: scrollVisible || openedByScroll ? "transform" : undefined,
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
								Stay ahead of the startup story
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
								Unlimited news, special reports and curated newsletters on startups and funding. Free with one account.
							</p>

							{/* One way in: every sign-in / sign-up option (Google, email registration, email sign-in)
							    lives on the full-screen /login page, which sends the reader home with the welcome card. */}
							<Link
								href="/login"
								onClick={() => closeModal()}
								style={{ ...authButtonBase(isMobileBanner), background: modalTheme.brand, color: "#fff", border: `1.5px solid ${modalTheme.brand}`, boxShadow: "0 10px 24px rgba(231,34,98,0.32)", textDecoration: "none" }}
								onMouseEnter={(e) => {
									e.currentTarget.style.transform = "translateY(-1px)";
									e.currentTarget.style.boxShadow = "0 14px 30px rgba(231,34,98,0.4)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.transform = "translateY(0)";
									e.currentTarget.style.boxShadow = "0 10px 24px rgba(231,34,98,0.32)";
								}}
							>
								Login / Sign up
								<ArrowRight size={isMobileBanner ? 18 : 20} strokeWidth={2.4} style={{ flexShrink: 0 }} />
							</Link>

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
