"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/config";

export function Footer() {
  const year = new Date().getFullYear();
  const defaultCopyright = `© ${year} Dotfyi Media Ventures Pvt Ltd`;
  const [copyrightText, setCopyrightText] = useState(defaultCopyright);

  useEffect(() => {
    let cancelled = false;

    async function fetchFooterCopyright() {
      try {
        const res = await fetch('/api/site-settings/footer-copyright', { cache: 'no-store' });
        const data = await res.json();
        if (!cancelled && data?.success && typeof data?.data?.value === 'string' && data.data.value.trim()) {
          const resolved = data.data.value.replace(/\{\{year\}\}/g, String(year));
          setCopyrightText(resolved);
        }
      } catch {
        // Keep default text on errors.
      }
    }

    fetchFooterCopyright();
    return () => {
      cancelled = true;
    };
  }, [year]);

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Top Section: Brand and Tagline */}
        <div className="footer-top">
          <div className="footer-top-left">
            <div className="footer-brand">
              <Link href="/">
                <Image
                  src={siteConfig.logoFoot}
                  alt={siteConfig.name}
                  width={250}
                  height={60}
                  style={{ maxWidth: "250px", height: "auto", display: "block", margin: "0 auto" }}
                />
              </Link>
            </div>
            <p className="footer-tagline">
              Empowering innovation and connecting the startup ecosystem worldwide.
            </p>
          </div>
          <div className="footer-top-right">
            <div className="footer-social-links">
              {siteConfig.social.facebook && (
                <a href={siteConfig.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}
              {siteConfig.social.instagram && (
                <a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
              {siteConfig.social.linkedin && (
                <a href={siteConfig.social.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              )}
              <div className="footer-social-mobile-view">
              {siteConfig.social.appstore && (
                <Link href="">
                  <Image
                  src={siteConfig.social.appstore}
                  alt="App Store"
                  width={140}
                  height={45}
                  style={{ maxWidth: "140px", height: "auto", display: "block", margin: "0 auto" }}
                />  
                </Link>   
              )}
              {siteConfig.social.googleplay && (
                   <Link href="">
                  <Image
                  src={siteConfig.social.googleplay}
                  alt="Google Play"
                  width={160}
                  height={45}
                  style={{ maxWidth: "160px", height: "auto", display: "block", margin: "0 auto" }}
                />  
                </Link>           
              
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Links Grid */}
        <div className="footer-bottom">
          <div>
            <h3>Topics</h3>
            <ul>
              <li><Link href="/ai-deeptech">AI & Deeptech</Link></li>
              <li><Link href="/ev-mobility">Ev & Mobility</Link></li>
              <li><Link href="/social-media">Social Media</Link></li>
              <li><Link href="/ecommerce">Ecommerce</Link></li>
              <li><Link href="/gaming">Gaming</Link></li>
            </ul>
          </div>

          <div>
            <h3>For Startup</h3>
            <ul>
              <li><a href="https://forms.gle/FrCjzLGAs1gNaVyG7" target="_blank" rel="noopener noreferrer">Feature your Startup</a></li>
              <li><a href="https://forms.gle/FrCjzLGAs1gNaVyG7" target="_blank" rel="noopener noreferrer">Submit your Funding Round</a></li>
              <li><a href="https://forms.gle/FrCjzLGAs1gNaVyG7" target="_blank" rel="noopener noreferrer">Submit your press release</a></li>
            </ul>
          </div>

          <div>
            <h3>For Events</h3>
            <ul>
              <li><a href="https://forms.gle/G4ZxCP3G1gTHJf1v5" target="_blank" rel="noopener noreferrer">Submit your Event</a></li>
              <li><Link href="/advertise-with-us/pagee">Advertise with us</Link></li>
            </ul>
          </div>

          <div>
            <h3>For Investors</h3>
            <ul>
              {/* <li><Link href="/dealflow-newsletter">Dealflow Newsletter</Link></li>
              <li><Link href="/regional-reports">Regional Reports</Link></li>
              <li><Link href="/speak-sponsor">Speak / Sponsor Opportunities</Link></li> */}
              <li>Dealflow Newsletter</li>
              <li>Regional Reports</li>
              <li>Speak / Sponsor Opportunities</li>
            </ul>
          </div>

          <div>
            <h3>About Us</h3>
            <ul>
              <li><Link href="/about">About us</Link></li>
              <li><Link href="">Our Partners</Link></li>
              <li><Link href="/contact-us">Contact us</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Policy Links and Social Icons */}
        <div className="footer-bottom-bar">
          <div className="footer-policy-links">
            <Link href="/privacy-policy">Privacy Policy</Link>
            <span className="footer-separator">/</span>
            <Link href="/terms-and-conditions">Terms and Conditions</Link>
            <span className="footer-separator">/</span>
            <Link href="/return-refund-policy">Return and Refund Policy</Link>
            {/* <span className="footer-separator">/</span>
            <Link href="/delete-your-account">Delete Your Account</Link> */}
          </div>

          {/* <div className="footer-top-right">
            <div className="footer-social-links">
              {siteConfig.social.facebook && (
                <a href={siteConfig.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}
              {siteConfig.social.instagram && (
                <a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
              {siteConfig.social.linkedin && (
                <a href={siteConfig.social.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
              )}
            </div>
          </div> */}
        </div>

        <div className="footer-bottom-right">
            <div className="footer-copyright">
              <p>{copyrightText}</p>
            </div>
          </div>
      </div>
    </footer>
  );
}
