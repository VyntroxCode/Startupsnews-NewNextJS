"use client";

function formatCardDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const month = d.toLocaleDateString("en-IN", { month: "short" }).toUpperCase();
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
}

interface PreviewCardProps {
  title: string;
  image1: string;
  country: string;
  region: string;
  startDate: string;
  endDate: string;
}

export function PreviewCard({ title, image1, country, region, startDate, endDate }: PreviewCardProps) {
  const dateText = startDate
    ? formatCardDate(startDate) + (endDate && endDate !== startDate ? " TO " + formatCardDate(endDate) : "")
    : "Date";
  const regionText = country === "India" ? region || "India" : country || "International";

  return (
    <>
      <div className="preview-label">Preview</div>
      <div className="preview-card">
        <div
          className="preview-media"
          style={image1 ? { backgroundImage: `url('${image1}')`, color: "transparent" } : undefined}
        >
          {image1 ? "" : "Cover image"}
        </div>
        <div className="preview-body">
          <div className="preview-date">{dateText}</div>
          <div className="preview-eyebrow">{regionText}</div>
          <div className="preview-title">{title || "Your event title will appear here"}</div>
        </div>
      </div>
    </>
  );
}
