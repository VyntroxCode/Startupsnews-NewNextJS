"use client";

import React from "react";

/**
 * TermsPage - Implemented with content provided in Step 2089.
 */
export default function TermsPage() {
    return (
        <div id="mvp-article-cont" className="left relative terms-custom-page" style={{ width: "100%", background: "#fff", overflow: "hidden", minHeight: "100vh" }}>

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
                        marginBottom: "20px",
                        letterSpacing: "1px"
                    }}>
                        Terms and Conditions
                    </h1>
                    <div style={{ width: "60px", height: "4px", background: "#ee1761", margin: "0 auto" }}></div>
                </header>

                <article style={{
                    fontSize: "16px",
                    lineHeight: "1.8",
                    color: "#333",
                    fontFamily: "'NB International', sans-serif"
                }}>
                    <p style={{ marginBottom: "25px", fontWeight: 700 }}>Welcome to StartupNews.fyi!</p>
                    <p style={{ marginBottom: "25px" }}>
                        These terms and conditions outline the rules and regulations for the use of DOTFYI Media Ventures Private Limited’s Website, located at StartupNews.fyi.
                    </p>
                    <p style={{ marginBottom: "25px" }}>
                        By accessing this website we assume you accept these terms and conditions. Do not continue to use StartupNews.fyi if you do not agree to take all of the terms and conditions stated on this page.
                    </p>
                    <p style={{ marginBottom: "40px" }}>
                        The following terminology applies to these Terms and Conditions, Privacy Statement and Disclaimer Notice and all Agreements: “Client”, “You” and “Your” refers to you, the person who logs on to this website and is compliant with the Company’s terms and conditions. “The Company”, “Ourselves”, “We”, “Our” and “Us”, refers to our Company. “Party”, “Parties”, or “Us”, refers to both the Client and ourselves. All terms refer to the offer, acceptance and consideration of payment necessary to undertake the process of our assistance to the Client in the most appropriate manner for the express purpose of meeting the Client’s needs in respect of the provision of the Company’s stated services, in accordance with and subject to, prevailing law of Netherlands. Any use of the above terminology or other words in the singular, plural, capitalization and/or he/she or they, are taken as interchangeable and therefore as referring to the same.
                    </p>

                    <h2 style={sectionTitleStyle}>Cookies</h2>
                    <p style={{ marginBottom: "25px" }}>
                        We employ the use of cookies. By accessing StartupNews.fyi, you agreed to use cookies in agreement with DOTFYI Media Ventures Private Limited’s Privacy Policy.
                    </p>
                    <p style={{ marginBottom: "40px" }}>
                        Most interactive websites use cookies to let us retrieve the user’s details for each visit. Cookies are used by our website to enable the functionality of certain areas to make it easier for people visiting our website. Some of our affiliate/advertising partners may also use cookies.
                    </p>

                    <h2 style={sectionTitleStyle}>License</h2>
                    <p style={{ marginBottom: "25px" }}>
                        Unless otherwise stated, DOTFYI Media Ventures Private Limited and/or its licensors own the intellectual property rights for all material on StartupNews.fyi. All intellectual property rights are reserved. You may access this from StartupNews.fyi for your personal use subject to restrictions set in these terms and conditions.
                    </p>
                    <p style={{ marginBottom: "15px" }}>You must not:</p>
                    <ul style={listStyle}>
                        <li>Republish material from StartupNews.fyi</li>
                        <li>Sell, rent or sub-license material from StartupNews.fyi</li>
                        <li>Reproduce, duplicate or copy material from StartupNews.fyi</li>
                        <li>Redistribute content from StartupNews.fyi</li>
                    </ul>
                    <p style={{ marginBottom: "25px" }}>
                        This Agreement shall begin on the date hereof.
                    </p>
                    <p style={{ marginBottom: "25px" }}>
                        Parts of this website offer an opportunity for users to post and exchange opinions and information in certain areas of the website. DOTFYI Media Ventures Private Limited does not filter, edit, publish or review Comments before their presence on the website. Comments do not reflect the views and opinions of DOTFYI Media Ventures Private Limited, its agents and/or affiliates. Comments reflect the views and opinions of the person who posts their views and opinions. To the extent permitted by applicable laws, DOTFYI Media Ventures Private Limited shall not be liable for the Comments or any liability, damages or expenses caused and/or suffered as a result of any use of and/or posting of and/or appearance of the Comments on this website.
                    </p>
                    <p style={{ marginBottom: "40px" }}>
                        DOTFYI Media Ventures Private Limited reserves the right to monitor all Comments and to remove any Comments which can be considered inappropriate, offensive or causes a breach of these Terms and Conditions.
                    </p>

                    <h2 style={sectionTitleStyle}>Hyperlinking to our content</h2>
                    <p style={{ marginBottom: "15px" }}>The following organizations may link to our Website without prior written approval:</p>
                    <ul style={listStyle}>
                        <li>Government agencies;</li>
                        <li>Search engines;</li>
                        <li>News organizations;</li>
                        <li>Online directory distributors may link to our Website in the same manner as they hyperlink to the Websites of other listed businesses; and</li>
                        <li>System-wide Accredited Businesses except soliciting non-profit organizations, charity shopping malls, and charity fundraising groups which may not hyperlink to our Web site.</li>
                    </ul>

                    <h2 style={sectionTitleStyle}>iFrames</h2>
                    <p style={{ marginBottom: "40px" }}>
                        Without prior approval and written permission, you may not create frames around our Webpages that alter in any way the visual presentation or appearance of our Website.
                    </p>

                    <h2 style={sectionTitleStyle}>Content Liability</h2>
                    <p style={{ marginBottom: "40px" }}>
                        We shall not be held responsible for any content that appears on your Website. You agree to protect and defend us against all claims that are rising on your Website. No link(s) should appear on any Website that may be interpreted as libellous, obscene or criminal, or which infringes, otherwise violates, or advocates the infringement or other violation of, any third-party rights.
                    </p>

                    <h2 style={sectionTitleStyle}>Reservation of rights</h2>
                    <p style={{ marginBottom: "40px" }}>
                        We reserve the right to request that you remove all links or any particular link to our Website. You approve to immediately remove all links to our Website upon request. We also reserve the right to amen these terms and conditions and it’s linking policy at any time. By continuously linking to our Website, you agree to be bound to and follow these linking terms and conditions.
                    </p>

                    <h2 style={sectionTitleStyle}>Disclaimer</h2>
                    <p style={{ marginBottom: "25px" }}>
                        To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website. Nothing in this disclaimer will:
                    </p>
                    <ul style={listStyle}>
                        <li>limit or exclude our or your liability for death or personal injury;</li>
                        <li>limit or exclude our or your liability for fraud or fraudulent misrepresentation;</li>
                        <li>limit any of our or your liabilities in any way that is not permitted under applicable law; or</li>
                        <li>exclude any of our or your liabilities that may not be excluded under applicable law.</li>
                    </ul>
                    <p style={{ marginBottom: "25px" }}>
                        The limitations and prohibitions of liability set in this Section and elsewhere in this disclaimer: (a) are subject to the preceding paragraph; and (b) govern all liabilities arising under the disclaimer, including liabilities arising in contract, in tort and for breach of statutory duty.
                    </p>
                    <p style={{ marginBottom: "40px" }}>
                        As long as the website and the information and services on the website are provided free of charge, we will not be liable for any loss or damage of any nature.
                    </p>

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

const listStyle: React.CSSProperties = {
    paddingLeft: "20px",
    marginBottom: "40px",
    listStyleType: "disc"
};
