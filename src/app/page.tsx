import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PostImage } from "@/components/PostImage";
import {
  getFeat1LeftPosts,
  getTrendingPosts,
  getMoreNewsPosts,
  getMoreNewsSlugs,
  getCategorySectionPosts,
  getDarkSectionPosts,
  getFeat1SectionPosts,
  getStartupEvents,
  getLatestNewsPosts,
  getPostsByCategory,
  onlyPostsWithImage,
  getPostImage,
  getCategoryDisplayName,
  HOME_WIDGET_CATEGORY_MAP,
  type Post,
  hasThumbnail,
} from "@/lib/data-adapter";
import { MobileCategorySection } from "@/components/MobileCategorySection";
import { HomeWidgetSection } from "@/components/HomeWidgetSection";
import { HomeDarkSection } from "@/components/HomeDarkSection";
import { HomeFeat1Section } from "@/components/HomeFeat1Section";
import { MoreNewsSection } from "@/components/MoreNewsSection";
import { StartupEventsSection } from "@/components/StartupEventsSection";
import { StickySidebarContent } from "@/components/StickySidebarContent";
import { EventsCarousel } from "@/components/EventsCarousel";
import { LatestNewsRotator, type LatestNewsSlide } from "@/components/LatestNewsRotator";
import { TrendingCard, TrendingCardText, TrendingHeadWord } from "@/components/TrendingSlideIn";
import { getPostPath } from "@/lib/post-utils";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

// Homepage canonical is rendered as a <link> in the JSX below: Next's metadata API always strips
// the trailing slash from a root URL ("https://startupnews.fyi"), but the served URL is ".../".
export const metadata: Metadata = {};

// ISR: serve cached HTML for 5 min so CDN/edge can serve in ~0.01s when cached.
// New/edited posts still appear immediately via revalidatePath('/', 'page') in posts.repository.ts.
export const revalidate = 300;

