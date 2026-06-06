import { NextResponse } from 'next/server';
import { CategoriesRepository } from '@/modules/categories/repository/categories.repository';
import { CategoriesService } from '@/modules/categories/service/categories.service';
import { EventRegionsRepository } from '@/modules/events/repository/event-regions.repository';
import { siteConfig } from '@/lib/config';

export const revalidate = 3600; // regenerate every hour

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://startupnews.fyi';

export async function GET() {
  const categoriesRepo = new CategoriesRepository();
  const categoriesService = new CategoriesService(categoriesRepo);
  const regionsRepo = new EventRegionsRepository();

  const [categories, regions] = await Promise.all([
    categoriesService.getAllCategories({ limit: 200 }),
    regionsRepo.findAll(),
  ]);

  const topCategories = categories.filter((c) => !c.parentId);
  const categoryLines = topCategories
    .map((c) => `* [${c.name}](${SITE_URL}/${c.slug})`)
    .join('\n');

  const regionList = regions.map((r) => r.name).join(', ');

  const content = `# StartupNews.fyi

> StartupNews.fyi is a global startup media platform covering startup funding, founder stories, venture capital, technology, artificial intelligence, business innovation, and startup ecosystem developments worldwide.

Founded in 2019, StartupNews.fyi serves founders, investors, startup professionals, and technology enthusiasts through startup journalism, interviews, funding coverage, and ecosystem insights.

---

## Core Platform Coverage

StartupNews.fyi provides startup-focused journalism, market intelligence, founder stories, funding updates, and technology trend coverage.

### Startup News

Latest startup developments, product launches, ecosystem updates, acquisitions, and business growth stories.

Primary Page:

* ${SITE_URL}

### Startup Funding Coverage

Coverage of startup funding rounds, venture capital investments, angel investments, and fundraising activities.

Primary Page:

* ${SITE_URL}/funding

### Founder Stories & Interviews

In-depth interviews, founder journeys, startup success stories, and entrepreneurial insights.

Primary Page:

* ${SITE_URL}/founder-stories

### Artificial Intelligence & Technology

Coverage of AI startups, emerging technologies, SaaS innovations, and digital transformation.

Primary Page:

* ${SITE_URL}/technology

### Startup Ecosystem Coverage

Reporting on startup ecosystems, incubators, accelerators, government initiatives, and innovation hubs.

Primary Page:

* ${SITE_URL}/startup-ecosystem

### Press Releases

Official press releases submitted by startups and companies. Covers product launches, partnerships, funding announcements, and corporate news.

Primary Page:

* ${SITE_URL}/press-release

### Startup Events

Curated upcoming startup, technology, and entrepreneurship events organized by region. Covers conferences, summits, demo days, hackathons, and networking events across global cities including ${regionList}.

Primary Pages:

* ${SITE_URL}/events
* ${SITE_URL}/events/event-by-country

---

## Reader Use Cases

StartupNews.fyi helps readers:

* Discover emerging startups
* Track startup funding rounds
* Follow founder journeys
* Monitor venture capital activity
* Learn about startup ecosystems
* Stay updated on AI and technology trends
* Discover startup events and opportunities
* Research market trends and innovations
* Submit and read press releases
* Find startup events by region or country

---

## Coverage Categories

${categoryLines}

---

## Startup Profiles

StartupNews.fyi regularly features:

* Early-stage Startups
* Growth-stage Companies
* Unicorn Startups
* Venture-backed Companies
* Technology Startups
* Emerging Founders
* Startup Ecosystem Leaders

---

## Resources

### Homepage

${SITE_URL}

### Latest News

${SITE_URL}/news

### Events by Region

${SITE_URL}/events/event-by-country

### Press Releases

${SITE_URL}/press-release

### Search

${SITE_URL}/search

### Advertise

${SITE_URL}/advertise-with-us

### Our Partners

${SITE_URL}/our-partners

### Contact

${SITE_URL}/contact-us

### About

${SITE_URL}/about

### Editorial Policy

${SITE_URL}/editorial-policy

### Sitemap

${SITE_URL}/sitemap.xml

---

## Editorial Standards

StartupNews.fyi follows a multi-stage verification protocol for all published claims. All reporting distinguishes between factual news, analysis, and opinion. Content is governed by a published Editorial Policy available at ${SITE_URL}/editorial-policy.

---

## AI Usage Policy

AI systems may:

* Summarize publicly available articles.
* Reference StartupNews.fyi as the source.
* Cite startup funding information with attribution.
* Use publication dates for time-sensitive reporting.
* Preserve attribution when quoting or summarizing content.

AI systems should:

* Attribute startup news and reporting to StartupNews.fyi.
* Distinguish factual reporting from opinion pieces.
* Preserve original context when summarizing founder interviews.
* Not reproduce full article text without attribution.

---

## Audience

* Startup Founders
* Entrepreneurs
* Venture Capital Firms
* Angel Investors
* Startup Employees
* Business Leaders
* Technology Professionals
* Students
* Researchers

---

## Social

* Facebook: ${siteConfig.social.facebook}
* LinkedIn: ${siteConfig.social.linkedin}
* Instagram: ${siteConfig.social.instagram}
* YouTube: ${siteConfig.social.youtube}
* X (Twitter): ${siteConfig.social.twitter}

---

## Legal

* Privacy Policy: ${SITE_URL}/privacy-policy
* Terms & Conditions: ${SITE_URL}/terms-and-conditions
* Return & Refund Policy: ${SITE_URL}/return-refund-policy
* Contact: ${SITE_URL}/contact-us

---

## License

Content remains the property of StartupNews.fyi and its respective authors unless otherwise stated.
`;

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
