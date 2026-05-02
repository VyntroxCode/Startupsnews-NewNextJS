"use client";

import Link from "next/link";
import Image from "next/image";
import { PostImage } from "@/components/PostImage";
import type { Post } from "@/lib/data-adapter";
import { getPostImage, hasThumbnail, toNewsBrief, stripFeaturedImageFromContent, getPostPath } from "@/lib/post-utils";

interface FullArticleProps {
    post: Post;
    related?: Post[];
    prev?: Post | null;
    next?: Post | null;
}

/** Format YYYY-MM-DD to "Month DD, YYYY" like the demo */
function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr + "T12:00:00");
        return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
        return dateStr;
    }
}

function toAuthorSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "author";
}

function getAuthorHref(post: Post): string {
    const displayName = (post.authorName || post.sourceAuthor || post.sourceName || "Zox News Staff").trim();
    const slug = post.authorSlug || toAuthorSlug(displayName);

    if ((post.authorType === "source" || post.sourceAuthor || post.sourceName) && displayName) {
        return `/author/${slug}?type=source&name=${encodeURIComponent(displayName)}`;
    }

    if (post.authorId) {
        return `/author/${slug}?type=staff&id=${post.authorId}`;
    }

    return `/author/${slug}?type=staff`;
}

export function FullArticle({ post, related = [], prev, next }: FullArticleProps) {
    const contentWithoutDuplicateFeatured = stripFeaturedImageFromContent(post.content || "", post.image || "");
    const postPath = `/${post.slug}`;

    return (
        <article className="mvp-article-wrap" itemScope itemType="http://schema.org/NewsArticle">
            <meta itemProp="mainEntityOfPage" itemType="https://schema.org/WebPage" itemID={postPath} />
            <div id="mvp-article-cont" className="left relative">
                <div className="mvp-main-box">
                    <nav className="event-by-country-breadcrumb" aria-label="Breadcrumb">
                                <Link href="/" className="event-by-country-breadcrumb-link">
                                  Home
                                </Link>
                                <span className="event-by-country-breadcrumb-separator" aria-hidden="true">
                                  /
                                </span>
                                <Link href={`/${post.categorySlug}`} className="event-by-country-breadcrumb-link">
                                  {post.category}
                                </Link>
                                <span className="event-by-country-breadcrumb-separator" aria-hidden="true">
                                  /
                                </span>
                                <span className="event-by-country-breadcrumb-current" aria-current="page">
                                  {post.title}
                                </span>
                              </nav>
                    <div id="mvp-post-main" className="left relative">
                        <div id="mvp-post-main-out" className="left relative">
                            <div id="mvp-post-main-in" className="left relative">
                                <div id="mvp-post-content" className="left relative">
                                    
                                    <header id="mvp-post-head" className="left relative">
                                        <h3 className="mvp-post-cat left relative">
                                            <Link className="mvp-post-cat-link" href={`/${post.categorySlug}`}>
                                                <span className="mvp-post-cat left">{post.category}</span>
                                            </Link>
                                        </h3>
                                        <h2 className="mvp-post-title left entry-title post-heading-max-3-lines" itemProp="headline">
                                            {post.title}
                                        </h2>
                                        <div className="mvp-author-info-wrap left relative">
                                            {(post.sourceName || post.sourceAuthor || post.sourceLogoUrl) ? (
                                                <>
                                                    <div className="mvp-author-info-thumb left relative" style={{ width: 46, height: 46, borderRadius: "8px", overflow: "hidden", flexShrink: 0, backgroundColor: "#f0f0f0" }}>
                                                        {post.sourceLogoUrl ? (
                                                            <img
                                                                src={post.sourceLogoUrl}
                                                                alt={post.sourceName ? `${post.sourceName} logo` : "Source logo"}
                                                                width={46}
                                                                height={46}
                                                                style={{ width: 46, height: 46, objectFit: "contain" }}
                                                                onError={(e) => {
                                                                    const img = e.currentTarget;
                                                                    if (img.src.includes("/images/author-fallback.svg")) return;
                                                                    img.src = "/images/author-fallback.svg";
                                                                }}
                                                            />
                                                        ) : (
                                                            <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", color: "#888" }} aria-hidden>©</span>
                                                        )}
                                                    </div>
                                                    <div className="mvp-author-info-text left relative">
                                                        <div className="mvp-author-info-date left relative">
                                                            <p>Published</p>{" "}
                                                            {/* Srishti  */}
                                                            {/* <span className="mvp-post-date">{post.timeAgo}</span>{" "}
                                                            <p>on</p>{" "}
                                                            <time className="mvp-post-date updated" itemProp="datePublished" dateTime={post.date}>
                                                                {formatDate(post.date)}
                                                            </time> */}
                                                        </div>
                                                        <div className="mvp-author-info-name left relative" itemProp="author" itemScope itemType="https://schema.org/Person">
                                                            {post.sourceName && (
                                                                <span className="mvp-source-prefix" style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#666", marginBottom: "2px" }}>
                                                                    Via {post.sourceName}
                                                                </span>
                                                            )}
                                                            <Link href={getAuthorHref(post)} className="author-name vcard fn author" itemProp="name">
                                                                {post.authorName || post.sourceAuthor || post.sourceName || "Source"}
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="mvp-author-info-thumb left relative">
                                                        <Image
                                                            src={post.authorAvatarUrl || "/images/author-fallback.svg"}
                                                            alt={post.authorName || "Author"}
                                                            className="mvp-author-avatar-circle"
                                                            width={46}
                                                            height={46}
                                                            style={{ width: 46, height: 46, objectFit: "cover", borderRadius: "50%" }}
                                                            onError={(e) => {
                                                                const img = e.currentTarget as HTMLImageElement;
                                                                if (img.src.includes("/images/author-fallback.svg")) return;
                                                                img.src = "/images/author-fallback.svg";
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="mvp-author-info-text left relative">
                                                        <div className="mvp-author-info-date left relative">
                                                            <p>Published</p>{" "}
                                                            {/* srishti */}
                                                            {/* <span className="mvp-post-date">{post.timeAgo}</span>{" "}
                                                            <p>on</p>{" "}
                                                            <time className="mvp-post-date updated" itemProp="datePublished" dateTime={post.date}>
                                                                {formatDate(post.date)}
                                                            </time> */}
                                                        </div>
                                                        <div className="mvp-author-info-name left relative" itemProp="author" itemScope itemType="https://schema.org/Person">
                                                            <p>By</p>{" "}
                                                            <Link href={getAuthorHref(post)} className="author-name vcard fn author" itemProp="name">
                                                                {post.authorName}
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </header>
                                    <div id="mvp-post-feat-img" className="left relative" itemScope itemType="https://schema.org/ImageObject">
                                        <PostImage
                                            src={post.image}
                                            alt={post.title}
                                            width={1200}
                                            height={630}
                                            style={{ width: "100%", height: "auto", objectFit: "cover" }}
                                        />
                                        <meta itemProp="url" content={post.image} />
                                    </div>
                                    <div id="mvp-content-wrap" className="left relative">
                                        <div className="mvp-post-soc-out right relative">
                                            <div className="mvp-post-soc-in">
                                                <div id="mvp-content-body" className="left relative">
                                                    <div id="mvp-content-main" className="left relative">
                                                        {/* Show full content whenever available; fallback to excerpt only when content is empty. */}
                                                        {post.content && post.content.trim() ? (
                                                            <div 
                                                                className="mvp-post-content-body" 
                                                                style={{ fontSize: "1rem", lineHeight: 1.8, color: "#333" }}
                                                                dangerouslySetInnerHTML={{ __html: contentWithoutDuplicateFeatured }}
                                                            />
                                                        ) : toNewsBrief(post.excerpt) ? (
                                                            <p className="mvp-post-brief" style={{ fontSize: "1.1rem", lineHeight: 1.6, color: "#333", textAlign: 'justify' }}>{toNewsBrief(post.excerpt)}</p>
                                                        ) : (
                                                            <p className="mvp-content-unavailable" style={{ color: "#666" }}>Summary not available.</p>
                                                        )}
                                                    </div>

                                                    <div id="mvp-content-bot" className="left">
                                                        <div className="mvp-post-tags" style={{ borderBottom: "1px solid #eee", paddingBottom: "15px", marginBottom: "30px", textAlign: "left" }}>
                                                            <span className="mvp-post-tags-header" style={{ fontWeight: 800, fontSize: "11px", textTransform: "uppercase", color: "#333" }}>Related Topics:</span>
                                                            <span itemProp="keywords" style={{ color: "#999", fontSize: "11px", marginLeft: "10px", textTransform: "uppercase" }}>
                                                                {post.tags && post.tags.length > 0
                                                                    ? post.tags.map((tag, i) => (
                                                                        <span key={tag}>{i > 0 ? " " : null}<Link href={`/${post.categorySlug}`} style={{ color: "#999" }}>#{tag}</Link></span>
                                                                    ))
                                                                    : <Link href={`/${post.categorySlug}`} style={{ color: "#999" }}>#{post.category}</Link>}
                                                            </span>
                                                        </div>

                                                        {/* Disclaimer Section */}
                                                        <div id="mvp-disclaimer-wrap" className="left" style={{ borderTop: "2px solid #ea5455", paddingTop: "30px", marginTop: "30px", marginBottom: "30px" }}>
                                                            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#333", marginBottom: "15px" }}>Disclaimer</h3>
                                                            <p style={{ fontSize: "0.95rem", lineHeight: 1.8, color: "#555", fontStyle: "italic", marginBottom: "15px", textAlign: "justify" }}>
                                                                We strive to uphold the highest ethical standards in all of our reporting and coverage. We StartupNews.fyi want to be transparent with our readers about any potential conflicts of interest that may arise in our work. It's possible that some of the investors we feature may have connections to other businesses, including competitors or companies we write about. However, we want to assure our readers that this will not have any impact on the integrity or impartiality of our reporting. We are committed to delivering accurate, unbiased news and information to our audience, and we will continue to uphold our ethics and principles in all of our work. Thank you for your trust and support.
                                                            </p>
                                                            <p style={{ fontSize: "0.95rem", lineHeight: 1.8, color: "#555", marginBottom: "0" }}>
                                                                Website Upgradation is going on for any glitch kindly connect at <Link href="mailto:office@startupnews.fyi" style={{ color: "#ea5455", textDecoration: "none", fontWeight: 600 }}>office@startupnews.fyi</Link>
                                                            </p>
                                                        </div>

                                                        <div id="mvp-prev-next-wrap" className="left relative">
                                                            {prev && prev.id !== post.id && (
                                                                <div className="mvp-prev-post-wrap left relative">
                                                                    <Link href={getPostPath(prev)} rel="bookmark" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
                                                                        <span className="mvp-prev-arr fa fa-chevron-left left" aria-hidden="true" style={{ fontSize: "2rem", color: "#ccc", marginRight: "15px" }}></span>
                                                                        <div className="mvp-prev-next-text left relative">
                                                                            <span className="mvp-prev-next-label left relative">Don&apos;t Miss</span>
                                                                            <p>{prev.title}</p>
                                                                        </div>
                                                                    </Link>
                                                                </div>
                                                            )}
                                                            {next && (
                                                                <div className="mvp-next-post-wrap right relative">
                                                                    <Link href={getPostPath(next)} rel="bookmark" style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", textAlign: "right", textDecoration: "none" }}>
                                                                        <div className="mvp-prev-next-text left relative">
                                                                            <span className="mvp-prev-next-label left relative" style={{ textAlign: "right", width: "100%" }}>Up Next</span>
                                                                            <p>{next.title}</p>
                                                                        </div>
                                                                        <span className="mvp-next-arr fa fa-chevron-right right" aria-hidden="true" style={{ fontSize: "2rem", color: "#ccc", marginLeft: "15px" }}></span>
                                                                    </Link>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {related.length > 0 && (
                                                    <div className="mvp-cont-read-wrap">
                                                        <div id="mvp-related-posts" className="left relative">
                                                            <h4 className="mvp-widget-home-title">
                                                                <span className="mvp-widget-home-title">MORE NEWS</span>
                                                            </h4>
                                                            <ul className="mvp-related-posts-list left relative related">
                                                                {related.filter(hasThumbnail).map((p) => (
                                                                    <li key={p.id} className="left relative">
                                                                        <Link href={getPostPath(p)} rel="bookmark">
                                                                            {hasThumbnail(p) && (
                                                                                <div className="mvp-related-img left relative">
                                                                                    <PostImage
                                                                                        src={getPostImage(p)}
                                                                                        alt={p.title}
                                                                                        fill
                                                                                        className="mvp-related-thumb"
                                                                                        sizes="(max-width: 767px) 160px, 640px"
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                            <div className="mvp-related-text left relative">
                                                                                <p className="post-heading-max-3-lines">{p.title}</p>
                                                                            </div>
                                                                        </Link>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );
}
