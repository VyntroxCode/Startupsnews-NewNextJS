"use client";

import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/config";
import "./footer-tailwind.css";

/* Styling: Tailwind with the `ft:` prefix, compiled by ./footer-tailwind.css (see its header for
   why the prefix, the `!` on link colour/transition, and transform-based motion).
   Breakpoints mirror the old globals.css max-width queries: max-[1025px] = ≤1024px,
   max-[769px] = ≤768px, max-[601px] = ≤600px (Tailwind's max-* is exclusive).
   Theme: --footer-bg / --footer-line are set on <footer> and swapped under html[data-theme=dark]. */

const EASE = "ft:ease-[cubic-bezier(0.22,1,0.36,1)]!";

/* Link hover: lift 2px + grow 4% + pink underline drawn left → right */
const LINK =
  "ft:relative ft:inline-block ft:font-medium ft:no-underline " +
  "ft:transition-[color,transform]! ft:duration-300! ft:ease-[cubic-bezier(0.22,1,0.36,1)]! " +
  "ft:hover:text-white! ft:hover:[transform:translateY(-2px)_scale(1.04)] " +
  "ft:focus-visible:text-white! ft:focus-visible:[transform:translateY(-2px)_scale(1.04)] " +
  "ft:after:absolute ft:after:left-0 ft:after:bottom-[-3px] ft:after:h-[2px] ft:after:w-full ft:after:rounded-[2px] " +
  "ft:after:bg-[#E62E69] ft:after:origin-left ft:after:[transform:scaleX(0)] " +
  "ft:after:transition-transform ft:after:duration-[350ms] ft:after:ease-[cubic-bezier(0.22,1,0.36,1)] " +
  "ft:hover:after:[transform:scaleX(1)] ft:focus-visible:after:[transform:scaleX(1)] " +
  "ft:motion-reduce:transition-none! ft:motion-reduce:after:transition-none " +
  "ft:motion-reduce:hover:[transform:none] ft:motion-reduce:focus-visible:[transform:none]";

const GRID_LINK = `${LINK} ft:origin-left ft:text-[14px] ft:text-[#b4b4b4]! ft:max-[601px]:text-[13px]`;
const POLICY_LINK = `${LINK} ft:origin-center ft:text-[13px] ft:text-[#8a8a8a]!`;

const SOCIAL_LINK =
  "ft:flex ft:size-11 ft:items-center ft:justify-center ft:rounded-full ft:border ft:border-solid ft:border-(--footer-line) " +
  "ft:bg-[rgb(255_255_255/0.04)] ft:text-[#b4b4b4]! " +
  "ft:transition-[transform,background,border-color,color,box-shadow]! ft:duration-[350ms]! " + EASE + " " +
  "ft:hover:[transform:translateY(-4px)_scale(1.08)] ft:hover:border-transparent ft:hover:text-white! " +
  "ft:hover:bg-[linear-gradient(135deg,#E62E69_0%,#9333ea_100%)] ft:hover:shadow-[0_10px_24px_-8px_rgb(230_46_105/0.6)] " +
  "ft:focus-visible:[transform:translateY(-4px)_scale(1.08)] ft:focus-visible:border-transparent ft:focus-visible:text-white! " +
  "ft:focus-visible:bg-[linear-gradient(135deg,#E62E69_0%,#9333ea_100%)] " +
  "ft:motion-reduce:transition-none! ft:motion-reduce:hover:[transform:none] ft:motion-reduce:focus-visible:[transform:none] " +
  "ft:max-[601px]:size-10";