export default async function HomePage() {
  const categorySlugs = [
    "ai-deeptech",
    "ev-mobility",
    "social-media",
    "ecommerce",
    "gaming",
    "web3-blockchain",
    "fintech",
  ] as const;

  // Batch 1: parallel fetch all independent data (one round-trip to cache/DB)
  const batch1 = await Promise.all([
    getFeat1LeftPosts(),
    getTrendingPosts(),
    getStartupEvents(),
    getCategorySectionPosts("ai-deeptech"),
    getFeat1SectionPosts("ev-mobility"),
    getCategorySectionPosts("social-media"),
    getDarkSectionPosts("ecommerce"),
    getCategorySectionPosts("gaming"),
    getFeat1SectionPosts("web3-blockchain"),
    getCategorySectionPosts("fintech"),
    getLatestNewsPosts(25),
    ...categorySlugs.map((slug) => getCategoryDisplayName(slug, HOME_WIDGET_CATEGORY_MAP[slug] ?? slug)),
  ]);

  const feat1Result = batch1[0] as Awaited<ReturnType<typeof getFeat1LeftPosts>>;
  const trending = batch1[1] as Post[];
  const startupEvents = batch1[2] as Awaited<ReturnType<typeof getStartupEvents>>;
  const aiDeeptechSection = batch1[3] as Awaited<ReturnType<typeof getCategorySectionPosts>>;
  const evMobilitySection = batch1[4] as Awaited<ReturnType<typeof getFeat1SectionPosts>>;
  const socialMediaSection = batch1[5] as Awaited<ReturnType<typeof getCategorySectionPosts>>;
  const ecommerceSection = batch1[6] as Awaited<ReturnType<typeof getDarkSectionPosts>>;
  const gamingSection = batch1[7] as Awaited<ReturnType<typeof getCategorySectionPosts>>;
  const web3BlockchainSection = batch1[8] as Awaited<ReturnType<typeof getFeat1SectionPosts>>;
  const fintechSection = batch1[9] as Awaited<ReturnType<typeof getCategorySectionPosts>>;
  const latestFromListing = batch1[10] as Post[];
  const categoryTitlesMap = batch1.slice(11, 18) as string[];

  const { main, sub } = feat1Result;
  const excludeIds = [main.id, sub[0].id, sub[1].id, ...trending.map((p) => p.id)];

  // Batch 2: more news (depends on excludeIds only)
  // Latest News hero cards each rotate through more stories from their own category.
  const heroCards = [main, sub[0], sub[1]];
  const heroCategorySlugs = [...new Set(heroCards.map((p) => p.categorySlug))];

  // Batch 2: more news (depends on excludeIds only) + the hero cards' category queues
  const [moreNews, moreNewsSlugs, heroCategoryPosts] = await Promise.all([
    getMoreNewsPosts(excludeIds, 15),
    getMoreNewsSlugs(excludeIds),
    // A failed queue must not take the homepage down — that card just stays on its one story.
    Promise.all(heroCategorySlugs.map((slug) => getPostsByCategory(slug, 10).catch((): Post[] => []))),
  ]);

  // One queue per card: the card's own story first, then up to 4 more from its category. `seen`
  // spans all three so two cards in the same category never show the same story.
  const seenInHero = new Set(heroCards.map((p) => p.id));
  const latestNewsRotation: LatestNewsSlide[][] = heroCards.map((card) => {
    const queue = [card];
    for (const post of heroCategoryPosts[heroCategorySlugs.indexOf(card.categorySlug)]) {
      if (queue.length >= 5) break;
      if (seenInHero.has(post.id)) continue;
      seenInHero.add(post.id);
      queue.push(post);
    }
    return queue.map((post) => ({
      id: post.id,
      href: getPostPath(post),
      title: post.title,
      category: post.category,
      timeAgo: post.timeAgo,
      image: getPostImage(post),
    }));
  });

  const mobilePostsMap: Record<string, Post[]> = {
    "ai-deeptech": [aiDeeptechSection.featured, ...aiDeeptechSection.right, ...aiDeeptechSection.list].filter(
      Boolean
    ) as Post[],
    "ev-mobility": [...evMobilitySection.top, ...evMobilitySection.bottom].filter(Boolean) as Post[],
    "social-media": [socialMediaSection.featured, ...socialMediaSection.right, ...socialMediaSection.list].filter(
      Boolean
    ) as Post[],
    ecommerce: [ecommerceSection.featured, ...ecommerceSection.list].filter(Boolean) as Post[],
    gaming: [gamingSection.featured, ...gamingSection.right, ...gamingSection.list].filter(Boolean) as Post[],
    "web3-blockchain": [...web3BlockchainSection.top, ...web3BlockchainSection.bottom].filter(Boolean) as Post[],
    fintech: [fintechSection.featured, ...fintechSection.right, ...fintechSection.list].filter(Boolean) as Post[],
  };

  const titles: Record<string, string> = {};
  categorySlugs.forEach((slug, index) => {
    titles[slug] = categoryTitlesMap[index];
  });

  // Title variables for the 7 desktop widget sections
  const titleAiDeeptech = titles["ai-deeptech"];
  const titleEvMobility = titles["ev-mobility"];
  const titleSocialMedia = titles["social-media"];
  const titleEcommerce = titles["ecommerce"];
  const titleGaming = titles["gaming"];
  const titleWeb3Blockchain = titles["web3-blockchain"];
  const titleFintech = titles["fintech"];

  // Latest News: use listing so posts with image only in content get thumbnail; fallback to combined list
  const latestNewsPosts = latestFromListing.length > 0 ? latestFromListing : onlyPostsWithImage([main, sub[0], sub[1], ...trending, ...moreNews.slice(0, 15)]);

  // Helper to ensure we have enough posts for mobile sections (2 featured + 2 list)
  const fillMobileSection = (catPosts: Post[], allPosts: Post[]) => {
    const withImage = onlyPostsWithImage(catPosts);
    const needed = 4; // 2 big featured cards + 2 small list cards
    if (withImage.length >= needed) return withImage.slice(0, needed);

    const usedIds = new Set(withImage.map(p => p.id));
    const extra = allPosts.filter(p => !usedIds.has(p.id) && hasThumbnail(p)).slice(0, needed - withImage.length);
    return [...withImage, ...extra];
  };

  // Get full list of available posts for fallbacks
  const allAvailablePosts = [main, sub[0], sub[1], ...trending, ...moreNews];

  // Prepare data for all 12 mobile sections
  const mobileSections = categorySlugs.map(slug => ({
    slug,
    title: titles[slug],
    posts: fillMobileSection(mobilePostsMap[slug] || [], allAvailablePosts)
  }));

  return (
    <>
      <link rel="canonical" href={`${SITE_URL.replace(/\/+$/, "")}/`} />
      {/* Mobile-only: Featured Article + Latest News Section */}
      <section className="startupnews-mobile-latest-news">
        {/* Latest News Title - Below Navbar */}
        <div className="startupnews-mobile-section-title">Latest News</div>

        {/* Featured Article at Top */}
        <div className="startupnews-mobile-featured">
          <Link href={getPostPath(main)} rel="bookmark" className="startupnews-mobile-featured-link">
            <div className="startupnews-mobile-featured-image">
              <PostImage
                src={getPostImage(main)}
                alt={main.title}
                fill
                className="mvp-reg-img"
                sizes="100vw"
                style={{ objectFit: "cover" }}
              />
              <PostImage
                src={getPostImage(main)}
                alt={main.title}
                className="mvp-mob-img"
                width={400}
                height={300}
                style={{ width: "100%", height: "auto", objectFit: "cover" }}
                priority
                fetchPriority="high"
              />
            </div>
            <div className="startupnews-mobile-featured-content">
              <div className="startupnews-mobile-featured-meta">
                <span className="startupnews-mobile-featured-category">{main.category}</span>
                <span className="startupnews-mobile-featured-time">{main.timeAgo}</span>
              </div>
              <h1 className="startupnews-mobile-featured-title post-heading-max-3-lines">{main.title}</h1>
            </div>
          </Link>
        </div>

        {/* Latest News Article Cards */}
        <div className="mvp-main-box">
          <ul className="startupnews-articles-list">
            {latestNewsPosts.slice(1, 7).map((post) => (
              <li key={post.id} className="startupnews-article-card">
                <Link href={getPostPath(post)} rel="bookmark">
                  <div className="startupnews-article-content">
                    <div className="startupnews-article-meta">
                      <span className="startupnews-category">{post.category}</span>
                      <span className="startupnews-date">{post.timeAgo}</span>
                    </div>
                    <h2 className="startupnews-article-title post-heading-max-3-lines">{post.title}</h2>
                    {/* <p className="startupnews-article-excerpt">{post.excerpt}</p> */}
                  </div>
                  <div className="startupnews-article-image">
                    <PostImage
                      src={getPostImage(post)}
                      alt={post.title}
                      width={600}
                      height={360}
                      sizes="(max-width: 767px) 100vw, 400px"
                      style={{ width: "100%", height: "auto", objectFit: "cover" }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Mobile-only: Most Popular Section */}
      <section className="startupnews-mobile-most-popular">
        <div className="mvp-main-box">
          <h2 className="startupnews-mobile-popular-title">Most Popular</h2>
          <ul className="startupnews-popular-list">
            {trending.slice(0, 5).map((post, index) => (
              <li key={post.id} className="startupnews-popular-card">
                <Link href={getPostPath(post)} rel="bookmark">
                  <div className="startupnews-popular-image-wrapper">
                    <div className="startupnews-popular-image">
                      <PostImage
                        src={getPostImage(post)}
                        alt={post.title}
                        width={120}
                        height={120}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <div className="startupnews-popular-number">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                  </div>
                  <div className="startupnews-popular-content">
                    <h3 className="startupnews-popular-title-text post-heading-max-3-lines">{post.title}</h3>
                    <span className="startupnews-popular-read-time">4 MIN READ</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Mobile-only: Startup Events Section - Carousel */}
      <section className="startupnews-mobile-events">
        <div className="mvp-main-box">
          <EventsCarousel events={startupEvents} maxEvents={10} />
        </div>
      </section>

      {/* Mobile-only: All 12 Category Sections */}
      {mobileSections.map((section) => (
        <MobileCategorySection key={section.slug} title={section.title} posts={section.posts} slug={section.slug} />
      ))}

      {/* Mobile-only: More News Section */}
      <section className="startupnews-mobile-more-news">
        <div className="mvp-main-box">
          <h2 className="startupnews-mobile-section-title">More News</h2>
          <div className="startupnews-mobile-more-news-content">
            <MoreNewsSection initialPosts={moreNews} availableSlugs={moreNewsSlugs} />
          </div>
        </div>
      </section>

      {/* Desktop: Original Featured Section - Layout 1 */}
      <div className="mvp-main-box startupnews-desktop-featured">
        <section id="mvp-feat1-wrap" className="left relative">
          <div className="mvp-feat1-right-out left relative">
            <div className="mvp-feat1-right-in">
              <div className="mvp-feat1-main left relative">
                {/* Left column: 1 big featured + 2 sub */}
                <div className="mvp-feat1-left-wrap relative">
                  <div className="mvp-feat1-pop-head">
                    <span className="mvp-feat1-pop-head">Latest News</span>
                  </div>
                  <LatestNewsRotator variant="main" enterFrom="right" posts={latestNewsRotation[0]} />
                  <div className="mvp-feat1-sub-wrap left relative">
                    <LatestNewsRotator variant="sub" enterFrom="left" posts={latestNewsRotation[1]} />
                    <LatestNewsRotator variant="sub" enterFrom="right" posts={latestNewsRotation[2]} />
                  </div>
                </div>
                {/* Middle column: Trending */}
                <div className="mvp-feat1-mid-wrap left relative">
                  <h3 className="mvp-feat1-pop-head">
                    <TrendingHeadWord>Trending</TrendingHeadWord>
                  </h3>
                  <div className="mvp-feat1-pop-wrap left relative">
                    {trending.map((post, index) => {
                      const trendingImage = getPostImage(post);

                      return (
                      <Link key={post.id} href={getPostPath(post)} rel="bookmark">
                        <TrendingCard index={index}>
                          <div className="mvp-feat1-pop-img home-trending-pop-img left relative">
                            <Image
                              src={trendingImage}
                              alt=""
                              fill
                              aria-hidden
                              className="home-trending-pop-img-bg"
                              sizes="(max-width: 767px) 100vw, 400px"
                              style={{ objectFit: "cover", objectPosition: "center" }}
                            />
                            <PostImage
                              src={trendingImage}
                              alt={post.title}
                              fill
                              className="mvp-reg-img"
                              sizes="(max-width: 767px) 100vw, 400px"
                              imageStyle={{ objectFit: "contain", objectPosition: "center" }}
                            />
                            <PostImage
                              src={trendingImage}
                              alt={post.title}
                              fill
                              className="mvp-mob-img"
                              sizes="(max-width: 767px) 100vw, 330px"
                              imageStyle={{ objectFit: "contain", objectPosition: "center" }}
                            />
                          </div>
                          <TrendingCardText index={index}>
                            <div className="mvp-cat-date-wrap left relative">
                              <span className="mvp-cd-cat left relative">{post.category}</span>
                              <span className="mvp-cd-date left relative">{post.timeAgo}</span>
                            </div>
                            <h2 className="post-heading-max-3-lines">{post.title}</h2>
                          </TrendingCardText>
                        </TrendingCard>
                      </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            {/* Right column: Ad + Startup Events */}
            <div className="mvp-feat1-right-wrap left relative">
<StartupEventsSection events={startupEvents} animated />
            </div>
          </div>
        </section>
      </div>

      {/* Homepage widget sections: 7 categories in sequence */}
      <div id="mvp-home-widget-wrap" className="mvp-home-widget-block left relative startupnews-desktop-featured">
        <HomeWidgetSection
          title={titleAiDeeptech}
          categorySlug="ai-deeptech"
          featured={aiDeeptechSection.featured}
          right={aiDeeptechSection.right}
          list={aiDeeptechSection.list}
          url={`/${categorySlugs}`}
        />
        <HomeFeat1Section
          title={titleEvMobility}
          categorySlug="ev-mobility"
          top={evMobilitySection.top}
          bottom={evMobilitySection.bottom}
          url={`/${categorySlugs}`}
        />
        <HomeWidgetSection
          title={titleSocialMedia}
          categorySlug="social-media"
          featured={socialMediaSection.featured}
          right={socialMediaSection.right}
          list={socialMediaSection.list}
          url={`/${categorySlugs}`}
          mainpos="middle"
        />
        <HomeDarkSection
          title={titleEcommerce}
          categorySlug="ecommerce"
          featured={ecommerceSection.featured}
          list={ecommerceSection.list}
          url={`/${categorySlugs}`}
        />
        <HomeWidgetSection
          title={titleGaming}
          categorySlug="gaming"
          featured={gamingSection.featured}
          right={gamingSection.right}
          list={gamingSection.list}
          url={`/${categorySlugs}`}
        />
        <HomeFeat1Section
          title={titleWeb3Blockchain}
          categorySlug="web3-blockchain"
          top={web3BlockchainSection.top}
          bottom={web3BlockchainSection.bottom}
          url={`/${categorySlugs}`}
        />
        <HomeWidgetSection
          title={titleFintech}
          categorySlug="fintech"
          featured={fintechSection.featured}
          right={fintechSection.right}
          list={fintechSection.list}
          url={`/${categorySlugs}`}
          mainpos="middle"
        />
      </div>

      {/* More News */}
      <div className="mvp-main-blog-wrap left relative startupnews-desktop-featured">
        <div className="mvp-main-box">
          <div className="mvp-main-blog-cont left relative">
            <div className="mvp-widget-home-head">
              <h4 className="mvp-widget-home-title">
                <span className="mvp-widget-home-title">More News</span>
              </h4>
            </div>
            <div className="mvp-main-blog-out left relative">
              <div className="mvp-main-blog-in">
                <div className="mvp-main-blog-body left relative">
                  <MoreNewsSection initialPosts={moreNews} availableSlugs={moreNewsSlugs} />
                </div>
              </div>
              <div id="mvp-side-wrap" className="left relative">
                <StickySidebarContent>
                  <StartupEventsSection events={startupEvents} animated />
                </StickySidebarContent>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
