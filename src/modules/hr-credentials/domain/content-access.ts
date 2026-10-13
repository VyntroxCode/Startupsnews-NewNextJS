/** Employee-portal logins (by Employee ID) that get the admin panel's Posts (with Industry, Authors
 * and Content Studio), Reports and Brand Stories inside the employee portal, with full access, same
 * as the super admin. Shared by the portal nav, the /employee/(content) pages and the API guard
 * (requireContentAccess), so adding or removing someone here is the whole change. Admin-panel
 * roles are gated separately (CONTENT_ROLES, REPORTS_ROLES, BRAND_STORIES_ROLES, …). */
export const CONTENT_EMPLOYEE_CODES: readonly string[] = ['SNFYI-0030'];

export function canEmployeeUseContent(employeeCode: string | null | undefined): boolean {
  return !!employeeCode && CONTENT_EMPLOYEE_CODES.includes(employeeCode.trim().toUpperCase());
}

/** The portal twins of the admin screens: /admin/posts -> /employee/posts, and so on. */
export const CONTENT_PORTAL_PATHS: readonly string[] = [
  '/employee/posts',
  '/employee/categories',
  '/employee/authors',
  '/employee/content-studio',
  '/employee/reports',
  '/employee/brand-stories',
];

export function isContentPortalPath(pathname: string): boolean {
  return CONTENT_PORTAL_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
