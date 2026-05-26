type AdminAiBackendMode = "rule_based" | "ollama" | "llama_cpp";

type RefineInput = {
  question: string;
  intentLabel: string;
  draftAnswer: string;
  sql: string;
  columns: string[];
  rows: unknown[][];
};

export type AdminAiLlmProvider = "ollama" | "llama_cpp";

type RefineSuccess = {
  ok: true;
  answer: string;
  model: string;
  provider: AdminAiLlmProvider;
};

type RefineError = {
  ok: false;
  error: string;
  detail: string;
  provider: AdminAiLlmProvider;
};

export type RefineResult = RefineSuccess | RefineError;

function normalizeEnvValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getAdminAiBackendMode(): AdminAiBackendMode {
  const raw = normalizeEnvValue(process.env.ADMIN_AI_BACKEND)?.toLowerCase();
  if (raw === "ollama") return "ollama";
  if (raw === "llama_cpp") return "llama_cpp";
  return "rule_based";
}

function buildEvidenceTable(columns: string[], rows: unknown[][]): string {
  if (columns.length === 0 || rows.length === 0) return "ไม่มีแถวข้อมูล";
  const limitedRows = rows.slice(0, 8);
  return JSON.stringify(
    limitedRows.map((row) => {
      const out: Record<string, unknown> = {};
      columns.forEach((column, idx) => {
        out[column] = row[idx] ?? null;
      });
      return out;
    }),
    null,
    2,
  );
}

function buildPrompts(input: RefineInput) {
  const evidenceTable = buildEvidenceTable(input.columns, input.rows);
  const systemPrompt = [
    "You are a Thai admin analytics assistant for Heart4Rooms survey data.",
    "You must answer in Thai.",
    "Use only the provided SQL result and draft answer.",
    "Do not invent facts, counts, percentages, or causes.",
    "Keep the answer concise, clear, and suitable for an admin dashboard chat.",
    "If the evidence is empty, say that the data was not found.",
  ].join(" ");

  const userPrompt = [
    `คำถาม: ${input.question}`,
    `intent: ${input.intentLabel}`,
    `draft_answer: ${input.draftAnswer}`,
    `sql_used: ${input.sql}`,
    `evidence_rows: ${evidenceTable}`,
    "โปรดสรุปคำตอบภาษาไทย 2-5 บรรทัด โดยยึดข้อมูลข้างต้นเท่านั้น",
  ].join("\n\n");

  return { systemPrompt, userPrompt };
}

async function refineWithOllama(input: RefineInput): Promise<RefineResult> {
  const baseUrl = normalizeEnvValue(process.env.OLLAMA_BASE_URL);
  const model = normalizeEnvValue(process.env.OLLAMA_MODEL);
  if (!baseUrl || !model) {
    return {
      ok: false,
      provider: "ollama",
      error: "OLLAMA_NOT_CONFIGURED",
      detail: "Set OLLAMA_BASE_URL and OLLAMA_MODEL before enabling ADMIN_AI_BACKEND=ollama",
    };
  }

  const { systemPrompt, userPrompt } = buildPrompts(input);

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        options: {
          temperature: 0.1,
          num_predict: 220,
        },
        keep_alive: "15m",
      }),
    });
  } catch (error) {
    return {
      ok: false,
      provider: "ollama",
      error: "OLLAMA_REQUEST_FAILED",
      detail: error instanceof Error ? error.message : "unknown error",
    };
  }

  const json = (await response.json().catch(() => null)) as
    | {
        message?: { content?: unknown };
        error?: unknown;
      }
    | null;

  if (!response.ok) {
    return {
      ok: false,
      provider: "ollama",
      error: "OLLAMA_HTTP_ERROR",
      detail:
        typeof json?.error === "string"
          ? json.error
          : `ollama returned HTTP ${response.status}`,
    };
  }

  const content = typeof json?.message?.content === "string" ? json.message.content.trim() : "";
  if (!content) {
    return {
      ok: false,
      provider: "ollama",
      error: "OLLAMA_EMPTY_RESPONSE",
      detail: "ollama returned an empty assistant message",
    };
  }

  return {
    ok: true,
    provider: "ollama",
    answer: content,
    model,
  };
}

async function refineWithLlamaCpp(input: RefineInput): Promise<RefineResult> {
  const baseUrl = normalizeEnvValue(process.env.LLAMA_CPP_BASE_URL);
  const apiKey = normalizeEnvValue(process.env.LLAMA_CPP_API_KEY);
  const requestModel = normalizeEnvValue(process.env.LLAMA_CPP_MODEL) ?? "local-model";
  if (!baseUrl) {
    return {
      ok: false,
      provider: "llama_cpp",
      error: "LLAMA_CPP_NOT_CONFIGURED",
      detail: "Set LLAMA_CPP_BASE_URL before enabling ADMIN_AI_BACKEND=llama_cpp",
    };
  }

  const { systemPrompt, userPrompt } = buildPrompts(input);
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
  const endpoint = normalizedBaseUrl.endsWith("/v1")
    ? `${normalizedBaseUrl}/chat/completions`
    : `${normalizedBaseUrl}/v1/chat/completions`;

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (apiKey) {
    headers.authorization = `Bearer ${apiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: requestModel,
        stream: false,
        temperature: 0.1,
        max_tokens: 220,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
  } catch (error) {
    return {
      ok: false,
      provider: "llama_cpp",
      error: "LLAMA_CPP_REQUEST_FAILED",
      detail: error instanceof Error ? error.message : "unknown error",
    };
  }

  const json = (await response.json().catch(() => null)) as
    | {
        model?: unknown;
        error?: unknown;
        choices?: Array<{
          message?: {
            content?: unknown;
          };
        }>;
      }
    | null;

  if (!response.ok) {
    let detail = `llama.cpp returned HTTP ${response.status}`;
    if (typeof json?.error === "string") {
      detail = json.error;
    } else if (
      json?.error &&
      typeof json.error === "object" &&
      "message" in json.error &&
      typeof (json.error as { message?: unknown }).message === "string"
    ) {
      detail = (json.error as { message: string }).message;
    }

    return {
      ok: false,
      provider: "llama_cpp",
      error: "LLAMA_CPP_HTTP_ERROR",
      detail,
    };
  }

  const content =
    typeof json?.choices?.[0]?.message?.content === "string"
      ? json.choices[0].message.content.trim()
      : "";
  if (!content) {
    return {
      ok: false,
      provider: "llama_cpp",
      error: "LLAMA_CPP_EMPTY_RESPONSE",
      detail: "llama.cpp returned an empty assistant message",
    };
  }

  const responseModel = typeof json?.model === "string" && json.model.trim() ? json.model.trim() : requestModel;
  return {
    ok: true,
    provider: "llama_cpp",
    answer: content,
    model: responseModel,
  };
}

export async function refineAdminAiAnswerWithLlm(input: RefineInput): Promise<RefineResult> {
  const backendMode = getAdminAiBackendMode();
  if (backendMode === "ollama") {
    return refineWithOllama(input);
  }
  if (backendMode === "llama_cpp") {
    return refineWithLlamaCpp(input);
  }

  return {
    ok: false,
    provider: "llama_cpp",
    error: "LLM_BACKEND_NOT_ENABLED",
    detail: "Set ADMIN_AI_BACKEND=ollama or ADMIN_AI_BACKEND=llama_cpp to enable LLM refinement",
  };
}
