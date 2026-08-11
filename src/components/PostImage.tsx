"use client";

import Image, { ImageProps } from "next/image";
import { useState, useEffect } from "react";

interface PostImageProps extends Omit<ImageProps, "style"> {
  /** Wrapper style (kept for backward compatibility in this codebase) */
  style?: React.CSSProperties;
  /** Real <img> style passed to next/image */
  imageStyle?: React.CSSProperties;
  /** Whether to render a blurred background copy of the image behind a contained foreground image */
  containWithBackdrop?: boolean;
}

/**
 * Post image. Keeps layout stable: when src is empty or image fails to load,
 * renders a grey placeholder of the same size so the layout does not change.
 * Syncs to src prop when it changes (e.g. client navigation or async data).
 */
export function PostImage({
  src,
  alt,
  width,
  height,
  fill,
  className,
  style,
  imageStyle,
  ...rest
}: PostImageProps) {
  const FALLBACK_POST_IMAGE = "/images/banner-fallback.svg";

  const resolveInitialSrc = (value: unknown): string => {
    if (typeof value === "string" && value.trim()) return value.trim();
    return FALLBACK_POST_IMAGE;
  };

  const [imgSrc, setImgSrc] = useState(() =>
    resolveInitialSrc(src)
  );
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setImgSrc(resolveInitialSrc(src));
    setErrored(false);
  }, [src]);

  const showImage = !errored && imgSrc && imgSrc.length > 0;

  const isFill = fill === true;
  const numericWidth = typeof width === "number" ? width : undefined;
  const numericHeight = typeof height === "number" ? height : undefined;
  const hasBackdrop = !!rest.containWithBackdrop;
  
  // Remove containWithBackdrop before spreading to Next/Image
  const { containWithBackdrop, ...imageProps } = rest;

  const wrapperStyle: React.CSSProperties = isFill
    ? { position: "relative", width: "100%", height: "100%", minHeight: 0, display: "block", overflow: "hidden" }
    : {
        position: "relative",
        display: "block",
        width: numericWidth ?? "100%",
        height: numericHeight ?? "100%",
        overflow: "hidden",
      };

  const placeholderStyle: React.CSSProperties = isFill
    ? { position: "absolute", inset: 0, backgroundColor: "#e0e0e0" }
    : {
        width: "100%",
        height: "100%",
        backgroundColor: "#e0e0e0",
        minWidth: numericWidth ?? undefined,
        minHeight: numericHeight ?? undefined,
      };

  return (
    <span
      style={{ ...wrapperStyle, ...(style as React.CSSProperties) }}
      data-post-image-wrapper
    >
      {showImage ? (
        <>
          {hasBackdrop && (
            <Image
              {...imageProps}
              src={imgSrc!}
              alt=""
              width={width}
              height={height}
              fill={fill}
              className={className}
              style={{
                objectFit: "cover",
                objectPosition: "center",
                filter: "blur(28px) saturate(1.5)",
                opacity: 0.6,
                transform: "scale(1.2)",
              }}
            />
          )}
          <Image
            {...imageProps}
            src={imgSrc!}
            alt={alt}
            width={width}
            height={height}
            fill={fill}
            className={className}
            onError={() => {
              if (imgSrc !== FALLBACK_POST_IMAGE) {
                setImgSrc(FALLBACK_POST_IMAGE);
                return;
              }
              setErrored(true);
            }}
            style={{
              objectFit: hasBackdrop ? "cover" : (imageStyle?.objectFit ?? "cover"),
              objectPosition: "center",
              zIndex: hasBackdrop ? 1 : undefined,
              ...imageStyle,
            }}
          />
        </>
      ) : (
        <span
          className={`post-image-placeholder ${className ?? ""}`.trim()}
          style={placeholderStyle}
          aria-hidden
        />
      )}
    </span>
  );
}
