import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { PostImage } from "@/components/PostImage";
import { getPostsByCategory, getStartupEvents, hasThumbnail } from "@/lib/data-adapter";
import { getPostPath } from "@/lib/post-utils";
// import { Sidebar } from "@/components/Sidebar"; // Unused
import { StickySidebarContent } from "@/components/StickySidebarContent";
import { StartupEventsSection } from "@/components/StartupEventsSection";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://startupnews.fyi";

// Enable ISR - regenerate pages every hour
export const revalidate = 3600; // 1 hour

// Allow dynamic params for categories not pre-generated
export const dynamicParams = true;

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const displayName = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const title = `${displayName} News & Updates`;
  const description = `Latest ${displayName} startup news, funding rounds, and industry analysis on StartupNews.fyi.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_BASE}/category/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_BASE}/category/${slug}`,
      siteName: "StartupNews.fyi",
      type: "website",
    },
    twitter: { card: "summary", title, description },
  };
}


export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const posts = await getPostsByCategory(slug, 20);
  const title = slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const listPosts = posts.slice(0, 20);
  const heroPost = listPosts[0] ?? null;
  const remainingPosts = listPosts.slice(1);
  const startupEvents = await getStartupEvents();

  const toBackgroundStyle = (imageUrl?: string | null): CSSProperties | undefined => {
    if (!imageUrl || !imageUrl.trim()) return undefined;
    return {
      backgroundImage: `url("${imageUrl}")`,
    };
  };

  return (
    <div className="mvp-main-blog-wrap left relative">
      <div className="mvp-main-box">
        <div className="mvp-main-blog-cont left relative">
          <h1 className="mvp-feat1-pop-head sector-page-theme-title">
            <span className="mvp-feat1-pop-head">{title}</span>
          </h1>

          {heroPost && (
            <div className="sector-hero-wrap left relative">
              <Link href={getPostPath(heroPost)} rel="bookmark" className="sector-hero-link">
                <div className="sector-hero-image-wrap left relative">
                  <div
                    className="sector-hero-image-bg"
                    aria-hidden
                    style={toBackgroundStyle(heroPost.image)}
                  />
                  <div className="sector-hero-image-fg">
                    <PostImage
                      src={heroPost.image || ''}
                      alt={heroPost.title}
                      fill
                      sizes="100vw"
                      imageStyle={{ objectFit: "contain" }}
                    />
                  </div>
                </div>
                <div className="sector-hero-overlay" />
                <div className="sector-hero-content">
                  <span className="sector-hero-tag">{heroPost.category || title}</span>
                  <h1 className="sector-hero-title">{heroPost.title}</h1>
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
                                <div
                                  className="sector-thumb-image-bg"
                                  aria-hidden
                                  style={toBackgroundStyle(post.image)}
                                />
                                <div className="sector-thumb-image-fg">
                                  <PostImage
                                    src={post.image || ''}
                                    alt={post.title}
                                    fill
                                    sizes="(max-width: 767px) 100vw, 800px"
                                    imageStyle={{ objectFit: "contain" }}
                                  />
                                </div>
                              </div>
                            )}
                            <div className="mvp-blog-story-in">
                              <div className="mvp-blog-story-text left relative">
                                <div className="mvp-cat-date-wrap left relative">
                                  <span className="mvp-cd-cat left relative">{post.category}</span>
                                  {/* srishti */}
                                  {/* <span className="mvp-cd-date left relative">{post.timeAgo}</span> */}
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
                <div className="mvp-inf-more-wrap left relative">
                  <Link href="/news" className="mvp-inf-more-but">
                    More Posts
                  </Link>
                  <div className="mvp-nav-links">
                    <Link href="/news">Page 1 of 1</Link>
                  </div>
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
