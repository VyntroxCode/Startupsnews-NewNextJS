"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface AuthorPostCardImageProps {
  src?: string;
  alt: string;
}

export function AuthorPostCardImage({ src, alt }: AuthorPostCardImageProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const next = typeof src === "string" && src.trim() ? src.trim() : null;
    setImgSrc(next);
    setErrored(false);
  }, [src]);

  if (!imgSrc || errored) {
    return <div className="author-grid-image-fallback" aria-hidden />;
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      unoptimized
      sizes="(max-width: 767px) 100vw, 50vw"
      className="author-grid-image-main"
      style={{ objectFit: "contain", objectPosition: "center" }}
      onError={() => setErrored(true)}
    />
  );
}
