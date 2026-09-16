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

/** Inner Pages (partner logos + editable content for standalone pages like Our Partners) — given to Publisher Admin alongside content management. */
export const INNER_PAGES_ROLES = ['admin', 'editor', 'publisher_admin'] as const;

/** Every admin-panel role — dashboard/stats and other cross-cutting read-only surfaces. */
export const ALL_ADMIN_ROLES = ['admin', 'editor', 'author', 'event_admin', 'publisher_admin', 'it_support'] as const;

/** Network Manager (contacts CRM) — super admin only, standalone tool. */
export const CONTACTS_ROLES = ['admin'] as const;

/** Sales Tracker — super admin only, standalone tool. */
export const SALES_TRACKER_ROLES = ['admin'] as const;

/** HR Tool — super admin only, standalone tool (has its own internal role system for HR Head/Manager/Employee). */
export const HR_TOOL_ROLES = ['admin'] as const;

/** IT Tickets — triage/manage the full queue (status, priority, assignee, delete comments/attachments). */
export const IT_TICKETS_MANAGE_ROLES = ['admin', 'it_support'] as const;

/** IT Tickets — permanently delete a ticket (with its comments/attachments). Deliberately stricter than
 * manage: IT Support resolves/closes, only the super admin deletes. The UI hides Delete from the same set. */
export const IT_TICKETS_DELETE_ROLES = ['admin'] as const;

/** IT Tickets — move a ticket INTO Blocked. IT Support resolves/closes; only the super admin blocks.
 * Enforced by `canSetTicketStatus` (modules/it-tickets/domain/status-policy.ts) on server and client. */
export const IT_TICKETS_BLOCK_ROLES = ['admin'] as const;

/** IT Tickets — move a ticket OUT of Blocked. Same as blocking by decision (2026-09-14). To let IT Support
 * unblock, point this at IT_TICKETS_MANAGE_ROLES — nothing else needs to change. */
export const IT_TICKETS_UNBLOCK_ROLES: readonly string[] = IT_TICKETS_BLOCK_ROLES;

/** IT Tickets — every admin-panel role can raise a ticket and see/comment on their own (helpdesk model). */
export const IT_TICKETS_ROLES = ['admin', 'editor', 'author', 'event_admin', 'publisher_admin', 'it_support'] as const;
