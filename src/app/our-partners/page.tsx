"use client";

import React from "react";

const LOGO_TILE_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px",
  backgroundColor: "#fff",
  border: "1px solid #f0f0f0",
  borderRadius: "8px",
  minHeight: "90px",
};

const LOGO_IMG_STYLE: React.CSSProperties = {
  width: "100%",
  height: "70px",
  objectFit: "contain",
};

const GRID_STYLE: React.CSSProperties = {
  maxWidth: "1200px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
  gap: "12px",
};

function LogoGrid({ urls }: { urls: string[] }) {
  return (
    <div style={GRID_STYLE}>
      {urls.map((url, idx) => (
        <div key={idx} style={LOGO_TILE_STYLE}>
          <img
            src={url}
            alt={`partner-logo-${idx}`}
            style={LOGO_IMG_STYLE}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      ))}
    </div>
  );
}

const SECTION_HEADING_BORDER: React.CSSProperties = {
  marginTop: 0,
  marginBottom: "20px",
  padding: "15px",
  borderColor: "#ee1761",
  borderStyle: "solid",
  borderWidth: "0px 0px 0px 3px",
};

export default function OurPartnersPage() {
  return (
    <div
      id="mvp-article-cont"
      className="left relative our-partners-custom-page"
      style={{ width: "100%", overflow: "hidden", minHeight: "100vh", paddingTop: "20px" }}
    >
      <div
        className="kt-row-column-wrap"
        style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px 80px" }}
      >
        {/* Header */}
        <header style={{ textAlign: "left", marginBottom: "50px" }}>
          <div style={{ ...SECTION_HEADING_BORDER, borderWidth: "0px 0px 0px 5px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "26px", fontWeight: 700, color: "#000", letterSpacing: "1px" }}>
              Our Partners
            </h2>
          </div>
          <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#666", textAlign: "left", width: "90%" }}>
            In less than 15 months <strong>StartupNews.fyi</strong> has spread its wings to over 14 countries through our Media Partnership approach with some of the top event IP's and top exhibitors from across the globe.
          </p>
        </header>

        {/* Indian Partnerships */}
        <section style={{ marginBottom: "60px" }}>
          <div style={SECTION_HEADING_BORDER}>
            <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#000", letterSpacing: "1px" }}>
              Indian Partnerships
            </h2>
          </div>
          <div style={{ marginBottom: "30px", paddingBottom: "10px", borderBottom: "2px solid #e0e0e0" }}>
            <LogoGrid urls={[
              "https://www.brainwired.in/assets/partners/partner9.webp",
              "https://media.licdn.com/dms/image/v2/D4E0BAQHNOtKEQQT07Q/company-logo_200_200/B4EZWuabA9GYAI-/0/1742387917411/aicisbmohali_logo?e=1779321600&v=beta&t=Ux1hjCBlV4Zf9lTMDxKqVEZDaBgE8nuUWrr6CUlDzbw",
              "https://bsmedia.business-standard.com/_media/bs/img/article/2021-08/17/full/20210817172135.jpg",
              "https://image.pitchbook.com/EmxbpFrRZ0jh6yCoxP4uxRlGWNt1698215356099_200x200",
              "https://bigbox.ventures/wp-content/uploads/2023/02/Logo-e1675776578358.png",
              "https://wisesndtwu.org/wp-content/uploads/2025/05/Billenium_Divas_logo-1024x714-1.png",
              "https://images.crunchbase.com/image/upload/c_pad,h_160,w_160,f_auto,b_white,q_auto:eco,dpr_1/pw9fgwm55q8tgvqhsrom?ik-sanitizeSvg=true",
              "https://media.licdn.com/dms/image/v2/C4E0BAQEvH3nXJXpL6g/company-logo_200_200/company-logo_200_200/0/1631355596508?e=1779321600&v=beta&t=JXtIZ50gfrbCOguOHIbWSoriGk5RANqhUNMEQN8SHlk",
              "https://startupflora.com/_next/image?url=%2Fimg%2Fincubators-1.png&w=128&q=75",
              "https://scontent.fixr3-1.fna.fbcdn.net/v/t39.30808-1/335408808_555523603311091_8240723812867669254_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=107&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=lsn2W4lxHc4Q7kNvwHh_6fh&_nc_oc=AdrYHOihvFg6H5Uy2Nsj_096_cDwpTBm-6oIdUEv-lhLnU4uIE9denNZgY1xoDdUBO67heCX0mohccP1a6kqV0es&_nc_zt=24&_nc_ht=scontent.fixr3-1.fna&_nc_gid=zdDkefx4vmO8wBUZM-W8lg&_nc_ss=78289&oh=00_Af4P5rQLlAZSW2jzq5gcS1GMzdjH6l3LuCXoefTR1vTf0A&oe=69FE21C7",
              "https://1000logos.net/wp-content/uploads/2021/05/DBS-Bank-logo-500x310.png",
              "https://media.licdn.com/dms/image/v2/D560BAQE7XjW2yRAvjg/company-logo_200_200/company-logo_200_200/0/1666125273525/ellenox_logo?e=1779321600&v=beta&t=czyGM_cBFOWLZvGjR4bpjHJW5ZAukIqktH4aKYVbkc8",
              "https://media.licdn.com/dms/image/v2/C560BAQFAaPXfgrwMPg/company-logo_200_200/company-logo_200_200/0/1646376040673?e=1779321600&v=beta&t=dzjHq8IhTzva_7-7Ebwm0cUredHwKpcnmAQ-RST1DDc",
              "https://avatars.githubusercontent.com/u/128216445?s=200&v=4",
              "https://faad.in/logo.svg",
              "https://media.licdn.com/dms/image/v2/C510BAQGWWm5aM15fYg/company-logo_200_200/company-logo_200_200/0/1630565571631/favcy_logo?e=1779321600&v=beta&t=8FfPI2ckT6Yx0j-CNra1AtWud2v2Ns7YadzpCReRiZs",
              "https://media.licdn.com/dms/image/v2/D4D0BAQHGsA8wUQiENA/company-logo_200_200/B4DZy9K7fkKYAI-/0/1772700285690/feedscoglobal_logo?e=1779321600&v=beta&t=ZkRhxYH7z-Dg3N7rrj1ndO9MC_wHaG74WNGb96mOp-s",
              "https://static-asset.inc42.com/logo/fluid-ventures.png",
              "https://media.licdn.com/dms/image/v2/D4D0BAQFNi0UkVCzQFQ/company-logo_200_200/company-logo_200_200/0/1738499630395/fsvcapital_logo?e=1779321600&v=beta&t=KH1WGJYuJFq-n6ty44Yro1NiuxprbeDlNpLh6t3fW7M",
              "https://static.wixstatic.com/media/aa50f4_127af2f3cab44b3eac4508e53febb9b5~mv2.png/v1/fill/w_219,h_48,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/Fund-Enable-On-Dark-Background%20(1)%20(1).png",
              "https://valuation.fundtq.com/assets/subscription/images/logo.png",
              "https://getvantage.co/assets/img/newpartnerpage/logo/11.png",
              "https://equalifi.org/wp-content/uploads/2025/02/GTM-logo-without-bg.png",
              "https://scontent.fixr3-2.fna.fbcdn.net/v/t39.30808-6/299681992_504113198382673_1038130526355128139_n.png?stp=dst-png_s960x960&_nc_cat=110&ccb=1-7&_nc_sid=2a1932&_nc_ohc=RMbQ5KW1tCoQ7kNvwEByfoY&_nc_oc=Adqb-VYeDKq_pGbXnaIxn9aJgN7hzgVnrmcnHkGSytRMGszOUpw-npnC5BICk3Lwk_lxd8yBqfgZ65lN4ym6R_t2&_nc_zt=23&_nc_ht=scontent.fixr3-2.fna&_nc_gid=WzG1kf_LBGM5QnK4BW2a6A&_nc_ss=7b289&oh=00_Af5jtXgKaUyQjdtIDhu9FH4bja4zJl2U1t0tpCqpTLEs1A&oe=69FE2F10",
              "https://images.crunchbase.com/image/upload/c_pad,h_160,w_160,f_auto,b_white,q_auto:eco,dpr_1/borgxoakhrmypgofzeli?ik-sanitizeSvg=true",
              "https://www.impactfulpitch.com/assets/ImpactfulPitchLogo.svg",
              "https://scontent.fixr3-1.fna.fbcdn.net/v/t39.30808-1/300907331_445648354247254_7826047524514757852_n.png?stp=dst-png_s200x200&_nc_cat=107&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=Xu8NdcTeT9YQ7kNvwH2uzhq&_nc_oc=AdpiXptCPO_mxjoiGmNqp0obPeiqZ_9028LjywsOUbw5HXykRC7oxTksz-5in7JVo7PcFvKH9jh1DVankLxB2kWP&_nc_zt=24&_nc_ht=scontent.fixr3-1.fna&_nc_gid=BmN5JbIjakcdxA-kYf-2PA&_nc_ss=7b289&oh=00_Af4bw_ybPLZx2mC6T8fO0ppQfxnCilQszdLWf7Sv8d_Kuw&oe=69FE3D33",
              "https://scontent.fixr3-2.fna.fbcdn.net/v/t1.6435-9/108032102_158586015759466_613065209054636591_n.png?_nc_cat=104&ccb=1-7&_nc_sid=2a1932&_nc_ohc=q7FJcvJGii8Q7kNvwEVibBE&_nc_oc=Adrp5RVUC83DZzxOtZVqb_Q22GwrovKdoZ0ai_uHA6BE0lBKB6j9rgUChUbY7uxCni1UKunEtGhpfuyIr1iL2xHi&_nc_zt=23&_nc_ht=scontent.fixr3-2.fna&_nc_gid=b1GtH2YihfWCrtvSudSIJA&_nc_ss=7b289&oh=00_Af5K87psRWid9jhsoLSKWiT_RCrAh9mHIuaWg6OyuJRy-A&oe=6A1FB8D1",
              "https://scontent.fixr3-2.fna.fbcdn.net/v/t39.30808-1/241145642_176917111212542_4555435115561291809_n.jpg?stp=dst-jpg_s200x200_tt6&_nc_cat=108&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=7BrqUxMN-3YQ7kNvwGSOGQN&_nc_oc=AdpzvC_IbI5VeW32w82f8-khGtCORQexOk3tUBF8C1Wtl74rB2AC6nIFEtUmBmTP7UvDnaZMbR1Oj0u2guK5pI_l&_nc_zt=24&_nc_ht=scontent.fixr3-2.fna&_nc_gid=ctKYnootzE-G5LAY4wXjgw&_nc_ss=7b289&oh=00_Af7lE_Cfd_dG6p9npIfm4TzHENZ82YRl8tNJBvOb20HpzQ&oe=69FE238C",
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
            ]} />
          </div>
        </section>

        {/* International Events */}
        <section style={{ marginBottom: "60px" }}>
          <div style={SECTION_HEADING_BORDER}>
            <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#000", letterSpacing: "1px" }}>
              International Events
            </h2>
          </div>
          <div style={{ marginBottom: "30px", paddingBottom: "10px", borderBottom: "2px solid #e0e0e0" }}>
            <LogoGrid urls={[
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNiTe3Xq2Ljam2IXTM8y8U6Dnsp_p85klJRQ&s",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ_tUZ54vmHUJeYqzBsictEV8UDxw6q1LNb8A&s",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRuoj6pa6gd3Tf20zHfH_QnRfHMiOI1F9a5Qg&s",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS2t1mfDKtG5VhMRIqzK2ILt-553uW0yOLTxg&s",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSNQfZ_OZUShxKOPrqtWbtm-xCJVUsnmn9NtQ&s",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSvgAKx8hzp76yCbX4247R1OgNXXiA_AhnGwg&s",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTsTmIzGX0NfxeVIXIqME2g5FCCpFbfudlbTQ&s",
              "https://media.licdn.com/dms/image/v2/C4D0BAQHmyJ_vqcxelg/company-logo_200_200/company-logo_200_200/0/1630581235774/kuwait_fintech_summit_logo?e=2147483647&v=beta&t=nEOEeg0JPd8J9k6IB6AkPpNHVNV_bhWVBNoMTEpCd3c",
              "https://image.pitchbook.com/rLrvGahJKGDhsIxYzmb9CuGFwY51721106455539_200x200",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR0yYIOmQaM0B3OAm_YC4LJHAId43cQP_nLcA&s",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSiIEZXpgwO3zQ7fGtEleAhO3xBoIqfB_Yp3w&s",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjvA0_xqd-b2uEKk52nGNQnbMslV-ZP15E2A&s",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ9S_DMMfAEZuuP7vufWD-DQ6LE_nOjsdSt_A&s",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRP8m_XZXDi1iIM0G4-S2AOjYeBtckoiTcMOw&s",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTbQDJ6_18HQN5A-2k_ueSz6OtHJcPsSSAnxQ&s",
            ]} />
          </div>
        </section>

        {/* International Events Organisers */}
        <section style={{ marginBottom: "60px" }}>
          <div style={SECTION_HEADING_BORDER}>
            <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#000", letterSpacing: "1px", lineHeight: "1.2" }}>
              International Events Organisers
            </h2>
          </div>
          <div style={{ marginBottom: "30px", paddingBottom: "10px", borderBottom: "2px solid #e0e0e0" }}>
            <LogoGrid urls={[
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSRa59zQf3bgZOvNBVtDUBA3PKtcnCqGWIU5Q&s",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRC7r2AYOcSZg1W7x2TKD5PWXp0MQuAQlmLOA&s",
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQSIaHpyrktOMIlolH3aMDuj3wKWgXFrF6Svw&s",
              "https://media.licdn.com/dms/image/v2/D4E0BAQEcBg6tp-g_pg/company-logo_200_200/company-logo_200_200/0/1727947216581/cryptomondays_london_logo?e=2147483647&v=beta&t=oDplexyJYoJK2eqqJlt5qyVkIwOFEr_9XIj4OVbfc5w",
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
            ]} />
          </div>
        </section>

        {/* e-Cell Partnerships */}
        <section style={{ marginBottom: "60px" }}>
          <div style={SECTION_HEADING_BORDER}>
            <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#000", letterSpacing: "1px" }}>
              e-Cell Partnerships
            </h2>
          </div>
          <div style={{ marginBottom: "30px", paddingBottom: "10px" }}>
            <LogoGrid urls={[
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
              "https://media.licdn.com/dms/image/v2/D560BAQFSKhSgyXoRHw/company-logo_200_200/company-logo_200_200/0/1704392874605?e=2147483647&v=beta&t=RNFBnY5Qz9EFOtNU3VrbiN2oRWThG8qghHLJ5GffxQk",
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
            ]} />
          </div>
        </section>
      </div>
    </div>
  );
}
