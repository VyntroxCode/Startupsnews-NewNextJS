"use client";

import React from "react";

export default function EditorialPolicy() {
  return (
     <div id="mvp-article-cont" className="left relative privacy-custom-page" style={{ width: "100%", background: "#fff", overflow: "hidden", minHeight: "100vh" }}>

            <div className="kt-row-column-wrap" style={{ maxWidth: "800px", margin: "0 auto", padding: "80px 20px" }}>

                <header style={{ marginBottom: "60px", textAlign: "center" }}>
                    <h2 style={{
                        fontSize: "42px",
                        fontWeight: 900,
                        color: "#000",
                        textTransform: "uppercase",
                        fontFamily: "Inter, sans-serif",
                        marginBottom: "20px",
                        letterSpacing: "1px"
                    }}>
                        Editorial Policy
                    </h2>
                    <div style={{ width: "60px", height: "4px", background: "#ee1761", margin: "0 auto" }}></div>
                </header>

                <article style={{
                    fontSize: "16px",
                    lineHeight: "1.8",
                    color: "#333",
                    fontFamily: "'NB International', sans-serif"
                }}>
                    <p style={{ marginBottom: "25px" }}>
                        <strong>Effective:</strong> March 2026 | <strong>Applies to:</strong> All published content | <strong>Reviewed by:</strong> Editorial Board | <strong>Next review:</strong> February 2027 </p>

                    <h2 style={sectionTitleStyle}>Our Commitment to Readers & Publishers</h2>
                    <p style={{ marginBottom: "25px" }}>
                        StartupNews.fyi covers startups, tech, innovation, D2C, foodtech, and emerging business models with rigour, fairness, and transparency — serving readers across the USA, UK, Germany, UAE, and beyond.
                    </p>
                    <p style={{ marginBottom: "40px" }}>
                        <strong>Coverage Areas:</strong> Startups · Technology · Innovation · D2C · Foodtech · Venture Capital · Fintech · Sustainability · AI & Deep Tech · Creator Economy
                    </p>

                    <h2 style={sectionTitleStyle}>01. Our Mission & Editorial Independence</h2>
                    <p style={{ marginBottom: "25px" }}>
                        StartupNews.fyi exists to inform, analyse, and connect the global startup community — from founders raising their first round to institutional investors tracking macro trends. Our editorial mission is to deliver accurate, timely, and original reporting that serves our readers' professional and intellectual needs, not the interests of advertisers, investors, or PR firms.
                        </p>
                    <p style={{ marginBottom: "25px" }}>
                        Our editorial team operates independently. No advertiser, sponsor, commercial partner, or investor holds any influence over which stories we pursue, how we frame them, or what conclusions we draw. This separation is non-negotiable.
                    </p>
                    <p style={{ marginBottom: "40px" }}>
                        Every editorial decision — what to cover, who to quote, which angle to take — is made solely on the basis of news value, reader relevance, and journalistic merit.
                    </p>

                    <h2 style={sectionTitleStyle}>02. EEAT Standards — Experience, Expertise, Authoritativeness & Trustworthiness</h2>
                    <p style={{ marginBottom: "15px" }}>We align our content quality with Google's EEAT framework because we believe it reflects genuine reader value, not merely SEO compliance.
                    </p>
                    <p style={{ marginBottom: "15px" }}><strong>Experience</strong> Writers bring direct industry experience — founders, operators, investors, and journalists who have lived in the ecosystems they cover.
                    </p>
                    <p style={{ marginBottom: "15px" }}><strong>Expertise</strong> Subject-matter experts review coverage in specialised verticals including fintech, foodtech, deep tech, and regulatory affairs.
                    </p>
                    <p style={{ marginBottom: "15px" }}><strong>Authoritativeness</strong> We cite primary sources — founders, company filings, official data — and are transparent about the limitations of secondary reporting.
                    </p>
                    <p style={{ marginBottom: "15px" }}><strong>Trustworthiness</strong> Author bios, editor credits, conflict disclosures, and clear correction policies are published on every article page.
                    </p>
                    <p style={{ marginBottom: "15px" }}>All contributors must complete a contributor profile that discloses their background, professional affiliations, and any relevant financial interests. This information is published alongside their bylines.
                    </p>

                    <h2 style={sectionTitleStyle}>03. Sourcing, Verification & Accuracy</h2>
                    <p style={{ marginBottom: "40px" }}>
                        Accuracy is our primary obligation to readers. We follow a multi-stage verification protocol for all published claims.
                    </p>
                    <ul style={listStyle}>
                        <li><strong>Primary sources first.</strong> We always seek direct comment from the subject of a story — companies, founders, investors — before publication. A minimum 24-hour response window is given for comment requests.</li>
                        <li><strong>Two-source minimum</strong> For any factual claim that could be disputed or that carries material consequence for its subject.</li>
                        <li><strong>Named sources preferred.</strong> Anonymous sources are used only when the information is significant, cannot be obtained any other way, and when the source's reasons for anonymity are credible and documented internally.</li>
                        <li><strong>Data attribution.</strong> All statistics, research findings, and financial figures are linked to their original source. We distinguish between proprietary research and publicly available data.</li>
                        <li><strong>No PR-laundering.</strong> Press releases and PR-generated content are never published verbatim. All press release material must be independently verified and contextualised before publication.</li>
                        <li><strong>Embargoes honoured.</strong> We respect agreed embargo terms and will not break an embargo for competitive reasons.</li>
                    </ul>

                    <h2 style={sectionTitleStyle}>04. Conflict of Interest & Advertising Policy</h2>
                    <p style={{ marginBottom: "25px" }}>
                        StartupNews.fyi is commercially supported through advertising, sponsored content, and events. We are rigorous about separating commercial activity from editorial output.
                    </p>
                    <ul style={listStyle}>
                        <li><strong>Sponsored content is clearly labelled.</strong> Any content produced in exchange for payment — including sponsored articles, partner features, and branded newsletters — is marked "Sponsored" or "Partner Content" prominently and cannot be altered by editorial staff to appear organic.</li>
                        <li><strong>Advertisers cannot buy coverage.</strong> Purchasing advertising space on StartupNews.fyi does not entitle any company to editorial coverage, positive framing, or review rights over stories that mention them.</li>
                        <li><strong>Staff financial disclosures.</strong> Editorial staff are required to disclose any personal financial interests in companies they cover. Staff with a material interest in a company must recuse themselves from covering that company.</li>
                        <li><strong>Gift and hospitality policy.</strong> Contributors may not accept gifts, free travel, or hospitality worth more than a nominal amount from companies they cover. Exceptions require prior editorial approval and disclosure in the published piece.</li>
                        <li><strong>Investor and founder relations.</strong> Our publication does not take equity stakes, advisory fees, or revenue-share arrangements with companies we cover.</li>
                    </ul>

                    <h2 style={sectionTitleStyle}>05. Corrections & Updates Policy</h2>
                    <p style={{ marginBottom: "25px" }}>
                       We correct errors promptly and transparently. We do not delete stories, alter published text without notice, or suppress corrections to protect relationships.
                    </p>
                    <p style={{ marginBottom: "25px" }}>
                        <strong>Correction protocol:</strong> Factual errors are corrected within 24 hours of identification. A correction note is appended to the original article stating what was wrong and what the correct information is. Material errors that affect the substance of a story may result in an Editor's Note placed at the top of the article. Significant corrections are communicated to our newsletter subscribers.
                    </p>
                    <ul style={listStyle}>
                        <li><strong>Updates vs corrections.</strong> New information that adds to — but does not contradict — an original story is marked "Updated" with a timestamp. This is distinguished from corrections, which acknowledge error.</li>
                        <li><strong>No stealth edits.</strong> We never alter published content without disclosure. Any substantive post-publication change is timestamped and noted at the foot of the article.</li>
                        <li><strong>Right of reply.</strong> Individuals or companies who believe they have been misrepresented may submit a right-of-reply request. We will consider publishing response pieces or appending a response note to the original article.</li>
                    </ul>

                    <h2 style={sectionTitleStyle}>06. Audience & Global Editorial Sensitivity</h2>
                    <p style={{ marginBottom: "25px" }}>
                        Our readership spans multiple regulatory, cultural, and business environments. Our editorial standards reflect this global responsibility.
                    </p>
                    <p style={{ marginBottom: "25px" }}>
                        <strong>Primary Markets:</strong> United States · United Kingdom · Germany · UAE · Rest of World
                    </p>
                    <ul style={listStyle}>
                        <li><strong>Regulatory context.</strong> When covering companies operating across jurisdictions, we note relevant regulatory differences — GDPR in Europe, FTC rules in the US, DIFC regulations in UAE — that may affect how the news lands for different readers.</li>
                        <li><strong>Cultural sensitivity.</strong> We avoid language, framing, or assumptions that are culturally specific to one market without acknowledging that specificity. Our editorial team includes voices with regional expertise in each primary market.</li>
                        <li><strong>Currency and measurement.</strong> Financial figures are presented in the currency of origin with USD equivalents. We follow each market's localisation norms in date formats, units, and usage conventions where relevant.</li>
                    </ul>

                    <h2 style={sectionTitleStyle}>07. AI & Technology in Our Newsroom</h2>
                    <p style={{ marginBottom: "15px" }}>We use technology tools — including AI-assisted research, transcription, and translation — to support our journalists. We are transparent about how these tools are used and their limits.</p>
                    <ul style={listStyle}>
                        <li><strong>No AI-generated articles.</strong> StartupNews.fyi does not publish articles written entirely by AI. All published editorial content is written or substantially authored by a named human contributor.</li>
                        <li><strong>AI as a research aid.</strong> AI tools may be used for background research, transcription of interviews, or translation assistance. In all cases, a journalist verifies the accuracy of AI-assisted content before it enters a published piece.</li>
                        <li><strong>Disclosure where material.</strong> Where AI has contributed substantially to a piece — such as AI-generated data summaries included in a data-driven feature — this is disclosed within the article.</li>
                        <li><strong>No AI-generated images of real people.</strong> We do not use AI-generated images to depict real individuals, events, or products without clear labelling as an illustration.</li>
                    </ul>

                    <h2 style={sectionTitleStyle}>08. Content Standards & Prohibited Practices</h2>
                    <p style={{ marginBottom: "15px" }}>The following practices are explicitly prohibited on StartupNews.fyi and constitute grounds for editorial discipline, removal of content, and public correction:</p>
                    <ul style={listStyle}>
                        <li><strong>Plagiarism and content theft.</strong> Reproducing another publication's work without attribution and licence is a serious breach. All external content must be properly sourced and quoted, not reproduced.</li>
                        <li><strong>Fabrication.</strong> Inventing quotes, data, events, or sources is a terminable offence and triggers full public retraction of the affected article.</li>
                        <li><strong>Clickbait and misleading headlines.</strong> –  Headlines must accurately reflect article content. Sensationalised, misleading, or out-of-context headlines are not permitted.</li>
                        <li><strong>SEO manipulation.</strong>  Keyword stuffing, thin content, content farms, and other practices that optimise for search engines at the expense of reader value are prohibited.</li>
                        <li><strong>Undisclosed promotional content.</strong> Writing positively about a company in exchange for payment without clear disclosure is prohibited and may constitute a regulatory violation in multiple jurisdictions we serve.</li>
                        <li><strong>Discriminatory language.</strong> Content that demeans individuals or groups based on race, gender, nationality, religion, or other protected characteristics has no place on this platform.</li>
                    </ul>

                    <h2 style={sectionTitleStyle}>09. Contact & Accountability</h2>
                    <p style={{ marginBottom: "25px" }}>
                        We believe accountability journalism begins at home. Readers, sources, and subjects of our coverage should have clear channels to reach us.
                    </p>
                    <table className="editorial-purpose" style={{ marginBottom: "25px" }}>
                        <tbody>
                        <tr style={{ textAlign: "left" }}>
                        <th>Purpose</th>
                        <th>Contact</th>
                        </tr>
                        <tr>
                            <td>Editorial Queries</td>
                            <td>editorial@startupnews.fyi</td>
                        </tr>
                        <tr>
                            <td>Corrections & Complaints</td>
                            <td>corrections@startupnews.fyi</td>
                        </tr>
                        <tr>
                            <td>Tips & Leads</td>
                            <td>tips@startupnews.fyi</td>
                        </tr>
                        <tr>
                            <td>Partnerships & <br/>Sponsorships</td>
                            <td>partnerships@startupnews.fyi</td>
                        </tr>
                        </tbody>
                    </table>
                    <p style={{ marginBottom: "25px" }}>
                        Complaints about editorial conduct should be submitted in writing to corrections@startupnews.fyi. We aim to acknowledge all complaints within 48 hours and resolve them within 10 working days. Unresolved disputes may be escalated to an independent editorial ombudsperson appointed annually by our editorial board.
                    </p>

                </article>

            </div>

            <style jsx>{`
                @media (max-width: 1024px) {
                    .sn-social-vertical {
                        display: none !important;
                    }
                }
                    .editorial-purpose th, td{
                    width: 50%;
                    textAlign: "left";
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