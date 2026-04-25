"use client";

import React from "react";

export default function ContactUsPage() {
  return (
    <div
      id="mvp-article-cont"
      className="left relative contact-us-custom-page">
      <div className="kt-row-column-wrap">
        <header className="contact-us-header">
          <h1 className="contact-us-title">
            Contact Us
          </h1>
        </header>

        <section className="contact-us-section">
          <div className="contact-us-sections">
            <div className="contact-us-section-item">
              <h2 className="contact-us-section-item-title">Quick Support</h2>
              <p className="contact-us-section-item-body">
                Please chat with our team using the chat widget at the bottom right hand corner of this page, which typically offers the fastest support.
              </p>
              <p className="contact-us-section-item-body">
                Or you can also share your concern at{" "}
                <a href="mailto:office@startupnews.fyi">
                  office@startupnews.fyi
                </a>
              </p>
            </div>

            <div className="contact-us-section-item">
              <h2 className="contact-us-section-item-title">Press</h2>
              <p className="contact-us-section-item-body">
                For all press inquiries or press releases, please email at{" "}
                <a href="mailto:publishing@startupnews.fyi">
                  publishing@startupnews.fyi
                </a>
              </p>
            </div>

            <div className="contact-us-section-item">
              <h2 className="contact-us-section-item-title">Careers</h2>
              <p className="contact-us-section-item-body">
                For information regarding careers with us, please email at{" "}
                <a className="contact-us-section-item-link" href="mailto:office@startupnews.fyi">
                  office@startupnews.fyi
                </a>
              </p>
            </div>

            <div className="contact-us-section-item">
              <h2 className="contact-us-section-item-title">Website Support</h2>
              <p className="contact-us-section-item-body">
                To report a technical issue with <a className="contact-us-section-item-link" href="https://startupnews.fyi">StartupNews.fyi</a>, please email{" "}
                <a href="mailto:tech@startupnews.fyi">
                  tech@startupnews.fyi
                </a>{" "}
                with a summary of the issue along with a screenshot, the url, your browser version, browser extensions enabled, operating system, and the make &amp; model of your device.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
