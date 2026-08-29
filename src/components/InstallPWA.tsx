"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  PWA_INSTALL_DISMISSED_KEY,
  PWA_HINT_DISMISSED_KEY,
  clearInstalledMarker,
  dismiss,
  isDismissed,
  isMarkedInstalled,
  markInstalled,
} from "@/lib/pwa-storage";

type Mode = "install" | "ios" | "installed" | "none";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const theme = {
  brand: "#E72262",
  brandTint: "#fce4ec",
  ink: "#111111",
  inkSoft: "#4b5563",
  line: "rgba(17,17,17,0.1)",
  panel: "#ffffff",
};

function isStandalone(): boolean {
  const displayModeStandalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(displayModeStandalone || iosStandalone);
}

function isIOS(): boolean {
  const ua = window.navigator.userAgent || "";
  const iPadOS = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(ua) || iPadOS;
}

function isSafari(): boolean {
  const ua = window.navigator.userAgent || "";
  return /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
}

function isChromium(): boolean {
  if (isIOS()) return false; // Chrome on iOS is Safari underneath — never fires beforeinstallprompt.
  const uaData = (navigator as unknown as { userAgentData?: { brands?: { brand: string }[] } }).userAgentData;
  if (uaData?.brands?.length) {
    return uaData.brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/i.test(b.brand));
  }
  const ua = window.navigator.userAgent || "";
  return /Chrome|Chromium|Edg\//.test(ua);
}

function isLoggedIn(): boolean {
  try {
    return Boolean(window.localStorage.getItem("pub_auth_token"));
  } catch {
    return false;
  }
}

/** Everything decidable synchronously (no await needed) — computed once as the
 * initial state so the "already installed" cases never need a post-mount
 * render just to catch up, and no synchronous setState-in-effect is needed. */
function computeInitialMode(): Mode {
  if (typeof window === "undefined") return "none";
  if (isStandalone()) {
    // We're running inside the installed app right now — nothing to show.
    markInstalled();
    return "none";
  }
  if (isMarkedInstalled()) return "installed";
  if (isIOS() && isSafari()) return "ios";
  return "none";
}

function computeInitialDismissed(key: string): boolean {
  if (typeof window === "undefined") return false;
  return isDismissed(key);
}

