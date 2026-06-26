"use client";

import { useState } from "react";
import Link from "next/link";
import { PostImage } from "@/components/PostImage";

interface PostCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  categorySlug: string;
  timeAgo: string;
  image: string;
}

interface CategoryMorePostsProps {
  categorySlug: string;
  initialCount: number;
}

function getPostPath(post: { categorySlug: string; slug: string }): string {
  const slug = post.slug.startsWith(`${post.categorySlug}/`)
    ? post.slug.slice(post.categorySlug.length + 1)
    : post.slug;
  return `/${post.categorySlug}/${slug}`;
}

const LOAD_SIZE = 10;

export function CategoryMorePosts({ categorySlug, initialCount }: CategoryMorePostsProps) {
  const [posts, setPosts] = useState<PostCard[]>([]);
  const [offset, setOffset] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  async function loadMore() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/posts?category=${encodeURIComponent(categorySlug)}&offset=${offset}&limit=${LOAD_SIZE}`
      );
      const json = await res.json();
      const newPosts: PostCard[] = json.data ?? [];
      setPosts((prev) => [...prev, ...newPosts]);
      setOffset((prev) => prev + newPosts.length);
      if (newPosts.length < LOAD_SIZE) setHasMore(false);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {posts.length > 0 && (
        <ul className="mvp-blog-story-list left relative infinite-content">
          {posts.map((post) => (
            <li key={post.id} className="mvp-blog-story-wrap left relative infinite-post">
              <Link href={getPostPath(post)} rel="bookmark">
                <div className="mvp-blog-story-out relative">
                  {post.image && (
                    <div className="mvp-blog-story-img left relative">
                      <div
                        className="sector-thumb-image-bg"
                        aria-hidden
                        style={{ backgroundImage: `url("${post.image}")` }}
                      />
                      <div className="sector-thumb-image-fg">
                        <PostImage
                          src={post.image}
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

      {hasMore && (
        <div className="mvp-inf-more-wrap left relative">
          <button
            className="mvp-inf-more-but"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? "Loading..." : "More Posts"}
          </button>
        </div>
      )}
    </>
  );
}
