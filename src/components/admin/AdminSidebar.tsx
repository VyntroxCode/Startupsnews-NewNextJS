'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAdminUser, getAuthHeaders } from '@/lib/admin-auth';
import { isPathAllowed } from '@/lib/admin-role-access';
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  CalendarPlus,
  ChartColumn,
  ChevronDown,
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
  ReceiptText,
  Ticket,
  UserCog,
  UserPlus,
  Users,
  TrendingUp,
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


export interface MenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra restriction on top of isPathAllowed — only these roles see it in the sidebar
   * even if the path itself is technically open to everyone (e.g. 'all' roles). */
  roles?: string[];
  /** Other routes that live under this item and should highlight it (no sidebar entry of their own). */
  alsoActive?: string[];
}

/** A collapsible heading with its own links underneath; hidden when none of its children are visible to the role. */
export interface MenuGroup {
  group: string;
  icon: LucideIcon;
  children: MenuItem[];
}

export type MenuEntry = MenuItem | MenuGroup;

export const isGroup = (entry: MenuEntry): entry is MenuGroup => 'group' in entry;
export const isItemActive = (pathname: string, item: MenuItem) =>
  [item.href, ...(item.alsoActive ?? [])].some((href) => pathname === href || pathname.startsWith(href + '/'));

const menuItems: MenuEntry[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  // Content Studio lives under Posts now — reached from the "Content Studio" tab on /admin/posts.
  { href: '/admin/posts', label: 'Posts', icon: FileText, alsoActive: ['/admin/content-studio'] },
  // Events no longer has its own sidebar item — Partnership Tracker (below) is now the
  // primary entry point and links out to /admin/events, /events?tab=regions and
  // /events?tab=banners itself ("View:" row) for anyone who needs those tables directly.
  { href: '/admin/partnership-tracker', label: 'Events Tracker', icon: CalendarDays },
  { href: '/admin/newsletter', label: 'Newsletter', icon: Mail },
  { href: '/admin/sales-tracker', label: 'Sales Tracker', icon: ChartColumn },
  { href: '/admin/it-tickets', label: 'IT Support', icon: Ticket },
  { href: '/admin/hr-tool', label: 'HR Management', icon: UserPlus },
  // The staff's own HR self-service, grouped the same way as in the employee portal's sidebar.
  {
    group: 'HRMS',
    icon: Briefcase,
    children: [
      { href: '/admin/my-leads', label: 'My Leads', icon: UserPlus, roles: ['event_admin', 'publisher_admin'] },
      { href: '/admin/attendance', label: 'Attendance', icon: Clock, roles: ['event_admin', 'publisher_admin'] },
      { href: '/admin/leave', label: 'Leave', icon: CalendarPlus, roles: ['event_admin', 'publisher_admin'] },
      { href: '/admin/my-payslips', label: 'My Payslips', icon: ReceiptText, roles: ['event_admin', 'publisher_admin'] },
      { href: '/admin/documents', label: 'Documents', icon: Files, roles: ['event_admin', 'publisher_admin'] },
      { href: '/admin/rules-policy', label: 'Admin Rules', icon: ClipboardList, roles: ['event_admin', 'publisher_admin'] },
      { href: '/admin/my-exit', label: 'My Exit', icon: LogOut, roles: ['event_admin', 'publisher_admin'] },
    ],
  },
  { href: '/admin/tools', label: 'Tools', icon: Wrench },
  { href: '/admin/reports', label: 'Reports', icon: ChartColumn },
  { href: '/admin/brand-stories', label: 'Brand Stories', icon: BookOpen },
  { href: '/admin/inner-pages', label: 'Inner Pages', icon: Layers },
  { href: '/admin/registered-users', label: 'Registered Users', icon: UserPlus },
  // Reader-panel settings, one section per reader area (Funding sponsor cards, Reports).
  { href: '/admin/user-management', label: 'User Management', icon: UserCog },
  // IncubatX startup dossiers submitted on /incubatx/startup-details.
  { href: '/admin/grants', label: 'Grants', icon: Landmark },
  { href: '/admin/funding-data', label: 'Funding Data', icon: TrendingUp },
  { href: '/admin/contacts', label: 'Directory', icon: Contact },
  { href: '/admin/users', label: 'Users', icon: Users },
];

