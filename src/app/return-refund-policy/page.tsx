"use client";

import React from "react";

export default function ReturnRefundPolicyPage() {
    return (
        <div id="mvp-article-cont" className="left relative refund-custom-page" style={{ width: "100%", background: "#fff", overflow: "hidden", minHeight: "100vh" }}>

            <div className="kt-row-column-wrap" style={{ maxWidth: "800px", margin: "0 auto", padding: "80px 20px" }}>

                <header style={{ marginBottom: "60px", textAlign: "center" }}>
                    <h2 style={{ fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 900, color: "#000", textTransform: "uppercase", fontFamily: "Inter, sans-serif", marginBottom: "12px", letterSpacing: "1px", lineHeight: "1.25" }}>
                        Cancellation, Refund &amp; Returns Policy
                    </h2>
                    <p style={{ fontSize: "14px", color: "#666", marginBottom: "4px" }}>Last updated: May 3, 2025 &nbsp;|&nbsp; Effective: May 3, 2025</p>
                    <div style={{ width: "60px", height: "4px", background: "#ee1761", margin: "16px auto 0" }}></div>
                </header>

                <article style={{ fontSize: "16px", lineHeight: "1.8", color: "#333", fontFamily: "'NB International', sans-serif" }}>

                    {/* 1. Overview */}
                    <h2 style={sectionTitleStyle}>1. Overview</h2>
                    <p style={{ marginBottom: "25px" }}>
                        This Cancellation, Refund and Returns Policy ("Policy") governs all purchases made through StartupNews.fyi, including event tickets, merchandise, and early-access / crowdfunded product purchases facilitated on behalf of third-party brand partners ("D2C Partner Products").
                    </p>
                    <p style={{ marginBottom: "25px" }}>
                        By completing a purchase you confirm that you have read, understood, and agreed to this Policy. This Policy is designed to comply with applicable consumer-protection laws across our primary markets: India, the United States, the United Kingdom, Germany (and the European Union), and the United Arab Emirates.
                    </p>
                    <p style={{ marginBottom: "40px" }}>
                        <strong>Operated by:</strong> DOTFYI Media Ventures Private Limited, 1553-A-8 Gali No.2, West Rohtash Nagar, Shahdara, East Delhi, India 110032.<br />
                        <strong>Contact:</strong> <a href="mailto:office@startupnews.fyi" style={{ color: "#ee1761" }}>office@startupnews.fyi</a>
                    </p>

                    {/* 2. Definitions */}
                    <h2 style={sectionTitleStyle}>2. Definitions</h2>
                    <ul style={listStyle}>
                        <li><strong>Company / We / Us / Our</strong> — DOTFYI Media Ventures Private Limited, trading as StartupNews.fyi.</li>
                        <li><strong>Buyer / You</strong> — any individual or entity completing a purchase via the Website.</li>
                        <li><strong>Event Ticket</strong> — a digital or physical access pass to any StartupNews.fyi-organised event (e.g., The Seed Summit, Pitch Day, City Meetups).</li>
                        <li><strong>Merchandise</strong> — branded or co-branded physical goods sold via the Website.</li>
                        <li><strong>D2C Partner Product</strong> — an early-access or sample product from a third-party consumer brand sold or distributed through the Website, akin to a crowdfunding pre-order.</li>
                        <li><strong>Order</strong> — a confirmed purchase transaction.</li>
                        <li><strong>Service / Website</strong> — StartupNews.fyi, accessible at <a href="https://www.startupnews.fyi" style={{ color: "#ee1761" }}>https://www.startupnews.fyi</a>.</li>
                        <li><strong>Payment Gateway</strong> — Razorpay, Stripe, PayPal, or any other processor used at checkout.</li>
                    </ul>

                    {/* 3. Event Tickets */}
                    <h2 style={sectionTitleStyle}>3. Event Tickets</h2>

                    <h3 style={subSectionTitleStyle}>3.1 Cancellation by You</h3>
                    <p style={{ marginBottom: "15px" }}>Because events involve advance venue, catering, and production commitments, our ticket refund window is time-bound:</p>
                    <ul style={listStyle}>
                        <li><strong>More than 30 days before the event date</strong> — 100% refund of the ticket price (excluding payment-gateway processing fees, which are non-refundable).</li>
                        <li><strong>15–30 days before the event date</strong> — 50% refund.</li>
                        <li><strong>Less than 15 days before the event date</strong> — No refund. You may transfer your ticket to another attendee at no charge (see Section 3.3).</li>
                    </ul>
                    <p style={{ marginBottom: "25px" }}>
                        To request a cancellation, email <a href="mailto:office@startupnews.fyi" style={{ color: "#ee1761" }}>office@startupnews.fyi</a> with subject line: <em>'TICKET CANCEL – [Order ID] – [Event Name]'</em>. Refunds are processed to the original payment method within 7–14 business days of approval.
                    </p>

                    <h3 style={subSectionTitleStyle}>3.2 Event Cancellation or Rescheduling by Us</h3>
                    <ul style={listStyle}>
                        <li><strong>Full cancellation by Us</strong> — 100% refund, including all fees, processed automatically within 10 business days.</li>
                        <li><strong>Rescheduling (new date within 90 days)</strong> — Your ticket remains valid for the new date. If the new date does not suit you, request a full refund within 7 days of the rescheduling announcement.</li>
                        <li><strong>Force-majeure</strong> (natural disaster, government order, pandemic restriction, etc.) — We will offer either a full credit note valid for 12 months or a refund minus proven third-party costs. We will always communicate transparently about our position.</li>
                    </ul>

                    <h3 style={subSectionTitleStyle}>3.3 Ticket Transfers</h3>
                    <p style={{ marginBottom: "25px" }}>
                        Tickets are personal but transferable. To transfer, email us the Order ID, current holder name, and the new holder's full name and email. We will update the registration at no charge up to 48 hours before the event.
                    </p>

                    <h3 style={subSectionTitleStyle}>3.4 No-Show</h3>
                    <p style={{ marginBottom: "25px" }}>Failure to attend the event does not entitle the Buyer to a refund.</p>

                    <h3 style={subSectionTitleStyle}>3.5 Duplicate Purchases</h3>
                    <p style={{ marginBottom: "40px" }}>
                        If you accidentally purchase the same ticket twice, notify us within 24 hours. We will refund the duplicate order in full.
                    </p>

                    {/* 4. Merchandise */}
                    <h2 style={sectionTitleStyle}>4. Merchandise</h2>

                    <h3 style={subSectionTitleStyle}>4.1 Return Window</h3>
                    <p style={{ marginBottom: "25px" }}>
                        You may return unused, unopened merchandise in its original packaging within 7 days of delivery (tracking timestamp). To initiate a return, email <a href="mailto:office@startupnews.fyi" style={{ color: "#ee1761" }}>office@startupnews.fyi</a> with subject <em>'RETURN – [Order ID]'</em> and include photos of the item and packaging.
                    </p>

                    <h3 style={subSectionTitleStyle}>4.2 Eligible Returns</h3>
                    <ul style={listStyle}>
                        <li>Item received is damaged, defective, or materially different from the product listing.</li>
                        <li>Wrong item shipped.</li>
                        <li>Item is unused and in original sealed packaging.</li>
                    </ul>

                    <h3 style={subSectionTitleStyle}>4.3 Non-Eligible Returns</h3>
                    <ul style={listStyle}>
                        <li>Items purchased on sale or under promotional discount (unless defective).</li>
                        <li>Personalised or custom-printed goods.</li>
                        <li>Items unsealed or showing signs of use.</li>
                        <li>Items returned after the 7-day window.</li>
                        <li>Perishables or hygiene-sensitive products once unsealed.</li>
                    </ul>

                    <h3 style={subSectionTitleStyle}>4.4 Return Shipping</h3>
                    <p style={{ marginBottom: "25px" }}>
                        You are responsible for return shipping costs unless the item is defective or incorrectly shipped. We strongly recommend using a tracked and insured courier. We cannot process a refund without confirmed receipt of the returned item.
                    </p>
                    <p style={{ marginBottom: "25px" }}>
                        <strong>Return address:</strong> 1553-A-8 Gali No.2, West Rohtash Nagar, Shahdara, East Delhi, India 110032.
                    </p>

                    <h3 style={subSectionTitleStyle}>4.5 Refund Processing</h3>
                    <p style={{ marginBottom: "40px" }}>
                        Once we receive and inspect the returned item, we will notify you within 2 business days and, if approved, process a refund to your original payment method within 7–14 business days.
                    </p>

                    {/* 5. D2C Partner Products */}
                    <h2 style={sectionTitleStyle}>5. D2C Partner Products (Early-Access / Crowdfunded Samples)</h2>
                    <p style={{ marginBottom: "25px" }}>
                        StartupNews.fyi occasionally features early-stage consumer products from partner brands (D2C Partner Products), similar to a Kickstarter-style pre-order or sample programme. Please read this section carefully before purchasing.
                    </p>

                    <h3 style={subSectionTitleStyle}>5.1 Pre-order / Early-Access Nature</h3>
                    <p style={{ marginBottom: "25px" }}>
                        D2C Partner Products are pre-production or limited-run samples. Delivery timelines are estimates and may change. By purchasing, you acknowledge the inherent uncertainties of early-access programmes.
                    </p>

                    <h3 style={subSectionTitleStyle}>5.2 Cancellation Before Dispatch</h3>
                    <p style={{ marginBottom: "25px" }}>
                        You may cancel a D2C Partner Product order any time before the brand dispatches it. Contact us at <a href="mailto:office@startupnews.fyi" style={{ color: "#ee1761" }}>office@startupnews.fyi</a> with your Order ID. We will liaise with the partner and issue a full refund within 14 business days.
                    </p>

                    <h3 style={subSectionTitleStyle}>5.3 Returns After Delivery</h3>
                    <p style={{ marginBottom: "25px" }}>
                        D2C Partner Products follow the same 7-day return window as Merchandise (Section 4.1–4.4). If a product is defective or not as described, we will coordinate with the partner brand for either a replacement or full refund.
                    </p>

                    <h3 style={subSectionTitleStyle}>5.4 Disclaimer of Partner Liability</h3>
                    <p style={{ marginBottom: "40px" }}>
                        StartupNews.fyi acts as a facilitating platform, not the manufacturer or direct seller of D2C Partner Products. While we vet partners, we cannot guarantee final product quality or delivery timelines. We will, however, always mediate disputes in good faith and escalate unresolved complaints to the relevant payment gateway dispute resolution process.
                    </p>

                    {/* 6. Payment Gateway */}
                    <h2 style={sectionTitleStyle}>6. Payment Gateway Policy Compliance</h2>
                    <p style={{ marginBottom: "15px" }}>
                        All transactions are processed through PCI-DSS-compliant payment gateways (including Razorpay for India-based payments and Stripe / PayPal for international transactions). The following terms reflect gateway requirements:
                    </p>
                    <ul style={listStyle}>
                        <li>Refunds are returned to the original payment instrument only. We cannot redirect refunds to a different card, bank account, or UPI ID.</li>
                        <li>Depending on your bank or card issuer, refund credit timelines may be 5–10 business days after we initiate the refund.</li>
                        <li>International transactions may be subject to currency conversion differences at the time of refund; we are not liable for exchange-rate fluctuations.</li>
                        <li><strong>Chargebacks:</strong> If you initiate a chargeback with your bank without contacting us first, we reserve the right to suspend your account pending investigation. We encourage you to always contact us first at <a href="mailto:office@startupnews.fyi" style={{ color: "#ee1761" }}>office@startupnews.fyi</a> — most issues are resolved faster this way.</li>
                        <li>We do not store card details. All sensitive payment data is handled exclusively by our gateway partners.</li>
                    </ul>

                    {/* 7. Jurisdiction */}
                    <h2 style={sectionTitleStyle}>7. Jurisdiction-Specific Consumer Rights</h2>
                    <p style={{ marginBottom: "25px" }}>
                        Statutory consumer rights in your jurisdiction may grant you additional protections that supersede this Policy. We respect and comply with all applicable laws:
                    </p>

                    <h3 style={subSectionTitleStyle}>India (Consumer Protection Act, 2019)</h3>
                    <p style={{ marginBottom: "25px" }}>
                        Indian consumers may additionally file complaints with the National Consumer Disputes Redressal Commission (NCDRC) or the State Commission if disputes are not resolved to your satisfaction. Our registered address for legal correspondence is listed in Section 2.
                    </p>

                    <h3 style={subSectionTitleStyle}>United Kingdom (Consumer Contracts Regulations 2013)</h3>
                    <p style={{ marginBottom: "25px" }}>
                        UK buyers purchasing digital or physical goods remotely have a statutory 14-day cancellation right from date of receipt, regardless of our policy timescales above. This does not apply to event tickets or personalised goods. To exercise your statutory right, notify us in writing within 14 days.
                    </p>

                    <h3 style={subSectionTitleStyle}>European Union / Germany (EU Consumer Rights Directive 2011/83/EU &amp; BGB §§ 355–356)</h3>
                    <p style={{ marginBottom: "25px" }}>
                        EU/German consumers have a 14-day statutory withdrawal right for distance sales of goods (not applicable to event tickets, which are excluded under Article 16(l) of the EU Consumer Rights Directive, or to personalised goods). We will provide a model withdrawal form upon request. Refunds for valid withdrawals are issued within 14 calendar days of receiving your withdrawal notice, and we may withhold the refund until we receive goods back.
                    </p>

                    <h3 style={subSectionTitleStyle}>United States</h3>
                    <p style={{ marginBottom: "25px" }}>
                        No federal statute mandates specific refund windows for event tickets or merchandise; however, our policy above is designed to be fair and commercially reasonable. If a product is materially misrepresented, you may also seek a chargeback through your credit card issuer under Regulation Z and Regulation E protections.
                    </p>

                    <h3 style={subSectionTitleStyle}>United Arab Emirates (UAE Consumer Protection Law, Federal Law No. 15 of 2020)</h3>
                    <p style={{ marginBottom: "40px" }}>
                        UAE consumers have the right to return defective goods within 15 days of purchase. We honour this right and will arrange a return or exchange. For event cancellations, UAE consumers are entitled to a full refund if we cancel the event.
                    </p>

                    {/* 8. Gifts */}
                    <h2 style={sectionTitleStyle}>8. Gifts</h2>
                    <p style={{ marginBottom: "40px" }}>
                        If an item was purchased as a gift and shipped directly to the recipient, the recipient may initiate a return under this Policy. Any refund will be issued as a gift credit / voucher (not cash) to the original purchaser, or as a direct refund to the original payment method if the purchaser prefers and contacts us.
                    </p>

                    {/* 9. Non-Refundable */}
                    <h2 style={sectionTitleStyle}>9. Non-Refundable Items (Summary)</h2>
                    <ul style={listStyle}>
                        <li>Event tickets purchased fewer than 15 days before the event date.</li>
                        <li>Tickets for events the buyer did not attend (no-show).</li>
                        <li>Sale or promotional-price merchandise.</li>
                        <li>Personalised / custom goods.</li>
                        <li>Unsealed hygiene-sensitive or perishable goods.</li>
                        <li>Payment-gateway processing fees (non-refundable by our gateway partners).</li>
                    </ul>

                    {/* 10. Contact */}
                    <h2 style={sectionTitleStyle}>10. How to Contact Us</h2>
                    <p style={{ marginBottom: "15px" }}>For all cancellation, refund, or return queries:</p>
                    <ul style={listStyle}>
                        <li><strong>Email:</strong> <a href="mailto:office@startupnews.fyi" style={{ color: "#ee1761" }}>office@startupnews.fyi</a> (fastest — include Order ID in subject)</li>
                        <li><strong>Website:</strong> <a href="https://www.startupnews.fyi" style={{ color: "#ee1761" }}>https://www.startupnews.fyi</a></li>
                        <li><strong>Registered Address:</strong> DOTFYI Media Ventures Private Limited, 1553-A-8 Gali No.2, West Rohtash Nagar, Shahdara, East Delhi, India 110032.</li>
                    </ul>
                    <p style={{ marginBottom: "25px" }}>We aim to respond to all queries within 2 business days (Monday–Friday, IST).</p>
                    <p style={{ marginBottom: "40px", fontStyle: "italic", color: "#666" }}>
                        This Policy is subject to change. The version published at <a href="https://www.startupnews.fyi/return-refund-policy" style={{ color: "#ee1761" }}>https://www.startupnews.fyi/return-refund-policy</a> on the date of your purchase governs your transaction.
                    </p>

                </article>
            </div>

        </div>
    );
}

const sectionTitleStyle: React.CSSProperties = {
    fontSize: "24px",
    fontWeight: 800,
    color: "#000",
    marginTop: "50px",
    marginBottom: "20px",
    fontFamily: "Inter, sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
};

const subSectionTitleStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: 700,
    color: "#000",
    marginTop: "30px",
    marginBottom: "12px",
    fontFamily: "Inter, sans-serif"
};

const listStyle: React.CSSProperties = {
    paddingLeft: "20px",
    marginBottom: "40px",
    listStyleType: "disc"
};
