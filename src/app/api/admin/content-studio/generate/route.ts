import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/shared/middleware/auth.middleware";
import { CONTENT_STUDIO_ROLES } from "@/shared/middleware/roles";
import { runPipeline } from "@/modules/content-studio/lib/llm/pipeline";
import type { GenerateRequest } from "@/modules/content-studio/types";

// Four sequential LLM calls; the default serverless timeout is far too short.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/content-studio/generate
 *
 * Runs the whole LLM pipeline server-side and streams progress back as SSE so
 * the 6-step checklist in the UI reflects real progress. The API key never
 * leaves the server.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAnyRole(request, CONTENT_STUDIO_ROLES);
  if (auth instanceof NextResponse) return auth;

  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.article?.title) {
    return Response.json({ error: "No source article provided" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      // nginx drops a proxied response after 60s without a byte, and one LLM call in the
      // pipeline can run longer. An SSE comment frame keeps the connection alive; the client
      // ignores frames that carry no `data:` line.
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          // The browser went away and the stream is closed; a throw here would escape the timer.
          clearInterval(keepAlive);
        }
      }, 15000);

      try {
        const data = await runPipeline(body, (step, label) =>
          send({ type: "step", step, label }),
        );
        send({ type: "done", data });
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : "Generation failed",
        });
      } finally {
        clearInterval(keepAlive);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Stop nginx buffering the stream, so each step reaches the checklist as it happens.
      "X-Accel-Buffering": "no",
    },
  });
}
