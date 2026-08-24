/** Shared centered page title + pink underline used at the top of standalone content pages
 * (About Us, Advertise With Us, Editorial Policy, Our Partners, Contact Us, ...), right below
 * the PageBreadcrumb — one consistent title treatment instead of each page styling its own. */
export function PageHeading({ title }: { title: string }) {
  return (
    <div className="site-page-heading">
      <h1>{title}</h1>
    </div>
  );
}
