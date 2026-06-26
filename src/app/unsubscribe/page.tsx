"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    if (!token) return;
    setStatus("loading");
    fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data: { success: boolean; email?: string; error?: string }) => {
        if (data.success) {
          setStatus("success");
          setMessage(data.email ? `${data.email}` : "");
        } else {
          setStatus("error");
          setMessage(data.error || "The unsubscribe link is invalid or has expired.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (data.success) {
        setStatus("success");
        setMessage(trimmed);
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to unsubscribe. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  const isTokenFlow = Boolean(token);
  const showForm = (!isTokenFlow && status !== "success") || (isTokenFlow && status === "error");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        .unsub-root {
          min-height: 100vh;
          background: #fafafa;
          background-image:
            radial-gradient(circle at 20% 20%, rgba(238,23,97,0.06) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(238,23,97,0.04) 0%, transparent 50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          padding: 40px 20px;
          box-sizing: border-box;
        }

        .unsub-card {
          background: #ffffff;
          border-radius: 24px;
          border: 1px solid #f0f0f0;
          box-shadow:
            0 1px 2px rgba(0,0,0,0.04),
            0 8px 32px rgba(0,0,0,0.07),
            0 24px 64px rgba(238,23,97,0.04);
          width: 100%;
          max-width: 480px;
          overflow: hidden;
        }

        .unsub-card-top {
          background: linear-gradient(135deg, #fff5f8 0%, #fff 60%);
          border-bottom: 1px solid #fce7f3;
          padding: 40px 40px 32px;
          text-align: center;
        }

        .unsub-logo {
          display: block;
          margin: 0 auto 28px;
          height: 28px;
          width: auto;
        }

        .unsub-icon-wrap {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          background: linear-gradient(135deg, #fff0f5, #ffe4ee);
          border: 1px solid #fecdd3;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          box-shadow: 0 4px 12px rgba(238,23,97,0.12);
        }

        .unsub-title {
          font-size: 24px;
          font-weight: 800;
          color: #111;
          margin: 0 0 8px;
          letter-spacing: -0.3px;
        }

        .unsub-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
          line-height: 1.6;
        }

        .unsub-card-body {
          padding: 32px 40px 36px;
        }

        .unsub-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 8px;
        }

        .unsub-input {
          width: 100%;
          padding: 13px 16px;
          font-size: 15px;
          font-family: 'Inter', sans-serif;
          color: #111;
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .unsub-input:focus {
          background: #fff;
          border-color: #ee1761;
          box-shadow: 0 0 0 3px rgba(238,23,97,0.10);
        }
        .unsub-input::placeholder { color: #9ca3af; }
        .unsub-input:disabled { opacity: 0.6; }

        .unsub-btn {
          width: 100%;
          padding: 14px;
          margin-top: 16px;
          font-family: 'Inter', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          background: linear-gradient(135deg, #ee1761, #c9134f);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          letter-spacing: 0.2px;
          transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s;
          box-shadow: 0 4px 14px rgba(238,23,97,0.30);
        }
        .unsub-btn:hover:not(:disabled) {
          opacity: 0.92;
          box-shadow: 0 6px 20px rgba(238,23,97,0.38);
          transform: translateY(-1px);
        }
        .unsub-btn:active:not(:disabled) { transform: translateY(0); }
        .unsub-btn:disabled {
          background: #d1d5db;
          box-shadow: none;
          cursor: not-allowed;
        }

        .unsub-spinner-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 0 8px;
          gap: 14px;
        }
        .unsub-spinner {
          width: 36px;
          height: 36px;
          border: 3px solid #fce7f3;
          border-top: 3px solid #ee1761;
          border-radius: 50%;
          animation: unsub-spin 0.75s linear infinite;
        }
        @keyframes unsub-spin { to { transform: rotate(360deg); } }

        .unsub-success-wrap {
          text-align: center;
          padding: 4px 0 8px;
        }
        .unsub-success-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px;
          box-shadow: 0 4px 16px rgba(34,197,94,0.28);
          animation: unsub-pop 0.4s cubic-bezier(0.175,0.885,0.32,1.275);
        }
        @keyframes unsub-pop {
          from { transform: scale(0.6); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .unsub-success-title {
          font-size: 20px;
          font-weight: 800;
          color: #111;
          margin: 0 0 8px;
        }
        .unsub-success-email {
          font-size: 14px;
          font-weight: 600;
          color: #ee1761;
          background: #fff5f8;
          display: inline-block;
          padding: 4px 14px;
          border-radius: 20px;
          border: 1px solid #fecdd3;
          margin: 0 0 16px;
        }
        .unsub-success-note {
          font-size: 13.5px;
          color: #6b7280;
          line-height: 1.65;
          margin: 0;
        }
        .unsub-success-note a {
          color: #ee1761;
          font-weight: 600;
          text-decoration: none;
        }
        .unsub-success-note a:hover { text-decoration: underline; }

        .unsub-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 24px 0;
          color: #d1d5db;
          font-size: 12px;
          font-weight: 600;
        }
        .unsub-divider::before,
        .unsub-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #f3f4f6;
        }

        .unsub-error-box {
          background: #fff5f5;
          border: 1px solid #fecaca;
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 20px;
          font-size: 13.5px;
          color: #b91c1c;
          line-height: 1.5;
        }

        .unsub-footer {
          text-align: center;
          margin-top: 28px;
          font-size: 13px;
          color: #9ca3af;
        }
        .unsub-footer a {
          color: #ee1761;
          font-weight: 600;
          text-decoration: none;
        }
        .unsub-footer a:hover { text-decoration: underline; }

        .unsub-back-home {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 20px;
          padding: 10px 20px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 600;
          color: #374151;
          text-decoration: none;
          transition: background 0.15s;
        }
        .unsub-back-home:hover { background: #f3f4f6; }

        @media (max-width: 520px) {
          .unsub-card-top { padding: 32px 24px 26px; }
          .unsub-card-body { padding: 24px 24px 28px; }
          .unsub-title { font-size: 20px; }
        }
      `}</style>

      <div className="unsub-root">
        <div className="unsub-card">

          {/* ── TOP SECTION ── */}
          <div className="unsub-card-top">
            {/* <Image
              src="/logo.png"
              alt="StartupNews.fyi"
              width={160}
              height={28}
              className="unsub-logo"
              style={{ objectFit: "contain" }}
            /> */}

            <div className="unsub-icon-wrap">
              {status === "success" ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ee1761" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2"/>
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ee1761" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              )}
            </div>

            <h1 className="unsub-title">
              {status === "success" ? "You're unsubscribed" : "Unsubscribe"}
            </h1>
            <p className="unsub-subtitle">
              {status === "success"
                ? "We've removed you from the Morning Signal newsletter."
                : status === "loading" && isTokenFlow
                ? "Processing your request…"
                : "Enter your email to unsubscribe from the Morning Signal newsletter."}
            </p>
          </div>

          {/* ── BODY ── */}
          <div className="unsub-card-body">

            {/* Loading (token flow) */}
            {isTokenFlow && status === "loading" && (
              <div className="unsub-spinner-wrap">
                <div className="unsub-spinner" />
                <span style={{ fontSize: 13.5, color: "#9ca3af" }}>Unsubscribing…</span>
              </div>
            )}

            {/* Success */}
            {status === "success" && (
              <div className="unsub-success-wrap">
                <div className="unsub-success-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <p className="unsub-success-title">All done!</p>
                {message && <p className="unsub-success-email">{message}</p>}
                <p className="unsub-success-note">
                  You won&rsquo;t receive any more newsletter emails from us.<br />
                  Changed your mind? <a href="/dashboard/settings">Resubscribe from your dashboard</a>.
                </p>
                <a href="/" className="unsub-back-home" style={{ marginTop: 24 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  Back to StartupNews.fyi
                </a>
              </div>
            )}

            {/* Error banner (token flow) */}
            {isTokenFlow && status === "error" && (
              <div className="unsub-error-box">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{message} Enter your email below to unsubscribe manually.</span>
              </div>
            )}

            {/* Email form */}
            {showForm && (
              <form onSubmit={handleSubmit}>
                {isTokenFlow && status === "error" && (
                  <div className="unsub-divider">or try with your email</div>
                )}
                <label htmlFor="unsub-email" className="unsub-label">Email address</label>
                <input
                  id="unsub-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  disabled={status === "loading"}
                  className="unsub-input"
                  style={inputFocused ? {} : {}}
                />
                <button type="submit" disabled={status === "loading"} className="unsub-btn">
                  {status === "loading" ? (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                      <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid #fff", borderRadius: "50%", display: "inline-block", animation: "unsub-spin 0.75s linear infinite" }} />
                      Processing…
                    </span>
                  ) : "Unsubscribe"}
                </button>

                <p className="unsub-footer">
                  Changed your mind?{" "}
                  <a href="/">Back to StartupNews.fyi</a>
                </p>
              </form>
            )}

          </div>
        </div>

        {/* Bottom branding */}
        {/* <p style={{ marginTop: 24, fontSize: 12, color: "#c4c4c4", textAlign: "center" }}>
          &copy; {new Date().getFullYear()} DOTFYI Media Ventures Pvt. Ltd. &middot; New Delhi, India
        </p> */}
      </div>
    </>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif", color: "#9ca3af", fontSize: 14 }}>
        Loading…
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}
