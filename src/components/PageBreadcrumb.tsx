import Link from "next/link";

/** Shared "Home / {Current}" breadcrumb for standalone content pages (About Us, Advertise With
 * Us, Editorial Policy, Our Partners, Contact Us, ...) — same classes the /events pages already
 * use, so every page's breadcrumb renders identically. */
export function PageBreadcrumb({ current }: { current: string }) {
  return (
    <nav className="event-by-country-breadcrumb" aria-label="Breadcrumb">
      <Link href="/" className="event-by-country-breadcrumb-link">
        Home
      </Link>
      <span className="event-by-country-breadcrumb-separator" aria-hidden="true">
        /
      </span>
      <span className="event-by-country-breadcrumb-current" aria-current="page">
        {current}
      </span>
    </nav>
  );
}
