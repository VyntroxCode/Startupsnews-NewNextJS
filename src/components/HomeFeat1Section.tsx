import Link from "next/link";
import { PostImage } from "@/components/PostImage";
import type { Post } from "@/lib/data-adapter";
import { getPostPath } from "@/lib/post-utils";

interface HomeFeat1SectionProps {
  title: string;
  categorySlug: string;
  top: [Post | null, Post | null];
  bottom: [Post | null, Post | null, Post | null, Post | null];
  url: string;
}

/** Home Featured 1 layout: 2 large top + 4 smaller bottom. Used for Tech. */
export function HomeFeat1Section({ title, categorySlug, top, bottom,url }: HomeFeat1SectionProps) {
  return (
    <section className="mvp-widget-home left relative">
      <div className="mvp-main-box">
        <div className="mvp-widget-home-head">
          <Link href={`/${categorySlug}`}>
              <h4 className="mvp-widget-home-title">
                <span className="mvp-widget-home-title">{title}</span>
              </h4>
            </Link>
        </div>
        <div className="mvp-widget-feat1-wrap left relative">
          <div className="mvp-widget-feat1-cont left relative">
            {top[0] && top[0].image && (
              <Link href={getPostPath(top[0])} rel="bookmark">
                <div className="mvp-widget-feat1-top-story left relative">
                  <div className="mvp-widget-feat1-top-img left relative" style={{ position: "relative", height: 354 }}>
                    <PostImage
                      src={top[0].image || ''}
                      alt={top[0].title}
                      fill
                      sizes="(max-width: 767px) 100vw, 590px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div className="mvp-widget-feat1-top-text left relative">
                    <div className="mvp-cat-date-wrap left relative">
                      <span className="mvp-cd-cat left relative">{top[0].category}</span>
                      {/* srishti */}
                      {/* <span className="mvp-cd-date left relative">{top[0].timeAgo}</span> */}
                    </div>
                    <h2 className="post-heading-max-3-lines">{top[0].title}</h2>
                  </div>
                </div>
              </Link>
            )}
            {top[1] && top[1].image && (
              <Link href={getPostPath(top[1])} rel="bookmark">
                <div className="mvp-widget-feat1-top-story left relative">
                  <div className="mvp-widget-feat1-top-img left relative" style={{ position: "relative", height: 354 }}>
                    <PostImage
                      src={top[1].image || ''}
                      alt={top[1].title}
                      fill
                      sizes="(max-width: 767px) 100vw, 590px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div className="mvp-widget-feat1-top-text left relative">
                    <div className="mvp-cat-date-wrap left relative">
                      <span className="mvp-cd-cat left relative">{top[1].category}</span>
                      {/* srishti */}
                      {/* <span className="mvp-cd-date left relative">{top[1].timeAgo}</span> */}
                    </div>
                    <h2 className="post-heading-max-3-lines">{top[1].title}</h2>
                  </div>
                </div>
              </Link>
            )}
          </div>
          <div className="mvp-widget-feat1-cont left relative">
            {bottom.filter((p): p is Post => p !== null && p.image !== undefined).map((post) => (
              <Link key={post.id} href={getPostPath(post)} rel="bookmark">
                <div className="mvp-widget-feat1-bot-story left relative">
                  <div className="mvp-widget-feat1-bot-img left relative" style={{ position: "relative" }}>
                    <PostImage
                      src={post.image || ''}
                      alt={post.title}
                      fill
                      sizes="(max-width: 767px) 100vw, 400px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                  <div className="mvp-widget-feat1-bot-text left relative">
                    <div className="mvp-cat-date-wrap left relative">
                      <span className="mvp-cd-cat left relative">{post.category}</span>
                      {/* srishti */}
                      {/* <span className="mvp-cd-date left relative">{post.timeAgo}</span> */}
                    </div>
                    <h2 className="post-heading-max-3-lines">{post.title}</h2>
                    {/* <p className="post-card-excerpt-max-3-lines">{post.excerpt}</p> */}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <Link href={`/${categorySlug}`}>
                  <div className="mvp-widget-feat2-side-more-but left relative">
                    <span className="mvp-widget-feat2-side-more">Read More</span>
                    <i className="fa fa-long-arrow-right" aria-hidden="true"></i>
                  </div>
                </Link>
      </div>
    </section>
  );
}
