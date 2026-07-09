/** Section-scoped role sets for the Event Admin / Publisher Admin panels. */

export const EVENTS_ROLES = ['admin', 'editor', 'event_admin'] as const;

/** Home page banners — given to Event Admin alongside Events/Event Regions. */
export const BANNERS_ROLES = ['admin', 'editor', 'event_admin'] as const;

/** View/create/edit content (posts, categories, authors). */
export const CONTENT_ROLES = ['admin', 'editor', 'author', 'publisher_admin'] as const;

/** Delete/bulk-mutate content, and manage categories/authors. */
export const CONTENT_MANAGE_ROLES = ['admin', 'editor', 'publisher_admin'] as const;

/** HTML Tools — Event Admin/Publisher Admin only see tools explicitly shared with them. */
export const TOOLS_VIEW_ROLES = ['admin', 'editor', 'event_admin', 'publisher_admin'] as const;

/** Reports + Report Sections — given to Publisher Admin alongside content management. */
export const REPORTS_ROLES = ['admin', 'editor', 'publisher_admin'] as const;

/** Every admin-panel role — dashboard/stats and other cross-cutting read-only surfaces. */
export const ALL_ADMIN_ROLES = ['admin', 'editor', 'author', 'event_admin', 'publisher_admin'] as const;
