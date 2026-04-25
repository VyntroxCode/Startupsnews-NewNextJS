"use client";

import React from "react";

/**
 * PrivacyPolicyPage - Implemented with content provided in Step 2069.
 */
export default function PrivacyPolicyPage() {
    return (
        <div id="mvp-article-cont" className="left relative privacy-custom-page" style={{ width: "100%", background: "#fff", overflow: "hidden", minHeight: "100vh" }}>

            {/* STICKY SOCIAL SIDEBAR (CONSISTENCY WITH ABOUT PAGE) */}
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
                        Privacy Policy
                    </h1>
                    <div style={{ width: "60px", height: "4px", background: "#ee1761", margin: "0 auto" }}></div>
                </header>

                <article style={{
                    fontSize: "16px",
                    lineHeight: "1.8",
                    color: "#333",
                    fontFamily: "'NB International', sans-serif"
                }}>
                    <p style={{ marginBottom: "25px" }}>
                        At StartupNews.fyi, accessible from www.StartupNews.fyi, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by StartupNews.fyi and how we use it.
                    </p>
                    <p style={{ marginBottom: "25px" }}>
                        If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us.
                    </p>
                    <p style={{ marginBottom: "40px" }}>
                        This Privacy Policy applies only to our online activities and is valid for visitors to our website with regards to the information that they shared and/or collect in StartupNews.fyi. This policy does not apply to any information collected offline or via channels other than this website.
                    </p>

                    <h2 style={sectionTitleStyle}>Consent</h2>
                    <p style={{ marginBottom: "40px" }}>
                        By using our website, you hereby consent to our Privacy Policy and agree to its terms.
                    </p>

                    <h2 style={sectionTitleStyle}>Information we collect</h2>
                    <p style={{ marginBottom: "25px" }}>
                        The personal information that you are asked to provide, and the reasons why you are asked to provide it, will be made clear to you at the point we ask you to provide your personal information.
                    </p>
                    <p style={{ marginBottom: "25px" }}>
                        If you contact us directly, we may receive additional information about you such as your name, email address, phone number, the contents of the message and/or attachments you may send us, and any other information you may choose to provide. When you register for an Account, we may ask for your contact information, including items such as name, company name, address, email address, and telephone number.
                    </p>

                    <h2 style={sectionTitleStyle}>How do we use your information?</h2>
                    <p style={{ marginBottom: "15px" }}>We use the information we collect in various ways, including:</p>
                    <ul style={listStyle}>
                        <li>Provide, operate, and maintain our website</li>
                        <li>Improve, personalize, and expand our website</li>
                        <li>Understand and analyze how you use our website</li>
                        <li>Develop new products, services, features, and functionality</li>
                        <li>Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes</li>
                        <li>Send you emails</li>
                        <li>Find and prevent fraud</li>
                    </ul>

                    <h2 style={sectionTitleStyle}>Log Files</h2>
                    <p style={{ marginBottom: "40px" }}>
                        StartupNews.fyi follows a standard procedure of using log files. These files log visitors when they visit websites. All hosting companies do this and are a part of hosting services’ analytics. The information collected by log files includes internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is personally identifiable. The purpose of the information is for analyzing trends, administering the site, tracking users’ movement on the website, and gathering demographic information.
                    </p>

                    <h2 style={sectionTitleStyle}>Our Advertising Partners</h2>
                    <p style={{ marginBottom: "25px" }}>
                        Some of the advertisers on our site may use cookies and web beacons. Our advertising partners are listed below. Each of our advertising partners has its own Privacy Policy for their policies on user data. For easier access, we hyperlinked to their Privacy Policies below.
                    </p>
                    <ul style={listStyle}>
                        <li>
                            <strong>Google</strong><br />
                            <a href="https://policies.google.com/technologies/ads" style={{ color: "#ee1761", textDecoration: "underline" }}>https://policies.google.com/technologies/ads</a>
                        </li>
                    </ul>

                    <h2 style={sectionTitleStyle}>Advertising Partners Privacy Policies</h2>
                    <p style={{ marginBottom: "25px" }}>
                        You may consult this list to find the Privacy Policy for each of the advertising partners of StartupNews.fyi.
                    </p>
                    <p style={{ marginBottom: "25px" }}>
                        Third-party ad servers or ad networks uses technologies like cookies, JavaScript, or Web Beacons that are used in their respective advertisements and links that appear on StartupNews.fyi, which are sent directly to users’ browser. They automatically receive your IP address when this occurs. These technologies are used to measure the effectiveness of their advertising campaigns and/or to personalize the advertising content that you see on websites that you visit.
                    </p>
                    <p style={{ marginBottom: "40px" }}>
                        Note that StartupNews.fyi has no access to or control over these cookies that are used by third-party advertisers.
                    </p>

                    <h2 style={sectionTitleStyle}>Third-Party Privacy Policies</h2>
                    <p style={{ marginBottom: "25px" }}>
                        StartupNews.fyi’s Privacy Policy does not apply to other advertisers or websites. Thus, we are advising you to consult the respective Privacy Policies of these third-party ad servers for more detailed information. It may include their practices and instructions about how to opt-out of certain options.
                    </p>
                    <p style={{ marginBottom: "40px" }}>
                        You can choose to disable cookies through your individual browser options. To know more detailed information about cookie management with specific web browsers, it can be found at the browsers’ respective websites.
                    </p>

                    <h2 style={sectionTitleStyle}>CCPA Privacy Rights (Do Not Sell My Personal Information)</h2>
                    <p style={{ marginBottom: "15px" }}>Under the CCPA, among other rights, California consumers have the right to:</p>
                    <ul style={listStyle}>
                        <li>Request that a business that collects a consumer’s personal data disclose the categories and specific pieces of personal data that a business has collected about consumers.</li>
                        <li>Request that a business deletes any personal data about the consumer that a business has collected.</li>
                        <li>Request that a business that sells a consumer’s personal data, not sell the consumer’s personal data.</li>
                    </ul>
                    <p style={{ marginBottom: "40px" }}>
                        If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.
                    </p>

                    <h2 style={sectionTitleStyle}>GDPR Data Protection Rights</h2>
                    <p style={{ marginBottom: "15px" }}>We would like to make sure you are fully aware of all of your data protection rights. Every user is entitled to the following:</p>
                    <ul style={listStyle}>
                        <li><strong>The right to access</strong> – You have the right to request copies of your personal data. We may charge you a small fee for this service.</li>
                        <li><strong>The right to rectification</strong> – You have the right to request that we correct any information you believe is inaccurate. You also have the right to request that we complete the information you believe is incomplete.</li>
                        <li><strong>The right to erasure</strong> – You have the right to request that we erase your personal data, under certain conditions.</li>
                        <li><strong>The right to restrict processing</strong> – You have the right to request that we restrict the processing of your personal data, under certain conditions.</li>
                        <li><strong>The right to object to processing</strong> – You have the right to object to our processing of your personal data, under certain conditions.</li>
                        <li><strong>The right to data portability</strong> – You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.</li>
                    </ul>
                    <p style={{ marginBottom: "40px" }}>
                        If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us.
                    </p>

                    <h2 style={sectionTitleStyle}>Children’s Information</h2>
                    <p style={{ marginBottom: "25px" }}>
                        Another part of our priority is adding protection for children while using the internet. We encourage parents and guardians to observe, participate in, and/or monitor and guide their online activity.
                    </p>
                    <p style={{ marginBottom: "25px" }}>
                        StartupNews.fyi does not knowingly collect any Personal Identifiable Information from children under the age of 13. If you think that your child provided this kind of information on our website, we strongly encourage you to contact us immediately and we will do our best efforts to promptly remove such information from our records.
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
