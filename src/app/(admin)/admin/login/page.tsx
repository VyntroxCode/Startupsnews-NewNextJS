'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { siteConfig } from '@/lib/config';
import { setAdminSession } from '@/lib/admin-auth';

// Force dynamic rendering for login page
export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Store token in localStorage
      if (data.data?.token) {
        setAdminSession(data.data.token, data.data.user);
      }

      // Redirect to admin dashboard
      router.push('/admin');
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <div className="admin-login-container">
        {/* Animated gradient background */}
        <div className="admin-login-background">
          <div className="admin-login-gradient-orb admin-login-orb-1"></div>
          <div className="admin-login-gradient-orb admin-login-orb-2"></div>
          <div className="admin-login-gradient-orb admin-login-orb-3"></div>
          <div className="admin-login-grid-pattern"></div>
        </div>

        {/* Login Card */}
        <div className="admin-login-card">
          {/* Logo and Header */}
          <div className="admin-login-header">
            <div className="admin-login-logo-wrapper">
              <Image
                src={siteConfig.logo}
                alt={`${siteConfig.name} Logo`}
                width={120}
                height={60}
                priority
                className="admin-login-logo"
              />
          </div>
            <h2 className="admin-login-title">Admin Portal</h2>
            <p className="admin-login-subtitle">
              Sign in to access the admin dashboard
          </p>
        </div>

          {/* Error Message */}
        {error && (
            <div className="admin-login-error" role="alert">
              <svg
                className="admin-login-error-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
              <span>{error}</span>
          </div>
        )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="admin-login-form">
            {/* Email Input */}
            <div className="admin-login-input-group">
              <label htmlFor="email" className="admin-login-label">
              Email Address
            </label>
              <div className="admin-login-input-wrapper">
                <svg
                  className="admin-login-input-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
            <input
                  id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
                  className="admin-login-input"
              placeholder="admin@startupnews.fyi"
                  autoComplete="email"
                  disabled={loading}
            />
              </div>
          </div>

            {/* Password Input */}
            <div className="admin-login-input-group">
              <label htmlFor="password" className="admin-login-label">
              Password
            </label>
              <div className="admin-login-input-wrapper">
                <svg
                  className="admin-login-input-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
            <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
                  className="admin-login-input"
              placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="admin-login-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
          </div>

            {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
              className="admin-login-submit-button"
          >
            {loading ? (
                <span className="admin-login-button-content">
                  <svg
                    className="admin-login-spinner"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                  <circle cx="12" cy="12" r="10" opacity="0.25"></circle>
                  <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75"></path>
                </svg>
                Signing in...
              </span>
            ) : (
                <span className="admin-login-button-content">
                  Sign In
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </span>
            )}
          </button>
        </form>

          {/* Footer */}
          <div className="admin-login-footer">
            <p className="admin-login-footer-text">
              © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 2rem 1rem;
          overflow: hidden;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        }

        .admin-login-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          z-index: 0;
        }

        .admin-login-gradient-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
          animation: float 20s infinite ease-in-out;
        }

        .admin-login-orb-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(102, 126, 234, 0.8) 0%, transparent 70%);
          top: -200px;
          left: -200px;
          animation-delay: 0s;
        }

        .admin-login-orb-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(118, 75, 162, 0.8) 0%, transparent 70%);
          bottom: -150px;
          right: -150px;
          animation-delay: 5s;
        }

        .admin-login-orb-3 {
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(240, 147, 251, 0.8) 0%, transparent 70%);
          top: 50%;
          right: -100px;
          animation-delay: 10s;
        }

        .admin-login-grid-pattern {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 50px 50px;
          animation: gridMove 30s infinite linear;
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -30px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes gridMove {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }

        .admin-login-card {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          padding: 3.5rem;
          width: 100%;
          max-width: 460px;
          position: relative;
          z-index: 1;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        @media (max-width: 640px) {
          .admin-login-card {
            padding: 2rem 1.5rem;
            border-radius: 20px;
          }
        }

        .admin-login-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .admin-login-logo-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
          border-radius: 16px;
          border: 1px solid rgba(102, 126, 234, 0.2);
        }

        .admin-login-logo {
          height: auto;
          width: auto;
          max-width: 180px;
          object-fit: contain;
        }

        .admin-login-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #0f172a;
          letter-spacing: -0.02em;
          line-height: 1.2;
        }

        @media (max-width: 640px) {
          .admin-login-title {
            font-size: 1.75rem;
          }
        }

        .admin-login-subtitle {
          color: #64748b;
          font-size: 0.9375rem;
          margin: 0;
          line-height: 1.5;
        }

        .admin-login-error {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #991b1b;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          border: 1px solid #fca5a5;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .admin-login-error-icon {
          flex-shrink: 0;
        }

        .admin-login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .admin-login-input-group {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .admin-login-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #334155;
          display: block;
        }

        .admin-login-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .admin-login-input-icon {
          position: absolute;
          left: 1rem;
          color: #94a3b8;
          pointer-events: none;
          z-index: 1;
          transition: color 0.2s;
        }

        .admin-login-input {
          width: 100%;
          padding: 0.875rem 1rem 0.875rem 3rem;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          font-size: 0.9375rem;
          box-sizing: border-box;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: #ffffff;
          color: #0f172a;
        }

        .admin-login-input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .admin-login-input:focus + .admin-login-input-icon,
        .admin-login-input:focus ~ .admin-login-input-icon {
          color: #667eea;
        }

        .admin-login-input:disabled {
          background: #f1f5f9;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .admin-login-input::placeholder {
          color: #94a3b8;
        }

        .admin-login-password-toggle {
          position: absolute;
          right: 1rem;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s;
          z-index: 1;
        }

        .admin-login-password-toggle:hover {
          color: #667eea;
        }

        .admin-login-password-toggle:focus {
          outline: 2px solid #667eea;
          outline-offset: 2px;
          border-radius: 4px;
        }

        .admin-login-submit-button {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
          position: relative;
          overflow: hidden;
          margin-top: 0.5rem;
        }

        .admin-login-submit-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .admin-login-submit-button:hover:not(:disabled)::before {
          left: 100%;
        }

        .admin-login-submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
        }

        .admin-login-submit-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .admin-login-submit-button:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
          box-shadow: none;
          opacity: 0.7;
        }

        .admin-login-button-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          position: relative;
          z-index: 1;
        }

        .admin-login-spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .admin-login-footer {
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e2e8f0;
          text-align: center;
        }

        .admin-login-footer-text {
          color: #94a3b8;
          font-size: 0.8125rem;
          margin: 0;
        }
      `}</style>
    </>
  );
}
