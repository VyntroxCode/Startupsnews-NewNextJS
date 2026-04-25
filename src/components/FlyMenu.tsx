"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/config";
import { useFlyMenu } from "@/components/FlyMenuContext";

type FlyMenuItem = {
  id?: string;
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
  dividerBefore?: boolean;
};

function isExpandable(item: FlyMenuItem): item is FlyMenuItem & { id: string; children: { label: string; href: string }[] } {
  return "id" in item && Array.isArray(item.children) && item.children.length > 0;
}

export function FlyMenu() {
  const { toggle } = useFlyMenu();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const flyMenu = siteConfig.flyMenu as FlyMenuItem[];

  return (
    <div id="mvp-fly-wrap" className="startupnews-fly">
      <div id="mvp-fly-menu-top">

        <button
          type="button"
          className="startupnews-fly-close"
          onClick={toggle}
          aria-label="Close menu"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M1 1L17 17M1 17L17 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div id="mvp-fly-menu-wrap">
        <nav className="mvp-fly-nav-menu startupnews-fly-nav">
          <ul>
            {flyMenu.map((item) => {
              const isExternal = (item.href ?? "").startsWith("http");
              if (isExpandable(item)) {
                const isOpen = expandedId === item.id;
                return (
                  <li key={item.id} className={`startupnews-fly-item startupnews-fly-expandable${item.dividerBefore ? ' startupnews-fly-divider' : ''}`}>
                    <div className="startupnews-fly-row">
                      {item.href ? (isExternal ? (
                        <a
                          href={item.href ?? "#"}
                          onClick={toggle}
                          className="startupnews-fly-label"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.label}
                        </a>
                      ) : (
                        <Link
                          href={item.href ?? "#"}
                          onClick={toggle}
                          className="startupnews-fly-label"
                        >
                          {item.label}
                        </Link>
                      )) : (
                        <span className="startupnews-fly-label">{item.label}</span>
                      )}
                      <button
                        type="button"
                        className={`startupnews-fly-toggle${isOpen ? ' active' : ''}`}
                        onClick={() => setExpandedId(isOpen ? null : item.id)}
                        aria-expanded={isOpen}
                        aria-label={isOpen ? "Collapse" : "Expand"}
                      >
                        <i className={`fa ${isOpen ? 'fa-minus' : 'fa-plus'}`} aria-hidden="true"></i>
                      </button>
                    </div>
                    {isOpen && (
                      <ul className="startupnews-fly-sub">
                        {item.children.map((sub) => (
                          <li key={sub.href}>
                            <Link
                              href={sub.href}
                              onClick={toggle}
                            >
                              {sub.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }
              return (
                <li
                  key={item.label}
                  className={`startupnews-fly-item${item.dividerBefore ? " startupnews-fly-divider" : ""}`}
                >
                  {isExternal ? (
                    <a
                      href={item.href ?? "#"}
                      onClick={toggle}
                      className="startupnews-fly-label"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      href={item.href ?? "#"}
                      onClick={toggle}
                      className="startupnews-fly-label"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div id="mvp-fly-soc-wrap" className="startupnews-fly-soc">
        <span className="mvp-fly-soc-head startupnews-fly-soc-head">CONNECT WITH US</span>
        <ul className="mvp-fly-soc-list">
          {siteConfig.social.facebook && (
            <li>
              <a
                href={siteConfig.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="fab fa-facebook-f"
                aria-label="Facebook"
              ></a>
            </li>
          )}
          {siteConfig.social.twitter && (
            <li>
              <a
                href={siteConfig.social.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="fa-brands fa-x-twitter"
                aria-label="Twitter"
              ></a>
            </li>
          )}
          {siteConfig.social.instagram && (
            <li>
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="fab fa-instagram"
                aria-label="Instagram"
              ></a>
            </li>
          )}
          {siteConfig.social.linkedin && (
            <li>
              <a
                href={siteConfig.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="fab fa-linkedin-in"
                aria-label="LinkedIn"
              ></a>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