const SOCIAL_ICON = "ft:size-[18px] ft:fill-current";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Topics",
    links: [
      { href: "/ai-deeptech", label: "AI & Deeptech" },
      { href: "/ev-mobility", label: "Ev & Mobility" },
      { href: "/social-media", label: "Social Media" },
      { href: "/ecommerce", label: "Ecommerce" },
      { href: "/gaming", label: "Gaming" },
      { href: "/press-release", label: "Press Release" },
    ],
  },
  {
    title: "For Founders",
    links: [
      { href: "/feature-your-startup", label: "Feature your Startup" },
      { href: "/submit-funding-round", label: "Submit your Funding Round" },
      { href: "/submit-press-release", label: "Submit your press release" },
      // { href: "#", label: "Get Media Coverage" },
    ],
  },
  {
    title: "Events",
    links: [
      { href: "/events", label: "Upcoming Events" },
      { href: "/events/dubai", label: "Tech Events in Dubai" },
      { href: "/events/singapore", label: "Tech Events in Singapore" },
      { href: "/events/bengaluru", label: "Startup Events in Bengaluru" },
      { href: "/sponsor-event", label: "Partner / Sponsor an Event" },
      { href: "/list-your-event", label: "List Your Event" },
    ],
  },
  {
    title: "For Investors",
    links: [
      // { href: "/dealflow-newsletter", label: "Dealflow Newsletter" },
      // { href: "/regional-reports", label: "Regional Reports" },
      // { href: "/speak-sponsor", label: "Speak / Sponsor Opportunities" },
      { href: "/funding-tracker", label: "Funding Tracker" },
      { href: "/dashboard/reports", label: "Indian Startup Funding Report" },
    ],
  },
  {
    title: "About Us",
    links: [
      { href: "/about-us", label: "About us" },
      { href: "/advertise-with-us", label: "Advertise with Us" },
      { href: "/editorial-policy", label: "Editorial Policy" },
      { href: "/our-partners", label: "Our Partners" },
      // { href: "/careers", label: "Careers" },
      { href: "/contact-us", label: "Contact Us" },
    ],
  },
];

const POLICY_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-and-conditions", label: "Terms and Conditions" },
  { href: "/return-refund-policy", label: "Return and Refund Policy" },
  { href: "/editorial-policy", label: "Editorial Policy" },
  // { href: "/delete-your-account", label: "Delete Your Account" },
];

/** `copyrightText` is resolved on the server (root layout → ConditionalLayout) so the admin-set
 * text is in the initial HTML rather than swapped in after hydration. */
