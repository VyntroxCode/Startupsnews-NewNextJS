/** Client-side path scoping for the Event Admin / Publisher Admin panels (mirrors the API guards). */

// Only the super admin can manage other admin-panel accounts.
const ADMIN_ONLY_PATHS = ['/admin/users'];

export const ROLE_ALLOWED_PATHS: Record<string, string[] | 'all'> = {
  admin: 'all',
  editor: 'all',
  author: 'all',
  event_admin: ['/admin', '/admin/events', '/admin/event-regions', '/admin/banners', '/admin/tools'],
  publisher_admin: ['/admin', '/admin/posts', '/admin/categories', '/admin/authors', '/admin/tools', '/admin/reports'],
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
