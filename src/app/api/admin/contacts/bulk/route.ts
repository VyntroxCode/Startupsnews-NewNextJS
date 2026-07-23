import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { CONTACTS_ROLES } from '@/shared/middleware/roles';
import { ContactsService } from '@/modules/contacts/service/contacts.service';
import { ContactsRepository } from '@/modules/contacts/repository/contacts.repository';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { BulkAction } from '@/modules/contacts/domain/types';

const contactsRepository = new ContactsRepository();
const contactsService = new ContactsService(contactsRepository);

interface BulkBody {
  ids: number[];
  action: BulkAction;
  value?: string;
}

const VALID_ACTIONS: BulkAction[] = ['setCity', 'setCountry', 'addTag', 'delete'];

export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, CONTACTS_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const [body, errorResponse] = await parseJsonBody<BulkBody>(request);
    if (errorResponse) return errorResponse;
    if (!body || !Array.isArray(body.ids) || !body.ids.length) {
      return NextResponse.json({ success: false, error: 'ids array is required' }, { status: 400 });
    }
    if (!VALID_ACTIONS.includes(body.action)) {
      return NextResponse.json({ success: false, error: 'Invalid bulk action' }, { status: 400 });
    }
    if (body.action !== 'delete' && !body.value) {
      return NextResponse.json({ success: false, error: 'value is required for this action' }, { status: 400 });
    }

    const ids = body.ids.map((id) => Number(id)).filter((id) => Number.isFinite(id));
    await contactsService.bulkAction(ids, body.action, body.value, auth.user.email);

    return NextResponse.json({ success: true, data: { count: ids.length } });
  } catch (error) {
    console.error('Error running bulk contact action:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Bulk action failed' },
      { status: 500 }
    );
  }
}
