import { NextRequest, NextResponse } from 'next/server';
import { bulkContacts } from '@/app/api/admin/contacts/_handlers';
import { requireDirectoryEmployee, directoryActor } from '../_lib';

export async function POST(request: NextRequest) {
  const auth = await requireDirectoryEmployee(request);
  if (auth instanceof NextResponse) return auth;
  return bulkContacts(request, directoryActor(auth.credential));
}
