'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getEmployeeUser, clearEmployeeSession, type EmployeeUser } from '@/lib/employee-auth';

function AttendanceIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"></circle>
      <polyline points="12 7 12 12 15.5 14"></polyline>
    </svg>
  );
}

function RulesPolicyIcon({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2h6a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"></path>
      <path d="M9 4h6"></path>
      <line x1="8" y1="10" x2="16" y2="10"></line>
      <line x1="8" y1="14" x2="16" y2="14"></line>
      <line x1="8" y1="18" x2="12" y2="18"></line>
    </svg>
  );
}

// Written as a list so future employee-facing sections slot in the same way without
// restructuring the sidebar.
const NAV_ITEMS: { href: string; label: string; icon: typeof AttendanceIcon }[] = [
  { href: '/employee/attendance', label: 'Attendance', icon: AttendanceIcon },
  { href: '/employee/rules-policy', label: 'Rules & Policy', icon: RulesPolicyIcon },
];

const SIDEBAR_WIDTH = 260;

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<EmployeeUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      const stored = getEmployeeUser();
      if (!stored) {
        router.replace('/admin/login');
        return;
      }
      setUser(stored);
      setChecked(true);
    };
    checkSession();
  }, [router]);

  function handleLogout() {
    clearEmployeeSession();
    router.replace('/admin/login');
  }

  if (!checked || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7fafc', color: '#64748b' }}>
        Loading…
      </div>
    );
  }

  const asideStyle: CSSProperties = {
    width: SIDEBAR_WIDTH, flexShrink: 0, background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
    borderRight: '1px solid rgba(0,0,0,0.06)', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column',
    minHeight: '100vh', boxShadow: '2px 0 8px rgba(0,0,0,0.02)',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc', display: 'flex' }}>
      <aside style={asideStyle}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.25rem 0.5rem 1.25rem',
          borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: '1.25rem',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700,
            fontSize: 16, flexShrink: 0,
          }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.name}
            </div>
            <div style={{ color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>{user.employeeCode}</div>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          <div style={{
            fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8',
            fontWeight: 700, padding: '0 0.75rem', marginBottom: '0.5rem',
          }}>
            Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.9rem', borderRadius: 8,
                  color: isActive ? '#6366f1' : '#475569', background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                  textDecoration: 'none', fontWeight: isActive ? 600 : 500, fontSize: '0.9rem', marginBottom: '0.2rem',
                  borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                }}
              >
                <Icon color={isActive ? '#6366f1' : '#94a3b8'} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            padding: '0.65rem 1rem', background: '#fff', color: '#b91c1c', border: '1px solid #fecaca',
            borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', marginTop: '1rem',
          }}
        >
          Logout
        </button>
      </aside>

      <main style={{ flex: 1, padding: '2rem 2.5rem', maxWidth: 1100 }}>{children}</main>
    </div>
  );
}
