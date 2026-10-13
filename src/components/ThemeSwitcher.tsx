"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import {
  DEFAULT_THEME,
  getThemePreference,
  resolveTheme,
  setThemePreference,
  subscribeToTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

type Gsap = typeof import("gsap").gsap;

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

const getResolved = (): ResolvedTheme => resolveTheme(getThemePreference());
const getServerPreference = (): ThemePreference => DEFAULT_THEME;
const getServerResolved = (): ResolvedTheme => "light";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function useThemeState() {
  const preference = useSyncExternalStore(subscribeToTheme, getThemePreference, getServerPreference);
  const resolved = useSyncExternalStore(subscribeToTheme, getResolved, getServerResolved);
  return { preference, resolved };
}

/**
 * The same three choices as a segmented control, for the slide-out menu. On phones the header has
 * no room for another button (at 360px it would run into the logo), so this is where the theme is
 * changed there; the header button is hidden below 768px.
 */
export function ThemeSegmented() {
  const { preference } = useThemeState();
  return (
    <div className="sn-theme-seg" role="radiogroup" aria-label="Theme">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={value === preference}
          className="sn-theme-seg-opt"
          onClick={() => setThemePreference(value)}
        >
          <Icon size={15} strokeWidth={2.1} aria-hidden />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Light / Dark / System switcher in the site header. Which icon shows is decided in CSS from
 * `html[data-theme]` (set before first paint by THEME_INIT_SCRIPT), so the server HTML is the same
 * for every visitor and nothing shifts on hydration. GSAP is loaded on first hover / focus / tap
 * and only adds polish — without it (or with reduced motion) the CSS transitions carry the swap.
 */
export function ThemeSwitcher() {
  const { preference, resolved } = useThemeState();
  const [open, setOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const gsapRef = useRef<Gsap | null>(null);
  const lastResolved = useRef<ResolvedTheme | null>(null);
  const menuId = useId();
  const tipId = useId();

  const loadGsap = useCallback(() => {
    if (gsapRef.current || prefersReducedMotion()) return;
    import("gsap").then((m) => {
      gsapRef.current = m.gsap;
    });
  }, []);

  // Icon swap: spin the incoming sun / moon in. Skipped on the first render so a restored theme
  // does not animate on page load.
  useEffect(() => {
    const previous = lastResolved.current;
    lastResolved.current = resolved;
    const gsap = gsapRef.current;
    const button = buttonRef.current;
    if (previous === null || previous === resolved || !gsap || !button || prefersReducedMotion()) return;

    const incoming = button.querySelector(`[data-theme-icon="${resolved}"]`);
    if (!incoming) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        incoming,
        { rotate: resolved === "dark" ? -70 : 70, scale: 0.4, opacity: 0 },
        { rotate: 0, scale: 1, opacity: 1, duration: 0.36, ease: "back.out(1.8)", clearProps: "all" },
      );
    }, button);
    return () => ctx.revert();
  }, [resolved]);

  // Popover entrance + outside click / Escape while it is open.
  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    const gsap = gsapRef.current;
    let ctx: ReturnType<Gsap["context"]> | undefined;
    if (menu && gsap && !prefersReducedMotion()) {
      ctx = gsap.context(() => {
        // GSAP takes over from the CSS keyframe fallback.
        gsap.set(menu, { animation: "none" });
        gsap.fromTo(
          menu,
          { opacity: 0, y: -6, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.18, ease: "power3.out" },
        );
        gsap.fromTo(
          menu.querySelectorAll("[role='menuitemradio']"),
          { opacity: 0, x: 6 },
          { opacity: 1, x: 0, duration: 0.18, stagger: 0.025, ease: "power2.out", clearProps: "opacity,transform" },
        );
      }, menu);
    }
    menu?.querySelector<HTMLButtonElement>("[aria-checked='true']")?.focus({ preventScroll: true });

    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      ctx?.revert();
    };
  }, [open]);

  const choose = (value: ThemePreference) => {
    setThemePreference(value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("[role='menuitemradio']"));
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    let next = -1;
    if (e.key === "ArrowDown") next = (index + 1) % items.length;
    else if (e.key === "ArrowUp") next = (index - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else if (e.key === "Tab") setOpen(false);
    if (next >= 0) {
      e.preventDefault();
      items[next].focus();
    }
  };

  const current = OPTIONS.find((o) => o.value === preference) ?? OPTIONS[0];

  return (
    <div className="sn-theme" ref={wrapRef} data-open={open || undefined}>
      <button
        ref={buttonRef}
        type="button"
        className="sn-theme-btn"
        aria-label={`Theme: ${current.label}. Change theme`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-describedby={open ? undefined : tipId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        onPointerEnter={loadGsap}
        onPointerDown={loadGsap}
        onFocus={loadGsap}
      >
        <Sun className="sn-theme-icon" data-theme-icon="light" size={17} strokeWidth={2.1} aria-hidden />
        <Moon className="sn-theme-icon" data-theme-icon="dark" size={16} strokeWidth={2.1} aria-hidden />
      </button>

      <span className="sn-theme-tip" role="tooltip" id={tipId}>
        Theme: {current.label}
      </span>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          className="sn-theme-menu"
          role="menu"
          aria-label="Theme"
          onKeyDown={onMenuKeyDown}
        >
          {OPTIONS.map(({ value, label, Icon }) => {
            const active = value === preference;
            return (
              <button
                key={value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className="sn-theme-opt"
                onClick={() => choose(value)}
              >
                <Icon size={15} strokeWidth={2.1} aria-hidden />
                <span>{label}</span>
                {active && <Check className="sn-theme-check" size={14} strokeWidth={2.6} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
