"use client";

import { useState } from "react";
import Link from "next/link";
import { PostImage } from "@/components/PostImage";
import type { Post } from "@/lib/data-adapter";
import { getPostPath } from "@/lib/post-utils";

interface MoreNewsSectionProps {
  initialPosts: Post[];
  availableSlugs: string[];
  buttonText?: string;
}

export function MoreNewsSection({
  initialPosts,
  availableSlugs,
  buttonText = "More News",
}: MoreNewsSectionProps) {
  // Posts that are already loaded (initially from server)
  const [loadedPosts, setLoadedPosts] = useState<Post[]>(initialPosts);
  // Slugs that are yet to be loaded
  // initialPosts are already loaded, so we start after them if they are in the list?
  // Actually page.tsx will pass slugs for *remaining* posts or *all* posts?
  // Let's assume availableSlugs excludes the ones in initialPosts to be safe, or we handle index.
  // Better pattern: page.tsx passes `moreNews` (limits to 15) and `moreNewsSlugs` (all matching slugs).
  // We should slice `moreNewsSlugs` to ignore the first 15.

  // Wait, `getMoreNewsSlugs` in data-adapter generally returns ALL slugs matching the criteria.
  // `getMoreNewsPosts` returns the first N posts.
  // So `availableSlugs` will likely contain the slugs of `initialPosts` too.
  // We should filter them out or just rely on index.

  // Let's assume standard behavior: we have X posts. We want to load more from the list of slugs.
  // But we don't want to duplicate.

  const [loading, setLoading] = useState(false);

  // Normalized checking
  const loadedIds = new Set(loadedPosts.map(p => p.slug));
  const nextSlugs = availableSlugs.filter(slug => !loadedIds.has(slug));

  const hasMore = nextSlugs.length > 0;

  const loadMore = async () => {
    if (!hasMore || loading) return;

    setLoading(true);
    // Load next 5 posts
    const toLoad = nextSlugs.slice(0, 5);

    try {
      const newPosts = await Promise.all(
        toLoad.map(async (slug) => {
          try {
            // Slug is in format "category/post-slug" which matches the database format
            const res = await fetch(`/api/posts/${encodeURIComponent(slug)}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data.success ? data.data : null;
          } catch (e) {
            return null;
          }
        })
      );

      const validPosts = newPosts.filter((p): p is Post => p !== null);
      setLoadedPosts(prev => [...prev, ...validPosts]);
    } catch (err) {
      console.error("Failed to load more posts", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ul className="mvp-blog-story-list left relative infinite-content">
        {loadedPosts.map((post, index) => {
          return (
            <li key={post.id} className="mvp-blog-story-wrap left relative infinite-post">
              <Link href={getPostPath(post)} rel="bookmark">
                <div className="mvp-blog-story-out relative">
                  {post.image && (
                    <div className="mvp-blog-story-img left relative">
                      <PostImage
                        src={post.image || ''}
                        alt={post.title}
                        width={400}
                        height={240}
                        style={{ width: "100%", height: "auto", objectFit: "cover" }}
                        sizes="(max-width: 767px) 100vw, 400px"
                      />
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
                      <div className="read-more-link">
                        <span>
                          View More <i className="fa fa-long-arrow-right" aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mvp-inf-more-wrap left relative">
        {hasMore ? (
          <button
            type="button"
            className="mvp-inf-more-but"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? "Loading..." : buttonText}
          </button>
        ) : (
          <span className="mvp-inf-more-but" aria-hidden="true">
            No more posts
          </span>
        )}
      </div>
    </>
  );
}
