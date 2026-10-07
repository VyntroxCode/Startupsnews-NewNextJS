/** Topics offered in the /contact-us "Get in touch" form. Shared by the form and /api/contact,
 * which falls back to "General enquiry" for anything not in this list. */
export const CONTACT_TOPICS = [
  'General enquiry',
  'Press / news tip',
  'Advertising & partnerships',
  'Careers',
  'Technical support',
  'Other',
] as const;
