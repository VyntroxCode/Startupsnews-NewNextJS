import { isContentPortalPath } from '@/modules/hr-credentials/domain/content-access';

/** The admin Posts / Reports / Brand Stories screens are also mounted in the employee portal
 * (/employee/posts, …). Their links are written as /admin/… paths; this turns one into its
 * /employee/… twin while the screen is running there, and leaves it alone in the admin panel. */
export function panelPath(href: string): string {
  if (typeof window === 'undefined' || !isContentPortalPath(window.location.pathname)) return href;
  return href.replace(/^\/admin(?=\/|\?|$)/, '/employee');
}