/** The menu as one role sees it: items it may open, groups trimmed to their visible children (and
 * dropped when empty). Shared by the desktop rail and the phone drawer (AdminMobileNav). */
export function getVisibleMenu(role: string): MenuEntry[] {
  const canSee = (item: MenuItem) => isPathAllowed(role, item.href) && (!item.roles || item.roles.includes(role));
  return menuItems
    .map((entry) => (isGroup(entry) ? { ...entry, children: entry.children.filter(canSee) } : entry))
    .filter((entry) => (isGroup(entry) ? entry.children.length > 0 : canSee(entry)));
}

export default function AdminSidebar({ isOpen, onHoverChange }: AdminSidebarProps) {
  const pathname = usePathname();
  const headerHeight = 60;
  const [tools, setTools] = useState<ToolItem[]>([]);
  const role = getAdminUser()?.role || '';
  const visibleMenuItems = getVisibleMenu(role);
  // A group the user hasn't toggled stays open while one of its pages is the current one.
  const [groupToggles, setGroupToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Roles without the Tools page (Event / Publisher Admin, …) don't need its sub-item list.
    if (!isPathAllowed(getAdminUser()?.role || '', '/admin/tools')) return;
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
    // Desktop (md+) only — phones get AdminMobileNav's drawer + bottom tab bar instead.
    <aside
      className="admin-sidebar-scroll hidden md:block"
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
        {visibleMenuItems.map((entry) => {
          if (isGroup(entry)) {
            const groupActive = entry.children.some((child) => isItemActive(pathname, child));
            const expanded = groupToggles[entry.group] ?? groupActive;
            // Collapsed: lit like an active item so the current page's section is still visible.
            const headerLit = groupActive && !(expanded && isOpen);
            const GroupIcon = entry.icon;
            return (
              <div key={entry.group}>
                <button
                  type="button"
                  onClick={() => setGroupToggles((prev) => ({ ...prev, [entry.group]: !expanded }))}
                  aria-expanded={expanded}
                  title={!isOpen ? entry.group : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isOpen ? 'flex-start' : 'center',
                    gap: isOpen ? '0.875rem' : '0',
                    width: '100%',
                    padding: isOpen ? '0.875rem 1.25rem' : '0.875rem 0',
                    marginBottom: '0.25rem',
                    color: headerLit ? '#6366f1' : '#475569',
                    background: headerLit
                      ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)'
                      : 'transparent',
                    border: 'none',
                    borderLeft: headerLit ? '3px solid #6366f1' : '3px solid transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    font: 'inherit',
                    fontWeight: headerLit ? '600' : '500',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  onMouseEnter={(e) => {
                    if (!headerLit) {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.color = '#334155';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!headerLit) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#475569';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, width: '24px', height: '24px' }}>
                    <GroupIcon size={20} color={headerLit ? '#6366f1' : 'currentColor'} aria-hidden />
                  </div>
                  {isOpen && (
                    <>
                      <span style={{ fontSize: '0.9375rem', flex: 1, textAlign: 'left' }}>{entry.group}</span>
                      <ChevronDown size={16} aria-hidden style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }} />
                    </>
                  )}
                </button>

                {isOpen && expanded && (
                  <div style={{ paddingLeft: '1.5rem', marginBottom: '0.5rem' }}>
                    {entry.children.map((child) => {
                      const childActive = isItemActive(pathname, child);
                      const ChildIcon = child.icon;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.625rem',
                            padding: '0.55rem 0.75rem',
                            marginBottom: '0.1rem',
                            color: childActive ? '#6366f1' : '#64748b',
                            background: childActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                            textDecoration: 'none',
                            borderRadius: '7px',
                            borderLeft: childActive ? '2px solid #6366f1' : '2px solid #e2e8f0',
                            fontSize: '0.875rem',
                            fontWeight: childActive ? 600 : 500,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            if (!childActive) {
                              e.currentTarget.style.background = '#f1f5f9';
                              e.currentTarget.style.color = '#334155';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!childActive) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#64748b';
                            }
                          }}
                        >
                          <ChildIcon size={16} color={childActive ? '#6366f1' : 'currentColor'} aria-hidden />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const item = entry;
          const isActive = isItemActive(pathname, item);
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
