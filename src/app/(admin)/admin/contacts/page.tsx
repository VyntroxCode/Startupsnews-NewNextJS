'use client';

import ContactsDirectory from '@/components/admin/contacts/ContactsDirectory';

/** Directory — full contacts manager for every role let in here (super admin and Event Admin, via
 * admin-role-access.ts). The APIs enforce the same set (CONTACTS_ROLES). */
export default function ContactsPage() {
  return <ContactsDirectory />;
}
