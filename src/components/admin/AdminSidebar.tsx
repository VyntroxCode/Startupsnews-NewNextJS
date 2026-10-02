'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAdminUser, getAuthHeaders } from '@/lib/admin-auth';
import { isPathAllowed } from '@/lib/admin-role-access';
import {
  BookOpen,
  CalendarDays,
  CalendarPlus,
  ChartColumn,
  ClipboardList,
  Clock,
  Contact,
  FileText,
  Files,
  Landmark,
  LayoutDashboard,
  Layers,
  LogOut,
  Mail,
  Ticket,
  UserPlus,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

interface AdminSidebarProps {
  isOpen: boolean;
  /** Called as the pointer (or keyboard focus) enters and leaves the rail, so the layout can
   * expand it on hover. Optional — without it the sidebar just follows isOpen as before. */
  onHoverChange?: (hovering: boolean) => void;
}

interface ToolItem {
  id: number;
  name: string;
  slug: string;
}


interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra restriction on top of isPathAllowed — only these roles see it in the sidebar
   * even if the path itself is technically open to everyone (e.g. 'all' roles). */
  roles?: string[];
  /** Other routes that live under this item and should highlight it (no sidebar entry of their own). */
  alsoActive?: string[];
}

const menuItems: MenuItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  // Content Studio lives under Posts now — reached from the "Content Studio" tab on /admin/posts.
  { href: '/admin/posts', label: 'Posts', icon: FileText, alsoActive: ['/admin/content-studio'] },
  // Events no longer has its own sidebar item — Partnership Tracker (below) is now the
  // primary entry point and links out to /admin/events, /events?tab=regions and
  // /events?tab=banners itself ("View:" row) for anyone who needs those tables directly.
  { href: '/admin/partnership-tracker', label: 'Events Tracker', icon: CalendarDays },
  { href: '/admin/newsletter', label: 'Newsletter', icon: Mail },
  { href: '/admin/sales-tracker', label: 'Sales Tracker', icon: ChartColumn },
  { href: '/admin/it-tickets', label: 'IT Tickets', icon: Ticket },
  { href: '/admin/hr-tool', label: 'HR Management', icon: UserPlus },
  { href: '/admin/my-leads', label: 'My Leads', icon: UserPlus, roles: ['event_admin', 'publisher_admin'] },
  { href: '/admin/attendance', label: 'Attendance', icon: Clock, roles: ['event_admin', 'publisher_admin'] },
  { href: '/admin/leave', label: 'Leave', icon: CalendarPlus, roles: ['event_admin', 'publisher_admin'] },
  { href: '/admin/documents', label: 'Documents', icon: Files, roles: ['event_admin', 'publisher_admin'] },
  { href: '/admin/rules-policy', label: 'Admin Rules', icon: ClipboardList, roles: ['event_admin', 'publisher_admin'] },
  { href: '/admin/my-exit', label: 'Resignation', icon: LogOut, roles: ['event_admin', 'publisher_admin'] },
  { href: '/admin/tools', label: 'Tools', icon: Wrench },
  { href: '/admin/reports', label: 'Reports', icon: ChartColumn },
  { href: '/admin/brand-stories', label: 'Brand Stories', icon: BookOpen },
  { href: '/admin/inner-pages', label: 'Inner Pages', icon: Layers },
  { href: '/admin/registered-users', label: 'Registered Users', icon: UserPlus },
  // IncubatX startup dossiers submitted on /incubatx/startup-details.
  { href: '/admin/grants', label: 'Grants', icon: Landmark },
  { href: '/admin/contacts', label: 'Directory', icon: Contact },
  { href: '/admin/users', label: 'Users', icon: Users },
];

export default function AdminSidebar({ isOpen, onHoverChange }: AdminSidebarProps) {
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
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      // Keyboard parity with hover: React maps onFocus/onBlur to focusin/focusout so they fire
      // for descendants, and the relatedTarget check keeps the rail open while focus moves
      // between two links inside it rather than collapsing on every Tab.
      onFocus={() => onHoverChange?.(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onHoverChange?.(false); }}
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
          const isActive = [item.href, ...(item.alsoActive ?? [])].some((href) => pathname === href || pathname.startsWith(href + '/'));
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
                  <IconComponent size={20} color={isActive ? '#6366f1' : 'currentColor'} aria-hidden />
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
