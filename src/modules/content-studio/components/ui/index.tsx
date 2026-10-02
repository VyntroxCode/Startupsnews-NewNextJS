"use client";

import { forwardRef, type ReactNode } from "react";
import { ChevronDown, X, type LucideIcon } from "lucide-react";

import { cn } from "@/modules/content-studio/lib/cn";

// ══════════════════════════════════════════════════════════════════
// Shared primitives. Each replaces one of the repeated CSS classes from the
// original's <style> block; the source class is named in each comment.
// Variants are plain Record maps — three components need variants and none
// needs compound variants, so `cva` would be more surface than it saves.
// ══════════════════════════════════════════════════════════════════

// ── .btn / .btn.primary / .btn.sm (content-studio-v17.html:302-306) ──
type ButtonVariant = "default" | "primary";
type ButtonSize = "md" | "sm";

const BUTTON_BASE =
  "inline-flex items-center gap-1.5 rounded-cs-card border-[1.5px] font-cs-sans font-semibold whitespace-nowrap shadow-cs-soft transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  default:
    "border-cs-edge2 bg-cs-surface text-cs-ink hover:border-cs-accent hover:bg-cs-s2 hover:text-cs-accent",
  primary:
    "border-cs-accent bg-cs-accent text-white hover:border-cs-adark hover:bg-cs-adark shadow-[0_2px_8px_rgba(232,24,109,.25)] hover:shadow-[0_4px_12px_rgba(232,24,109,.35)]",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  md: "px-3.5 py-[7px] text-cs-ui",
  sm: "px-2.5 py-[5px] text-cs-meta",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: ButtonSize;
  }
>(function Button({ variant = "default", size = "md", className, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className)}
      {...rest}
    />
  );
});

// ── .gen-btn (content-studio-v17.html:103-106) — one call site, so inline ──
export function GenerateButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { className, ...rest } = props;
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-cs-panel bg-gradient-to-br from-cs-accent to-cs-adark px-6 py-2.5 font-cs-sans text-[13px] font-bold tracking-[-.01em] whitespace-nowrap text-white shadow-[0_3px_12px_rgba(232,24,109,.35)] transition-all duration-150",
        "hover:-translate-y-px hover:shadow-[0_5px_18px_rgba(232,24,109,.45)] active:translate-y-0",
        "disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
        className,
      )}
      {...rest}
    />
  );
}

// ── .tc chip (content-studio-v17.html:79-81) ──
export function Chip({
  on,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cn(
        "cursor-pointer rounded-full border-[1.5px] px-3 py-1 font-cs-sans text-cs-meta font-semibold whitespace-nowrap transition-all duration-100 select-none",
        on
          ? "border-cs-accent bg-cs-accent text-white"
          : "border-cs-edge2 bg-cs-surface text-cs-t2 hover:border-cs-accent hover:bg-cs-abg hover:text-cs-accent",
        className,
      )}
      {...rest}
    />
  );
}

// ── .fp feed pill (content-studio-v17.html:162-167) ──
export function SourcePill({
  on,
  color,
  label,
  count,
  onSelect,
  onRemove,
}: {
  on?: boolean;
  color?: string;
  label: string;
  /** Optional item count shown after the label; a zero count dims the pill. */
  count?: number;
  onSelect: () => void;
  onRemove?: () => void;
}) {
  return (
    <span
      className={cn(
        "flex cursor-pointer items-center gap-1 rounded-full border-[1.5px] px-2.5 py-[3px] text-cs-meta font-medium transition-all duration-100 select-none",
        on
          ? "border-cs-accent bg-cs-abg font-bold text-cs-accent"
          : "border-cs-edge bg-cs-surface text-cs-t2 hover:border-cs-accent hover:text-cs-accent",
        count === 0 && !on && "opacity-50",
      )}
      onClick={onSelect}
    >
      {color ? (
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: color }}
        />
      ) : null}
      {label}
      {count !== undefined ? (
        <span className="font-normal tabular-nums opacity-60">{count}</span>
      ) : null}
      {onRemove ? (
        <span
          role="button"
          aria-label={`Remove ${label}`}
          className="ml-[3px] inline-flex opacity-35 transition-opacity hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X aria-hidden className="size-3 shrink-0" />
        </span>
      ) : null}
    </span>
  );
}

