import { NextRequest, NextResponse } from 'next/server';
import { deleteContact, updateContact } from '@/app/api/admin/contacts/_handlers';
import { requireDirectoryEmployee, directoryActor } from '../_lib';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDirectoryEmployee(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  return updateContact(request, id, directoryActor(auth.credential));
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDirectoryEmployee(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  return deleteContact(id);
}
