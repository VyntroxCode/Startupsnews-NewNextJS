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
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

      // Exclude specific upload/auth paths that shouldn't trigger random full-page refreshes
      const isSpecialPath = requestUrl.includes('/api/admin/upload') ||
                            requestUrl.includes('/api/admin/presign') ||
                            requestUrl.includes('/api/admin/auth/') ||
                            requestUrl.includes('/api/admin/media/ingest');

      if (response.ok && method !== 'GET' && requestUrl.includes('/api/admin/') && !isSpecialPath) {
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
    setSidebarOpen(!sidebarOpen);
  };

  // Show loading state
  if (loading) {
    return (
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
    );
  }

  // Login page doesn't need layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Header height constant (must match AdminSidebar)
  const headerHeight = 60;
  const sidebarWidth = sidebarOpen ? 260 : 70;

  // Admin pages with layout
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7fafc',
      }}
    >
      {/* Fixed Header */}
      <AdminHeader
        user={user}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
      />

      {/* Fixed Sidebar - positioned below header */}
      <AdminSidebar isOpen={sidebarOpen} />

      {/* Main Content Area - accounts for fixed header and sidebar */}
      <div
        style={{
          marginTop: `${headerHeight}px`,
          marginLeft: `${sidebarWidth}px`,
          transition: 'margin-left 0.3s ease',
          minHeight: `calc(100vh - ${headerHeight}px)`,
        }}
      >
        <main
          key={contentRefreshKey}
          style={{
            padding: '2rem',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
