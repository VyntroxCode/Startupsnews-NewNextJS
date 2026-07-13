"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/config";
import { FlyMenuButton } from "@/components/FlyMenuButton";

interface AuthUser { id: number; name: string; email: string; }

const AVATAR_COLORS = [
  '#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#06b6d4',
];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export function Header() {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const avatarClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle search icon click - on mobile expand input first; do not open overlay
  const handleSearchClick = (e: React.MouseEvent) => {
    if (window.innerWidth <= 767) {
      if (isSearchExpanded) return;
      e.preventDefault();
      e.stopPropagation();
      setIsSearchExpanded(true);
    }
  };

  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = searchInputRef.current;
    if (input && input.value.trim()) {
      // Navigate to search page
      window.location.href = `/search?q=${encodeURIComponent(input.value.trim())}`;
    }
  };

  // Focus input when expanded
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Close search when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isSearchExpanded &&
        searchWrapRef.current &&
        !searchWrapRef.current.contains(e.target as Node) &&
        window.innerWidth <= 767
      ) {
        setIsSearchExpanded(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSearchExpanded && window.innerWidth <= 767) {
        setIsSearchExpanded(false);
      }
    };

    if (isSearchExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isSearchExpanded]);

  // Handle scroll detection for enhanced shadow effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      setIsScrolled(scrollY > 10);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => { window.removeEventListener("scroll", handleScroll); };
  }, []);

  // Read auth user from localStorage + listen for changes
  useEffect(() => {
    const readAuth = () => {
      try {
        const raw = localStorage.getItem('pub_auth_user');
        setAuthUser(raw ? JSON.parse(raw) : null);
      } catch { setAuthUser(null); }
    };
    readAuth();
    window.addEventListener('storage', readAuth);
    // Also listen for login/logout events fired by AuthModal
    window.addEventListener('pub-auth-changed', readAuth);
    return () => {
      window.removeEventListener('storage', readAuth);
      window.removeEventListener('pub-auth-changed', readAuth);
    };
  }, []);

  // Close user dropdown when clicking outside
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuOpen]);

  // Clean up pending avatar click timer on unmount
  useEffect(() => {
    return () => {
      if (avatarClickTimer.current) clearTimeout(avatarClickTimer.current);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pub_auth_token');
    localStorage.removeItem('pub_auth_user');
    setAuthUser(null);
    setUserMenuOpen(false);
    window.dispatchEvent(new Event('pub-auth-changed'));
  };

  return (
    <header 
      id="mvp-main-head-wrap" 
      ref={headerRef}
      className={`left relative startupnews-nav ${isScrolled ? "scrolled" : ""}`}
    >
      <nav id="mvp-main-nav-wrap" className="left relative">
        <div id="mvp-main-nav-bot" className="left">
          <div id="mvp-main-nav-bot-cont" className="left">
            <div className="mvp-main-box">
              <div id="mvp-nav-bot-wrap" className="left relative startupnews-nav-inner">
                <div className="mvp-nav-bot-right-out left">
                  <div className="mvp-nav-bot-right-in">
                    <div className="mvp-nav-bot-cont left">
                      <div className="mvp-nav-bot-left-out">
                        <div className="mvp-nav-bot-left left relative">
                          <FlyMenuButton />
                        </div>
                        <div className="mvp-nav-bot-left-in startupnews-nav-left">
                          <Link href="/" className="startupnews-logo-link">
                            <Image
                              src={siteConfig.logo}
                              alt={siteConfig.name}
                              width={220}
                              height={46}
                              className="startupnews-logo"
                              priority
                            />
                          </Link>
                          <div className="mvp-nav-menu left startupnews-menu">
                            <ul>
                              {siteConfig.menu.map((item) => {
                                const isExternal = item.href && item.href.startsWith("http");
                                const linkContent = (
                                  <>
                                    {item.label}
                                    {"hasDropdown" in item && item.hasDropdown && (
                                      <span className="startupnews-dropdown-arrow">▼</span>
                                    )}
                                  </>
                                );

                                const handleProtectedClick = (e: React.MouseEvent) => {
                                  const token = typeof window !== 'undefined' ? localStorage.getItem('pub_auth_token') : null;
                                  if (!token) {
                                    e.preventDefault();
                                    window.dispatchEvent(new CustomEvent('open-auth-modal'));
                                  } else {
                                    e.preventDefault();
                                    window.location.href = '/dashboard/reports';
                                  }
                                };

                                return (
                                <li key={item.label} className={item.children ? "startupnews-menu-item-has-children" : ""}>
                                  {item.href ? (
                                    isExternal ? (
                                      <a href={item.href} target="_blank" rel="noopener noreferrer">
                                        {linkContent}
                                      </a>
                                    ) : "requiresAuth" in item && item.requiresAuth ? (
                                      <Link href={item.href} onClick={handleProtectedClick}>{linkContent}</Link>
                                    ) : (
                                      <Link href={item.href}>{linkContent}</Link>
                                    )
                                  ) : (
                                    <span className="startupnews-menu-item-no-click">{linkContent}</span>
                                  )}
                                  {item.children && (
                                    <ul className="startupnews-dropdown-menu">
                                      {item.children.map((subItem) => {
                                        const subExternal = subItem.href.startsWith("http");
                                        return (
                                          <li key={subItem.href}>
                                            {subExternal ? (
                                              <a href={subItem.href} target="_blank" rel="noopener noreferrer">{subItem.label}</a>
                                            ) : (
                                              <Link href={subItem.href}>{subItem.label}</Link>
                                            )}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  )}
                                </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mvp-nav-bot-right left relative startupnews-search-wrap" ref={searchWrapRef} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <form
                    className={`startupnews-search ${isSearchExpanded ? "startupnews-search-expanded" : ""}`}
                    onSubmit={handleSearchSubmit}
                  >
                    <input
                      ref={searchInputRef}
                      type="search"
                      placeholder="Search..."
                      className="startupnews-search-input"
                      aria-label="Search"
                    />
                    <button
                      type="submit"
                      className="startupnews-search-btn"
                      aria-label="Search"
                      onClick={handleSearchClick}
                    >
                      <i className="fa fa-search" aria-hidden></i>
                    </button>
                  </form>

                  {/* User avatar / login button */}
                  <div ref={userMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
                    {authUser ? (
                      <>
                        <button
                          onClick={() => {
                            if (avatarClickTimer.current) clearTimeout(avatarClickTimer.current);
                            avatarClickTimer.current = setTimeout(() => {
                              window.location.href = '/dashboard';
                            }, 250);
                          }}
                          onDoubleClick={() => {
                            if (avatarClickTimer.current) {
                              clearTimeout(avatarClickTimer.current);
                              avatarClickTimer.current = null;
                            }
                            setUserMenuOpen(prev => !prev);
                          }}
                          title={`${authUser.name} — click for dashboard, double-click to sign out`}
                          style={{
                            width: 34, height: 34, borderRadius: '50%',
                            background: avatarColor(authUser.name),
                            border: '2px solid #fff',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                            color: '#fff', fontWeight: 800, fontSize: 14,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            letterSpacing: 0, lineHeight: 1, flexShrink: 0,
                          }}
                        >
                          {authUser.name.charAt(0).toUpperCase()}
                        </button>
                        {userMenuOpen && (
                          <div style={{
                            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                            background: '#fff', borderRadius: 8, padding: '2px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.16)', border: '1px solid #e5e7eb',
                            zIndex: 99999,
                          }}>
                            {/* Sign out */}
                            <button
                              onClick={handleLogout}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '6px 10px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#dc2626', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap', borderRadius: 6 }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                              Sign Out
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-auth-modal'))}
                        title="Sign in"
                        style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: '#f3f4f6', border: '2px solid #e5e7eb',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#6b7280', flexShrink: 0,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ee1761'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#ee1761'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f3f4f6'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </button>
                    )}
                  </div>

                  {/* Hamburger menu for mobile - right side */}
                  <div className="mvp-nav-bot-right-mobile-hamburger">
                    <FlyMenuButton />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
