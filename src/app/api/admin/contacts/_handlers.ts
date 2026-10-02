import { NextRequest, NextResponse } from 'next/server';
import { ContactsService } from '@/modules/contacts/service/contacts.service';
import { ContactsRepository } from '@/modules/contacts/repository/contacts.repository';
import { entityToContact } from '@/modules/contacts/utils/contacts.utils';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { BulkAction, ContactInput, ContactsConfig } from '@/modules/contacts/domain/types';

/** Directory (contacts) request handlers, shared by /api/admin/contacts (admin-panel roles) and
 * /api/employee/directory (allow-listed employees). Each route does its own auth, then passes the
 * actor (email or Employee ID) that is stamped on created/updated rows. */

const contactsService = new ContactsService(new ContactsRepository());

export async function listContacts(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const city = searchParams.get('city') || undefined;
    const country = searchParams.get('country') || undefined;
    const type = searchParams.get('type') || undefined;
    const tag = searchParams.get('tag') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 50000);
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

export async function createContact(request: NextRequest, actor: string) {
  try {
    const [body, errorResponse] = await parseJsonBody<ContactInput>(request);
    if (errorResponse) return errorResponse;
    if (!body) return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });

    const entity = await contactsService.createContact(body, actor);
    return NextResponse.json({ success: true, data: entityToContact(entity) }, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create contact' },
      { status: 400 }
    );
  }
}

function parseId(idParam: string): number | null {
  const id = parseInt(idParam, 10);
  return Number.isFinite(id) ? id : null;
}

export async function updateContact(request: NextRequest, idParam: string, actor: string) {
  try {
    const id = parseId(idParam);
    if (!id) return NextResponse.json({ success: false, error: 'Invalid contact id' }, { status: 400 });

    const [body, errorResponse] = await parseJsonBody<Partial<ContactInput>>(request);
    if (errorResponse) return errorResponse;
    if (!body) return NextResponse.json({ success: false, error: 'Request body is required' }, { status: 400 });

    const entity = await contactsService.updateContact(id, body, actor);
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

export async function deleteContact(idParam: string) {
  try {
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

interface BulkBody {
  ids: number[];
  action: BulkAction;
  value?: string;
}

const VALID_ACTIONS: BulkAction[] = ['setCity', 'setCountry', 'addTag', 'delete'];

export async function bulkContacts(request: NextRequest, actor: string) {
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
    await contactsService.bulkAction(ids, body.action, body.value, actor);

    return NextResponse.json({ success: true, data: { count: ids.length } });
  } catch (error) {
    console.error('Error running bulk contact action:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Bulk action failed' },
      { status: 500 }
    );
  }
}

interface ImportBody {
  rows: ContactInput[];
}

export async function importContacts(request: NextRequest, actor: string) {
  try {
    const [body, errorResponse] = await parseJsonBody<ImportBody>(request);
    if (errorResponse) return errorResponse;
    if (!body || !Array.isArray(body.rows) || !body.rows.length) {
      return NextResponse.json({ success: false, error: 'rows array is required' }, { status: 400 });
    }
    if (body.rows.length > 50000) {
      return NextResponse.json({ success: false, error: 'Import is limited to 50000 rows at a time' }, { status: 400 });
    }

    const result = await contactsService.importContacts(body.rows, actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error importing contacts:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}

export async function getConfig() {
  try {
    const config = await contactsService.getConfig();
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching contacts config:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch config' }, { status: 500 });
  }
}

export async function saveConfig(request: NextRequest) {
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
