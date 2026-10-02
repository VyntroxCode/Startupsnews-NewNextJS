import "server-only";

// ══════════════════════════════════════════════════════════════════
// Azure OpenAI client — the only model call in this app.
//
// Config comes from the server env (AZURE_OPENAI_API_KEY / _ENDPOINT /
// _DEPLOYMENT / _API_VERSION) and is only ever read on the server;
// `server-only` above makes a stray client import a build error rather than a
// silent key leak. Plain fetch against the Chat Completions REST API, so no SDK.
// ══════════════════════════════════════════════════════════════════

const MAX_OUTPUT_TOKENS = 32000;

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function config() {
  return {
    apiKey: env("AZURE_OPENAI_API_KEY"),
    endpoint: env("AZURE_OPENAI_ENDPOINT").replace(/\/+$/, ""),
    deployment: env("AZURE_OPENAI_DEPLOYMENT"),
    apiVersion: env("AZURE_OPENAI_API_VERSION") || "2025-01-01-preview",
  };
}

/** Whether key, endpoint and deployment are all set. Safe to expose — it never reveals the key. */
export function isConfigured(): boolean {
  const c = config();
  return Boolean(c.apiKey && c.endpoint && c.deployment);
}

/** The deployment name, for the "Azure OpenAI · <deployment>" status row. */
export function modelName(): string {
  return config().deployment || "not set";
}

/**
 * One model call. Ported from `callLLM`, content-studio-v17.html:1951-1983.
 *
 * Streamed (SSE) so a long draft can't trip undici's 300s headers/body timeout
 * while the model is still writing; the deltas are concatenated into the final text.
 */
export async function callLLM(prompt: string): Promise<string> {
  const c = config();
  if (!isConfigured())
    throw new Error(
      "Azure OpenAI is not configured — set AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_DEPLOYMENT",
    );

  const url = `${c.endpoint}/openai/deployments/${encodeURIComponent(c.deployment)}/chat/completions?api-version=${encodeURIComponent(c.apiVersion)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": c.apiKey },
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: MAX_OUTPUT_TOKENS,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    let message = detail.slice(0, 300);
    try {
      message = JSON.parse(detail)?.error?.message || message;
    } catch {}
    if (res.status === 401 || res.status === 403)
      throw new Error("Invalid Azure OpenAI key — check AZURE_OPENAI_API_KEY.");
    if (res.status === 404)
      throw new Error("Azure OpenAI deployment not found — check AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_DEPLOYMENT.");
    if (res.status === 429) throw new Error("Azure OpenAI rate limit hit — try again shortly.");
    throw new Error(`Azure OpenAI request failed (${res.status}): ${message}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let finishReason: string | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const data = line.trim();
      if (!data.startsWith("data:")) continue;
      const payload = data.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const chunk = JSON.parse(payload);
        const choice = chunk.choices?.[0];
        if (choice?.delta?.content) text += choice.delta.content;
        if (choice?.finish_reason) finishReason = choice.finish_reason;
      } catch {
        // A keep-alive or partial line — ignore it.
      }
    }
  }

  if (finishReason === "content_filter")
    throw new Error("Azure OpenAI content filter blocked this request.");
  if (!text) throw new Error("Empty response");
  return text;
}
