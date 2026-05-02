"use client";

import React from "react";

/**
 * AboutPage - Redesigned to match Step 2054 visual reference.
 */
export default function AboutPage() {
    return (
        <div id="mvp-article-cont" className="left relative about-custom-page" style={{ width: "100%", background: "#f9f9f9", overflow: "hidden", minHeight: "100vh" }}>

            {/* STICKY SOCIAL SIDEBAR (MOCKED POSITION) */}
            <div className="sn-social-vertical" style={{
                position: "fixed",
                left: "40px",
                top: "150px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                zIndex: 100
            }}>
                <div style={{ width: "32px", height: "32px", background: "#3b5998", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px" }}><i className="fa-brands fa-facebook-f"></i></div>
                <div style={{ width: "32px", height: "32px", background: "#000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px" }}><i className="fa-brands fa-x-twitter"></i></div>
                <div style={{ width: "32px", height: "32px", background: "#bd081c", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px" }}><i className="fa-brands fa-pinterest-p"></i></div>
                <div style={{ width: "32px", height: "32px", background: "#ccc", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px" }}><i className="fa-solid fa-envelope"></i></div>
            </div>

            <div className="kt-row-column-wrap" style={{ maxWidth: "1200px", margin: "0 auto", padding: "60px 20px" }}>

                {/* HEADER */}
                <header style={{ textAlign: "center", marginBottom: "40px" }}>
                    <h2 style={{
                        fontSize: "28px",
                        fontWeight: 800,
                        color: "#000",
                        textTransform: "uppercase",
                        fontFamily: "Inter, sans-serif",
                        marginBottom: "30px",
                        letterSpacing: "1px"
                    }}>
                        ABOUT US
                    </h2>
                </header>

                {/* INTRODUCTION */}
                <section style={{ maxWidth: "900px", margin: "0 auto 80px", textAlign: "justify" }}>
                    <p style={{
                        fontSize: "15px",
                        lineHeight: "1.6",
                        color: "#000",
                        marginBottom: "25px",
                        fontFamily: "'NB International', sans-serif"
                    }}>
                        StartupNews.fyi offers readers a clear window into the future of startups, innovation, and global business. It's where founders, operators, investors, and industry leaders come to understand what's emerging, what's shifting, and what truly matters across markets. From breakthrough technologies and evolving business models to investment trends and cross-border expansion, we surface high-impact stories and intelligence that help decision-makers stay one step ahead in a rapidly changing world.
                    </p>
                    <p style={{
                        fontSize: "15px",
                        lineHeight: "1.6",
                        color: "#000",
                        fontFamily: "'NB International', sans-serif"
                    }}>
                        Built as a trusted, verified news aggregation and ecosystem intelligence platform, StartupNews.fyi is designed to cut through noise and misinformation. Every update is curated with credibility and relevance at its core, ensuring our audience receives reliable insights they can act on with confidence. As we engage a global community through content, data, and ecosystem initiatives, authenticity remains central to who we are—if you ever encounter communication claiming to represent StartupNews.fyi, we encourage verification through our official channels to ensure trust and transparency at every touchpoint.
                    </p>
                </section>

                {/* TEAM GRID */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }} className="team-grid">

                    {/* Madhur Mohan Malik */}
                    <div className="team-card" style={{ background: "#fff", padding: "40px", borderRadius: "12px", boxShadow: "0 10px 40px rgba(0,0,0,0.05)" }}>
                        <div style={{ marginBottom: "20px" }}>
                            <h3 style={{ fontSize: "22px", fontWeight: 700, color: "#000", marginBottom: "5px" }}>Madhur Mohan Malik</h3>
                            <p style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>Founder</p>
                            <a href="#" style={{ color: "#0077b5", fontSize: "20px" }}><i className="fa-brands fa-linkedin"></i></a>
                        </div>
                        <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#333", fontStyle: "italic" }}>
                            <span style={{ fontWeight: 700 }}>Madhur Mohan Malik</span> is the Founder of StartupNews.fyi, driving its vision to become a trusted global source for startup and industry intelligence. With deep experience across media, technology, and ecosystem building, he focuses on creating high-signal platforms that connect founders, investors, and operators worldwide. His work is centered on credibility, global perspective, and building meaningful bridges across innovation ecosystems.
                        </p>
                    </div>

                    {/* Kapil Suri */}
                    <div className="team-card" style={{ background: "#fff", padding: "40px", borderRadius: "12px", boxShadow: "0 10px 40px rgba(0,0,0,0.05)" }}>
                        <div style={{ marginBottom: "20px" }}>
                            <h3 style={{ fontSize: "22px", fontWeight: 700, color: "#000", marginBottom: "5px" }}>Kapil Suri</h3>
                            <p style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>CoFounder</p>
                            <a href="https://www.linkedin.com/in/kapil-suri-3986307/" target="_blank" rel="noopener noreferrer" style={{ color: "#0077b5", fontSize: "20px" }} aria-label="Kapil Suri on LinkedIn"><i className="fa-brands fa-linkedin"></i></a>
                        </div>
                        <p style={{ fontSize: "13px", lineHeight: "1.6", color: "#333", fontStyle: "italic" }}>
                            <span style={{ fontWeight: 700 }}>Kapil Suri</span> is the Co-Founder of StartupNews.fyi, bringing strategic insight and operational depth to the platform's global growth. With a strong background in business development and ecosystem partnerships, he plays a key role in shaping long-term strategy and execution. His focus lies in building scalable systems, trusted relationships, and sustainable value across global startup communities.
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
                    .sn-social-vertical {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
