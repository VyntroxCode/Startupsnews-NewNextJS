import Link from "next/link";
import { PostImage } from "@/components/PostImage";
import type { Post } from "@/lib/data-adapter";
import { getPostPath } from "@/lib/post-utils";

interface HomeDarkSectionProps {
  title: string;
  categorySlug: string;
  featured: Post | null;
  list: Post[];
  url: string;
}

/** Home Dark Widget: dark background, 1 large featured left + 4 list items right. Used for Videos. */
export function HomeDarkSection({ title, categorySlug, featured, list,url }: HomeDarkSectionProps) {
  return (
    <section className="mvp-widget-home left relative">
      <div className="mvp-widget-dark-wrap left relative">
        <div className="mvp-main-box">
          <div className="mvp-widget-home-head">
            <Link href={`/${categorySlug}`}>
              <h4 className="mvp-widget-home-title">
                <span className="mvp-widget-home-title">{title}</span>
              </h4>
            </Link>
          </div>
          <div className="mvp-widget-dark-main left relative">
            <div className="mvp-widget-dark-left left relative">
              {featured && featured.image && (
                <Link href={getPostPath(featured)} rel="bookmark">
                  <div className="mvp-widget-dark-feat left relative">
                    <div className="mvp-widget-dark-feat-img left relative" style={{ position: "relative", height: 443 }}>
                      <PostImage
                        src={featured.image || ''}
                        alt={featured.title}
                        fill
                        sizes="(max-width: 767px) 100vw, 740px"
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                    <div className="mvp-widget-dark-feat-text left relative">
                      <div className="mvp-cat-date-wrap left relative">
                        <span className="mvp-cd-cat left relative">{featured.category}</span>
                        {/* srishti */}
                        {/* <span className="mvp-cd-date left relative">{featured.timeAgo}</span> */}
                      </div>
                      <h2 className="post-heading-max-3-lines">{featured.title}</h2>
                    </div>
                  </div>
                </Link>
              )}
            </div>
            <div className="mvp-widget-dark-right left relative">
              {list.filter((p) => p.image).slice(0, 4).map((post) => (
                <Link key={post.id} href={getPostPath(post)} rel="bookmark">
                  <div className="mvp-widget-dark-sub left relative">
                    <div className="mvp-widget-dark-sub-out right relative">
                      <div className="mvp-widget-dark-sub-img left relative">
                        <PostImage
                          src={post.image || ''}
                          alt={post.title}
                          width={400}
                          height={240}
                          style={{ width: "100%", height: "auto", objectFit: "cover" }}
                          sizes="(max-width: 767px) 100vw, 400px"
                        />
                      </div>
                      <div className="mvp-widget-dark-sub-in">
                        <div className="mvp-widget-dark-sub-text left relative">
                          <div className="mvp-cat-date-wrap left relative">
                            <span className="mvp-cd-cat left relative">{post.category}</span>
                            {/* srishti */}
                            {/* <span className="mvp-cd-date left relative">{post.timeAgo}</span> */}
                          </div>
                          <h2 className="post-heading-max-3-lines">{post.title}</h2>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              <Link href={`/${categorySlug}`}>
                  <div className="mvp-widget-feat2-side-more-but left relative">
                    <span className="mvp-widget-feat2-side-more">Read More</span>
                    <i className="fa fa-long-arrow-right" aria-hidden="true"></i>
                  </div>
                </Link>
            </div>
            
          </div>
        </div>
      </div>
    </section>
  );
}
