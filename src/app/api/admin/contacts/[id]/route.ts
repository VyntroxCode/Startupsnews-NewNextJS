import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { CONTACTS_ROLES } from '@/shared/middleware/roles';
import { ContactsService } from '@/modules/contacts/service/contacts.service';
import { ContactsRepository } from '@/modules/contacts/repository/contacts.repository';
import { entityToContact } from '@/modules/contacts/utils/contacts.utils';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { ContactInput } from '@/modules/contacts/domain/types';

const contactsRepository = new ContactsRepository();
const contactsService = new ContactsService(contactsRepository);

function parseId(idParam: string): number | null {
  const id = parseInt(idParam, 10);
  return Number.isFinite(id) ? id : null;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, CONTACTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: idParam } = await params;
    const id = parseId(idParam);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid contact id' }, { status: 400 });

    const [body, errorResponse] = await parseJsonBody<Partial<ContactInput>>(request);
    if (errorResponse) return errorResponse;
    if (!body) return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });

    const entity = await contactsService.updateContact(id, body, auth.user.email);
    if (!entity) return NextResponse.json({ success: false, error: 'Contact not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: entityToContact(entity) });
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update contact' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(request, CONTACTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id: idParam } = await params;
    const id = parseId(idParam);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid contact id' }, { status: 400 });

    await contactsService.deleteContact(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
