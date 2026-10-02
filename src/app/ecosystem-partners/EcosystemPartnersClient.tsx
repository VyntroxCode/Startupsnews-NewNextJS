"use client";

import { useEffect, useRef, useState } from "react";

const GRADIENT = "linear-gradient(120deg,#E91E63,#667EEA)";

const VISIBLE_COUNT = 6;

export function LogoGrid({ count, sectionId }: { count: number; sectionId: string }) {
	const [expanded, setExpanded] = useState(false);
	const cards = Array.from({ length: count });
	const extra = count - VISIBLE_COUNT;
	const showToggle = extra > 0;

	return (
		<>
			<div className="grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-4 max-sm:grid-cols-[repeat(auto-fill,minmax(128px,1fr))] max-sm:gap-3">
				{cards.map((_, i) => {
					const hiddenExtra = i >= VISIBLE_COUNT && !expanded;
					return (
						<div
							key={`${sectionId}-logo-${i}`}
							className={`group relative aspect-[16/9.5] bg-white border border-[#E6E9F0] rounded-xl flex flex-col items-center justify-center gap-1.5 p-4 shadow-[0_6px_18px_rgba(30,41,59,0.06)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(233,30,99,0.14)] hover:border-transparent ${
								hiddenExtra ? "hidden" : ""
							}`}
						>
							<span
								className="absolute top-0 left-3.5 right-3.5 h-[3px] rounded-b origin-center scale-x-0 transition-transform duration-200 group-hover:scale-x-100"
								style={{ backgroundImage: GRADIENT }}
							/>
							<div className="w-[38px] h-[38px] rounded-[9px] opacity-[0.14]" style={{ backgroundImage: GRADIENT }} />
							<span className="text-[11px] font-semibold text-[#64748B] tracking-wide">Partner Logo</span>
						</div>
					);
				})}
				<div className="flex flex-col items-center justify-center gap-1.5 aspect-[16/9.5] rounded-xl border-[1.5px] border-dashed border-[#C9CEDA] text-[#64748B] p-4 transition-colors hover:border-[#E91E63] hover:text-[#E91E63]">
					<span className={`text-[22px] leading-none font-semibold`}>+</span>
					<span className="text-[11.5px] font-semibold text-center">Add Logo</span>
				</div>
			</div>
			{showToggle && (
				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					aria-expanded={expanded}
					className={`block mx-auto mt-[22px] bg-transparent cursor-pointer font-semibold text-[12.5px] text-[#E91E63] tracking-[0.06em] uppercase px-6 py-2.5 border-[1.5px] border-[#E91E63] rounded-full transition-colors hover:bg-[#E91E63] hover:text-white`}
				>
					{expanded ? "Show less" : `Show ${extra} more`}
				</button>
			)}
		</>
	);
}

/** Country section that fades up the first time it scrolls into view. */
export function RevealSection({
	id,
	className,
	children,
}: {
	id: string;
	className: string;
	children: React.ReactNode;
}) {
	const ref = useRef<HTMLElement | null>(null);
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting) {
					setVisible(true);
					observer.disconnect();
				}
			},
			{ threshold: 0.12 },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	return (
		<section
			id={id}
			ref={ref}
			className={`${className} ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-[18px]"}`}
		>
			{children}
		</section>
	);
}

/** In-page anchor that smooth-scrolls to `targetId` and updates the hash without a jump. */
export function ScrollToLink({
	targetId,
	className,
	children,
}: {
	targetId: string;
	className: string;
	children: React.ReactNode;
}) {
	return (
		<a
			href={`#${targetId}`}
			onClick={(e) => {
				e.preventDefault();
				document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
				window.history.replaceState(null, "", `#${targetId}`);
			}}
			className={className}
		>
			{children}
		</a>
	);
}
