import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { FUNDING_ROLES } from '@/shared/middleware/roles';
import { undoUploadBatch } from '@/modules/funding-deals/service/funding-deals.service';

/** DELETE /api/admin/funding-deals/batches/:id — undo an upload: removes the batch and every deal
 * it added that is still in the table (FK cascade). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAnyRole(req, FUNDING_ROLES);
  if (auth instanceof NextResponse) return auth;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ success: false, error: 'Invalid id.' }, { status: 400 });

  try {
    const { found, dealsRemoved } = await undoUploadBatch(id);
    if (!found) return NextResponse.json({ success: false, error: 'Upload not found.' }, { status: 404 });
    return NextResponse.json({ success: true, data: { dealsRemoved } });
  } catch (err) {
    console.error('[admin/funding-deals/batches DELETE]', err);
    return NextResponse.json({ success: false, error: 'Failed to undo the upload.' }, { status: 500 });
  }
}
