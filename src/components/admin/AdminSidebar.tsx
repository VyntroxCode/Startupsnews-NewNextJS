'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAdminUser, getAuthHeaders } from '@/lib/admin-auth';
import { isPathAllowed } from '@/lib/admin-role-access';

interface AdminSidebarProps {
  isOpen: boolean;
}

type IconProps = { size?: number; color?: string };

interface ToolItem {
  id: number;
  name: string;
  slug: string;
}


const DashboardIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1"></rect>
    <rect x="14" y="3" width="7" height="7" rx="1"></rect>
    <rect x="14" y="14" width="7" height="7" rx="1"></rect>
    <rect x="3" y="14" width="7" height="7" rx="1"></rect>
  </svg>
);

const PostsIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

const EventsIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const NewsletterIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const ToolsIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
  </svg>
);

const ReportsIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
  </svg>
);

const BrandStoriesIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
  </svg>
);

const RegisteredUsersIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <line x1="19" y1="8" x2="19" y2="14"></line>
    <line x1="22" y1="11" x2="16" y2="11"></line>
  </svg>
);

const UsersIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const ContactsIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2"></rect>
    <circle cx="9" cy="10" r="2"></circle>
    <path d="M5 17c.5-2 2-3 4-3s3.5 1 4 3"></path>
    <line x1="14" y1="9" x2="19" y2="9"></line>
    <line x1="14" y1="13" x2="19" y2="13"></line>
  </svg>
);

const AttendanceIcon = ({ size = 20, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"></circle>
    <polyline points="12 7 12 12 15.5 14"></polyline>
  </svg>
);

interface MenuItem {
  href: string;
  label: string;
  icon: (props: IconProps) => React.JSX.Element;
  /** Extra restriction on top of isPathAllowed — only these roles see it in the sidebar
   * even if the path itself is technically open to everyone (e.g. 'all' roles). */
  roles?: string[];
}

const menuItems: MenuItem[] = [
  { href: '/admin', label: 'Dashboard', icon: DashboardIcon },
  { href: '/admin/posts', label: 'Posts', icon: PostsIcon },
  // Events no longer has its own sidebar item — Partnership Tracker (below) is now the
  // primary entry point and links out to /admin/events, /events?tab=regions and
  // /events?tab=banners itself ("View:" row) for anyone who needs those tables directly.
  { href: '/admin/partnership-tracker', label: 'Partnership Tracker', icon: EventsIcon },
  { href: '/admin/newsletter', label: 'Newsletter', icon: NewsletterIcon },
  { href: '/admin/sales-tracker', label: 'Sales Tracker', icon: ReportsIcon },
  { href: '/admin/hr-tool', label: 'HR Management', icon: RegisteredUsersIcon },
  { href: '/admin/attendance', label: 'Attendance', icon: AttendanceIcon, roles: ['event_admin', 'publisher_admin'] },
  { href: '/admin/tools', label: 'Tools', icon: ToolsIcon },
  { href: '/admin/reports', label: 'Reports', icon: ReportsIcon },
  { href: '/admin/brand-stories', label: 'Brand Stories', icon: BrandStoriesIcon },
  { href: '/admin/registered-users', label: 'Registered Users', icon: RegisteredUsersIcon },
  { href: '/admin/contacts', label: 'Directory', icon: ContactsIcon },
  { href: '/admin/users', label: 'Users', icon: UsersIcon },
];

export default function AdminSidebar({ isOpen }: AdminSidebarProps) {
  const pathname = usePathname();
  const headerHeight = 60;
  const [tools, setTools] = useState<ToolItem[]>([]);
  const role = getAdminUser()?.role || '';
  const visibleMenuItems = menuItems.filter((item) => isPathAllowed(role, item.href) && (!item.roles || item.roles.includes(role)));

  useEffect(() => {
    const loadTools = async () => {
      try {
        const res = await fetch('/api/admin/tools', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) setTools(data.data);
      } catch {}
    };
    loadTools();
    const handler = () => loadTools();
    window.addEventListener('admin:data-updated', handler);
    return () => window.removeEventListener('admin:data-updated', handler);
  }, []);

  return (
    <aside
      className="admin-sidebar-scroll"
      style={{
        position: 'fixed',
        left: 0,
        top: `${headerHeight}px`,
        width: isOpen ? '260px' : '70px',
        height: `calc(100dvh - ${headerHeight}px)`,
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderRight: '1px solid rgba(0, 0, 0, 0.06)',
        padding: '1.25rem 0',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 999,
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '2px 0 8px rgba(0, 0, 0, 0.02)',
      }}
    >
      <nav style={{ padding: '0 0.5rem 1.5rem' }}>
        {visibleMenuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const isToolsItem = item.href === '/admin/tools';
          const IconComponent = item.icon;
          return (
            <div key={item.href}>
              {/* Main menu item */}
              <Link
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  gap: isOpen ? '0.875rem' : '0',
                  padding: isOpen ? '0.875rem 1.25rem' : '0.875rem 0',
                  marginBottom: '0.25rem',
                  color: isActive ? '#6366f1' : '#475569',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)'
                    : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                  borderRadius: '8px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  position: 'relative',
                  fontWeight: isActive ? '600' : '500',
                }}
                title={!isOpen ? item.label : undefined}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = '#f1f5f9';
                    e.currentTarget.style.color = '#334155';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#475569';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '24px', height: '24px' }}>
                  <IconComponent size={20} color={isActive ? '#6366f1' : 'currentColor'} />
                </div>
                {isOpen && (
                  <span style={{ fontSize: '0.9375rem', transition: 'opacity 0.2s', flex: 1 }}>
                    {item.label}
                  </span>
                )}
                {/* Count badge */}
                {isToolsItem && isOpen && tools.length > 0 && (
                  <span style={{ fontSize: '0.7rem', background: '#e0e7ff', color: '#4f46e5', borderRadius: '9999px', padding: '0.1rem 0.45rem', fontWeight: 700 }}>
                    {tools.length}
                  </span>
                )}
              </Link>

              {/* Dynamic tool sub-items */}
              {isToolsItem && isOpen && tools.length > 0 && (
                <div style={{ paddingLeft: '2.25rem', marginBottom: '0.5rem' }}>
                  {tools.map(tool => {
                    const toolHref = `/admin/tools/${tool.id}`;
                    const isToolActive = pathname === toolHref;
                    return (
                      <Link
                        key={tool.id}
                        href={toolHref}
                        title={tool.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.45rem 0.75rem',
                          marginBottom: '0.1rem',
                          color: isToolActive ? '#6366f1' : '#64748b',
                          background: isToolActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                          textDecoration: 'none',
                          borderRadius: '7px',
                          borderLeft: isToolActive ? '2px solid #6366f1' : '2px solid #e2e8f0',
                          fontSize: '0.84rem',
                          fontWeight: isToolActive ? 600 : 400,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => {
                          if (!isToolActive) {
                            e.currentTarget.style.background = '#f1f5f9';
                            e.currentTarget.style.color = '#334155';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isToolActive) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#64748b';
                          }
                        }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: isToolActive ? '#6366f1' : '#cbd5e1', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tool.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })}
      </nav>
    </aside>
  );
}
