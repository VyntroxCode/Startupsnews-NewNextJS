import Link from "next/link";
import { PostImage } from "@/components/PostImage";
import { getStartupEvents, hasThumbnail, getPostImage, getSearchPagePosts } from "@/lib/data-adapter";
import { StickySidebarContent } from "@/components/StickySidebarContent";
import { StartupEventsSection } from "@/components/StartupEventsSection";
import { getPostPath } from "@/lib/post-utils";

export const revalidate = 90;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const startupEvents = await getStartupEvents();
  const normalizedQuery = (q || "").trim().replace(/^"+|"+$/g, "");
  const posts = normalizedQuery ? await getSearchPagePosts(normalizedQuery) : [];

  return (
    <div className="mvp-main-blog-wrap left relative">
      <div className="mvp-main-box">
        <div className="mvp-main-blog-cont left relative">
          <header id="mvp-post-head" className="left relative">
            <h2 className="mvp-post-title left entry-title" itemProp="headline">
              {q ? (
                <>
                  Search results for &quot;{q}&quot;
                </>
              ) : (
                "Search"
              )}
            </h2>
          </header>
          <div className="mvp-main-blog-out left relative">
            <div className="mvp-main-blog-in">
              <div className="mvp-main-blog-body left relative">
                {!q ? (
                  <div className="mvp-search-text left relative">
                    <p>Enter a search term above.</p>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="mvp-search-text left relative">
                    <p>Sorry, your search did not match any entries.</p>
                  </div>
                ) : (
                  <ul className="mvp-blog-story-list left relative infinite-content">
                    {posts.filter(hasThumbnail).map((post) => (
                      <li key={post.id} className="mvp-blog-story-wrap left relative infinite-post">
                        <Link href={getPostPath(post)} rel="bookmark">
                          <div className="mvp-blog-story-out relative">
                            {hasThumbnail(post) && (
                              <div className="mvp-blog-story-img left relative">
                                <PostImage
                                  src={getPostImage(post)}
                                  alt={post.title}
                                  className="mvp-reg-img mvp-big-img"
                                  width={800}
                                  height={500}
                                />
                                <PostImage
                                  src={getPostImage(post)}
                                  alt={post.title}
                                  className="mvp-mob-img"
                                  width={330}
                                  height={200}
                                  style={{ width: "100%", height: "auto", objectFit: "cover" }}
                                />
                              </div>
                            )}
                            <div className="mvp-blog-story-in">
                              <div className="mvp-blog-story-text left relative">
                                <div className="mvp-cat-date-wrap left relative">
                                  <span className="mvp-cd-cat left relative">{post.category}</span>
                                  <span className="mvp-cd-date left relative">{post.timeAgo}</span>
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
                )}
                <div className="mvp-inf-more-wrap left relative">
                  <div className="mvp-nav-links">
                    {posts.length > 0 && <Link href="/news">Page 1 of 1</Link>}
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
