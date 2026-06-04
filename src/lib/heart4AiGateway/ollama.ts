import { getHeart4AiGatewayConfig } from "@/lib/heart4AiGateway/config";

export type OllamaChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatResult =
  | { ok: true; content: string; model: string }
  | { ok: false; error: string; detail: string };

export async function ollamaChat(input: {
  messages: OllamaChatMessage[];
  maxTokens?: number;
  temperature?: number;
}): Promise<ChatResult> {
  const cfg = getHeart4AiGatewayConfig();
  const url = `${cfg.ollamaBaseUrl.replace(/\/$/, "")}/api/chat`;
  const timeoutMs = cfg.ollamaChatTimeoutMs;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        model: cfg.chatModel,
        messages: input.messages,
        stream: false,
        options: {
          temperature: input.temperature ?? 0.25,
          num_predict: input.maxTokens ?? 900,
        },
      }),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown error";
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return {
      ok: false,
      error: timedOut ? "OLLAMA_CHAT_TIMEOUT" : "OLLAMA_REQUEST_FAILED",
      detail: timedOut
        ? `เกิน ${Math.round(timeoutMs / 1000)} วินาที — ลองปิด RAG ชั่วคราวหรือรอ GPU ว่าง`
        : msg,
    };
  }

  const json = (await response.json().catch(() => null)) as {
    message?: { content?: string };
    error?: string;
  } | null;

  if (!response.ok) {
    return {
      ok: false,
      error: "OLLAMA_HTTP_ERROR",
      detail: json?.error ?? `HTTP ${response.status}`,
    };
  }

  const content = json?.message?.content?.trim() ?? "";
  if (!content) {
    return { ok: false, error: "OLLAMA_EMPTY", detail: "empty response" };
  }

  return { ok: true, content, model: cfg.chatModel };
}

export async function ollamaEmbed(texts: string[]): Promise<
  | { ok: true; vectors: number[][] }
  | { ok: false; error: string; detail: string }
> {
  const cfg = getHeart4AiGatewayConfig();
  const base = cfg.ollamaBaseUrl.replace(/\/$/, "");
  const vectors: number[][] = [];

  for (const text of texts) {
    let response: Response;
    try {
      response = await fetch(`${base}/api/embeddings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({ model: cfg.embedModel, prompt: text }),
      });
    } catch (error) {
      return {
        ok: false,
        error: "OLLAMA_EMBED_FAILED",
        detail: error instanceof Error ? error.message : "unknown",
      };
    }

    const json = (await response.json().catch(() => null)) as { embedding?: number[] } | null;
    if (!response.ok || !Array.isArray(json?.embedding)) {
      return {
        ok: false,
        error: "OLLAMA_EMBED_HTTP",
        detail: `HTTP ${response.status}`,
      };
    }
    vectors.push(json.embedding);
  }

  return { ok: true, vectors };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
