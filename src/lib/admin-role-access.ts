/** Client-side path scoping for the Event Admin / Publisher Admin panels (mirrors the API guards). */

// Only the super admin can manage other admin-panel accounts, or use the standalone Network
// Manager (contacts CRM), HR tool, or Sales tracker — matches HR_TOOL_ROLES/SALES_TRACKER_ROLES
// in shared/middleware/roles.ts, which already gate their APIs to 'admin' only.
const ADMIN_ONLY_PATHS = ['/admin/users', '/admin/contacts', '/admin/hr-tool', '/admin/sales-tracker'];

export const ROLE_ALLOWED_PATHS: Record<string, string[] | 'all'> = {
  admin: 'all',
  editor: 'all',
  author: 'all',
  // Event Admin's post access is scoped server-side to the Press Release category only (see posts API routes).
  event_admin: ['/admin', '/admin/events', '/admin/event-regions', '/admin/partnership-tracker', '/admin/banners', '/admin/tools', '/admin/posts', '/admin/attendance', '/admin/rules-policy'],
  publisher_admin: ['/admin', '/admin/posts', '/admin/tools', '/admin/reports', '/admin/brand-stories', '/admin/attendance', '/admin/rules-policy'],
};

function matchesPrefix(prefixes: string[], pathname: string): boolean {
  return prefixes.some((prefix) => {
    // '/admin' is the dashboard root — match it exactly, not as a prefix for every
    // other admin subpath (which would defeat the whole point of section scoping).
    if (prefix === '/admin') return pathname === '/admin';
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export function isPathAllowed(role: string, pathname: string): boolean {
  if (matchesPrefix(ADMIN_ONLY_PATHS, pathname)) return role === 'admin';

  const allowed = ROLE_ALLOWED_PATHS[role];
  if (!allowed || allowed === 'all') return true;
  return matchesPrefix(allowed, pathname);
}

export function defaultPathForRole(role: string): string {
  const allowed = ROLE_ALLOWED_PATHS[role];
  if (!allowed || allowed === 'all') return '/admin';
  return allowed[0] || '/admin';
}
