'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  getAdminUser,
  verifyToken,
  clearAdminSession,
  AdminUser,
  updateLastActivity,
  isSessionIdle,
  getIdleTimeoutMs,
} from '@/lib/admin-auth';
import { isPathAllowed, defaultPathForRole } from '@/lib/admin-role-access';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { clearAllAdminApiCache } from '@/hooks/useAdminData';

const ADMIN_DATA_UPDATED_EVENT = 'admin:data-updated';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  // The sidebar rests as a 70px icon rail and opens on hover, matching the HR Tool's own
  // sidebar. The header button PINS it open rather than toggling it, because once hover
  // drives the width a plain "close" has nothing to hold against the next mouse-over.
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarOpen = sidebarPinned || sidebarHovered;
  const [contentRefreshKey, setContentRefreshKey] = useState(0);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Allow access to login page without auth
      if (pathname === '/admin/login') {
        setLoading(false);
        return;
      }

      const storedUser = getAdminUser();
      if (!storedUser) {
        setLoading(false);
        router.replace('/admin/login');
        return;
      }

      // Verify token with server (with timeout so we don't hang forever)
      const timeoutMs = 10000;
      const verifiedUser = await Promise.race([
        verifyToken(),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('Verification timeout')), timeoutMs)
        ),
      ]).catch(() => null);

      if (!verifiedUser) {
        clearAdminSession();
        setLoading(false);
        router.replace('/admin/login');
        return;
      }

      if (!isPathAllowed(verifiedUser.role, pathname)) {
        setUser(verifiedUser);
        setLoading(false);
        router.replace(defaultPathForRole(verifiedUser.role));
        return;
      }

      setUser(verifiedUser);
      updateLastActivity();
      setLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  useEffect(() => {
    if (pathname === '/admin/login') {
      return;
    }

    const logoutForInactivity = () => {
      clearAdminSession();
      setUser(null);
      router.replace('/admin/login');
    };

    const scheduleIdleTimeout = () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      idleTimeoutRef.current = setTimeout(() => {
        logoutForInactivity();
      }, getIdleTimeoutMs());
    };

    const handleActivity = () => {
      updateLastActivity();
      scheduleIdleTimeout();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isSessionIdle()) {
        logoutForInactivity();
      }
    };

    if (isSessionIdle()) {
      logoutForInactivity();
      return;
    }

    scheduleIdleTimeout();
    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];
    for (const eventName of activityEvents) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, handleActivity);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname, router]);

  useEffect(() => {
    const win = window as typeof window & {
      __adminFetchPatched?: boolean;
      __adminOriginalFetch?: typeof fetch;
    };

    if (win.__adminFetchPatched) {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    win.__adminOriginalFetch = originalFetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();

      const response = await originalFetch(input, init);

      // Exclude specific upload/auth paths that shouldn't trigger random full-page refreshes.
      // hr-tool is excluded too — it manages its own client-side state via HrToolContext (a
      // single bootstrap fetch + optimistic local updates on every save) and doesn't need or
      // want this blanket remount; without this, every single save in the HR Tool (rules,
      // directory edits, etc) force-remounted the whole widget ~150ms later, which reset all of
      // its state to initialState() and was reported as "saving kicks me back to the Dashboard"
      // — the sessionStorage-remembered `view` (see HrToolContext's VIEW_STORAGE_KEY) papers
      // over the worst of it, but the full state wipe + reloading flash still happened every time.
      const isSpecialPath = requestUrl.includes('/api/admin/upload') ||
                            requestUrl.includes('/api/admin/presign') ||
                            requestUrl.includes('/api/admin/auth/') ||
                            requestUrl.includes('/api/admin/media/ingest') ||
                            requestUrl.includes('/api/admin/hr-tool');

      if (response.ok && method !== 'GET' && requestUrl.includes('/api/admin/') && !isSpecialPath) {
        // Clear the cache directly here, not just via the event below — the event only reaches a
        // useAdminData instance that's currently MOUNTED, which isn't the case when the write
        // came from an edit/create page (the list page is unmounted at that moment). Without
        // this, saving from an edit page left the list's cache stale until it naturally expired.
        clearAllAdminApiCache();
        window.dispatchEvent(
          new CustomEvent(ADMIN_DATA_UPDATED_EVENT, {
            detail: {
              method,
              url: requestUrl,
              timestamp: Date.now(),
            },
          })
        );

        // Fallback for admin pages that do not use useAdminData
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }

        refreshTimeoutRef.current = setTimeout(() => {
          router.refresh();
          // Force remount so client-only admin pages also reload their data effects.
          setContentRefreshKey((prev) => prev + 1);
        }, 150);
      }

      return response;
    };

    win.__adminFetchPatched = true;

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [router]);

  const toggleSidebar = () => {
    setSidebarPinned((pinned) => !pinned);
  };

  // Show loading state
 if (loading) {
    return (
      <>
        <meta name="robots" content="noindex, nofollow" />
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div>Loading...</div>
        </div>
      </>
    );
  }

  // Login page doesn't need layout
  if (pathname === '/admin/login') {
    return (
      <>
        <meta name="robots" content="noindex, nofollow" />
        {children}
      </>
    );
  }

  // Header height constant (must match AdminSidebar)
  const headerHeight = 60;
  // Follows the sidebar's ACTUAL width, hover included — not just the pin. Keying this to the pin
  // alone let a hover-opened sidebar float over the page, which read as the content being cut off:
  // the sidebar is position:fixed, so the 190px it gains on hover simply covered the page title,
  // the tab bar and the table's first column. The content moves with it instead.
  const sidebarWidth = sidebarOpen ? 260 : 70;
  // HR Management renders its own full-bleed app shell (sidebar, header, rounded card) —
  // the standard 2rem content padding left a visible gap around it instead of the widget
  // sitting flush against the real admin header/sidebar.
  const contentPadding = pathname === '/admin/hr-tool' ? '0' : '2rem';

  // Admin pages with layout
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7fafc',
      }}
    >
      <meta name="robots" content="noindex, nofollow" />
      {/* Fixed Header */}
      <AdminHeader
        user={user}
        sidebarOpen={sidebarPinned}
        onToggleSidebar={toggleSidebar}
      />

      {/* Fixed Sidebar - positioned below header */}
      <AdminSidebar isOpen={sidebarOpen} onHoverChange={setSidebarHovered} />

      {/* Main Content Area - accounts for fixed header and sidebar */}
      <div
        style={{
          marginTop: `${headerHeight}px`,
          marginLeft: `${sidebarWidth}px`,
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: `calc(100vh - ${headerHeight}px)`,
        }}
      >
        <main
          key={contentRefreshKey}
          style={{
            padding: contentPadding,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
