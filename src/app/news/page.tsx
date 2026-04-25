import Link from "next/link";
import { PostImage } from "@/components/PostImage";
import { getMoreNewsPosts, getStartupEvents, hasThumbnail } from "@/lib/data-adapter";
import { getPostPath } from "@/lib/post-utils";
// import { Sidebar } from "@/components/Sidebar"; // Unused
import { StickySidebarContent } from "@/components/StickySidebarContent";
import { StartupEventsSection } from "@/components/StartupEventsSection";

// Prevent build-time DB access; render at request time.
export const dynamic = 'force-dynamic';

export default async function NewsPage() {
  const [posts, events] = await Promise.all([
    getMoreNewsPosts([]),
    getStartupEvents(),
  ]);

  return (
    <div className="mvp-main-blog-wrap left relative mvp-main-blog-marg">
      <div className="mvp-main-box">
        <div className="mvp-main-blog-cont left relative">
          <div className="mvp-main-blog-out left relative">
            <div className="mvp-main-blog-in">
              <div className="mvp-main-blog-body left relative">
                <ul className="mvp-blog-story-list left relative infinite-content">
                  {posts.filter(hasThumbnail).map((post) => (
                    <li key={post.id} className="mvp-blog-story-wrap left relative infinite-post">
                      <Link href={getPostPath(post)} rel="bookmark">
                        <div className="mvp-blog-story-out relative">
                          {hasThumbnail(post) && (
                            <div className="mvp-blog-story-img left relative">
                              <PostImage
                                src={post.image || ''}
                              alt={post.title}
                              width={800}
                              height={500}
                              style={{ width: "100%", height: "auto", objectFit: "cover" }}
                                sizes="(max-width: 767px) 100vw, 800px"
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
                <StartupEventsSection events={events} />
              </StickySidebarContent>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
