"use client";

import type React from "react";

const SECTION_HEADING_BORDER: React.CSSProperties = {
	marginTop: 0,
	marginBottom: "20px",
	padding: "15px",
	borderColor: "#ee1761",
	borderStyle: "solid",
	borderWidth: "0px 0px 0px 3px",
};

function LogoGrid({ urls }: { urls: string[] }) {
	return (
		<div className="partners-logo-grid">
			{urls.map((url, idx) => (
				<div key={idx} className="partners-logo-tile" data-logo-tile="1">
					<img
						src={url}
						alt={`partner-logo-${idx}`}
						className="partners-logo-img"
						onError={(e) => {
							const tile = (e.target as HTMLImageElement).closest(
								"[data-logo-tile]",
							) as HTMLElement;
							if (tile) tile.style.display = "none";
						}}
					/>
				</div>
			))}
		</div>
	);
}

export default function OurPartnersPage() {
	return (
		<>
			<style>{`
        .partners-wrap {
          width: 100%;
          overflow: hidden;
          min-height: 100vh;
          padding-top: 20px;
        }
        .partners-inner {
          max-width: 1100px;
          margin: 0 auto;
          padding: 40px 24px 80px;
        }
        .partners-header {
          text-align: left;
          margin-bottom: 50px;
        }
        .partners-header h1 {
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
        .partners-logo-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 16px;
        }
        .partners-logo-tile {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: #fff;
          border: 1px solid #f0f0f0;
          border-radius: 8px;
          min-height: 130px;
        }
        .partners-logo-img {
          width: 100%;
          height: 110px;
          object-fit: contain;
        }

        @media (max-width: 768px) {
          .partners-inner {
            padding: 24px 16px 60px;
          }
          .partners-header {
            margin-bottom: 32px;
          }
          .partners-header h1 {
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
          .partners-logo-grid {
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 10px;
          }
          .partners-logo-tile {
            padding: 10px;
            min-height: 90px;
          }
          .partners-logo-img {
            height: 70px;
          }
        }

        @media (max-width: 480px) {
          .partners-logo-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
          .partners-logo-tile {
            padding: 8px;
            min-height: 80px;
          }
          .partners-logo-img {
            height: 56px;
          }
        }
      `}</style>

			<div
				id="mvp-article-cont"
				className="left relative our-partners-custom-page partners-wrap"
			>
				<div className="kt-row-column-wrap partners-inner">
					{/* Header */}
					<header className="partners-header">
						<div
							style={{
								...SECTION_HEADING_BORDER,
								borderWidth: "0px 0px 0px 5px",
								marginBottom: "20px",
							}}
						>
							<h2
								style={{
									fontSize: "26px",
									fontWeight: 700,
									color: "#000",
									letterSpacing: "1px",
								}}
							>
								Our Partners
							</h2>
						</div>
						<h1>Trusted by Leading Global Startup &amp; Tech Ecosystems</h1>
						<p>
							In a short span, <strong>StartupNews.fyi</strong> has built
							partnerships across <strong>24 Countries</strong>, becoming a
							recognized Media and Ecosystem partner for some of the
							World&apos;s most Influential Startup Events, Innovation Summits
							and Business Exhibitions.
						</p>
						<p>
							Our growing Global footprint reflects the trust placed in us by
							Organizers, Investors, Accelerators, Corporates, and Innovation
							Leaders who share our commitment to empowering Entrepreneurs and
							shaping the future of Business.
						</p>
						<p>
							From Local Communities to International Stages, we continue to
							connect Startups with opportunities that transcend borders.
						</p>
					</header>

					{/* Indian Partnerships */}
					<section style={{ marginBottom: "60px" }}>
						<div style={SECTION_HEADING_BORDER}>
							<h2 className="partners-section-title">Indian Partnerships</h2>
						</div>
						<div
							style={{
								marginBottom: "30px",
								paddingBottom: "10px",
								borderBottom: "2px solid #e0e0e0",
							}}
						>
							<LogoGrid
								urls={[
									"https://www.brainwired.in/assets/partners/partner9.webp",
									"https://bsmedia.business-standard.com/_media/bs/img/article/2021-08/17/full/20210817172135.jpg",
									"https://bigbox.ventures/wp-content/uploads/2023/02/Logo-e1675776578358.png",
									"https://wisesndtwu.org/wp-content/uploads/2025/05/Billenium_Divas_logo-1024x714-1.png",
									"https://images.crunchbase.com/image/upload/c_pad,h_160,w_160,f_auto,b_white,q_auto:eco,dpr_1/pw9fgwm55q8tgvqhsrom?ik-sanitizeSvg=true",
									"https://startupflora.com/_next/image?url=%2Fimg%2Fincubators-1.png&w=128&q=75",
									"https://1000logos.net/wp-content/uploads/2021/05/DBS-Bank-logo-500x310.png",
									"https://avatars.githubusercontent.com/u/128216445?s=200&v=4",
									"https://faad.in/logo.svg",
									"https://static-asset.inc42.com/logo/fluid-ventures.png",
									"https://static.wixstatic.com/media/aa50f4_127af2f3cab44b3eac4508e53febb9b5~mv2.png/v1/fill/w_219,h_48,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Fund-Enable-On-Dark-Background%20(1)%20(1).png",
									"https://valuation.fundtq.com/assets/subscription/images/logo.png",
									"https://getvantage.co/assets/img/newpartnerpage/logo/11.png",
									"https://equalifi.org/wp-content/uploads/2025/02/GTM-logo-without-bg.png",
									"https://images.crunchbase.com/image/upload/c_pad,h_160,w_160,f_auto,b_white,q_auto:eco,dpr_1/borgxoakhrmypgofzeli?ik-sanitizeSvg=true",
									"https://www.impactfulpitch.com/assets/ImpactfulPitchLogo.svg",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS0ztuU93uZ_9EJ3khbqjtSAlfyHkDh3jPbaA&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWXi8JpCoX8imCm1zaKnsNnokMDnuCk1sPyQ&s",
									"https://ipventures.in/wp-content/uploads/2022/06/ipv-logo-exits-2021.png",
									"https://investor.legalpay.in/images/ivygrowthlogo.png",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQKWGp1XLOWc_GNrE60uQzR2sOrZegD8twheQ&s",
									"https://www.jitoahmedabad.org/wp-content/uploads/2025/11/JIIF-Logo-1.png",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRsfTmoRcGi-tsMp-BVah79Ay0jlRWNrcwO5g&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTSsKyuoUau1BE9L9Hhfe82zdaeE82l_n1Vjw&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQXdTp6MRRgn60l5FFpY8k7hyt2iItT5wykTw&s",
									"https://media.licdn.com/dms/image/v2/D560BAQGbFmyNLcKQUA/company-logo_200_200/company-logo_200_200/0/1697621175661/millet_yard_logo?e=2147483647&v=beta&t=0lb5-eOyMXndNBv-a9YQyyuqApOHyS_IKVFGsh9OUAQ",
									"https://media.licdn.com/dms/image/v2/D560BAQFzeJLXieqrKw/company-logo_200_200/company-logo_200_200/0/1685355969426/niragacapital_logo?e=2147483647&v=beta&t=XRGiC-YSfdYecTvrTOePmAGqR2W8D5W_qvINzXjgEPc",
									"https://play-lh.googleusercontent.com/u2B29Y-h1RDjFKB4h-lZrvG85q6X-tFHsm3P36tsiFGT2DIrhYSrGZmLIKC-K_UAfq4",
									"https://framerusercontent.com/assets/zqfTCirZzaLralRPFgpzSCqDUf8.png",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQEr_-nimpZgvQGb6KqI4Sd0pMV5HSQEyxweQ&s",
									"https://media.licdn.com/dms/image/v2/D4D0BAQHLlUI0m-LUXQ/company-logo_200_200/company-logo_200_200/0/1686055855675/red_art_works21_logo?e=2147483647&v=beta&t=PrWrTaa8meiT_VmtAkvVlmbNADh9fUIsM66IbnHZpHY",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTeD7KcXcNorsWxgYT0OFS43mQxTK_QyFs0hw&s",
									"https://img-cdn.publive.online/fit-in/640x430/filters:format(webp)/entrackr/media/post_attachments/wp-content/uploads/2023/07/Recur.jpg",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuNRxVudVgEMpYXa1xrGhVdx-KyhnUJ6MHFw&s",
									"https://media.licdn.com/dms/image/v2/C4E0BAQHy1S3a_09UuQ/company-logo_200_200/company-logo_200_200/0/1630619853692?e=2147483647&v=beta&t=v6c0bZYztlKGhMJfYZquhWrspoOOO59Qv7GmXOHq46U",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxe9ZwGQeNL_hBfIaMY8fJB-YeSlKxzNqTjQ&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSIc4UjqDjarSGz2ReM6_Ljthkx5GSENi1EHg&s",
									"https://media.licdn.com/dms/image/v2/C560BAQEOkSapsr8o6g/company-logo_200_200/company-logo_200_200/0/1630580193906/sscbs_innovation_and_incubation_foundation_logo?e=2147483647&v=beta&t=u39cZIq71kjSu8XYmQPcnRl0hgwiFgfWHhDeYPgyAfo",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQbJmbCXjWwzmWNgMZ0xRRYkUGYOIqekgbMQQ&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBLeRXflrZiKbzT27pyxdyY2vvBL6_QCVUaw&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSfP8JyO1NRbUt3JrovPVbQse0YZIGcK4zaJA&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3E2XvKWHU4n9gN75qAyYXcgNDIwJS0H5PVQ&s",
									"https://media.licdn.com/dms/image/v2/C4D0BAQEmwxN8KWEsMQ/company-logo_200_200/company-logo_200_200/0/1678297295856?e=2147483647&v=beta&t=FI2FDiibvnYGlHyjqKTuyNWrm-gutBNG78gfgA8IKiY",
									"https://media.licdn.com/dms/image/v2/D4D0BAQHiFLt7O7jNFw/company-logo_200_200/company-logo_200_200/0/1683697638788/csiworldinfotech_logo?e=2147483647&v=beta&t=khoToCyk_gK0kRf4DEu-r4YFQnGbtcdYRVLcYFVTbDM",
									"https://media.licdn.com/dms/image/v2/C560BAQGI7dI3vIJKxA/company-logo_200_200/company-logo_200_200/0/1630662692731?e=2147483647&v=beta&t=b1ntmzscEcVgzMJvPq_yYz35dgNWt9-C3GSqt6VQDew",
									"https://www.f6s.com/content-resource/media/4840338_6a5aa32184d68ebad505a566ec8bac7316f9eb52.png",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSvXOq01r6jfBnnNU_2Jw2o6R6DWhVFuIflDw&s",
									"https://media.licdn.com/dms/image/v2/D4D16AQEsZNDNGdFmfA/profile-displaybackgroundimage-shrink_200_800/profile-displaybackgroundimage-shrink_200_800/0/1715683271653?e=2147483647&v=beta&t=MYHQukTtvd4J4n4SrAcUjjKABp_cjJGpVzTiCpsXSQo",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRhBGyKfHXBEJHl1806u0Bp3K7E7J7SBk4NAQ&s",
									"https://media.licdn.com/dms/image/v2/D4D0BAQGxG-oN6eJKnw/company-logo_200_200/company-logo_200_200/0/1688797105285?e=2147483647&v=beta&t=yDR6xVURwzH6_pd-Fmefo3qlXr7evMth19wXYcVI4Lw",
									"https://pbs.twimg.com/profile_images/1755918270027231232/NKBOwt3q_400x400.jpg",
									"https://i0.wp.com/workie.in/wp-content/uploads/2023/06/Workie-removebg-preview.png?fit=556%2C448&ssl=1",
									"https://images.yourstory.com/cs/images/companies/ftcxidcoxpjrsccs-1713434870074.png?fm=auto&ar=1:1&mode=fill&fill=solid&fill-color=fff",
								]}
							/>
						</div>
					</section>

					{/* International Events */}
					<section style={{ marginBottom: "60px" }}>
						<div style={SECTION_HEADING_BORDER}>
							<h2 className="partners-section-title">International Events</h2>
						</div>
						<div
							style={{
								marginBottom: "30px",
								paddingBottom: "10px",
								borderBottom: "2px solid #e0e0e0",
							}}
						>
							<LogoGrid
								urls={[
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNiTe3Xq2Ljam2IXTM8y8U6Dnsp_p85klJRQ&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_tUZ54vmHUJeYqzBsictEV8UDxw6q1LNb8A&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuoj6pa6gd3Tf20zHfH_QnRfHMiOI1F9a5Qg&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2t1mfDKtG5VhMRIqzK2ILt-553uW0yOLTxg&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNQfZ_OZUShxKOPrqtWbtm-xCJVUsnmn9NtQ&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSvgAKx8hzp76yCbX4247R1OgNXXiA_AhnGwg&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsTmIzGX0NfxeVIXIqME2g5FCCpFbfudlbTQ&s",
									"https://media.licdn.com/dms/image/v2/C4D0BAQHmyJ_vqcxelg/company-logo_200_200/company-logo_200_200/0/1630581235774/kuwait_fintech_summit_logo?e=2147483647&v=beta&t=nEOEeg0JPd8J9k6IB6AkPpNHVNV_bhWVBNoMTEpCd3c",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0yYIOmQaM0B3OAm_YC4LJHAId43cQP_nLcA&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSiIEZXpgwO3zQ7fGtEleAhO3xBoIqfB_Yp3w&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjvA0_xqd-b2uEKk52nGNQnbMslV-ZP15E2A&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9S_DMMfAEZuuP7vufWD-DQ6LE_nOjsdSt_A&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRP8m_XZXDi1iIM0G4-S2AOjYeBtckoiTcMOw&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTbQDJ6_18HQN5A-2k_ueSz6OtHJcPsSSAnxQ&s",
								]}
							/>
						</div>
					</section>

					{/* International Events Organisers */}
					<section style={{ marginBottom: "60px" }}>
						<div style={SECTION_HEADING_BORDER}>
							<h2
								className="partners-section-title"
								style={{ lineHeight: "1.2" }}
							>
								International Events Organisers
							</h2>
						</div>
						<div
							style={{
								marginBottom: "30px",
								paddingBottom: "10px",
								borderBottom: "2px solid #e0e0e0",
							}}
						>
							<LogoGrid
								urls={[
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRa59zQf3bgZOvNBVtDUBA3PKtcnCqGWIU5Q&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRC7r2AYOcSZg1W7x2TKD5PWXp0MQuAQlmLOA&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSIaHpyrktOMIlolH3aMDuj3wKWgXFrF6Svw&s",
									"https://s3.amazonaws.com/industryevents/organiser/logo/1685/medium/1676384917781.jpg?1676679533",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTx_e_smAGbIQgHzaGZIhzUiyk8lS-K0gpI4w&s",
									"https://pbs.twimg.com/profile_images/1643847879331655680/86jlnJD8_400x400.jpg",
									"https://static.wixstatic.com/media/6a3ff5_ee64f6ba94ce46509fa8ecf111fa94a0~mv2.jpeg/v1/fill/w_400,h_400,al_c,q_80/PFrelLTI_400x400.jpeg",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSdb7wNRdWxhFb6bzfLArRDKJp2MaoWBghtTA&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQgrh85_mBms8swbJJzWnE4mgyZxvp7rCLXhQ&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQapOyIn3meLxSWYtDwqquXsFOwpgOhUfRK1A&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSF-BcpmWErgD_Z6lT6AWjqHn5vmvebwQUwUg&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMuYqKosWNt8Fyi4NG3_m_mohD-a9c-spNwQ&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLV1CLZx845o-89hCTYM0u1jLqNay6WWSJTQ&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRY-z16FqFeKWYsLvUPShrtMPMs6ZTFYHWSCQ&s",
									"https://media.licdn.com/dms/image/v2/C4E0BAQHGw2ancaBFBA/company-logo_200_200/company-logo_200_200/0/1631367594558/magespire_logo?e=2147483647&v=beta&t=fpMmKlDHO0t4zxzu3BG7nCIwfcWM-Q8bG5WUcueBdDU",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT6e-2a1rMF2QwQIG29rMHXU-kBMe1BoVXU2w&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRxP_4y68IgrKrTHNvLWUO9o4mXEKrMEDYalA&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSuxlfLuhDDZMagC_CXExrzzQY83wI__JdMAA&s",
									"https://media.licdn.com/dms/image/v2/D560BAQGwXHQPusWlcA/company-logo_200_200/company-logo_200_200/0/1692182908741/scribe_minds_media_logo?e=2147483647&v=beta&t=HaA44GHGi75rYOd1d3XOQOdDXXSd3uaQ1aiCzj2g-vY",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSAHmVz0AdK8vfj5Nc2Pmjf0qy2coFqn7R0VQ&s",
									"https://media.licdn.com/dms/image/v2/C4E0BAQHIhUOn9AhgwQ/company-logo_200_200/company-logo_200_200/0/1630572333811/small_business_expo_logo?e=2147483647&v=beta&t=zyk1tijeOXnsWe-S6YGNT3BBxwJbmUn2B1c6ehp-k7g",
									"https://play-lh.googleusercontent.com/iBf31aZjayRQUb1SNVtCgBhCCPKHDsQZ9X68AU4kou21oHvzCwSiJG-oNlo360-JJSM",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRpKC9-_iohz3F-uCYBvAquXcbWVhLNAJsEJA&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0Jhmxi7OGQW-GO9lSdrgVbRkSOtoK_UOZoA&s",
									"https://static.wixstatic.com/media/9d1042_0c44ba4fee004723bda099e98022a93b~mv2.png/v1/fit/w_2500,h_1330,al_c/9d1042_0c44ba4fee004723bda099e98022a93b~mv2.png",
									"https://s3.amazonaws.com/industryevents/organiser/logo/815/medium/Screenshot_2023-06-04_105510.png?1685840135",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRrhvkkxYiLsrBfdGrNhJpAjHDzW_j4DjVxLQ&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ-aX8yh67nfBSCF4MxQmPJuoJcE22XDDv0Uw&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4WJExv7iExUgU8HPPsQss_vV7H30pbRa_Tg&s",
								]}
							/>
						</div>
					</section>

					{/* e-Cell Partnerships */}
					<section style={{ marginBottom: "60px" }}>
						<div style={SECTION_HEADING_BORDER}>
							<h2 className="partners-section-title">e-Cell Partnerships</h2>
						</div>
						<div style={{ marginBottom: "30px", paddingBottom: "10px" }}>
							<LogoGrid
								urls={[
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ3hy08cfmvi4-DgnLp8Jh1Wz0zx1QO-XmyTQ&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRb6NjSb8js3bjVM0nJjO9T0LzA7NUgZC_XQ&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR4OyBu8oG3qJ5dAPlnnT3VBVooqvvtBu5QUw&s",
									"https://media.licdn.com/dms/image/v2/C510BAQGEV-A5iy4mDQ/company-logo_200_200/company-logo_200_200/0/1630622076594/ecosocssc_logo?e=2147483647&v=beta&t=iJ50YfXZy0WdCmD6VbAA1gmZZ4fEMPgYsuneLWa84WU",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSFsGnWIydTPGI7YRb3cjpEr__Z-9ZPDGykNQ&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQLV1CLZx845o-89hCTYM0u1jLqNay6WWSJTQ&s",
									"https://upload.wikimedia.org/wikipedia/en/e/ec/Indian_Institute_of_Management_Udaipur_Logo.png",
									"https://upload.wikimedia.org/wikipedia/en/thumb/1/13/Institute_of_Chemical_Technology_logo.png/250px-Institute_of_Chemical_Technology_logo.png",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTUpzkQBgoVQFg4kXImvLVBKfLQN4oaDP9SGA&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQD9vmoXeT5kzf9GVkagzWt7RqIL25kc4IoIA&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRP9Zrd7JIusUiXHE5GF9ildLGd1xT84TTDmg&s",
									"https://upload.wikimedia.org/wikipedia/en/2/2d/Indian_Institute_of_Technology_Roorkee_Logo.svg",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS-yfPxdSCg2XmJrRUzPlkh_fCdH9sVp3BNaw&s",
									"https://www.ecell.in/certificate/assets/img/E-Cell%20Logo-Black.png",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQ21DM2iiQdAdnklMmgi2Jvn8sQaCrvaBH9A&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNi6Ra7NH-IeP2NxeEYr_KKl0PBSZ8LLpHdA&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTVGNpXQOhpP0O08Oyluos8LHMiI68CrodR7A&s",
									"https://media.licdn.com/dms/image/v2/D4D0BAQF75rMd2SJIXw/company-logo_200_200/company-logo_200_200/0/1728033541155?e=2147483647&v=beta&t=awbPTntdpV9FqALwF_HhfNE1AcKHTgipCEU5uEbTSEE",
									"https://pbs.twimg.com/profile_images/1400477243814645767/8KG7dtMt_400x400.jpg",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT20676oJJMPVZx0w-nXtCEcwvjYHB4p_Q5QA&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTer8pzGCaqW_OR2h8SZyjtPEPYzyGeTDKB9w&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTrdacykrELzmXO6DufcGcNu8AHoO5m8nxtQg&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTRrtlAip0Mf2OVVowj9v81abgNODcXX-7Zbw&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcReQWpNJ8ynqRA8usEVtq73HajndzWXz4LBGA&s",
									"https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/IEEE_logo.svg/960px-IEEE_logo.svg.png",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSdS3Two8vcJ4xNAK2H_1NcjBJ6gQhEMEs39Q&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvR8WAcGoQ9gDValskybsxtSqrdKVdx3e6SA&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlZonSmWs64IeN3Y-s6YvcHYKtCPciUoYDew&s",
									"https://media.licdn.com/dms/image/v2/C4D0BAQHdr1RaxRmLCQ/company-logo_200_200/company-logo_200_200/0/1630577771710/abhivyakti_bits_goa_logo?e=2147483647&v=beta&t=rhzEoNfIvk4s6iKMOm2c4P1knlYy-xDLZp_I2DV4Lug",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTxAOqKbOtk6AitlURPyXoFH1vunwLrVmpomw&s",
									"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTuY71mD_X1AyYSLOmIIICzd7dWT8Ci9-_NuQ&s",
								]}
							/>
						</div>
					</section>
				</div>
			</div>
		</>
	);
}
