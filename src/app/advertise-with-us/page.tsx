"use client";

import React, { useState, useRef } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { HeadphonesIcon, ArrowRightIcon } from "@/components/icons";

export default function AdvertisePage() {
    const [formData, setFormData] = useState({
            firstName: "",
            companyName: "",
            email: "",
            phone: "",
            budgetRate: "",
            campaignGoal: "",
            objective: "",
        });
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const turnstileRef = useRef<TurnstileInstance>(null);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            const { name, value } = e.target;
            setFormData((prev) => ({ ...prev, [name]: value }));
        };

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();

            if (!turnstileToken) {
                alert('Please complete the CAPTCHA verification.');
                return;
            }

            setSubmitting(true);
            const response = await fetch('/api/advertise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, turnstileToken }),
            });

            const result = await response.json().catch(() => null);
            setSubmitting(false);

            if (!response.ok || !result?.success) {
                const errorMessage = result?.error || 'Failed to send your enquiry. Please try again.';
                alert(errorMessage);
                turnstileRef.current?.reset();
                setTurnstileToken(null);
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
            turnstileRef.current?.reset();
            setTurnstileToken(null);
        };

    const audienceData = [
  { label: "Startup founders & co-founders", value: 38 },
  { label: "Investors & VCs", value: 18 },
  { label: "Tech & product professionals", value: 22 },
  { label: "Corporate decision-makers", value: 12 },
  { label: "Students & aspiring founders", value: 10 },
];

