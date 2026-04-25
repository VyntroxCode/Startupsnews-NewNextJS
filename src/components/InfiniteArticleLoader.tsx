"use client";

type InfiniteArticleLoaderProps = {
  initialPosts?: Array<{ id: string }>;
  availableSlugs?: string[];
};

/**
 * Fallback loader component.
 * Keeps single-post pages buildable when infinite scroll is disabled/unavailable.
 */
export function InfiniteArticleLoader(_props: InfiniteArticleLoaderProps) {
  return null;
}