export default function InstallPWA() {
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode>(computeInitialMode);
  const [armed, setArmed] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [installDismissed, setInstallDismissed] = useState<boolean>(() =>
    computeInitialDismissed(PWA_INSTALL_DISMISSED_KEY)
  );
  const [hintDismissed, setHintDismissed] = useState<boolean>(() =>
    computeInitialDismissed(PWA_HINT_DISMISSED_KEY)
  );

  const deferredEventRef = useRef<BeforeInstallPromptEvent | null>(null);
  const promptCalledRef = useRef(false);

  /* ── "Already installed" detection ladder — the async parts that
     computeInitialMode() couldn't resolve synchronously. ────────────── */
  useEffect(() => {
    if (isStandalone()) return; // already reflected in the initial mode.

    let cancelled = false;

    const run = async () => {
      let alreadyInstalled = isMarkedInstalled();

      if (!alreadyInstalled) {
        const getInstalledRelatedApps = (
          navigator as unknown as { getInstalledRelatedApps?: () => Promise<unknown[]> }
        ).getInstalledRelatedApps;
        if (typeof getInstalledRelatedApps === "function") {
          try {
            const related = await getInstalledRelatedApps.call(navigator);
            if (Array.isArray(related) && related.length > 0) {
              alreadyInstalled = true;
              markInstalled();
            }
          } catch {
            // Unsupported/blocked — fall through to other heuristics.
          }
        }
      }

      if (cancelled) return;

      if (alreadyInstalled) {
        setMode((m) => (m === "install" ? m : "installed"));
        return;
      }

      if (isChromium()) {
        // Chromium-silence probe: if beforeinstallprompt hasn't fired ~3s after
        // the service worker is ready, the app is already installed. Timed from
        // serviceWorker.ready (not page load) so a slow registration isn't
        // mistaken for an install.
        try {
          if ("serviceWorker" in navigator) {
            await navigator.serviceWorker.ready;
          }
        } catch {
          // ignore
        }
        if (cancelled) return;
        setTimeout(() => {
          if (cancelled) return;
          setMode((m) => (m === "install" ? m : "installed"));
        }, 3000);
      }

      // Firefox / desktop Safari / iOS (handled synchronously already): no
      // further affordance to resolve.
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── beforeinstallprompt / appinstalled ────────────────────────────── */
  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredEventRef.current = e as BeforeInstallPromptEvent;
      promptCalledRef.current = false;
      // Definitive proof the app is NOT installed — clear any stale marker
      // even if we'd previously concluded "installed" via the silence probe.
      clearInstalledMarker();
      setMode("install");
    };

    const onAppInstalled = () => {
      deferredEventRef.current = null;
      markInstalled();
      setMode("installed");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  /* ── Sequencing behind the auth modal ──────────────────────────────── */
  useEffect(() => {
    let armTimer: ReturnType<typeof setTimeout> | null = null;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ open: boolean }>).detail;
      const open = Boolean(detail?.open);
      setAuthBusy(open);
      if (!open) {
        // Auth flow just finished — arm shortly after.
        if (armTimer) clearTimeout(armTimer);
        armTimer = setTimeout(() => setArmed(true), 10000);
      }
    };
    window.addEventListener("auth-modal-state", handler);
    return () => {
      window.removeEventListener("auth-modal-state", handler);
      if (armTimer) clearTimeout(armTimer);
    };
  }, []);

  // Signed-in visitors will never see the auth sheet — arm independently.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tryArm = () => {
      if (timer) return;
      if (isLoggedIn()) {
        timer = setTimeout(() => setArmed(true), 3000);
      }
    };
    tryArm();
    window.addEventListener("pub-auth-changed", tryArm);
    return () => {
      window.removeEventListener("pub-auth-changed", tryArm);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Nobody else armed it — solo fallback.
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 10000);
    return () => clearTimeout(t);
  }, []);

  /* ── Actions ────────────────────────────────────────────────────────── */
  const handleInstallClick = async () => {
    const event = deferredEventRef.current;
    if (!event || promptCalledRef.current) return;
    promptCalledRef.current = true;
    try {
      await event.prompt();
      const choice = await event.userChoice;
      deferredEventRef.current = null;
      if (choice.outcome === "dismissed") {
        dismiss(PWA_INSTALL_DISMISSED_KEY);
        setInstallDismissed(true);
      }
      // Either way the event is spent — appinstalled (if accepted) will flip
      // mode to "installed" moments later.
      setMode("none");
    } catch {
      deferredEventRef.current = null;
    }
  };

  const handleDismissInstall = () => {
    dismiss(PWA_INSTALL_DISMISSED_KEY);
    setInstallDismissed(true);
  };

  const handleDismissHint = () => {
    dismiss(PWA_HINT_DISMISSED_KEY);
    setHintDismissed(true);
  };

  /* ── Resolve what to actually render ───────────────────────────────── */
  // Never over the signed-in user dashboard — it's a working surface, not a
  // browsing one, and the card sits on top of its modals.
  if (pathname?.startsWith("/dashboard")) return null;
  if (!armed || authBusy) return null;

  let visible: Mode = "none";
  if ((mode === "install" || mode === "ios") && !installDismissed) visible = mode;
  else if (mode === "installed" && !hintDismissed) visible = "installed";

  if (visible === "none") return null;

  const titles: Record<Exclude<Mode, "none">, string> = {
    install: "Install StartupNews.fyi",
    ios: "Add to Home Screen",
    installed: "You already have the app",
  };

  const dismissLabel = visible === "install" ? "Not now" : "Got it";
  const dismissHandler = visible === "installed" ? handleDismissHint : handleDismissInstall;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        // #mvp-site-main (globals.css) sets z-index:9999 + backface-visibility,
        // which makes the whole page-content subtree stack as one unit at 9999
        // regardless of what's inside it — anything below 9999 here loses to it
        // no matter how deep the covering element actually is. Matching 9999
        // exactly clears it via document order (this component mounts after
        // ConditionalLayout), while AuthModal — mounted after this one, also at
        // 9999/10000 — still wins ties against this card for the same reason.
        zIndex: 9999,
        width: "min(440px, calc(100vw - 32px))",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: theme.panel,
          border: `1px solid ${theme.line}`,
          borderTop: `3px solid ${theme.brand}`,
          borderRadius: 16,
          boxShadow: "0 12px 36px rgba(17,17,17,0.16)",
          padding: "16px 18px",
          fontFamily: "inherit",
        }}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: theme.brand,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            <Image src="/icons/icon-192.png" alt="" width={44} height={44} />
          </div>

          <div style={{ flex: "1 1 200px", minWidth: 180 }}>
            <p style={{ margin: "0 0 3px", fontWeight: 800, fontSize: 15, color: theme.ink }}>
              {titles[visible]}
            </p>

            {visible === "install" && (
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: theme.inkSoft }}>
                Get the app experience — in site colours, right from your device.
              </p>
            )}

            {visible === "ios" && (
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: theme.inkSoft }}>
                Tap{" "}
                <span style={{ display: "inline-flex", verticalAlign: "middle", margin: "0 2px" }} aria-label="Share icon">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 3v12" stroke={theme.brand} strokeWidth="2" strokeLinecap="round" />
                    <path d="M8 7l4-4 4 4" stroke={theme.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" stroke={theme.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>{" "}
                Share, then <strong style={{ color: theme.ink }}>Add to Home Screen</strong>.
              </p>
            )}

            {visible === "installed" && (
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: theme.inkSoft }}>
                Open it from your home screen, or tap the app icon in your browser&apos;s address bar.
              </p>
            )}
          </div>

          {/* stretch, not flex-end: the dismiss link is centred under the Install
              pill rather than hanging off its right edge with a 4px inset. */}
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6 }}>
            {visible === "install" && (
              <button
                type="button"
                onClick={handleInstallClick}
                style={{
                  border: "none",
                  borderRadius: 999,
                  background: theme.brand,
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  padding: "9px 20px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
              >
                Install
              </button>
            )}
            <button
              type="button"
              onClick={dismissHandler}
              style={{
                border: "none",
                background: "none",
                color: theme.inkSoft,
                fontWeight: 600,
                fontSize: 12.5,
                cursor: "pointer",
                fontFamily: "inherit",
                padding: visible === "install" ? "2px 4px" : "9px 4px",
                textAlign: "center",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              {dismissLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
