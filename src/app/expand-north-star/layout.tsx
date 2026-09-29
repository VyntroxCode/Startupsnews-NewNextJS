import "../isolated-tailwind.css";

// Only DelegationBenefits uses Tailwind utilities on this page; the other sections keep
// expand-north-star.css. The shared sheet scopes class detection with its own @source list.
export default function ExpandNorthStarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
