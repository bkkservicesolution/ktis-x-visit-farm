function normalizeEnvValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Must match `vector(...)` in `supabase/heart4rooms_ai_rag_v1.sql` (768). */
export const GEMINI_EMBEDDING_DIMENSION = 768;

const EMBED_MAX_ATTEMPTS = 10;
const EMBED_BASE_BACKOFF_MS = 1800;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(response: Response): number | null {
  const raw = response.headers.get("retry-after");
  if (!raw) return null;
  const sec = Number(raw.trim());
  if (Number.isFinite(sec) && sec >= 0) return Math.min(120_000, sec * 1000);
  return null;
}

function isRetryableEmbedFailure(status: number, message: string): boolean {
  if (status === 429 || status === 503) return true;
  const m = message.toLowerCase();
  return (
    m.includes("resource exhausted") ||
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("unavailable") ||
    m.includes("try again later")
  );
}

export function getGeminiEmbeddingModel(): string {
  // `text-embedding-004` is often unavailable on Generative Language API v1beta; use Gemini Embedding.
  return normalizeEnvValue(process.env.GEMINI_EMBEDDING_MODEL) ?? "gemini-embedding-001";
}

export type EmbedTextsResult =
  | { ok: true; embeddings: number[][]; model: string }
  | { ok: false; error: string; detail: string };

export async function embedTextsWithGemini(texts: string[]): Promise<EmbedTextsResult> {
  const apiKey = normalizeEnvValue(process.env.GEMINI_API_KEY);
  const model = getGeminiEmbeddingModel();
  if (!apiKey) {
    return {
      ok: false,
      error: "GEMINI_NOT_CONFIGURED",
      detail: "Set GEMINI_API_KEY before using RAG embeddings",
    };
  }

  if (texts.length === 0) {
    return { ok: true, embeddings: [], model };
  }

  const requests = texts.map((text) => ({
    model: `models/${model}`,
    content: { parts: [{ text }] },
    outputDimensionality: GEMINI_EMBEDDING_DIMENSION,
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:batchEmbedContents?key=${encodeURIComponent(apiKey)}`;
  const bodyStr = JSON.stringify({ requests });

  let lastStatus = 0;
  let lastMessage = "";

  for (let attempt = 1; attempt <= EMBED_MAX_ATTEMPTS; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: bodyStr,
      });
    } catch (error) {
      return {
        ok: false,
        error: "GEMINI_EMBED_REQUEST_FAILED",
        detail: error instanceof Error ? error.message : "unknown error",
      };
    }

    const json = (await response.json().catch(() => null)) as
      | {
          error?: { message?: string; code?: number };
          embeddings?: Array<{ values?: number[] }>;
        }
      | null;

    lastStatus = response.status;
    lastMessage = json?.error?.message ?? `gemini embedding returned HTTP ${response.status}`;

    if (response.ok) {
      const embeddings = (json?.embeddings ?? []).map((item) => item.values ?? []);
      const dim = GEMINI_EMBEDDING_DIMENSION;
      if (embeddings.length !== texts.length || embeddings.some((values) => values.length !== dim)) {
        return {
          ok: false,
          error: "GEMINI_EMBED_INVALID_RESPONSE",
          detail: `Gemini embedding API returned unexpected payload (expected ${texts.length} vectors of length ${dim})`,
        };
      }
      return { ok: true, embeddings, model };
    }

    const retryable = attempt < EMBED_MAX_ATTEMPTS && isRetryableEmbedFailure(response.status, lastMessage);
    if (retryable) {
      const fromHeader = parseRetryAfterMs(response);
      const exponential = Math.min(90_000, EMBED_BASE_BACKOFF_MS * 2 ** (attempt - 1));
      const jitter = Math.floor(Math.random() * 500);
      const waitMs = Math.max(fromHeader ?? 0, exponential) + jitter;
      await sleep(waitMs);
      continue;
    }

    const errorCode =
      response.status === 429 || lastMessage.toLowerCase().includes("resource exhausted")
        ? "GEMINI_EMBED_RATE_LIMIT"
        : "GEMINI_EMBED_HTTP_ERROR";

    return {
      ok: false,
      error: errorCode,
      detail:
        attempt > 1
          ? `${lastMessage} (ลองใหม่ ${attempt - 1} ครั้งแล้วยังไม่สำเร็จ — ลดขนาดข้อมูลหรือรอแล้วค่อย reindex อีกครั้ง)`
          : lastMessage,
    };
  }

  return { ok: false, error: "GEMINI_EMBED_HTTP_ERROR", detail: lastMessage || "unexpected embed loop exit" };
}

export async function embedTextWithGemini(text: string): Promise<
  | { ok: true; embedding: number[]; model: string }
  | { ok: false; error: string; detail: string }
> {
  const result = await embedTextsWithGemini([text]);
  if (!result.ok) return result;
  return { ok: true, embedding: result.embeddings[0] ?? [], model: result.model };
}
