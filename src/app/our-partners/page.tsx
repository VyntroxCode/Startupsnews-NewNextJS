"use client";

import React from "react";

/**
 * Our Partners - Placeholder page; content to be added later.
 */
export default function OurPartnersPage() {
  return (
    <div
      id="mvp-article-cont"
      className="left relative our-partners-custom-page"
      style={{ width: "100%", background: "#f9f9f9", overflow: "hidden", minHeight: "100vh" }}
    >
      <div
        className="kt-row-column-wrap"
        style={{ maxWidth: "800px", margin: "0 auto", padding: "60px 24px 80px" }}
      >
        <header style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "#000",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Our Partners
          </h1>
        </header>
        <section style={{ textAlign: "center" }}>
          <p style={{ fontSize: "15px", lineHeight: "1.6", color: "#666" }}>
            Details coming soon.
          </p>
        </section>
      </div>
    </div>
  );
}
