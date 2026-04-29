import Link from "next/link";
import { PostImage } from "@/components/PostImage";
import type { Post } from "@/lib/data-adapter";
import { getPostPath } from "@/lib/post-utils";

interface HomeWidgetSectionProps {
  title: string;
  categorySlug: string;
  featured: Post | null;
  right: [Post | null, Post | null];
  list: Post[];
  url: string;
  /** "left" = 1 big left, 2 right (Entertainment). "middle" = 2 stacked left, 1 big right (Business). */
  mainpos?: "left" | "middle";
}

/** Home Featured 2 layout: 1 big featured + 2 smaller + sidebar. mainpos "middle" swaps so 2 left, 1 big right. */
export function HomeWidgetSection({ title, categorySlug, featured, right, list, url, mainpos = "left" }: HomeWidgetSectionProps) {
  const leftClassName = mainpos === "middle"
    ? "mvp-widget-feat2-left left relative mvp-widget-feat2-left-alt"
    : "mvp-widget-feat2-left left relative";

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
        <div className="mvp-widget-feat2-wrap left relative">
          <div className="mvp-widget-feat2-out left relative">
            <div className="mvp-widget-feat2-in">
              <div className="mvp-widget-feat2-main left relative">
                {/* When mainpos=middle this div floats right so the 2 "right" posts appear on the left */}
                <div className={leftClassName}>
                  {featured && featured.image && (
                    <Link href={getPostPath(featured)} rel="bookmark">
                      <div className="mvp-widget-feat2-left-cont left relative">
                        <div className="mvp-feat1-feat-img left relative" style={{ position: "relative", height: 557 }}>
                          <PostImage
                            src={featured.image || ''}
                            alt={featured.title}
                            fill
                            sizes="(max-width: 767px) 100vw, 560px"
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                        <div className="mvp-feat1-feat-text left relative">
                          <div className="mvp-cat-date-wrap left relative">
                            <span className="mvp-cd-cat left relative">{featured.category}</span>
                            {/* srishti */}
                            {/* <span className="mvp-cd-date left relative">{featured.timeAgo}</span> */}
                          </div>
                          <h2 className="mvp-stand-title post-heading-max-3-lines">{featured.title}</h2>
                          {/* <p className="post-card-excerpt-max-3-lines">{featured.excerpt}</p> */}
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
                <div className="mvp-widget-feat2-right left relative">
                  {right[0] && right[0].image && (
                    <Link href={getPostPath(right[0])} rel="bookmark">
                      <div className="mvp-widget-feat2-right-cont left relative">
                        <div className="mvp-widget-feat2-right-img left relative">
                          <PostImage
                            src={right[0].image || ''}
                            alt={right[0].title}
                            width={400}
                            height={240}
                            style={{ width: "100%", height: "auto", objectFit: "cover" }}
                            sizes="(max-width: 767px) 100vw, 400px"
                          />
                        </div>
                        <div className="mvp-widget-feat2-right-text left relative">
                          <div className="mvp-cat-date-wrap left relative">
                            <span className="mvp-cd-cat left relative">{right[0].category}</span>
                            {/* srishti */}
                            {/* <span className="mvp-cd-date left relative">{right[0].timeAgo}</span> */}
                          </div>
                          <h2 className="post-heading-max-3-lines">{right[0].title}</h2>
                        </div>
                      </div>
                    </Link>
                  )}
                  {right[1] && right[1].image && (
                    <Link href={getPostPath(right[1])} rel="bookmark">
                      <div className="mvp-widget-feat2-right-cont left relative">
                        <div className="mvp-widget-feat2-right-img left relative">
                          <PostImage
                            src={right[1].image || ''}
                            alt={right[1].title}
                            width={400}
                            height={240}
                            style={{ width: "100%", height: "auto", objectFit: "cover" }}
                            sizes="(max-width: 767px) 100vw, 400px"
                          />
                        </div>
                        <div className="mvp-widget-feat2-right-text left relative">
                          <div className="mvp-cat-date-wrap left relative">
                            <span className="mvp-cd-cat left relative">{right[1].category}</span>
                            {/* srishti */}
                            {/* <span className="mvp-cd-date left relative">{right[1].timeAgo}</span> */}
                          </div>
                          <h2 className="post-heading-max-3-lines">{right[1].title}</h2>
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            </div>
            <div className="mvp-widget-feat2-side left relative">
              <div className="mvp-widget-feat2-side-list left relative">
                <div className="mvp-feat1-list left relative">
                  {list.filter((p) => p.image).map((post) => (
                    <Link key={post.id} href={getPostPath(post)} rel="bookmark">
                      <div className="mvp-feat1-list-cont left relative">
                        <div className="mvp-feat1-list-out relative">
                          <div className="mvp-feat1-list-img left relative">
                            <PostImage
                              src={post.image || ''}
                              alt={post.title}
                              width={120}
                              height={72}
                              sizes="120px"
                              style={{ objectFit: "cover" }}
                            />
                          </div>
                          <div className="mvp-feat1-list-in">
                            <div className="mvp-feat1-list-text">
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
                </div>
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
      </div>
    </section>
  );
}
