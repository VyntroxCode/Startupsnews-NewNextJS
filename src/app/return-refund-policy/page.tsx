"use client";

import React from "react";

/**
 * ReturnRefundPolicyPage - Implemented with content provided in Step 2110.
 */
export default function ReturnRefundPolicyPage() {
    return (
        <div id="mvp-article-cont" className="left relative refund-custom-page" style={{ width: "100%", background: "#fff", overflow: "hidden", minHeight: "100vh" }}>

            {/* STICKY SOCIAL SIDEBAR (CONSISTENCY) */}
            <div className="sn-social-vertical" style={{
                position: "fixed",
                left: "40px",
                top: "150px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                zIndex: 100
            }}>
                <div style={{ width: "32px", height: "32px", background: "#3b5998", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px" }}><i className="fa-brands fa-facebook-f"></i></div>
                <div style={{ width: "32px", height: "32px", background: "#000", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px" }}><i className="fa-brands fa-x-twitter"></i></div>
                <div style={{ width: "32px", height: "32px", background: "#bd081c", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px" }}><i className="fa-brands fa-pinterest-p"></i></div>
                <div style={{ width: "32px", height: "32px", background: "#ccc", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px" }}><i className="fa-solid fa-envelope"></i></div>
            </div>

            <div className="kt-row-column-wrap" style={{ maxWidth: "800px", margin: "0 auto", padding: "80px 20px" }}>

                <header style={{ marginBottom: "60px", textAlign: "center" }}>
                    <h1 style={{
                        fontSize: "42px",
                        fontWeight: 900,
                        color: "#000",
                        textTransform: "uppercase",
                        fontFamily: "Inter, sans-serif",
                        marginBottom: "10px",
                        letterSpacing: "1px"
                    }}>
                        Cancellation / Refund Policy
                    </h1>
                    <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>Last updated: January 16, 2023</p>
                    <div style={{ width: "60px", height: "4px", background: "#ee1761", margin: "0 auto" }}></div>
                </header>

                <article style={{
                    fontSize: "16px",
                    lineHeight: "1.8",
                    color: "#333",
                    fontFamily: "'NB International', sans-serif"
                }}>
                    <p style={{ marginBottom: "25px" }}>
                        Thank you for shopping at StartupNews.fyi.
                    </p>
                    <p style={{ marginBottom: "25px" }}>
                        If for any reason, You are not completely satisfied with a purchase We invite You to review our policy on refunds and returns. The following terms are applicable for any products that You purchased with Us.
                    </p>

                    <h2 style={sectionTitleStyle}>Interpretation and Definitions</h2>
                    <h3 style={subSectionTitleStyle}>Interpretation</h3>
                    <p style={{ marginBottom: "25px" }}>
                        The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in the singular or the plural.
                    </p>

                    <h3 style={subSectionTitleStyle}>Definitions</h3>
                    <p style={{ marginBottom: "15px" }}>For the purposes of this Return and Refund Policy:</p>
                    <ul style={listStyle}>
                        <li><strong>Company</strong> (referred to as either “the Company”, “We”, “Us” or “Our” in this Agreement) refers to DOTFYI Media Ventures Private Limited, 1553-A-8 Gali No.2, West Rohtash Nagar, Shahdara, East Delhi, India 110032.</li>
                        <li><strong>Goods</strong> refer to the items offered for sale on the Service.</li>
                        <li><strong>Orders</strong> mean a request by You to purchase Goods from Us.</li>
                        <li><strong>Service</strong> refers to the Website.</li>
                        <li><strong>Website</strong> refers to StartupNews.fyi, accessible from <a href="https://www.StartupNews.fyi" style={{ color: "#ee1761" }}>https://www.StartupNews.fyi</a></li>
                        <li><strong>You</strong> mean the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
                    </ul>

                    <h2 style={sectionTitleStyle}>Your order Cancellation Rights</h2>
                    <p style={{ marginBottom: "25px" }}>
                        You are entitled to cancel Your Order within 7 days without giving any reason for doing so.
                    </p>
                    <p style={{ marginBottom: "25px" }}>
                        The deadline for cancelling an Order is 7 days from the date on which You received the Goods or on which a third party you have appointed, who is not the carrier, takes possession of the product delivered.
                    </p>
                    <p style={{ marginBottom: "15px" }}>
                        To exercise Your right of cancellation, You must inform Us of your decision by means of a clear statement. You can inform us of your decision by:
                    </p>
                    <ul style={listStyle}>
                        <li>By email: <a href="mailto:office@startupnews.fyi" style={{ color: "#ee1761" }}>office@startupnews.fyi</a></li>
                    </ul>
                    <p style={{ marginBottom: "40px" }}>
                        We will reimburse You no later than 14 days from the day on which We receive the returned Goods. We will use the same means of payment as You used for the Order, and You will not incur any fees for such reimbursement.
                    </p>

                    <h2 style={sectionTitleStyle}>Conditions for Returns</h2>
                    <p style={{ marginBottom: "15px" }}>In order for the Goods to be eligible for a return, please make sure that:</p>
                    <ul style={listStyle}>
                        <li>The Goods were purchased in the last 7 days</li>
                        <li>The Goods are in the original packaging</li>
                    </ul>
                    <p style={{ marginBottom: "15px" }}>The following Goods cannot be returned:</p>
                    <ul style={listStyle}>
                        <li>The supply of Goods made to Your specifications or clearly personalized.</li>
                        <li>The supply of Goods which according to their nature are not suitable to be returned, deteriorates rapidly or where the date of expiry is over.</li>
                        <li>The supply of Goods which are not suitable for return due to health protection or hygiene reasons and were unsealed after delivery.</li>
                        <li>The supply of Goods which are, after delivery, according to their nature, inseparably mixed with other items.</li>
                    </ul>
                    <p style={{ marginBottom: "25px" }}>
                        We reserve the right to refuse returns of any merchandise that does not meet the above return conditions at our sole discretion.
                    </p>
                    <p style={{ marginBottom: "40px" }}>
                        Only regular-priced Goods may be refunded. Unfortunately, Goods on sale cannot be refunded. This exclusion may not apply to You if it is not permitted by applicable law.
                    </p>

                    <h2 style={sectionTitleStyle}>Returning goods</h2>
                    <p style={{ marginBottom: "25px" }}>
                        You are responsible for the cost and risk of returning the Goods to Us. You should send the Goods to the following address:
                    </p>
                    <p style={{ marginBottom: "25px", fontWeight: "bold" }}>
                        1553-A-8 Gali No.2, West Rohtash Nagar, Shahdara, East Delhi, India 110032
                    </p>
                    <p style={{ marginBottom: "40px" }}>
                        We cannot be held responsible for Goods damaged or lost in return shipment. Therefore, We recommend an insured and trackable mail service. We are unable to issue a refund without actual receipt of the Goods or proof of received return delivery.
                    </p>

                    <h2 style={sectionTitleStyle}>Gifts</h2>
                    <p style={{ marginBottom: "25px" }}>
                        If the Goods were marked as a gift when purchased and then shipped directly to you, You’ll receive a gift credit for the value of your return. Once the returned product is received, a gift certificate will be mailed to You.
                    </p>
                    <p style={{ marginBottom: "40px" }}>
                        If the Goods weren’t marked as a gift when purchased, or the gift giver had the order shipped to themselves to give it to You later, We will send the refund to the gift giver.
                    </p>

                    <h2 style={sectionTitleStyle}>Contact Us</h2>
                    <p style={{ marginBottom: "15px" }}>
                        If you have any questions about our Returns and Refunds Policy, please contact us:
                    </p>
                    <ul style={listStyle}>
                        <li>By email: <a href="mailto:office@startupnews.fyi" style={{ color: "#ee1761" }}>office@startupnews.fyi</a></li>
                    </ul>

                </article>

            </div>

            <style jsx>{`
                @media (max-width: 1024px) {
                    .sn-social-vertical {
                        display: none !important;
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
    marginTop: "50px",
    marginBottom: "20px",
    fontFamily: "Inter, sans-serif",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
};

const subSectionTitleStyle: React.CSSProperties = {
    fontSize: "20px",
    fontWeight: 700,
    color: "#000",
    marginTop: "30px",
    marginBottom: "15px",
    fontFamily: "Inter, sans-serif"
};

const listStyle: React.CSSProperties = {
    paddingLeft: "20px",
    marginBottom: "40px",
    listStyleType: "disc"
};
