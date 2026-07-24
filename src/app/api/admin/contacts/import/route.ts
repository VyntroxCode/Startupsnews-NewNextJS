import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { CONTACTS_ROLES } from '@/shared/middleware/roles';
import { ContactsService } from '@/modules/contacts/service/contacts.service';
import { ContactsRepository } from '@/modules/contacts/repository/contacts.repository';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { ContactInput } from '@/modules/contacts/domain/types';

const contactsRepository = new ContactsRepository();
const contactsService = new ContactsService(contactsRepository);

export const maxDuration = 900;

interface ImportBody {
  rows: ContactInput[];
}

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, CONTACTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<ImportBody>(request);
    if (errorResponse) return errorResponse;
    if (!body || !Array.isArray(body.rows) || !body.rows.length) {
      return NextResponse.json({ success: false, error: 'rows array is required' }, { status: 400 });
    }
    if (body.rows.length > 50000) {
      return NextResponse.json({ success: false, error: 'Import is limited to 50000 rows at a time' }, { status: 400 });
    }

    const result = await contactsService.importContacts(body.rows, auth.user.email);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error importing contacts:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
