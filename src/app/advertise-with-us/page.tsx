"use client";

import React, { useState } from "react";

/**
 * AdvertisePage - Redesigned to match Step 1958 and Step 1990 visual references.
 * Fixed missing components and row order.
 */
export default function AdvertisePage() {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        jobTitle: "",
        jobLevel: "",
        industry: "",
        company: "",
        country: "",
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
            lastName: '',
            email: '',
            phone: '',
            jobTitle: '',
            jobLevel: '',
            industry: '',
            company: '',
            country: '',
            objective: '',
        });
    };

    return (
        <div id="mvp-article-cont" className="left relative advertise-custom-page" style={{ width: "100%", background: "#fff", overflow: "hidden" }}>

            {/* TOP BANNER: Text only, bold and bigger font */}
            <div className="sn-advertise-top-banner" style={{ padding: "60px 20px 80px", background: "#fff" }}>
                <div style={{ maxWidth: "900px", margin: "0 auto" }}>
                    <p style={{ fontSize: "22px", lineHeight: "1.5", color: "#000", fontWeight: 700, marginBottom: "24px" }}>
                        StartupNews.fyi connects you to a fast-growing, global community of founders, investors, and decision-makers shaping the future of innovation.
                    </p>
                    <p style={{ fontSize: "22px", lineHeight: "1.5", color: "#000", fontWeight: 700, marginBottom: 0 }}>
                        Access a powerful network across India and multiple international markets — where entrepreneurs build, capital flows, and ideas turn into scalable ventures.
                    </p>
                </div>
            </div>

            {/* STATS: 4 items only */}
            <div className="sn-advertise-stats" style={{ padding: "60px 20px 80px", background: "#f5f5f5" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", maxWidth: "1200px", margin: "0 auto" }} className="advertise-stats-grid">
                    {[
                        { val: "10mn+", label: "Social Media Reach" },
                        { val: "400+", label: "Startup Events Organized" },
                        { val: "11", label: "International Delegations" },
                        { val: "24", label: "Media Partnership Countries" },
                    ].map((item, idx) => (
                        <div key={idx} style={{ textAlign: "center", padding: "32px 20px", background: "#fff", borderRadius: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                            <div style={{ fontSize: "42px", fontWeight: 800, color: "#000", lineHeight: "1", marginBottom: "8px" }}>{item.val}</div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "#333", textTransform: "uppercase", letterSpacing: "0.5px", lineHeight: "1.3" }}>{item.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* TEXT + IMAGE SECTION */}
            <div className="sn-advertise-network" style={{ padding: "80px 20px 100px", background: "#fff" }}>
                <div className="kt-row-column-wrap" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", maxWidth: "1200px", margin: "0 auto", gap: "60px", alignItems: "center" }}>
                    <div>
                        <p style={{ fontSize: "20px", lineHeight: "1.6", color: "#000", fontWeight: 600, marginBottom: "20px" }}>
                            Access a dynamic global network of founders, investors, and industry leaders who are actively building and shaping the future of startups and technology.
                        </p>
                        <p style={{ fontSize: "20px", lineHeight: "1.6", color: "#000", fontWeight: 600, marginBottom: 0 }}>
                            Reach decision-makers across India and multiple international markets through StartupNews.fyi&apos;s trusted media and on-ground ecosystem presence.
                        </p>
                    </div>
                    <div style={{ position: "relative" }}>
                        <div style={{
                            backgroundImage: "url('/images/advertise-network.png')",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            minHeight: "380px",
                            borderRadius: "12px",
                            boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
                        }} />
                    </div>
                </div>
            </div>

            {/* FORM: Speak to an expert — submits to office@startupnews.fyi */}
            <div className="sn-row-form" style={{ padding: "100px 0", background: "#fff" }}>
                <div className="kt-row-column-wrap" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 20px" }}>

                    <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#000", marginBottom: "12px", textTransform: "none" }}>Speak to an expert</h2>
                    <p style={{ fontSize: "14px", color: "#555", marginBottom: "50px" }}>
                        Enquiries are sent to <a href="mailto:office@startupnews.fyi" style={{ color: "#0077b5", fontWeight: 600 }}>office@startupnews.fyi</a>
                    </p>

                    <form onSubmit={handleSubmit} className="sn-advertise-form" style={{ width: "100%", maxWidth: "1100px" }}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>First Name *</label>
                                <input type="text" name="firstName" required value={formData.firstName} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Last Name *</label>
                                <input type="text" name="lastName" required value={formData.lastName} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Work Email Address *</label>
                                <input type="email" name="email" required value={formData.email} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Business Phone *</label>
                                <input type="tel" name="phone" required value={formData.phone} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Job Title *</label>
                                <input type="text" name="jobTitle" required value={formData.jobTitle} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Job Level *</label>
                                <select name="jobLevel" required value={formData.jobLevel} onChange={handleChange}>
                                    <option value="">Please Select</option>
                                    <option value="C-Level">C-Level</option>
                                    <option value="VP">VP</option>
                                    <option value="Director">Director</option>
                                    <option value="Manager">Manager</option>
                                    <option value="Individual Contributor">Individual Contributor</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Industry *</label>
                                <select name="industry" required value={formData.industry} onChange={handleChange}>
                                    <option value="">Please Select</option>
                                    <option value="Technology">Technology</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Healthcare">Healthcare</option>
                                    <option value="Retail">Retail</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Company / Organization *</label>
                                <input type="text" name="company" required value={formData.company} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-group form-row-single">
                            <label>Country *</label>
                            <select name="country" required value={formData.country} onChange={handleChange}>
                                <option value="">Please Select</option>
                                <option value="India">India</option>
                                <option value="United States">United States</option>
                                <option value="United Kingdom">United Kingdom</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="form-group form-row-single">
                            <label>Please outline your brand campaign objective or provide additional details. *</label>
                            <textarea name="objective" required value={formData.objective} onChange={handleChange} rows={5} />
                        </div>

                        <div style={{ paddingTop: "10px" }}>
                            <button type="submit" style={{ padding: "15px 40px", background: "#000", color: "#fff", fontWeight: 800, fontSize: "14px", textTransform: "uppercase", border: "none", cursor: "pointer", borderRadius: "0" }}>
                                Submit
                            </button>
                        </div>

                        <p style={{ fontSize: "11px", color: "#000", marginTop: "40px", lineHeight: "1.5", maxWidth: "800px" }}>
                            By submitting this form, I agree to StartupNews.fyi contacting me in relation to this enquiry. Your message will be sent to office@startupnews.fyi as described in our <a href="/privacy-policy" style={{ color: "#0077b5" }}>Privacy Policy</a>.
                        </p>
                    </form>
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 1024px) {
                    .kt-row-column-wrap {
                        grid-template-columns: 1fr !important;
                        gap: 40px !important;
                    }
                    .advertise-stats-grid {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                }
                @media (max-width: 600px) {
                    .advertise-stats-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
