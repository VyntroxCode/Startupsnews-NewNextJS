"use client";

import Image, { type ImageProps } from "next/image";
import type { ImgHTMLAttributes, SyntheticEvent } from "react";

const AUTHOR_FALLBACK = "/images/author-fallback.svg";

function swapToFallback(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.src.includes(AUTHOR_FALLBACK)) return;
  img.src = AUTHOR_FALLBACK;
}

/**
 * The byline images on an article, swapped to the author fallback if they fail to load. Kept as
 * the only client pieces of FullArticle (onError needs a browser handler) so the article itself
 * stays a Server Component.
 */
export function SourceLogoImg(props: ImgHTMLAttributes<HTMLImageElement>) {
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img {...props} onError={swapToFallback} />;
}

export function AuthorAvatarImage(props: ImageProps) {
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image {...props} onError={swapToFallback} />;
}
