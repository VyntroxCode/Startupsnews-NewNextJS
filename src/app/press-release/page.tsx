import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { PostImage } from "@/components/PostImage";
import { getPostsByCategory, getStartupEvents, hasThumbnail } from "@/lib/data-adapter";
import { getPostPath } from "@/lib/post-utils";
import { StickySidebarContent } from "@/components/StickySidebarContent";
import { StartupEventsSection } from "@/components/StartupEventsSection";

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

export const revalidate = 3600;
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Press Release | StartupNews.fyi",
  description: "Latest press releases from startups and companies on StartupNews.fyi.",
  alternates: { canonical: `${SITE_BASE}/press-release` },
  openGraph: {
    title: "Press Release | StartupNews.fyi",
    description: "Latest press releases from startups and companies on StartupNews.fyi.",
    url: `${SITE_BASE}/press-release`,
    siteName: "StartupNews.fyi",
    type: "website",
  },
  twitter: { card: "summary", title: "Press Release | StartupNews.fyi" },
};

export default async function PressReleasePage() {
  const posts = await getPostsByCategory("press-release", 20);
  const heroPost = posts[0] ?? null;
  const remainingPosts = posts.slice(1);
  const startupEvents = await getStartupEvents();

  const toBackgroundStyle = (imageUrl?: string | null): CSSProperties | undefined => {
    if (!imageUrl || !imageUrl.trim()) return undefined;
    return { backgroundImage: `url("${imageUrl}")` };
  };

  return (
    <div className="mvp-main-blog-wrap left relative">
      <div className="mvp-main-box">
        <div className="mvp-main-blog-cont left relative">
          <nav className="event-by-country-breadcrumb" aria-label="Breadcrumb">
            <Link href="/" className="event-by-country-breadcrumb-link">Home</Link>
            <span className="event-by-country-breadcrumb-separator" aria-hidden="true">/</span>
            <span className="event-by-country-breadcrumb-current" aria-current="page">Press Release</span>
          </nav>
          <h2 className="mvp-feat1-pop-head sector-page-theme-title">
            <span className="mvp-feat1-pop-head">Press Release</span>
          </h2>

          {heroPost && (
            <div className="sector-hero-wrap left relative">
              <Link href={getPostPath(heroPost)} rel="bookmark" className="sector-hero-link">
                <div className="sector-hero-image-wrap left relative">
                  <div className="sector-hero-image-bg" aria-hidden style={toBackgroundStyle(heroPost.image)} />
                  <div className="sector-hero-image-fg">
                    <PostImage src={heroPost.image || ''} alt={heroPost.title} fill sizes="100vw" imageStyle={{ objectFit: "contain" }} />
                  </div>
                </div>
                <div className="sector-hero-overlay" />
                <div className="sector-hero-content">
                  <span className="sector-hero-tag">Press Release</span>
                  <h2 className="sector-hero-title">{heroPost.title}</h2>
                </div>
              </Link>
            </div>
          )}

          <div className="mvp-main-blog-out left relative">
            <div className="mvp-main-blog-in">
              <div className="mvp-main-blog-body left relative">
                <ul className="mvp-blog-story-list left relative infinite-content">
                  {remainingPosts.map((post) => (
                    <li key={post.id} className="mvp-blog-story-wrap left relative infinite-post">
                      <Link href={getPostPath(post)} rel="bookmark">
                        <div className="mvp-blog-story-out relative">
                          {hasThumbnail(post) && (
                            <div className="mvp-blog-story-img left relative">
                              <div className="sector-thumb-image-bg" aria-hidden style={toBackgroundStyle(post.image)} />
                              <div className="sector-thumb-image-fg">
                                <PostImage src={post.image || ''} alt={post.title} fill sizes="(max-width: 767px) 100vw, 800px" imageStyle={{ objectFit: "contain" }} />
                              </div>
                            </div>
                          )}
                          <div className="mvp-blog-story-in">
                            <div className="mvp-blog-story-text left relative">
                              <div className="mvp-cat-date-wrap left relative">
                                <span className="mvp-cd-cat left relative">Press Release</span>
                              </div>
                              <h2 className="post-heading-max-3-lines">{post.title}</h2>
                              <p className="post-card-excerpt-max-3-lines">{post.excerpt}</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                {posts.length === 0 && (
                  <p style={{ color: '#64748b', padding: '2rem 0' }}>No press releases found.</p>
                )}
                <div className="mvp-inf-more-wrap left relative">
                  <Link href="/press-release" className="mvp-inf-more-but">
                    More Posts
                  </Link>
                </div>
              </div>
            </div>
            <div id="mvp-side-wrap" className="left relative theiaStickySidebar">
              <StickySidebarContent>
                <StartupEventsSection events={startupEvents} />
              </StickySidebarContent>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
