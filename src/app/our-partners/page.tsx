import { getPartnerLogosBySection, getInnerPageContent } from "@/lib/data-adapter";
import { PARTNER_LOGO_SECTIONS } from "@/modules/inner-pages/domain/types";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { PageHeading } from "@/components/PageHeading";
import { PartnerLogosMarquee } from "@/components/PartnerLogosMarquee";

export const revalidate = 60;
export const dynamic = "force-dynamic";

// Shown only if an admin hasn't set any Page Content yet from Inner Pages → Our Partners, so
// the page never renders visibly empty.
const DEFAULT_INTRO = (
	<>
		<h2 className="partners-section-title">Trusted by Leading Global Startup &amp; Tech Ecosystems</h2>
		<p>
			In a short span, <strong>StartupNews.fyi</strong> has built partnerships across{" "}
			<strong>24 Countries</strong>, becoming a recognized Media and Ecosystem partner for some of
			the World&apos;s most Influential Startup Events, Innovation Summits and Business Exhibitions.
		</p>
	</>
);

export default async function OurPartnersPage() {
	const [logosBySection, contentHtml] = await Promise.all([
		getPartnerLogosBySection(),
		getInnerPageContent("our-partners"),
	]);

	// International always shown first, no section headings — see PartnerLogosMarquee for the
	// two-counter-scrolling-rows-per-category layout.
	const hasAnyLogos = PARTNER_LOGO_SECTIONS.some((s) => (logosBySection[s] || []).length > 0);

	return (
		<>
			<style>{`
        .partners-wrap {
          width: 100%;
          overflow: hidden;
          padding-top: 20px;
        }
        .partners-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px 40px;
        }
        .partners-header {
          text-align: left;
          margin-bottom: 50px;
        }
        .partners-header h2 {
          font-size: 22px;
          font-weight: 800;
          color: #111;
          line-height: 1.3;
          margin: 0 0 16px;
          width: 90%;
        }
        .partners-header p {
          font-size: 15px;
          line-height: 1.75;
          color: #444;
          width: 90%;
          margin: 0 0 12px;
        }
        .partners-header p:last-child { margin-bottom: 0; }
        .partners-section-title {
          font-size: 24px;
          font-weight: 700;
          color: #000;
          letter-spacing: 1px;
        }
        .partners-empty {
          font-size: 14px;
          color: #999;
          font-style: italic;
        }

        /* Logo marquees — see PartnerLogosMarquee.tsx. The rows auto-scroll and can be
           grabbed and slid by hand; both are driven from one rAF loop in that component, so
           the only thing owed here is layout, the edge fade and the grab cursor. No overflow-
           scroll element anywhere, so there is nothing that could ever show a scrollbar. */
        .partners-marquee-group {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 40px;
        }
        .partners-marquee-row {
          overflow: hidden;
          width: 100%;
          cursor: grab;
          /* Horizontal is ours (pointer events); vertical stays with the page, so a touch drag
             that starts on a logo row can still scroll the article. */
          touch-action: pan-y;
          -webkit-user-select: none;
          user-select: none;
          -webkit-mask-image: linear-gradient(to right, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%);
          mask-image: linear-gradient(to right, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%);
        }
        .partners-marquee-row.is-dragging { cursor: grabbing; }
        .partners-marquee-track {
          display: flex;
          gap: 16px;
          width: max-content;
          will-change: transform;
        }
        /* Hover-pause and prefers-reduced-motion both live in PartnerLogosMarquee.tsx now —
           a CSS animation-play-state can't be reconciled with a hand-dragged offset. */

        .partners-logo-tile {
          flex: 0 0 auto;
          width: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: #fff;
          border: 1px solid #f0f0f0;
          border-radius: 8px;
          min-height: 130px;
        }
        .partners-logo-tile a {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        .partners-logo-img {
          width: 100%;
          height: 110px;
          object-fit: contain;
        }

        @media (max-width: 768px) {
          .partners-inner {
            padding: 24px 16px 32px;
          }
          .partners-header {
            margin-bottom: 32px;
          }
          .partners-header h2 {
            font-size: 18px;
            width: 100%;
          }
          .partners-header p {
            font-size: 14px;
            width: 100%;
            line-height: 1.65;
          }
          .partners-section-title {
            font-size: 18px;
            letter-spacing: 0.5px;
          }
          .partners-logo-tile {
            width: 100px;
            padding: 10px;
            min-height: 90px;
          }
          .partners-logo-img {
            height: 70px;
          }
        }
      `}</style>

			<div
				id="mvp-article-cont"
				className="left relative our-partners-custom-page partners-wrap"
			>
				<div className="kt-row-column-wrap partners-inner">
					<PageBreadcrumb current="Our Partners" />
					<PageHeading title="Our Partners" />

					<header className="partners-header">
						{contentHtml ? (
							<div dangerouslySetInnerHTML={{ __html: contentHtml }} />
						) : (
							DEFAULT_INTRO
						)}
					</header>

					{hasAnyLogos ? (
						PARTNER_LOGO_SECTIONS.map((section) => (
							<PartnerLogosMarquee key={section} logos={logosBySection[section] || []} />
						))
					) : (
						<p className="partners-empty">Logos coming soon.</p>
					)}
				</div>
			</div>
		</>
	);
}
