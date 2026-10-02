import { NextRequest, NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/app/api/admin/contacts/_handlers';
import { requireDirectoryEmployee } from '../_lib';

/** GET/PUT /api/employee/directory/config — types/cities/countries/tags (filter options + Admin & Config tab). */
export async function GET(request: NextRequest) {
  const auth = await requireDirectoryEmployee(request);
  if (auth instanceof NextResponse) return auth;
  return getConfig();
}

export async function PUT(request: NextRequest) {
  const auth = await requireDirectoryEmployee(request);
  if (auth instanceof NextResponse) return auth;
  return saveConfig(request);
}
