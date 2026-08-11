/** Section-scoped role sets for the Event Admin / Publisher Admin panels. */

export const EVENTS_ROLES = ['admin', 'editor', 'event_admin'] as const;

/** Home page banners — given to Event Admin alongside Events/Event Regions. */
export const BANNERS_ROLES = ['admin', 'editor', 'event_admin'] as const;

/** View/create/edit content (posts, categories, authors). Event Admin is scoped to the Press Release category only (enforced in the posts API). */
export const CONTENT_ROLES = ['admin', 'editor', 'author', 'publisher_admin', 'event_admin'] as const;

/** Delete/bulk-mutate content, and manage categories/authors. */
export const CONTENT_MANAGE_ROLES = ['admin', 'editor', 'publisher_admin'] as const;

/** View categories/authors — Publisher Admin no longer manages these directly. Event Admin needs read access to resolve the Press Release category. */
export const CATEGORIES_AUTHORS_VIEW_ROLES = ['admin', 'editor', 'author', 'publisher_admin','event_admin'] as const;

/** Create/edit/delete categories/authors. */
export const CATEGORIES_AUTHORS_MANAGE_ROLES = ['admin', 'editor'] as const;

/** HTML Tools — Event Admin/Publisher Admin only see tools explicitly shared with them. */
export const TOOLS_VIEW_ROLES = ['admin', 'editor', 'event_admin', 'publisher_admin'] as const;

/** Reports + Report Sections — given to Publisher Admin alongside content management. */
export const REPORTS_ROLES = ['admin', 'editor', 'publisher_admin'] as const;

/** Brand Stories + Brand Story Sections — given to Publisher Admin alongside content management. */
export const BRAND_STORIES_ROLES = ['admin', 'editor', 'publisher_admin'] as const;

/** Every admin-panel role — dashboard/stats and other cross-cutting read-only surfaces. */
export const ALL_ADMIN_ROLES = ['admin', 'editor', 'author', 'event_admin', 'publisher_admin'] as const;

/** Network Manager (contacts CRM) — super admin only, standalone tool. */
export const CONTACTS_ROLES = ['admin'] as const;

/** Sales Tracker — super admin only, standalone tool. */
export const SALES_TRACKER_ROLES = ['admin'] as const;

/** HR Tool — super admin only, standalone tool (has its own internal role system for HR Head/Manager/Employee). */
export const HR_TOOL_ROLES = ['admin'] as const;
