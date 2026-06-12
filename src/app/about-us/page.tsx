"use client";

/**
 * AboutPage - Redesigned to match Step 2054 visual reference.
 */
export default function AboutPage() {
	return (
		<div
			id="mvp-article-cont"
			className="left relative about-custom-page"
			style={{
				width: "100%",
				background: "#f9f9f9",
				overflow: "hidden",
				minHeight: "100vh",
			}}
		>
			<div
				className="kt-row-column-wrap"
				style={{ maxWidth: "1200px", margin: "0 auto", padding: "60px 20px" }}
			>
				{/* HEADER */}
				<header style={{ textAlign: "center", marginBottom: "40px" }}>
					<h2
						style={{
							fontSize: "28px",
							fontWeight: 800,
							color: "#000",
							textTransform: "uppercase",
							fontFamily: "Inter, sans-serif",
							marginBottom: "30px",
							letterSpacing: "1px",
						}}
					>
						ABOUT US
					</h2>
				</header>

				{/* INTRODUCTION */}
				<section
					style={{
						maxWidth: "900px",
						margin: "0 auto 80px",
						textAlign: "justify",
					}}
				>
					{[
						"StartupNews.fyi is an independent news and intelligence platform covering the global startup and technology ecosystem. We report on what's emerging, what's shifting, and what it means for founders, operators, investors, and builders navigating fast-moving markets.",
						"Our editorial team produces original reporting across fintech, AI and deeptech, ecommerce, mobility, Web3, and emerging business models — with a focus on stories that carry real consequence for people building companies and making capital decisions. We don't chase volume. We chase signal.",
						"Every story published on StartupNews.fyi is written, verified, and edited by named journalists and contributors with direct experience in the industries they cover.",
						"Our sourcing standards require primary attribution, multi-source verification, and clear disclosure of any commercial relationships — all governed by our Editorial Policy, which is published in full on this site.",
						"We cover startups and technology across the United States, the United Kingdom, the UAE, Southeast Asia, and Europe — with particular depth in markets where innovation is moving faster than the mainstream media can track.",
						"StartupNews.fyi also maintains one of the most comprehensive directories of global tech and startup events, curated editorially to help founders and operators find the rooms worth being in — from Singapore to San Francisco.",
						"We are owned and operated by Dotfyi Media Ventures Pvt Ltd, an independent media company with no equity stakes, advisory relationships, or revenue-share arrangements with any company we cover.",
						"Our journalism is funded through advertising, sponsored content — which is always clearly labelled — and ecosystem partnerships.",
					].map((text, i) => (
						<p
							key={i}
							style={{
								fontSize: "15px",
								lineHeight: "1.6",
								color: "#000",
								marginBottom: "20px",
								fontFamily: "'NB International', sans-serif",
							}}
						>
							{text}
						</p>
					))}
					<p
						style={{
							fontSize: "15px",
							lineHeight: "1.6",
							color: "#000",
							fontFamily: "'NB International', sans-serif",
						}}
					>
						If you have a tip, a correction, or a story you think we should be
						covering, reach us at{" "}
						<a
							href="mailto:editorial@startupnews.fyi"
							style={{ color: "#0077b5", textDecoration: "none" }}
						>
							editorial@startupnews.fyi
						</a>
						.
					</p>
				</section>

				{/* TEAM GRID */}
				<div
					style={{
						display: "grid",
						gridTemplateColumns: "1fr 1fr",
						gap: "30px",
					}}
					className="team-grid"
				>
					{/* Madhur Mohan Malik */}
					<div
						className="team-card"
						style={{
							background: "#fff",
							padding: "40px",
							borderRadius: "12px",
							boxShadow: "0 10px 40px rgba(0,0,0,0.05)",
						}}
					>
						<div style={{ marginBottom: "20px" }}>
							<h3
								style={{
									fontSize: "22px",
									fontWeight: 700,
									color: "#000",
									marginBottom: "5px",
								}}
							>
								Madhur Mohan Malik
							</h3>
							<p
								style={{
									fontSize: "14px",
									color: "#666",
									marginBottom: "10px",
								}}
							>
								Founder
							</p>
							<a
								href="https://www.linkedin.com/in/madhurmohanmalik/"
								style={{ color: "#0077b5", fontSize: "20px" }}
							>
								<i className="fa-brands fa-linkedin"></i>
							</a>
						</div>
						<p
							style={{
								fontSize: "13px",
								lineHeight: "1.6",
								color: "#333",
								fontStyle: "italic",
							}}
						>
							<span style={{ fontWeight: 700 }}>Madhur Mohan Malik</span> is the
							Founder of StartupNews.fyi, driving its vision to become a trusted
							global source for startup and industry intelligence. With deep
							experience across media, technology, and ecosystem building, he
							focuses on creating high-signal platforms that connect founders,
							investors, and operators worldwide. His work is centered on
							credibility, global perspective, and building meaningful bridges
							across innovation ecosystems.
						</p>
					</div>

					{/* Kapil Suri */}
					<div
						className="team-card"
						style={{
							background: "#fff",
							padding: "40px",
							borderRadius: "12px",
							boxShadow: "0 10px 40px rgba(0,0,0,0.05)",
						}}
					>
						<div style={{ marginBottom: "20px" }}>
							<h3
								style={{
									fontSize: "22px",
									fontWeight: 700,
									color: "#000",
									marginBottom: "5px",
								}}
							>
								Kapil Suri
							</h3>
							<p
								style={{
									fontSize: "14px",
									color: "#666",
									marginBottom: "10px",
								}}
							>
								CoFounder
							</p>
							<a
								href="https://www.linkedin.com/in/kapil-suri-3986307/"
								target="_blank"
								rel="noopener noreferrer"
								style={{ color: "#0077b5", fontSize: "20px" }}
								aria-label="Kapil Suri on LinkedIn"
							>
								<i className="fa-brands fa-linkedin"></i>
							</a>
						</div>
						<p
							style={{
								fontSize: "13px",
								lineHeight: "1.6",
								color: "#333",
								fontStyle: "italic",
							}}
						>
							<span style={{ fontWeight: 700 }}>Kapil Suri</span> is the
							Co-Founder of StartupNews.fyi, bringing strategic insight and
							operational depth to the platform's global growth. With a strong
							background in business development and ecosystem partnerships, he
							plays a key role in shaping long-term strategy and execution. His
							focus lies in building scalable systems, trusted relationships,
							and sustainable value across global startup communities.
						</p>
					</div>
				</div>
			</div>

			<style jsx>{`
                @media (max-width: 1024px) {
                    .team-grid {
                        grid-template-columns: 1fr !important;
                        gap: 20px !important;
                    }
                }
            `}</style>
		</div>
	);
}
