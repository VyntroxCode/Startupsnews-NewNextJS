import { NextRequest, NextResponse } from 'next/server';
import { createContact, listContacts } from '@/app/api/admin/contacts/_handlers';
import { requireDirectoryEmployee, directoryActor } from './_lib';

/** /api/employee/directory — the Directory for allow-listed employees, with the same full access
 * (list/create here; edit, delete, bulk, import and config under the sub-routes) as /api/admin/contacts. */
export async function GET(request: NextRequest) {
  const auth = await requireDirectoryEmployee(request);
  if (auth instanceof NextResponse) return auth;
  return listContacts(request);
}

export async function POST(request: NextRequest) {
  const auth = await requireDirectoryEmployee(request);
  if (auth instanceof NextResponse) return auth;
  return createContact(request, directoryActor(auth.credential));
}
