import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { CONTACTS_ROLES } from '@/shared/middleware/roles';
import { ContactsService } from '@/modules/contacts/service/contacts.service';
import { ContactsRepository } from '@/modules/contacts/repository/contacts.repository';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { ContactsConfig } from '@/modules/contacts/domain/types';

const contactsRepository = new ContactsRepository();
const contactsService = new ContactsService(contactsRepository);

export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, CONTACTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const config = await contactsService.getConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching contacts config:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAnyRole(request, CONTACTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<ContactsConfig>(request);
    if (errorResponse) return errorResponse;
    if (!body || !body.types || !body.cities || !body.countries || !body.tags) {
      return NextResponse.json({ success: false, error: 'types, cities, countries, tags are all required' }, { status: 400 });
    }

    await contactsService.saveConfig(body);
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error('Error saving contacts config:', error);
    return NextResponse.json({ success: false, error: 'Failed to save config' }, { status: 500 });
  }
}
