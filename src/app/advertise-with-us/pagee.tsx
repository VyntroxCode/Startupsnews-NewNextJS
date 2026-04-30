"use client";

import React , {useState} from "react";

export default function AdvertiseWithUsPagee() {
    const [formData, setFormData] = useState({
            firstName: "",
            companyName: "",
            email: "",
            phone: "",
            budgetRate: "",
            campaignGoal: "",
            objective: "",
        });
    
        const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            const { name, value } = e.target;
            setFormData((prev) => ({ ...prev, [name]: value }));
        };
    
        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            const response = await fetch('/api/advertise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
    
            const result = await response.json().catch(() => null);
    
            if (!response.ok || !result?.success) {
                const errorMessage = result?.error || 'Failed to send your enquiry. Please try again.';
                alert(errorMessage);
                return;
            }
    
            alert('Thank you for your enquiry. Your message has been sent to office@startupnews.fyi.');
            setFormData({
                firstName: '',
                companyName: '',
                email: '',
                phone: '',
                budgetRate: '',
                campaignGoal: '',
                objective: '',
            });
        };
    const brandLogosRow1 = [
        { alt: "Asian Paints", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756050325113-edy8al7ebg4.webp" },
        { alt: "Ambuja Cement", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756184858288-j473r4oo2n.webp" },
        { alt: "Pepsi", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756186381927-5336jij4k0q.webp" },
        { alt: "Berger", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756051724989-ngqc5j2n7pj.webp" },
        { alt: "Jio", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756185273540-5pun3kq2kec.webp" },
        { alt: "UltraTech", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756184929887-hsbiqphpwc8.webp" },
        { alt: "Emami", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756051739371-omx6m9lhah.webp" },
        { alt: "Kansai Nerolac", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756051815302-v1v6wfbyge.webp" },
        { alt: "ICICI Bank", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756185233848-65u9b2zjwda.webp" },
        { alt: "Skoda", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756184897356-12huosl8odeb.webp" },
    ];
    const brandLogosRow2 = [
        { alt: "Myntra", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756051904062-qxzviebxbz9.webp" },
        { alt: "Kotak", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756051867847-3114agspzp.webp" },
        { alt: "Dabur", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756051732367-xqplv5e78n.webp" },
        { alt: "Pidilite", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756051922921-9dgu9iokmz.webp" },
        { alt: "Xiaomi", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756186026719-8x5rhwmmtcl.webp" },
        { alt: "Reckitt", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756184858288-j473r4oo2n.webp" },
        { alt: "Mankind", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756051867847-3114agspzp.webp" },
        { alt: "Hindustan Unilever", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756050325113-edy8al7ebg4.webp" },
        { alt: "Yes Bank", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756187079216-zej4myhrj3k.webp" },
        { alt: "Mahindra", src: "https://kpbvnnqrlchqierazara.supabase.co/storage/v1/object/public/brand-logos/client_brands/1756051859989-9eobrbryjka.webp" },
    ];

    const audienceData = [
  { label: "Startup founders & co-founders", value: 38 },
  { label: "Investors & VCs", value: 18 },
  { label: "Tech & product professionals", value: 22 },
  { label: "Corporate decision-makers", value: 12 },
  { label: "Students & aspiring founders", value: 10 },
];

const geoData = [
  { label: "India", value: 70 },
  { label: "USA", value: 70 },
  { label: "UAE / MENA", value: 7 },
  { label: "UK", value: 10 },
  { label: "SEA & others", value: 15 },
];

const ProgressBar = ({ value }: { value: number }) => {
  return (
    <div className="progress-bar">
      <div
        className="progress-fill"
        style={{ width: `${value}%` }}
      />
    </div>
  );
};
    return (
        <div className="advertise-custom-page" style={{ width: "100%", background: "#fff", overflow: "hidden", fontFamily: "Arial, sans-serif", color: "#111" }}>
            <section className="advertise-with-us-section" style={{ padding: "80px 20px", background: "#fff" }}>
                <div className="advertise-with-us-main" style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
                    
                    <h1 className="heading" style={{ fontSize: "38px", fontWeight: 700, color: "#111" }}>
                        Reach India's Most Engaged Startup & Tech Audience
                    </h1>
                    {/* <h1 style={{ fontSize: "22px", lineHeight: "1.05", fontWeight: 500, margin: "0 auto 24px", maxWidth: "860px", color: "#000" }}>
                        StartupNews.fyi connects your brand with 10M+ monthly readers — founders, investors, and tech decision-makers across India and 24 countries. AI-curated, founder-first, globally distributed.
                    </h1> */}
                    <p style={{ fontSize: "18px", lineHeight: "1.8", maxWidth: "760px", margin: "0 auto 30px", color: "#444" }}>
                        StartupNews.fyi connects your brand with 10M+ monthly readers — founders, investors, and tech decision-makers across India and 24 countries. AI-curated, founder-first, globally distributed.
                    </p>
                   </div>

                   <div className="advertise-with-us-cta" style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" ,padding: "50px 20px", background: "#fff", border: "1px solid #000",  borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
                       <div className="icon" style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", width: "60px", height: "60px", background: "#dbeafe", borderRadius: "50%", fontSize: "24px" }}>
                        <i className="fa-solid fa-headphones"></i>
                                </div>
                        <p style={{ fontSize: "22px", fontWeight: 600, color: "#111", marginBottom: "16px" }}>
                        Ready to Advertise with StartupNews?
                    </p>
                    {/* <h1 style={{ fontSize: "18px", lineHeight: "1.5", fontWeight: 400, margin: "0 auto 24px", maxWidth: "800px", color: "#000" }}>
                        Connect with our advertising specialists to launch your brand across India's most trusted media network. Submit your enquiry and we'll create the perfect media strategy for your business goals.
                    </h1>

                    <div className="benefits" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "15px", justifyContent: "center" }}>
                        
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "1px", background: "#fff", padding: "8px 12px", borderRadius: "999px", margin: "0 auto 18px", border: "1px solid #e6e4e2", color: "#000", fontSize: "11px", fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "20px", borderRadius: "50%" ,  }}>🎯</span>
                        Expert Consultation
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "1px", background: "#fff", padding: "8px 12px", borderRadius: "999px", margin: "0 auto 18px", border: "1px solid #e6e4e2", color: "#000", fontSize: "11px", fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "20px", borderRadius: "50%" ,  }}>📊</span>
                        Media Strategy
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "1px", background: "#fff", padding: "8px 12px", borderRadius: "999px", margin: "0 auto 18px", border: "1px solid #e6e4e2", color: "#000", fontSize: "11px", fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "20px", borderRadius: "50%" ,  }}>💰</span>
                        Budget Guidance
                    </div>
                        
                    </div> */}

                    <a className="btn btn-primary" href="#sn-form" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "220px", padding: "16px 24px", background: "#000", color: "#fff", textDecoration: "none", fontWeight: 700, borderRadius: "4px" }}>
                            🚀 Submit Your Advertising Enquiry &nbsp; <i className="fa-solid fa-arrow-right"></i>
                        </a>

                    <p style={{ fontSize: "14px", marginTop: "10px", color: "#444" }}>
                        ⏱️ Takes 5-7 minutes • Get expert media consultation within 24 hours
                    </p>
                   </div>
            </section>
           
    

            <section style={{ padding: "60px7f7f"}}>
                <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "1px", background: "#fff", padding: "8px 12px", borderRadius: "999px", margin: "0 auto 18px", border: "1px solid #e6e4e2", color: "#000", fontSize: "12px", fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "20px", borderRadius: "50%" ,  }}>📊</span>
                        Our Impact
                    </div>
                    <p style={{ fontSize: "30px", fontWeight: 600, color: "#111", marginBottom: "16px" }}>
                        Reach That Matters
                    </p>
                    <h1 style={{ fontSize: "18px", lineHeight: "1.05", fontWeight: 400, margin: "0 auto 24px", maxWidth: "860px", color: "#000" }}>
                       StartupNews's unparalleled scale across India's most trusted media platforms
                    </h1>
                </div>
                <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "18px" }}>
                    {[
                        { value: "90.3M", label: "Google search Impressions" },
                        { value: "10M+", label: "Monthly Impressions" },
                        { value: "15M+", label: "Instagram organic Reach" },
                        { value: "22K+", label: "WhatsApp Community Members" },
                        { value: "445K+", label: "Instagram followers" },
                        { value: "24", label: "Countries Reached" },
                        { value: "250+", label: "Global media partners" },
                    ].map((item, idx) => (
                        <div key={idx} style={{ background: "#fff", borderRadius: "16px", padding: "30px 24px", boxShadow: "0 16px 45px rgba(0,0,0,0.08)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                            <div style={{ color: "#e91e63", fontSize: "28px", fontWeight: 600, marginBottom: "10px" }}>{item.value}</div>
                            <div style={{ color: "#333", fontSize: "14px", fontWeight: 400, letterSpacing: "0.05em" }}>{item.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section style={{ padding: "60px 20px" }}>
                <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "1px", background: "#fff", padding: "8px 12px", borderRadius: "999px", margin: "0 auto 18px", border: "1px solid #e6e4e2", color: "#000", fontSize: "12px", fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "20px", borderRadius: "50%" ,  }}>❤️</span>
                        Trusted By
                    </div>
                    <p style={{ fontSize: "30px", fontWeight: 600, color: "#111", marginBottom: "16px" }}>
                        Leading brands across India
                    </p>
                    <h1 style={{ fontSize: "18px", lineHeight: "1.05", fontWeight: 400, margin: "0 auto 24px", maxWidth: "860px", color: "#000" }}>
                       Join 10,000+ advertisers who trust StartupNews for their media campaigns
                    </h1>

                    {/* <div style={{ overflow: "hidden", marginTop: "40px", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "18px"}}> */}
                    {/* <div className="marquee marquee-right-to-left" style={{ display: "flex", alignItems: "center" }}>
                        {[...brandLogosRow1, ...brandLogosRow1].map((logo, idx) => (
                            <div key={`row1-${idx}`} style={{ flex: "0 0 auto", minWidth: "180px", marginRight: "18px", background: "#fff", borderRadius: "16px", padding: "22px", boxShadow: "0 12px 30px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <img src={logo.src} alt={logo.alt} style={{ maxHeight: "55px", maxWidth: "100%", objectFit: "contain" }} />
                            </div>
                        ))}
                    </div> */}
                    <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "10px" }}>
                    {[
                        { url: "https://m.media-amazon.com/images/I/31epF-8N9LL.png"  },
                        { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpvVJfhRhMR4rDhLCiyw63AuPPQAuvh-lgIQ&s" },
                        { url: "https://miro.medium.com/v2/resize:fit:2000/1*Nehq1KYRgFWTanqsLwWeFQ.png"},
                        { url: " https://assets1.cleartax-cdn.com/finfo/wg-utils/retool/51623de7-2149-40da-9fdc-699a83c29e87.png" },
                        { url: "https://upload.wikimedia.org/wikipedia/commons/f/fc/Naukri.png" },
                        { url: " https://images.squarespace-cdn.com/content/v1/58d67c53f5e231abb445a1c5/1530714471513-BDO4R6ZR8ZH9GOBWQ42U/Dot-_-Key-Logo.jpg"},
                        { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSQLg_5l55lYNEMEef4GEcBl1A7j1VxVTRjZg&s"},
                        { url: " https://awards.brandingforum.org/wp-content/uploads/2020/12/milton-logo-833sq.jpg"},
                        { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Tecno_Mobile_logo.svg/3840px-Tecno_Mobile_logo.svg.png"},
                        { url: "https://www.pngkey.com/png/detail/335-3359234_danube-properties-logo.png"},
                        { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyUPu_2EkfYW1frULtF3QJlFdb33ApLOoRFw&s"},
                        { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTTn_uizyorPXLjrVJR8JKCJ4j81iu-TUSG_w&s"},
                        { url: "https://cdn.prod.website-files.com/64c295253c28617fbde07f94/64de660c31e4244876231cf7_karan-invite-logo%20(1).png"},
                        { url: " https://vectorseek.com/wp-content/uploads/2025/08/Ramayana-Logo-PNG-SVG-Vector.jpg"},
                        { url: " https://svatantramhfc.com/images/svatantra-logo-new.png"},
                        { url: " https://trymintly-companylogo.s3.amazonaws.com/1695713117642_new-09.jpg.png"},
                        { url: " https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7hiz9GvkrUOwd3A-kFUd8o0DFHB1RJJ8XPg&s"},
                        { url: "https://cdn.shopify.com/s/files/1/0690/7723/7977/files/Logo_BLACK.png?v=1715307205"},
                        { url: "https://1000logos.net/wp-content/uploads/2023/03/Paytm-logo.png"},
                        { url: "https://www.sticckiz.com/cdn/shop/files/14.DiljitDosanjhSticker_Singer.png?v=1745327901"},
                    ].map((item, idx) => (
                        <div key={idx} style={{ background: "#fff", border:"1px solid #eee", borderRadius: "12px", padding: "30px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                            <div style={{  marginBottom: "10px" }}>{item.url ? (
        <img
          src={item.url}
          alt={`logo-${idx}`}
          style={{ height: "40px", objectFit: "contain" }}
        />
      ) : (
        <div style={{ height: "40px" }} /> // empty placeholder
      )}</div>
                          </div>
                    ))}
                </div>
                

                    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "70px", marginBottom: "32px", marginTop: "32px", justifyContent: "center", color: "#5c5959", fontSize: "13px", fontWeight: 600 }}>
                        <p>10,000+ Advertisers</p>
                        <p>Pan-India Coverage</p>
                        <p>Multi-Language Content</p>
                    </div>
                </div>
            </section>

            <section style={{ padding: "60px7f7f"}}>
                <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center",marginBottom: "20px" }}>
                    <p style={{ fontSize: "30px", fontWeight: 600, color: "#111", marginBottom: "20px" }}>
                        Ad Formats
                    </p>
                </div>
                <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "18px" }}>
                    {[
                        { icon: "📰", heading: "Sponsored article", label: "Long-form brand story published on SNFYI editorial with full SEO value" },
                        { icon: "📣",  heading: "Display banner", label: "Homepage, section & article-level banner placements(desktop + mobile)" },
                        { icon: "✉️",  heading: "Newsletter sponsorship", label: "Dedicated placement in weekly startup funding & news digest" },
                        { icon: "📱", heading: "Social media posts", label: "Instagram, LinkedIn & WhatsApp broadcast to 15M+ combined reach" },
                        { icon: "🎤", heading: "Events sponorship", label: "Brand presence at Founders Meet, Seed Summit, Dubai Konnect & more" },
                        { icon: "🤖", heading: "AI-powered native ads", label: "Contextually placed ads using SNFYI's AI personalisation engine" },
                        { icon: "📢", heading: "Press release distribution", label: "Publish & distribute your PR to 250+ global media patners" },
                        { icon: "🌎", heading: "International delegation", label: "Co-brand with SNFYI delegations to GITEX, Slush, Step & other global events" },
                    ].map((item, idx) => (
                        <div key={idx} style={{ background: "#fff", borderRadius: "16px", padding: "30px 24px", boxShadow: "0 16px 45px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
                            {/* <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "20px", borderRadius: "50%" ,  }}>📊</span> */}
                            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "20px", borderRadius: "50%" }}>{item.icon}</div>
                            <div style={{ color: "#e91e63", fontSize: "18px", fontWeight: 300, marginBottom: "10px" }}>{item.heading}</div>
                            <div style={{ color: "#333", fontSize: "14px", fontWeight: 200, letterSpacing: "0.05em" }}>{item.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <div className="container">
      <div style={{ margin: "48px", textAlign: "center" }}>
                        <div style={{ maxWidth: "1100px", margin: "20px auto", textAlign: "center" }}>
                    <p style={{ fontSize: "30px", fontWeight: 600, color: "#111", marginBottom: "16px" }}>
                        Who we Reach
                    </p>
                </div>

      <div className="grid">
        {/* Left Card */}
        <div className="card">
          <h3 className="card-title">Audience by type</h3>

          <div className="list">
            {audienceData.map((item, index) => (
              <div key={index} className="list-item">
                <span className="label">{item.label}</span>
                <span className="value pink">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Card */}
        <div className="card">
          <h3 className="card-title">Top geographies</h3>

          <div className="geo-list">
            {geoData.map((item, index) => (
              <div key={index} className="geo-item">
                <div className="geo-header">
                  <span className="label">{item.label}</span>
                  <span className="value">{item.value}%</span>
                </div>
                <ProgressBar value={item.value} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
            </section>

            <section style={{ padding: "50px 20px", background: "#fff" }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto" }}>   
                    <div style={{ marginBottom: "48px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "1px", background: "#fff", padding: "8px 12px", borderRadius: "999px", margin: "0 auto 18px", border: "1px solid #e6e4e2", color: "#000", fontSize: "12px", fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "20px", borderRadius: "50%" ,  }}>❤️</span>
                        Why Choose Us
                    </div>
                        <h2 style={{ fontSize: "36px", fontWeight: 800, marginBottom: "16px", color: "#000" }}>Why Choose StartupNews?</h2>
                        <p style={{ fontSize: "18px", lineHeight: "1.7", maxWidth: "760px", margin: "0 auto", color: "#555" }}>
                            India&rsquo;s most credible media powerhouse, offering unmatched reach, precision, and performance. Experience the difference with our comprehensive media solutions and expert guidance.
                        </p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "24px" }}>
                        {[
                            { title: "Precise Targeting", description: "Reach the right audience using geo-demo segmentation across TV and digital.", icon: "🎯" },
                            { title: "Expert Media Strategy", description: "Get comprehensive campaign planning and advertising guidance across our premium portfolio.", icon: "📊" },
                            { title: "Professional Consultation", description: "Comprehensive media consultation and post-campaign performance analysis.", icon: "✓" },
                            { title: "Expert Guidance", description: "Dedicated Relationship Managers for personalized planning and support.", icon: "🎧" },
                        ].map((item, idx) => (
                            <div key={idx} style={{ background: "#fff", border: "1px solid #e5e7eb", borderLeft: "5px solid #3b82f6", borderRadius: "8px", padding: "32px", display: "flex", gap: "20px" }}>
                                <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", width: "60px", height: "60px", background: "#dbeafe", borderRadius: "8px", fontSize: "24px" }}>
                                    {item.icon}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "10px", color: "#000", margin: "0 0 10px 0" }}>{item.title}</h3>
                                    <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#6b7280", margin: 0 }}>{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* <style jsx>{`
                @keyframes marquee-right-to-left {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes marquee-left-to-right {
                    0% { transform: translateX(-50%); }
                    100% { transform: translateX(0); }
                }
                .marquee-right-to-left {
                    animation: marquee-right-to-left 32s linear infinite;
                }
                .marquee-left-to-right {
                    animation: marquee-left-to-right 32s linear infinite;
                }
            `}</style> */}
            <section id="advertise-form" style={{ padding: "80px 20px", background: "#f7f7f7" }}>
                <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 20px" }}>
                    <div style={{ textAlign: "center", marginBottom: "40px" }}>
                        <h2 style={{ fontSize: "32px", fontWeight: 800, marginBottom: "12px", color: "#000" }}>Ready to Start Your Advertising Journey?</h2>
                        <p style={{ fontSize: "18px", lineHeight: "1.7", color: "#555", maxWidth: "760px", margin: "0 auto" }}>
                            Join 10,000+ advertisers who trust StartupNews for expert media guidance across India.
                        </p>
                    </div>

                     <div id="sn-form" className="sn-row-form" style={{ padding: "100px 0", background: "#fff" }}>
                <div className="kt-row-column-wrap" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>

                    <h2 style={{ fontSize: "20px", fontWeight: 500, color: "#000", marginBottom: "12px", textTransform: "none" }}>Get in Touch</h2>
                    <p style={{ fontSize: "14px", color: "#555", marginBottom: "50px" }}>
                        Tell us about your brand and campaign goals. Our team will get back to you within 24 hours with a custom media plan.
                    </p>

                    <form onSubmit={handleSubmit} className="sn-advertise-form" style={{ width: "100%", maxWidth: "1100px" }}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Your Name *</label>
                                <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Company Name *</label>
                                <input type="text" name="companyName" required value={formData.companyName} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Email *</label>
                                <input type="email" name="email" required value={formData.email} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Phone / Whatsapp *</label>
                                <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Budget Rate *</label>
                                <input type="text" name="budgetRate" required placeholder="Under ₹25,000" value={formData.budgetRate} onChange={handleChange} />
                                {/* <select name="jobLevel" required value={formData.jobLevel} onChange={handleChange}>
                                    <option value="">Under ₹25,000</option>
                                    <option value="C-Level">C-Level</option>
                                    <option value="VP">VP</option>
                                    <option value="Director">Director</option>
                                    <option value="Manager">Manager</option>
                                    <option value="Individual Contributor">Individual Contributor</option>
                                </select> */}
                            </div>
                            <div className="form-group">
                                <label>Campaign Goal *</label>
                                <input type="text" name="campaignGoal" required placeholder="Brand awareness" value={formData.campaignGoal} onChange={handleChange} />
                                {/* <select name="industry" required placeholder="Brand awareness" value={formData.industry} onChange={handleChange}>
                                    <option value="">Brand awareness</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Healthcare">Healthcare</option>
                                    <option value="Retail">Retail</option>
                                    <option value="Other">Other</option>
                                </select> */}
                            </div>
                        </div>

                        <div className="form-group form-row-single">
                            <label>Tell us more *</label>
                            <textarea name="objective" required value={formData.objective} onChange={handleChange} rows={5} placeholder ="Describe your campaign, target audience,  goals, or any specific requirements..." /> 
                        </div>

                        <div style={{ paddingTop: "10px", textAlign: "center" }}>

                            <button type="submit" style={{ display: "inline-block", width: "100%", maxWidth: "320px", margin: "0 auto", padding: "18px 24px", background: "#000", color: "#fff", textDecoration: "none", textAlign: "center", fontWeight: 700, borderRadius: "6px" }}>
                            Submit Your Enquiry Today
                        </button>
                            {/* <button type="submit" style={{ padding: "15px 40px", background: "#000", color: "#fff", fontWeight: 800, fontSize: "14px", textTransform: "uppercase", border: "none", cursor: "pointer", borderRadius: "0" }}>
                                Submit
                            </button> */}
                        </div>

                        <p style={{ fontSize: "11px", color: "#000", marginTop: "40px", lineHeight: "1.5", maxWidth: "800px" }}>
                            By submitting this form, I agree to StartupNews.fyi contacting me in relation to this enquiry. Your message will be sent to office@startupnews.fyi as described in our <a href="/privacy-policy" style={{ color: "#0077b5" }}>Privacy Policy</a>.
                        </p>
                    </form>
                </div>
            </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px", marginTop: "30px" }}>
                        {/* <a href="https://adwise.nw18.com/enquiry" target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", width: "100%", maxWidth: "320px", margin: "0 auto", padding: "18px 24px", background: "#000", color: "#fff", textDecoration: "none", textAlign: "center", fontWeight: 700, borderRadius: "6px" }}>
                            Submit Your Enquiry Today
                        </a> */}
                        <div style={{ background: "#fff", borderRadius: "18px", padding: "40px", boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
                            <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#000", marginBottom: "16px" }}>Speak to an expert</h3>
                            <p style={{ fontSize: "15px", color: "#666", marginBottom: "32px" }}>
                                Enquiries are sent to <a href="mailto:office@StartupNews.fyi" style={{ color: "#0077b5", fontWeight: 600 }}>office@StartupNews.fyi</a>.
                            </p>
                            <p style={{ color: "#555", lineHeight: "1.8", margin: 0 }}>
                                Submit your advertising requirements and get expert media guidance across StartupNews&rsquo;s premium media portfolio.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
