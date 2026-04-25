'use client';

import { useRouter } from 'next/navigation';
import { clearAdminSession, AdminUser } from '@/lib/admin-auth';

interface AdminHeaderProps {
  user: AdminUser | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export default function AdminHeader({ user, sidebarOpen, onToggleSidebar }: AdminHeaderProps) {
  const router = useRouter();

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      clearAdminSession();
      router.push('/admin/login');
    }
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <button
          onClick={onToggleSidebar}
          style={{
            padding: '0.625rem',
            background: 'transparent',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
            e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.08)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: '#475569',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {sidebarOpen ? (
              <>
                <path d="M18 6L6 18M6 6l12 12" />
              </>
            ) : (
              <>
                <path d="M3 12h18M3 6h18M3 18h18" />
              </>
            )}
          </svg>
        </button>
        <div>
          <h1
            style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              margin: 0,
              color: '#0f172a',
              letterSpacing: '-0.01em',
            }}
          >
            Welcome back, {user?.name || user?.email?.split('@')[0] || 'Admin'}
          </h1>
          <p
            style={{
              fontSize: '0.75rem',
              color: '#64748b',
              margin: '0.125rem 0 0 0',
              fontWeight: '400',
            }}
          >
            {user?.role || 'Administrator'}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.625rem 1.25rem',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(239, 68, 68, 0.2)';
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
