import { NextResponse } from 'next/server';

/**
 * Safely parse JSON from request body. Use in API routes to avoid 500 when
 * body is missing, too large, or malformed (e.g. on mobile or slow networks).
 */
export async function parseJsonBody<T = unknown>(
  request: Request
): Promise<[T | null, NextResponse | null]> {
  try {
    const body = (await request.json()) as T;
    return [body, null];
  } catch (e) {
    const message =
      e instanceof SyntaxError
        ? 'Invalid JSON in request body'
        : e instanceof Error &&
          (e.message?.includes('size') ||
            e.message?.includes('limit') ||
            e.message?.includes('body'))
          ? 'Request body too large. Try shortening the content.'
          : 'Invalid request body';
    return [
      null,
      NextResponse.json({ success: false, error: message }, { status: 400 }),
    ];
  }
}
