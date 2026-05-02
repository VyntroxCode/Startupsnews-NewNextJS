import Link from "next/link";
import { PostImage } from "@/components/PostImage";
import { getPostImage, type Post } from "@/lib/data-adapter";
import { getPostPath } from "@/lib/post-utils";

interface MobileCategorySectionProps {
    title: string;
    posts: Post[];
    slug: string;
}

export function MobileCategorySection({ title, posts, slug }: MobileCategorySectionProps) {
    // We expect at least 4 posts (guaranteed by fillMobileSection in page.tsx)
    // [0] -> Featured 1 (Big)
    // [1] -> Featured 2 (Big) - Optional/Secondary
    // [2,3] -> List (2 small cards)

    const featured1 = posts[0] || null;
    const featured2 = posts[1] || null;
    const list = posts.slice(2, 4); // Get 2 small cards (indices 2 and 3)

    if (!featured1) return null;

    return (
        <section className="startupnews-mobile-latest-news">
            {/* Section Title */}
            <div className="startupnews-mobile-section-flex">
            <h2 className="startupnews-mobile-section-title">{title}</h2>
             {/* View More Link - Right Aligned */}
            <div className="startupnews-mobile-category-view-more">
                <Link href={`/${slug}`} className="startupnews-mobile-category-view-more-link">
                    MORE <i className="fa fa-long-arrow-right" aria-hidden="true" />
                </Link>
            </div>
            </div>
            {/* First Featured Article */}
            <div className="startupnews-mobile-featured">
                <Link href={getPostPath(featured1)} rel="bookmark" className="startupnews-mobile-featured-link">
                    <div className="startupnews-mobile-featured-image">
                        <PostImage
                            src={getPostImage(featured1)}
                            alt={featured1.title}
                            fill
                            className="mvp-reg-img"
                            sizes="100vw"
                            style={{ objectFit: "cover" }}
                            priority={false}
                        />
                        <PostImage
                            src={getPostImage(featured1)}
                            alt={featured1.title}
                            className="mvp-mob-img"
                            width={400}
                            height={300}
                            style={{ width: "100%", height: "auto", objectFit: "cover" }}
                            priority={false}
                        />
                    </div>
                    <div className="startupnews-mobile-featured-content">
                        <div className="startupnews-mobile-featured-meta">
                            <span className="startupnews-mobile-featured-category">{featured1.category}</span>
                            {/* srishti */}
                            {/* <span className="startupnews-mobile-featured-time">{featured1.timeAgo}</span> */}
                        </div>
                        <h2 className="startupnews-mobile-featured-title post-heading-max-3-lines">{featured1.title}</h2>
                    </div>
                </Link>
            </div>

            {/* Second Featured Article (Optional - but our filling logic usually provides it) */}
            {featured2 && (
                <div className="startupnews-mobile-featured">
                    <Link href={getPostPath(featured2)} rel="bookmark" className="startupnews-mobile-featured-link">
                        <div className="startupnews-mobile-featured-image">
                            <PostImage
                                src={getPostImage(featured2)}
                                alt={featured2.title}
                                fill
                                className="mvp-reg-img"
                                sizes="100vw"
                                style={{ objectFit: "cover" }}
                            />
                            <PostImage
                                src={getPostImage(featured2)}
                                alt={featured2.title}
                                className="mvp-mob-img"
                                width={400}
                                height={300}
                                style={{ width: "100%", height: "auto", objectFit: "cover" }}
                            />
                        </div>
                        <div className="startupnews-mobile-featured-content">
                            <div className="startupnews-mobile-featured-meta">
                                <span className="startupnews-mobile-featured-category">{featured2.category}</span>
                                {/* srishti */}
                                {/* <span className="startupnews-mobile-featured-time">{featured2.timeAgo}</span> */}
                            </div>
                            <h2 className="startupnews-mobile-featured-title post-heading-max-3-lines">{featured2.title}</h2>
                        </div>
                    </Link>
                </div>
            )}

            {/* Article Cards (List) - 2 small cards */}
            <div className="mvp-main-box">
                <ul className="startupnews-articles-list">
                    {list.map((post) => (
                        <li key={post.id} className="startupnews-article-card">
                            <Link href={getPostPath(post)} rel="bookmark">
                                <div className="startupnews-article-content">
                                    <div className="startupnews-article-meta">
                                        <span className="startupnews-category">{post.category}</span>
                                        {/* srishti */}
                                        {/* <span className="startupnews-date">{post.timeAgo}</span> */}
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

            {/* View More Link - Right Aligned */}
            {/* <div className="startupnews-mobile-category-view-more">
                <Link href={`/${slug}`} className="startupnews-mobile-category-view-more-link">
                    View More <i className="fa fa-long-arrow-right" aria-hidden="true" />
                </Link>
            </div> */}
        </section>
    );
}