export function Footer({ copyrightText }: { copyrightText: string }) {
  return (
    <footer
      className={
        "ft:relative ft:z-1 ft:clear-both ft:box-border ft:block ft:w-full ft:max-w-[100vw] ft:overflow-x-hidden " +
        "ft:[--footer-bg:#0a0a0a] ft:[--footer-line:#232323] ft:bg-(--footer-bg)! ft:text-white! " +
        "ft:[html[data-theme=dark]_&]:[--footer-bg:#07080C] ft:[html[data-theme=dark]_&]:[--footer-line:rgb(255_255_255/0.09)] " +
        "ft:[html[data-theme=dark]_&]:shadow-[inset_0_1px_0_var(--sn-line)] " +
        /* Thin brand-gradient seam along the top edge */
        "ft:before:absolute ft:before:top-0 ft:before:right-0 ft:before:left-0 ft:before:h-[2px] ft:before:opacity-70 " +
        "ft:before:bg-[linear-gradient(90deg,transparent_0%,#E62E69_30%,#9333ea_70%,transparent_100%)]"
      }
    >
      <div
        className={
          "ft:mx-auto ft:box-border ft:w-full ft:max-w-[1200px] ft:px-6 ft:pt-[72px] ft:pb-8 " +
          "ft:max-[1025px]:px-10 ft:max-[1025px]:pt-16 ft:max-[1025px]:pb-7 " +
          "ft:max-[601px]:px-5 ft:max-[601px]:pt-14 ft:max-[601px]:pb-6"
        }
      >
        {/* Brand row: logo + tagline | social */}
        <div
          className={
            "ft:flex ft:items-center ft:justify-between ft:gap-8 ft:border-b ft:border-solid ft:border-(--footer-line) ft:pb-12 " +
            "ft:max-[769px]:flex-col ft:max-[769px]:gap-6 ft:max-[769px]:pb-9 ft:max-[769px]:text-center"
          }
        >
          <div className="ft:flex ft:min-w-0 ft:flex-col ft:items-start ft:gap-4 ft:max-[769px]:items-center">
            <Link
              href="/"
              className={
                "ft:inline-block ft:transition-transform! ft:duration-[350ms]! " + EASE + " " +
                "ft:hover:[transform:translateY(-2px)_scale(1.02)] ft:motion-reduce:transition-none! ft:motion-reduce:hover:[transform:none]"
              }
            >
              <Image
                src={siteConfig.logoFoot}
                alt={siteConfig.name}
                width={250}
                height={60}
                className="ft:m-0 ft:block ft:h-auto ft:max-w-[220px] ft:bg-transparent ft:max-[769px]:max-w-[170px]"
              />
            </Link>
            <p className="ft:m-0 ft:max-w-[380px] ft:text-[15px] ft:leading-[1.6] ft:font-normal ft:text-[#8a8a8a] ft:max-[601px]:text-[14px]">
              Empowering innovation and connecting the startup ecosystem worldwide.
            </p>
          </div>

          <div className="ft:flex ft:shrink-0 ft:items-center ft:gap-3">
            {siteConfig.social.facebook && (
              <a href={siteConfig.social.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className={SOCIAL_LINK}>
                <svg viewBox="0 0 24 24" width="18" height="18" className={SOCIAL_ICON}>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            )}
            {siteConfig.social.instagram && (
              <a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className={SOCIAL_LINK}>
                <svg viewBox="0 0 24 24" width="18" height="18" className={SOCIAL_ICON}>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            )}
            {siteConfig.social.linkedin && (
              <a href={siteConfig.social.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className={SOCIAL_LINK}>
                <svg viewBox="0 0 24 24" width="18" height="18" className={SOCIAL_ICON}>
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Link grid: 5 → 3 (≤1024px) → 2 (≤768px) columns */}
        <div
          className={
            "ft:grid ft:grid-cols-5 ft:items-start ft:gap-10 ft:border-b ft:border-solid ft:border-(--footer-line) ft:py-12 " +
            "ft:max-[1025px]:grid-cols-3 ft:max-[1025px]:gap-x-8 " +
            "ft:max-[769px]:grid-cols-2 ft:max-[769px]:gap-x-6 ft:max-[769px]:gap-y-9 ft:max-[769px]:py-10"
          }
        >
          {COLUMNS.map((col) => (
            <div key={col.title} className="ft:group/col ft:min-w-0">
              <h3
                className={
                  "ft:relative ft:m-0 ft:mb-6 ft:inline-block ft:pb-2.5 ft:text-[15px] ft:leading-[1.3] ft:font-bold ft:tracking-[0.02em] ft:text-white! " +
                  "ft:max-[601px]:mb-4 ft:max-[601px]:text-[14px] " +
                  "ft:after:absolute ft:after:bottom-0 ft:after:left-0 ft:after:h-[3px] ft:after:w-7 ft:after:rounded-[3px] " +
                  "ft:after:bg-[linear-gradient(90deg,#E62E69_0%,#9333ea_100%)] " +
                  "ft:after:transition-[width] ft:after:duration-[400ms] ft:after:ease-[cubic-bezier(0.22,1,0.36,1)] " +
                  "ft:group-hover/col:after:w-full ft:motion-reduce:after:transition-none"
                }
              >
                {col.title}
              </h3>
              <ul className="ft:m-0 ft:flex ft:list-none ft:flex-col ft:gap-3.5 ft:p-0 ft:max-[601px]:gap-3">
                {col.links.map((link) => (
                  <li key={link.href} className="ft:m-0 ft:leading-[1.4]">
                    <Link href={link.href} className={GRID_LINK}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar: copyright | policy links; stacked on ≤768px with the policy links on top */}
        <div
          className={
            "ft:flex ft:flex-wrap ft:items-center ft:justify-between ft:gap-x-8 ft:gap-y-4 ft:pt-7 " +
            "ft:max-[769px]:flex-col-reverse ft:max-[769px]:justify-center ft:max-[769px]:text-center"
          }
        >
          <p className="ft:m-0 ft:text-[13px] ft:font-medium ft:text-[#8a8a8a]">{copyrightText}</p>

          <nav aria-label="Legal" className="ft:flex ft:flex-wrap ft:items-center ft:gap-x-3.5 ft:gap-y-2.5 ft:max-[769px]:justify-center">
            {POLICY_LINKS.map((link, i) => (
              <span key={link.href} className="ft:contents">
                {i > 0 && (
                  <span aria-hidden="true" className="ft:select-none ft:text-[13px] ft:leading-none ft:text-[#4a4a4a]">
                    /
                  </span>
                )}
                <Link href={link.href} className={POLICY_LINK}>
                  {link.label}
                </Link>
              </span>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
