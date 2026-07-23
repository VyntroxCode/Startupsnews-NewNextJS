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

export async function GET(request: NextRequest) {
  const auth = await requireAnyRole(request, CONTACTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const city = searchParams.get('city') || undefined;
    const country = searchParams.get('country') || undefined;
    const type = searchParams.get('type') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 5000);
    const offset = (page - 1) * limit;

    const filters = { search, city, country, type, tag };

    const [total, entities] = await Promise.all([
      contactsService.countContacts(filters),
      contactsService.getAllContacts({ ...filters, limit, offset }),
    ]);

    return NextResponse.json({
      success: true,
      data: entities.map(entityToContact),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, CONTACTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<ContactInput>(request);
    if (errorResponse) return errorResponse;
    if (!body) return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });

    const entity = await contactsService.createContact(body, auth.user.email);
    return NextResponse.json({ success: true, data: entityToContact(entity) }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create contact' },
      { status: 400 }
    );
  }
}