// ── .sf setting field (content-studio-v17.html:71-77) ──
export function SettingField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-[5px]", className)}>
      <label className="text-cs-label font-bold tracking-[.08em] whitespace-nowrap text-cs-t2 uppercase">
        {label}
      </label>
      {children}
      {hint ? (
        <div className="mt-[5px] text-[10.5px] leading-[1.35] text-cs-t3">{hint}</div>
      ) : null}
    </div>
  );
}

export function FieldDivider() {
  return <div className="mx-1 w-px self-stretch bg-cs-edge" />;
}

// ── .sf select + .template-select-wrap arrow (content-studio-v17.html:73-87) ──
export function Select({
  accent,
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { accent?: boolean }) {
  return (
    <div className="relative">
      <select
        className={cn(
          "w-full appearance-none rounded-cs-card border-[1.5px] bg-cs-surface py-[7px] pr-7 pl-[11px] font-cs-sans text-cs-body text-cs-ink shadow-cs-soft transition-colors outline-none",
          "focus:border-cs-accent focus:shadow-[0_0_0_3px_rgba(232,24,109,.1)]",
          "disabled:cursor-not-allowed disabled:bg-cs-s2 disabled:text-cs-t3",
          accent
            ? "cursor-pointer border-cs-accent/30 bg-cs-abg font-semibold text-cs-accent"
            : "border-cs-edge2",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2",
          accent ? "text-cs-accent" : "text-cs-t2",
        )}
      />
    </div>
  );
}

// ── text inputs, from the several near-identical input rules ──
export const TextInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function TextInput({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "min-w-0 flex-1 rounded-cs-card border-[1.5px] border-cs-edge2 bg-cs-s2 px-[11px] py-2 font-cs-sans text-cs-ui text-cs-ink transition-all duration-150 outline-none",
        "focus:border-cs-accent focus:bg-cs-surface focus:shadow-[0_0_0_3px_rgba(232,24,109,.1)]",
        className,
      )}
      {...rest}
    />
  );
});

// ── .empty (content-studio-v17.html:183-186) ──
export function EmptyState({
  icon: Icon,
  children,
  className,
}: {
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-4 py-10 text-center text-cs-t2", className)}>
      <Icon aria-hidden className="mx-auto mb-3 size-[34px] opacity-[0.12]" />
      <div className="text-cs-ui leading-[1.85]">{children}</div>
    </div>
  );
}

// ── .raw code panel (content-studio-v17.html:295) ──
export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="rounded-cs-panel border border-cs-code-edge bg-cs-code-bg p-5 font-mono text-cs-ui leading-[1.7] wrap-anywhere whitespace-pre-wrap text-cs-code-fg">
      {children}
    </pre>
  );
}

// ── .spin / .sp-sm / .sp-dark (content-studio-v17.html:213, 309-310) ──
export function Spinner({ size = "lg" }: { size?: "lg" | "sm" | "dark" }) {
  if (size === "lg")
    return (
      <div className="size-[42px] animate-cs-spin-fast rounded-full border-[3px] border-cs-edge border-t-cs-accent" />
    );
  if (size === "dark")
    return (
      <span className="inline-block size-2.5 animate-cs-spin-fast rounded-full border-[1.5px] border-cs-edge border-t-cs-accent align-middle" />
    );
  return (
    <span className="mr-[3px] inline-block size-2.5 animate-cs-spin-fast rounded-full border-[1.5px] border-white/30 border-t-white align-middle" />
  );
}
