import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { CONTACTS_ROLES } from '@/shared/middleware/roles';
import { importContacts } from '../_handlers';

export const maxDuration = 900;

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, CONTACTS_ROLES);
  if (auth instanceof NextResponse) return auth;
  return importContacts(request, auth.user.email);
}