const geoData = [

  { label: "USA", value: 70 },
  { label: "UAE / MENA", value: 10 },
  { label: "UK", value: 10 },
  { label: "SEA & others", value: 10 },
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
            <style>{`
                .adv-main-heading { font-size: 38px; font-weight: 700; color: #111; padding-bottom: 20px; }
                .adv-cta-heading { font-size: 22px; font-weight: 600; color: #111; margin-bottom: 16px; }
                .adv-stats-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
                .adv-logos-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; }
                .adv-why-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
                .adv-cta-row { display: flex; flex-direction: row; align-items: center; gap: 70px; margin-bottom: 32px; margin-top: 32px; justify-content: center; color: #5c5959; font-size: 13px; font-weight: 600; }
                .adv-hero-sec { padding: 80px 20px; background: #fff; }
                .adv-stats-sec { padding: 60px 20px; }
                .adv-logos-sec { padding: 60px 20px; }
                .adv-who-inner { margin: 48px; text-align: center; }
                .adv-form-sec { padding: 80px 20px; background: #f7f7f7; }
                .adv-form-box { padding: 30px 0; background: #fff; }
                .adv-sec-title { font-size: 30px; font-weight: 600; color: #111; margin-bottom: 16px; }
                .adv-why-title { font-size: 36px; font-weight: 800; margin-bottom: 16px; color: #000; }
                .adv-form-title { font-size: 32px; font-weight: 800; margin-bottom: 12px; color: #000; }
                .adv-logo-tile { background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 20px 12px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
                .adv-stat-tile { background: #fff; border-radius: 16px; padding: 30px 24px; box-shadow: 0 16px 45px rgba(0,0,0,0.08); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
                @media (max-width: 768px) {
                    .adv-main-heading { font-size: 20px; }
                    .adv-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    .adv-logos-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
                    .adv-why-grid { grid-template-columns: 1fr; }
                    .adv-cta-row { flex-direction: column; gap: 12px; text-align: center; }
                    .adv-hero-sec { padding: 40px 28px; }
                    .adv-stats-sec, .adv-logos-sec { padding: 32px 24px; }
                    .adv-who-inner { margin: 16px 24px; }
                    .adv-form-sec { padding: 40px 24px; }
                    .adv-form-box { padding: 20px 0; }
                    .adv-sec-title { font-size: 22px; }
                    .adv-why-title { font-size: 24px; }
                    .adv-form-title { font-size: 22px; }
                    .adv-stat-tile { padding: 20px 16px; }
                    .adv-logo-tile { padding: 12px 8px; }
                    .adv-cta-heading { font-size: 17px; }
                }
                @media (max-width: 480px) {
                    .adv-main-heading { font-size: 18px; }
                    .adv-logos-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
                    .adv-hero-sec { padding: 32px 20px; }
                    .adv-stats-sec, .adv-logos-sec { padding: 28px 20px; }
                    .adv-who-inner { margin: 12px 20px; }
                    .adv-form-sec { padding: 32px 20px; }
                    .adv-form-box { padding: 16px 0; }
                    .adv-sec-title { font-size: 18px; }
                    .adv-why-title, .adv-form-title { font-size: 20px; }
                    .adv-cta-heading { font-size: 16px; }
                }
            `}</style>
            <section className="advertise-with-us-section adv-hero-sec">
                <div className="advertise-with-us-main" style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>

                    <h2 className="adv-main-heading">
                        Reach The Most Engaged Startup & Tech Audience
                    </h2>
                    <p style={{ fontSize: "18px", lineHeight: "1.8", maxWidth: "760px", margin: "0 auto 30px", color: "#444" }}>
                        StartupNews.fyi connects your brand with 10M+ monthly readers — founders, investors, and tech decision-makers across India and 24 countries. AI-curated, founder-first, globally distributed.
                    </p>
                   </div>

                   <div className="advertise-with-us-cta" style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" ,padding: "50px 20px", background: "#fff", border: "1px solid #000",  borderRadius: "8px", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
                       <div className="icon" style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "center", width: "60px", height: "60px", background: "#dbeafe", borderRadius: "50%", fontSize: "24px" }}>
                        <HeadphonesIcon aria-hidden="true" />
                                </div>
                        <p className="adv-cta-heading">
                        Ready to Advertise with StartupNews?
                    </p>

                    <a className="btn btn-primary" href="#sn-form" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "220px", padding: "16px 24px", background: "#000", color: "#fff", textDecoration: "none", fontWeight: 700, borderRadius: "4px" }}>
                            🚀 Submit Your Advertising Enquiry &nbsp; <ArrowRightIcon aria-hidden="true" />
                        </a>

                    <p style={{ fontSize: "14px", marginTop: "10px", color: "#444" }}>
                        ⏱️ Takes 5-7 minutes • Get expert media consultation within 24 hours
                    </p>
                   </div>
            </section>


            <section className="adv-stats-sec">
                <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
                    <p className="adv-sec-title">
                        Reach That Matters
                    </p>
                    <h2 style={{ fontSize: "18px", lineHeight: "1.05", fontWeight: 400, margin: "0 auto 24px", maxWidth: "860px", color: "#000" }}>
                       StartupNews's unparalleled scale across India's most trusted media platforms
                    </h2>
                </div>
                <div className="adv-stats-grid">
                    {[{ value: "90.3M", label: "Google search Impressions" },
                        { value: "10M+", label: "Monthly Impressions" },
                        { value: "15M+", label: "Instagram organic Reach" },
                        { value: "22K+", label: "WhatsApp Community Members" },
                        { value: "445K+", label: "Instagram followers" },
                        { value: "24", label: "Countries Reached" },
                        { value: "250+", label: "Global media partners" },
                    ].map((item, idx) => (
                        <div key={idx} className="adv-stat-tile">
                            <div style={{ color: "#e91e63", fontSize: "28px", fontWeight: 600, marginBottom: "10px" }}>{item.value}</div>
                            <div style={{ color: "#333", fontSize: "14px", fontWeight: 400, letterSpacing: "0.05em" }}>{item.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="adv-logos-sec">
                <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "1px", background: "#fff", padding: "8px 12px", borderRadius: "999px", margin: "0 auto 18px", border: "1px solid #e6e4e2", color: "#000", fontSize: "12px", fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "20px", borderRadius: "50%" }}>❤️</span>
                        Trusted By
                    </div>
                    <p className="adv-sec-title">
                        Leading brands across India
                    </p>
                    <h2 style={{ fontSize: "18px", lineHeight: "1.05", fontWeight: 400, margin: "0 auto 24px", maxWidth: "860px", color: "#000" }}>
                       Join 100’s advertisers who trust StartupNews for their media campaigns
                    </h2>

                    <div className="adv-logos-grid">
                    {[
                        { url: "https://m.media-amazon.com/images/I/31epF-8N9LL.png"  },
                        { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSpvVJfhRhMR4rDhLCiyw63AuPPQAuvh-lgIQ&s" },
                        { url: "https://miro.medium.com/v2/resize:fit:2000/1*Nehq1KYRgFWTanqsLwWeFQ.png"},
                        { url: "https://assets1.cleartax-cdn.com/finfo/wg-utils/retool/51623de7-2149-40da-9fdc-699a83c29e87.png" },
                        { url: "https://upload.wikimedia.org/wikipedia/commons/f/fc/Naukri.png" },
                        { url: "https://images.squarespace-cdn.com/content/v1/58d67c53f5e231abb445a1c5/1530714471513-BDO4R6ZR8ZH9GOBWQ42U/Dot-_-Key-Logo.jpg"},
                        { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSQLg_5l55lYNEMEef4GEcBl1A7j1VxVTRjZg&s"},
                        { url: "https://awards.brandingforum.org/wp-content/uploads/2020/12/milton-logo-833sq.jpg"},
                        { url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Tecno_Mobile_logo.svg/3840px-Tecno_Mobile_logo.svg.png"},
                        { url: "https://www.pngkey.com/png/detail/335-3359234_danube-properties-logo.png"},
                        { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSyUPu_2EkfYW1frULtF3QJlFdb33ApLOoRFw&s"},
                        { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTTn_uizyorPXLjrVJR8JKCJ4j81iu-TUSG_w&s"},
                        { url: "https://cdn.prod.website-files.com/64c295253c28617fbde07f94/64de660c31e4244876231cf7_karan-invite-logo%20(1).png"},
                        { url: "https://vectorseek.com/wp-content/uploads/2025/08/Ramayana-Logo-PNG-SVG-Vector.jpg"},
                        { url: "https://svatantramhfc.com/images/svatantra-logo-new.png"},
                        { url: "https://trymintly-companylogo.s3.amazonaws.com/1695713117642_new-09.jpg.png"},
                        { url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7hiz9GvkrUOwd3A-kFUd8o0DFHB1RJJ8XPg&s"},
                        { url: "https://cdn.shopify.com/s/files/1/0690/7723/7977/files/Logo_BLACK.png?v=1715307205"},
                        { url: "https://1000logos.net/wp-content/uploads/2023/03/Paytm-logo.png"},
                        { url: "https://www.sticckiz.com/cdn/shop/files/14.DiljitDosanjhSticker_Singer.png?v=1745327901"},
                    ].map((item, idx) => (
                        <div key={idx} className="adv-logo-tile">
                            <div style={{ width: "110px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <img src={item.url} alt={`logo-${idx}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                            </div>
                        </div>
                    ))}
                </div>

                    <div className="adv-cta-row">
                        <p>100’s Advertisers</p>
                        <p>Multi-Continent Coverage</p>
                        <p>Multi-Language</p>
                    </div>
                </div>
            </section>

            <section style={{ padding: "50px 20px", background: "#fff" }}>
                <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
                    <div style={{ marginBottom: "48px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "1px", background: "#fff", padding: "8px 12px", borderRadius: "999px", margin: "0 auto 18px", border: "1px solid #e6e4e2", color: "#000", fontSize: "12px", fontWeight: 600 }}>
                        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "20px", borderRadius: "50%" }}>❤️</span>
                        Why Choose Us
                    </div>
                        <h2 className="adv-why-title">Why Choose StartupNews?</h2>
                        <p style={{ fontSize: "18px", lineHeight: "1.7", maxWidth: "760px", margin: "0 auto", color: "#555" }}>
                            India&rsquo;s most credible media powerhouse, offering unmatched reach, precision, and performance. Experience the difference with our comprehensive media solutions and expert guidance.
                        </p>
                    </div>
                    <div className="adv-why-grid">
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

            <section id="advertise-form" className="adv-form-sec">
                <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 20px" }}>
                    <div style={{ textAlign: "center", marginBottom: "40px" }}>
                        <h2 className="adv-form-title">Ready to Start Your Advertising Journey?</h2>
                        <p style={{ fontSize: "18px", lineHeight: "1.7", color: "#555", maxWidth: "760px", margin: "0 auto" }}>
                          Join 100’s of advertisers who trust StartupNews for expert media guidance across India.
                        </p>
                    </div>

                     <div id="sn-form" className="sn-row-form adv-form-box">
                <div className="kt-row-column-wrap" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>

                    <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#000", marginBottom: "12px", textTransform: "none" }}>Get in Touch</h2>
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
                                <input type="text" name="budgetRate" required placeholder="Under $ 500" value={formData.budgetRate} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Campaign Goal *</label>
                                <input type="text" name="campaignGoal" required placeholder="Brand awareness" value={formData.campaignGoal} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-group form-row-single">
                            <label>Tell us more *</label>
                            <textarea name="objective" required value={formData.objective} onChange={handleChange} rows={5} placeholder="Describe your campaign, target audience, goals, or any specific requirements..." />
                        </div>

                        <div style={{ paddingTop: "10px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                            <Turnstile
                                ref={turnstileRef}
                                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                                onSuccess={(token) => setTurnstileToken(token)}
                                onExpire={() => setTurnstileToken(null)}
                                onError={() => setTurnstileToken(null)}
                            />
                            <button
                                type="submit"
                                disabled={submitting || !turnstileToken}
                                style={{ display: "inline-block", width: "100%", maxWidth: "320px", margin: "0 auto", padding: "18px 24px", background: submitting || !turnstileToken ? "#666" : "#000", color: "#fff", textDecoration: "none", textAlign: "center", fontWeight: 700, borderRadius: "6px", cursor: submitting || !turnstileToken ? "not-allowed" : "pointer", border: "none" }}
                            >
                                {submitting ? "Sending..." : "Submit Your Enquiry Today"}
                            </button>
                        </div>

                        <p style={{ fontSize: "11px", color: "#000", marginTop: "40px", lineHeight: "1.5", maxWidth: "800px" }}>
                            By submitting this form, I agree to StartupNews.fyi contacting me in relation to this enquiry. Your message will be sent to office@startupnews.fyi as described in our <a href="/privacy-policy" style={{ color: "#0077b5" }}>Privacy Policy</a>.
                        </p>
                    </form>
                </div>
            </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "24px", marginTop: "30px" }}>
                        <div style={{ background: "#fff", borderRadius: "18px", padding: "40px", boxShadow: "0 20px 60px rgba(0,0,0,0.08)" }}>
                            <h3 style={{ fontSize: "24px", fontWeight: 800, color: "#000", marginBottom: "16px" }}>Connect directly with an expert</h3>
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
