import { NextRequest, NextResponse } from 'next/server';
import { requireAnyRole } from '@/shared/middleware/auth.middleware';
import { HR_TOOL_ROLES } from '@/shared/middleware/roles';
import { parseJsonBody } from '@/shared/utils/parse-json-body';
import { hrToolService } from '../../_lib';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const auth = await requireAnyRole(request, HR_TOOL_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const { name } = await params;
    const [body, errorResponse] = await parseJsonBody<{ content: string }>(request);
    if (errorResponse) return errorResponse;
    if (body?.content === undefined) return NextResponse.json({ success: false, error: 'content is required' }, { status: 400 });

    await hrToolService.saveTemplate(decodeURIComponent(name), body.content);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving HR template:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to save template' },
      { status: 400 }
    );
  }
}
