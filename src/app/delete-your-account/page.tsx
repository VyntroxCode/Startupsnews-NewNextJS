"use client";

import React from "react";

export default function DeleteYourAccountPage() {
  return (
    <div
      id="mvp-article-cont"
      className="left relative delete-account-custom-page"
      style={{ width: "100%", background: "#fff", overflow: "hidden", minHeight: "100vh" }}
    >
      <div className="kt-row-column-wrap" style={{ maxWidth: "800px", margin: "0 auto", padding: "80px 20px" }}>
        <header style={{ marginBottom: "60px", textAlign: "center" }}>
          <h2
            className="delete-account-title"
            style={{
              fontSize: "42px",
              fontWeight: 900,
              color: "#000",
              textTransform: "uppercase",
              fontFamily: "Inter, sans-serif",
              lineHeight: 1.12,
              marginBottom: "20px",
              letterSpacing: "1px",
            }}
          >
            Delete Your Account
          </h2>
          <p className="delete-account-subtitle" style={{ fontSize: "18px", color: "#444", lineHeight: "1.7", marginBottom: "20px" }}>
            Are you sure you want to delete your account? This action cannot be undone.
          </p>
          <div style={{ width: "60px", height: "4px", background: "#ee1761", margin: "0 auto" }}></div>
        </header>

        <article
          style={{
            fontSize: "16px",
            lineHeight: "1.8",
            color: "#333",
            fontFamily: "'NB International', sans-serif",
          }}
        >
          <h2 style={sectionTitleStyle}>Request account deletion</h2>
          <p style={{ marginBottom: "25px" }}>
            Please fill out the form below to request account deletion. We will process your request within 15 days.
          </p>

          <h2 style={sectionTitleStyle}>Important notice</h2>
          <p style={{ marginBottom: "25px" }}>
            Once your account is deleted, all associated data will be permanently removed.
          </p>
          <p style={{ marginBottom: "25px" }}>
            If you change your mind, please contact support within 15 days.
          </p>

          <h2 style={sectionTitleStyle}>Contact support</h2>
          <p style={{ marginBottom: "10px" }}>Email us at:</p>
          <p style={{ marginBottom: "25px", fontWeight: 700 }}>
            <a href="mailto:office@startupnews.fyi" style={{ color: "#ee1761" }}>
              office@startupnews.fyi
            </a>
          </p>
          <p style={{ marginBottom: "10px" }}>
            Include your registered email address and write "Delete my account" in the subject line.
          </p>
        </article>
      </div>

      <style jsx>{`
        .delete-account-title {
          text-wrap: balance;
        }

        @media (max-width: 600px) {
          .delete-account-custom-page .kt-row-column-wrap {
            padding: 44px 20px 56px !important;
          }

          .delete-account-title {
            font-size: 34px !important;
            line-height: 1.2 !important;
            letter-spacing: 0.4px !important;
            margin-bottom: 14px !important;
          }

          .delete-account-subtitle {
            font-size: 16px !important;
            line-height: 1.7 !important;
            margin-bottom: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "24px",
  fontWeight: 800,
  color: "#000",
  marginTop: "32px",
  marginBottom: "14px",
  fontFamily: "Inter, sans-serif",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

function socialIconStyle(background: string): React.CSSProperties {
  return {
    width: "32px",
    height: "32px",
    background,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: "14px",
  };
}
