"use client";

/** One logo tile in a horizontal-scroll partner row — clickable (opens linkUrl in a new tab)
 * when a link is set, otherwise just displayed. Hides itself if the image URL 404s/breaks. */
export function PartnerLogoTile({ imageUrl, linkUrl }: { imageUrl: string; linkUrl: string | null }) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- external/admin-uploaded logo URLs of unknown origin, not local optimizable assets
    <img
      src={imageUrl}
      alt=""
      className="partners-logo-img"
      loading="lazy"
      onError={(e) => {
        const tile = (e.target as HTMLImageElement).closest("[data-logo-tile]") as HTMLElement | null;
        if (tile) tile.style.display = "none";
      }}
    />
  );

  return (
    <div className="partners-logo-tile" data-logo-tile="1">
      {linkUrl ? (
        <a href={linkUrl} target="_blank" rel="noopener noreferrer" aria-label="Visit partner site">
          {img}
        </a>
      ) : (
        img
      )}
    </div>
  );
}
