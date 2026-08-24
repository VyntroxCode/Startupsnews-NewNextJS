import type { Metadata } from 'next';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { PageHeading } from '@/components/PageHeading';

export const metadata: Metadata = {
  title: 'Editorial Policy — StartupNews.fyi',
  description:
    'StartupNews.fyi editorial policy covering sourcing, verification, EEAT standards, corrections, conflict of interest, and content standards.',
};

const listStyle: React.CSSProperties = {
  paddingLeft: '20px',
  marginBottom: '40px',
  listStyleType: 'disc',
};

export default function EditorialPolicy() {
  return (
    <div style={{ width: '100%', background: '#fff' }}>
      <style>{`
        .ep-breadcrumb-wrap { padding: 20px 20px 0 24px; }
        .ep-wrap { max-width: 800px; margin: 0 auto; padding: 40px 20px 40px; }
        .ep-header { margin-bottom: 40px; text-align: center; }
        .ep-section-title { font-size: 24px; font-weight: 800; color: #000; margin-top: 50px; margin-bottom: 20px; font-family: Inter, sans-serif; text-transform: uppercase; letter-spacing: 0.5px; }
        .ep-table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .ep-article { font-size: 16px; line-height: 1.8; color: #333; font-family: 'NB International', sans-serif; }
        @media (max-width: 768px) {
          .ep-breadcrumb-wrap { padding: 14px 16px 0 16px; }
          .ep-wrap { padding: 20px 16px 28px; }
          .ep-header { margin-bottom: 24px; }
          .ep-section-title { font-size: 18px; margin-top: 32px; margin-bottom: 14px; }
          .ep-article { font-size: 15px; }
        }
        @media (max-width: 480px) {
          .ep-breadcrumb-wrap { padding: 12px 14px 0 14px; }
          .ep-wrap { padding: 16px 14px 22px; }
          .ep-header { margin-bottom: 20px; }
          .ep-section-title { font-size: 16px; margin-top: 28px; }
          .ep-article { font-size: 14px; line-height: 1.7; }
        }
      `}</style>
      <div className="ep-breadcrumb-wrap">
        <PageBreadcrumb current="Editorial Policy" />
      </div>
      <PageHeading title="Editorial Policy" />

      <div className="ep-wrap">
        <header className="ep-header">
          <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>
            Applies to: All published content &nbsp;|&nbsp; Reviewed by: Editorial Board &nbsp;|&nbsp; Next review: February 2027
          </p>
        </header>

        <article className="ep-article">

          <h2 className="ep-section-title">Our Commitment to Readers &amp; Publishers</h2>
          <p style={{ marginBottom: '20px' }}>
            StartupNews.fyi covers startups, tech, innovation, D2C, foodtech, and emerging business models with rigour, fairness, and transparency, serving readers across the USA, UK, Germany, UAE, and beyond.
          </p>
          <p style={{ marginBottom: '40px', color: '#555' }}>
            <strong>Coverage Areas:</strong> Startups &nbsp;·&nbsp; Technology &nbsp;·&nbsp; Innovation &nbsp;·&nbsp; D2C &nbsp;·&nbsp; Foodtech &nbsp;·&nbsp; Venture Capital &nbsp;·&nbsp; Fintech &nbsp;·&nbsp; Sustainability &nbsp;·&nbsp; AI &amp; Deep Tech &nbsp;·&nbsp; Creator Economy
          </p>

          <h2 className="ep-section-title">Our Mission &amp; Editorial Independence</h2>
          <p style={{ marginBottom: '25px' }}>
            StartupNews.fyi exists to inform, analyse, and connect the global startup community, from founders raising their first round to institutional investors tracking macro trends. Our editorial mission is to deliver accurate, timely, and original reporting that serves our readers&apos; professional and intellectual needs, not the interests of advertisers, investors, or PR firms.
          </p>
          <p style={{ marginBottom: '25px' }}>
            Our editorial team operates independently. No advertiser, sponsor, commercial partner, or investor holds any influence over which stories we pursue, how we frame them, or what conclusions we draw. This separation is non-negotiable.
          </p>
          <p style={{ marginBottom: '40px' }}>
            Every editorial decision, what to cover, who to quote, which angle to take, is made solely on the basis of news value, reader relevance, and journalistic merit.
          </p>

          <h2 className="ep-section-title">EEAT Standards, Experience, Expertise, Authoritativeness &amp; Trustworthiness</h2>
          <p style={{ marginBottom: '15px' }}>We align our content quality with Google&apos;s EEAT framework because we believe it reflects genuine reader value, not merely SEO compliance.</p>
          <ul style={listStyle}>
            <li><strong>Experience.</strong> Writers bring direct industry experience, founders, operators, investors, and journalists who have lived in the ecosystems they cover.</li>
            <li><strong>Expertise.</strong> Subject-matter experts review coverage in specialised verticals including fintech, foodtech, deep tech, and regulatory affairs.</li>
            <li><strong>Authoritativeness.</strong> We cite primary sources, founders, company filings, official data, and are transparent about the limitations of secondary reporting.</li>
            <li><strong>Trustworthiness.</strong> Author bios, editor credits, conflict disclosures, and clear correction policies are published on every article page.</li>
          </ul>
          <p style={{ marginBottom: '40px' }}>All contributors must complete a contributor profile that discloses their background, professional affiliations, and any relevant financial interests. This information is published alongside their bylines.</p>

          <h2 className="ep-section-title">Sourcing, Verification &amp; Accuracy</h2>
          <p style={{ marginBottom: '25px' }}>Accuracy is our primary obligation to readers. We follow a multi-stage verification protocol for all published claims.</p>
          <ul style={listStyle}>
            <li><strong>Two-source minimum.</strong> Required for any factual claim that could be disputed or that carries material consequence for its subject.</li>
            <li><strong>Named sources preferred.</strong> Anonymous sources are used only when the information is significant, cannot be obtained any other way, and when the source&apos;s reasons for anonymity are credible and documented internally.</li>
            <li><strong>Data attribution.</strong> All statistics, research findings, and financial figures are linked to their original source. We distinguish between proprietary research and publicly available data.</li>
            <li><strong>No PR-laundering.</strong> Press releases and PR-generated content are never published verbatim. All press release material must be independently verified and contextualised before publication.</li>
            <li><strong>Embargoes honoured.</strong> We respect agreed embargo terms and will not break an embargo for competitive reasons.</li>
          </ul>

          <h2 className="ep-section-title">Conflict of Interest &amp; Advertising Policy</h2>
          <p style={{ marginBottom: '25px' }}>
            StartupNews.fyi is commercially supported through advertising, sponsored content, and events. We are rigorous about separating commercial activity from editorial output.
          </p>
          <ul style={listStyle}>
            <li><strong>Sponsored content is clearly labelled.</strong> Any content produced in exchange for payment, including sponsored articles, partner features, and branded newsletters, is marked &quot;Sponsored&quot; or &quot;Partner Content&quot; prominently and cannot be altered by editorial staff to appear organic.</li>
            <li><strong>Advertisers cannot buy coverage.</strong> Purchasing advertising space on StartupNews.fyi does not entitle any company to editorial coverage, positive framing, or review rights over stories that mention them.</li>
            <li><strong>Investor and founder relations.</strong> Our publication does not take equity stakes, advisory fees, or revenue-share arrangements with companies we cover.</li>
          </ul>

          <h2 className="ep-section-title">Corrections &amp; Updates Policy</h2>
          <p style={{ marginBottom: '25px' }}>We correct errors promptly and transparently. We do not delete stories, alter published text without notice, or suppress corrections to protect relationships.</p>
          <p style={{ marginBottom: '25px' }}>
            <strong>Correction protocol:</strong> Factual errors are corrected within 24 hours of identification. A correction note is appended to the original article stating what was wrong and what the correct information is. Material errors that affect the substance of a story may result in an Editor&apos;s Note placed at the top of the article. Significant corrections are communicated to our newsletter subscribers.
          </p>
          <ul style={listStyle}>
            <li><strong>Updates vs corrections.</strong> New information that adds to, but does not contradict, an original story is marked &quot;Updated&quot; with a timestamp. This is distinguished from corrections, which acknowledge error.</li>
            <li><strong>No stealth edits.</strong> We never alter published content without disclosure. Any substantive post-publication change is timestamped and noted at the foot of the article.</li>
            <li><strong>Right of reply.</strong> Individuals or companies who believe they have been misrepresented may submit a right-of-reply request. We will consider publishing response pieces or appending a response note to the original article.</li>
          </ul>

          <h2 className="ep-section-title">Audience &amp; Global Editorial Sensitivity</h2>
          <p style={{ marginBottom: '25px' }}>Our readership spans multiple regulatory, cultural, and business environments. Our editorial standards reflect this global responsibility.</p>
          <p style={{ marginBottom: '25px' }}><em>Primary Markets: United States &nbsp;·&nbsp; United Kingdom &nbsp;·&nbsp; Germany &nbsp;·&nbsp; UAE &nbsp;·&nbsp; Rest of World</em></p>
          <ul style={listStyle}>
            <li><strong>Regulatory context.</strong> When covering companies operating across jurisdictions, we note relevant regulatory differences, GDPR in Europe, FTC rules in the US, DIFC regulations in UAE, that may affect how the news lands for different readers.</li>
            <li><strong>Cultural sensitivity.</strong> We avoid language, framing, or assumptions that are culturally specific to one market without acknowledging that specificity. Our editorial team includes voices with regional expertise in each primary market.</li>
            <li><strong>Currency and measurement.</strong> Financial figures are presented in the currency of origin with USD equivalents. We follow each market&apos;s localisation norms in date formats, units, and usage conventions where relevant.</li>
          </ul>

          <h2 className="ep-section-title">AI &amp; Technology in Our Newsroom</h2>
          <p style={{ marginBottom: '15px' }}>We use technology tools, including AI-assisted research, transcription, and translation, to support our journalists. We are transparent about how these tools are used and their limits.</p>
          <ul style={listStyle}>
            <li><strong>No AI-generated articles.</strong> StartupNews.fyi does not publish articles written entirely by AI. All published editorial content is written or substantially authored by a named human contributor.</li>
            <li><strong>AI as a research aid.</strong> AI tools may be used for background research, transcription of interviews, or translation assistance. In all cases, a journalist verifies the accuracy of AI-assisted content before it enters a published piece.</li>
          </ul>

          <h2 className="ep-section-title">Content Standards &amp; Prohibited Practices</h2>
          <p style={{ marginBottom: '15px' }}>The following practices are explicitly prohibited on StartupNews.fyi and constitute grounds for editorial discipline, removal of content, and public correction:</p>
          <ul style={listStyle}>
            <li><strong>Plagiarism and content theft.</strong> Reproducing another publication&apos;s work without attribution and licence is a serious breach. All external content must be properly sourced and quoted, not reproduced.</li>
            <li><strong>Fabrication.</strong> Inventing quotes, data, events, or sources is a terminable offence and triggers full public retraction of the affected article.</li>
            <li><strong>Clickbait and misleading headlines.</strong> Headlines must accurately reflect article content. Sensationalised, misleading, or out-of-context headlines are not permitted.</li>
            <li><strong>SEO manipulation.</strong> Keyword stuffing, thin content, content farms, and other practices that optimize for search engines at the expense of reader value are prohibited.</li>
            <li><strong>Undisclosed promotional content.</strong> Writing positively about a company in exchange for payment without clear disclosure is prohibited and may constitute a regulatory violation in multiple jurisdictions we serve.</li>
            <li><strong>Discriminatory language.</strong> Content that demeans individuals or groups based on race, gender, nationality, religion, or other protected characteristics has no place on this platform.</li>
          </ul>

          <h2 className="ep-section-title">Contact &amp; Accountability</h2>
          <p style={{ marginBottom: '25px' }}>
            We believe accountability journalism begins at home. Readers, sources, and subjects of our coverage should have clear channels to reach us at. We aim to acknowledge all complaints within 48 hours and resolve them within 10 working days. Unresolved disputes may be escalated to an independent editorial ombudsperson appointed annually by our editorial board. Connect at{' '}
            <a href="mailto:office@startupnews.fyi" style={{ color: '#ee1761' }}>office@startupnews.fyi</a>
          </p>

          <p style={{ marginTop: '60px', paddingTop: '20px', borderTop: '1px solid #eee', fontSize: '14px', color: '#888' }}>
            © 2026 StartupNews.fyi · Last updated June 2026
          </p>

        </article>
      </div>
    </div>
  );
}
