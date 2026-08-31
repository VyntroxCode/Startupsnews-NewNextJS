"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: "primary" | "ghost" | "dark";
  children: ReactNode;
  /** Shown instead of `children` while `busy` is true, and sets `aria-busy` — for a submit
   * button's in-flight state. Never render a bare spinner with no text alongside it. */
  busy?: boolean;
  busyLabel?: ReactNode;
  className?: string;
}

const VARIANT_CLASS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  dark: "upload-btn",
};

/** Thin component wrapper around the site's existing `.btn-primary` / `.btn-ghost` / `.upload-btn`
 * CSS classes (previously plain `<button className="...">` with no shared component). Each page
 * that uses this defines those class names itself in a page-scoped style block — there is no
 * global button CSS in this repo, so visuals come entirely from the classes below, not from here. */
export function Button({ variant = "primary", children, busy, busyLabel, className, type = "button", ...rest }: ButtonProps) {
  const cls = [VARIANT_CLASS[variant], className].filter(Boolean).join(" ");
  return (
    <button type={type} className={cls} aria-busy={busy || undefined} {...rest}>
      {busy ? (busyLabel ?? children) : children}
    </button>
  );
}
