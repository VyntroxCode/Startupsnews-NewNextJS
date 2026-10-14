"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";
import type { AuthUser } from "@/components/auth/readerAuth";

interface NLCategory {
	id: number;
	name: string;
	slug: string;
}

const MAX = 3;

// Press Release is not a reader newsletter topic (same rule as /dashboard/newsletter).
const isPressRelease = (text: string) => /press[\s_-]*release/i.test(text);

/**
 * Post-login welcome card: instead of a plain "you're in" screen, ask the reader which
 * newsletter topics they want (1–3). Saves through the same endpoint as /dashboard/newsletter.
 */
export default function WelcomeNewsletterPicker({ user, onDone }: { user: AuthUser; onDone: () => void }) {
	const [categories, setCategories] = useState<NLCategory[]>([]);
	const [loading, setLoading] = useState(true);
	const [selected, setSelected] = useState<string[]>(() =>
		(user.newsletter_category_slugs || "").split(",").filter((s) => s && !isPressRelease(s)).slice(0, MAX)
	);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		fetch("/api/newsletter/categories")
			.then((r) => r.json())
			.then((d) => {
				if (d.success) {
					setCategories((d.data as NLCategory[]).filter((c) => !isPressRelease(c.name) && !isPressRelease(c.slug)));
				}
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	const toggle = (slug: string) => {
		setError("");
		setSelected((prev) => {
			if (prev.includes(slug)) return prev.filter((s) => s !== slug);
			if (prev.length >= MAX) return prev;
			return [...prev, slug];
		});
	};

	const save = async () => {
		if (selected.length === 0) {
			setError("Pick at least 1 topic.");
			return;
		}
		setSaving(true);
		setError("");
		try {
			const token = localStorage.getItem("pub_auth_token");
			const res = await fetch("/api/public-auth/newsletter-preferences", {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify({ categories: selected }),
			});
			const d = await res.json();
			if (!d.success) {
				setError(d.error || "Couldn't save. Please try again.");
				return;
			}
			const raw = localStorage.getItem("pub_auth_user");
			if (raw) {
				const u = JSON.parse(raw) as AuthUser;
				localStorage.setItem("pub_auth_user", JSON.stringify({ ...u, newsletter_category_slugs: selected.join(",") }));
				window.dispatchEvent(new Event("pub-auth-changed"));
			}
			onDone();
		} catch {
			setError("Couldn't save. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const firstName = user.name.split(" ")[0] || user.name;

	return (
		<div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[rgba(10,10,20,0.55)] backdrop-blur-[10px]">
			<div className="relative flex max-h-[calc(100vh-48px)] w-[calc(100vw-32px)] max-w-[460px] animate-[welcomeCardIn_0.5s_cubic-bezier(0.34,1.56,0.64,1)] flex-col overflow-hidden rounded-[28px] bg-[var(--sn-card,#fff)] text-center shadow-[0_32px_80px_var(--sn-shadow-22,rgba(0,0,0,0.22))]">
				<div className="absolute inset-x-0 top-0 h-[5px] bg-[#E72262]" />

				<div className="px-6 pt-9 sm:px-10">
					<span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E72262] text-white shadow-[0_8px_24px_rgba(231,34,98,0.35)]">
						<Mail size={26} strokeWidth={2.2} />
					</span>
					<p className="m-0 mb-1.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--sn-pink-ink,#E72262)]">
						Welcome, {firstName}!
					</p>
					<h2 className="m-0 mb-2 text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-[var(--sn-ink,#111)]">
						What should your newsletter cover?
					</h2>
					<p className="m-0 text-sm leading-normal text-[var(--sn-ink-2,#6b7280)]">
						Pick up to {MAX} topics for your daily briefing.
					</p>
				</div>

				<div className="mt-5 min-h-0 flex-1 overflow-y-auto px-6 sm:px-10">
					{loading ? (
						<div className="flex justify-center py-8 text-[var(--sn-ink-2,#6b7280)]">
							<Loader2 size={22} className="animate-spin" />
						</div>
					) : categories.length === 0 ? (
						<p className="py-6 text-sm text-[var(--sn-ink-2,#6b7280)]">
							Couldn&apos;t load topics. You can choose them later from your dashboard.
						</p>
					) : (
						<div className="flex flex-wrap justify-center gap-2 pb-1">
							{categories.map((c) => {
								const on = selected.includes(c.slug);
								const locked = !on && selected.length >= MAX;
								return (
									<button
										key={c.id}
										type="button"
										onClick={() => toggle(c.slug)}
										disabled={locked}
										aria-pressed={on}
										className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 font-[inherit] text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E72262]/20 ${
											on
												? "cursor-pointer border-[#E72262] bg-[#E72262] text-white"
												: locked
												? "cursor-not-allowed border-[var(--sn-line-a10,rgba(17,17,17,0.1))] bg-transparent text-[var(--sn-ink-2,#6b7280)] opacity-45"
												: "cursor-pointer border-[var(--sn-line-a10,rgba(17,17,17,0.1))] bg-transparent text-[var(--sn-ink,#111)] hover:border-[#E72262] hover:text-[var(--sn-pink-ink,#E72262)]"
										}`}
									>
										{on && <Check size={14} strokeWidth={3} />}
										{c.name}
									</button>
								);
							})}
						</div>
					)}
				</div>

				<div className="px-6 pb-7 pt-4 sm:px-10">
					<p className={`m-0 mb-3 text-xs ${error ? "font-semibold text-[#E72262]" : "text-[var(--sn-ink-2,#6b7280)]"}`}>
						{error || `${selected.length} of ${MAX} selected`}
					</p>
					<div className="flex w-full gap-2.5">
						<button
							type="button"
							onClick={onDone}
							className="flex-1 cursor-pointer rounded-xl border-[1.5px] border-[rgba(231,34,98,0.25)] bg-[var(--sn-card,#fff)] px-2.5 py-3 font-[inherit] text-[13.5px] font-bold text-[var(--sn-pink-ink,#E72262)] transition-colors hover:border-[#E72262] hover:bg-[var(--sn-bg-2,#fff7fb)]"
						>
							Skip for now
						</button>
						<button
							type="button"
							onClick={save}
							disabled={saving || loading || categories.length === 0}
							className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-0 bg-[#E72262] px-2.5 py-3 font-[inherit] text-[13.5px] font-bold text-white shadow-[0_6px_16px_rgba(231,34,98,0.3)] transition-[transform,box-shadow] enabled:cursor-pointer enabled:hover:-translate-y-px enabled:hover:shadow-[0_8px_20px_rgba(231,34,98,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
						>
							{saving && <Loader2 size={16} className="animate-spin" />}
							Save topics
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
