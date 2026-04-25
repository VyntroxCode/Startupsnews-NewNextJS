"use client";

import { useEffect, useState } from "react";

interface AuthorProfileAvatarProps {
  name: string;
  avatarUrl?: string | null;
}

export function AuthorProfileAvatar({ name, avatarUrl }: AuthorProfileAvatarProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const next = typeof avatarUrl === "string" && avatarUrl.trim() ? avatarUrl.trim() : null;
    setImgSrc(next);
    setErrored(false);
  }, [avatarUrl]);

  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "A";
  const showImage = Boolean(imgSrc) && !errored;

  return (
    <div className="author-page-avatar" aria-label={`${name} profile photo`}>
      {showImage ? (
        <>
          <div
            className="author-page-avatar-bg"
            style={{ backgroundImage: `url(${imgSrc})` }}
            aria-hidden
          />
          <img
            src={imgSrc as string}
            alt={name}
            className="author-page-avatar-main"
            onError={() => setErrored(true)}
          />
        </>
      ) : (
        <span className="author-page-avatar-initial" aria-hidden>{initial}</span>
      )}
    </div>
  );
}
