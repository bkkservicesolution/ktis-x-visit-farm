import { HEART4_ADMIN_AI_SCHEMA_HELP } from "@/lib/adminAiSqlTool";

type AdminAiBackendMode = "rule_based" | "ollama" | "llama_cpp";

type RefineInput = {
  question: string;
  intentLabel: string;
  draftAnswer: string;
  sql: string;
  columns: string[];
  rows: unknown[][];
};

type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AdminAiLlmProvider = "ollama" | "llama_cpp";

type LlmChatSuccess = {
  ok: true;
  content: string;
  model: string;
  provider: AdminAiLlmProvider;
};

type LlmChatError = {
  ok: false;
  error: string;
  detail: string;
  provider: AdminAiLlmProvider;
};

type LlmChatResult = LlmChatSuccess | LlmChatError;

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

export type AdminAiGeneratedSqlPlan = {
  intentLabel: string;
  sql: string;
  maxRows: number;
  suggestions: string[];
};

export type AdminAiGeneratedSqlPlanResult =
  | {
      ok: true;
      provider: AdminAiLlmProvider;
      model: string;
      plan: AdminAiGeneratedSqlPlan;
    }
  | {
      ok: false;
      provider: AdminAiLlmProvider;
      error: string;
      detail: string;
    };

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
    "Use polite masculine Thai particles such as 'ครับ' when appropriate.",
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

async function chatWithOllama(options: {
  messages: LlmMessage[];
  maxTokens: number;
  temperature: number;
  responseFormat?: "json_object";
}): Promise<LlmChatResult> {
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

  let response: Response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: options.messages,
        options: {
          temperature: options.temperature,
          num_predict: options.maxTokens,
        },
        keep_alive: "15m",
        ...(options.responseFormat ? { format: "json" } : {}),
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

async function chatWithLlamaCpp(options: {
  messages: LlmMessage[];
  maxTokens: number;
  temperature: number;
  responseFormat?: "json_object";
}): Promise<LlmChatResult> {
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
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        messages: options.messages,
        ...(options.responseFormat ? { response_format: { type: options.responseFormat } } : {}),
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
    content,
    model: responseModel,
  };
}

async function chatWithConfiguredLlm(options: {
  messages: LlmMessage[];
  maxTokens: number;
  temperature: number;
  responseFormat?: "json_object";
}): Promise<LlmChatResult> {
  const backendMode = getAdminAiBackendMode();
  if (backendMode === "ollama") {
    return chatWithOllama(options);
  }
  if (backendMode === "llama_cpp") {
    return chatWithLlamaCpp(options);
  }

  return {
    ok: false,
    provider: "llama_cpp",
    error: "LLM_BACKEND_NOT_ENABLED",
    detail: "Set ADMIN_AI_BACKEND=ollama or ADMIN_AI_BACKEND=llama_cpp to enable LLM refinement",
  };
}

function sanitizePlanSuggestions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function parseGeneratedSqlPlan(rawContent: string): AdminAiGeneratedSqlPlan | null {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    const firstBrace = rawContent.indexOf("{");
    const lastBrace = rawContent.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        parsed = JSON.parse(rawContent.slice(firstBrace, lastBrace + 1));
      } catch {
        parsed = null;
      }
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const sql = typeof parsed.sql === "string" ? parsed.sql.trim() : "";
  const intentLabel = typeof parsed.intent_label === "string" && parsed.intent_label.trim()
    ? parsed.intent_label.trim()
    : typeof parsed.intentLabel === "string" && parsed.intentLabel.trim()
      ? parsed.intentLabel.trim()
      : "วิเคราะห์คำถามข้อมูล";
  const maxRowsRaw = typeof parsed.max_rows === "number"
    ? parsed.max_rows
    : typeof parsed.maxRows === "number"
      ? parsed.maxRows
      : 20;

  if (!sql) return null;

  return {
    intentLabel,
    sql,
    maxRows: Math.max(1, Math.min(Math.trunc(maxRowsRaw), 100)),
    suggestions: sanitizePlanSuggestions(parsed.suggestions),
  };
}

export async function generateAdminAiSqlPlanWithLlm(input: {
  question: string;
  previousAttemptSql?: string;
  previousError?: string;
}): Promise<AdminAiGeneratedSqlPlanResult> {
  const schemaHelpText = JSON.stringify(HEART4_ADMIN_AI_SCHEMA_HELP, null, 2);
  const repairText =
    input.previousAttemptSql && input.previousError
      ? [
          "Previous attempt failed.",
          `failed_sql: ${input.previousAttemptSql}`,
          `error_feedback: ${input.previousError}`,
          "Return a corrected plan.",
        ].join("\n")
      : "This is the first attempt.";

  const systemPrompt = [
    "You are a SQL planner for a Thai analytics assistant.",
    "Your job is to convert the user question into exactly one read-only SQL query.",
    "You must return JSON only.",
    "The SQL must start with SELECT or WITH.",
    "Do not use semicolons.",
    "Use only these relations: public.heart4rooms_ai_core_v2 and public.heart4rooms_ai_open_text_v1.",
    "Keep max_rows between 5 and 100.",
    "Prefer human-readable grouped output using label columns when possible.",
  ].join(" ");

  const userPrompt = [
    `user_question: ${input.question}`,
    repairText,
    "Allowed schema help:",
    schemaHelpText,
    "Return JSON with keys: intent_label, sql, max_rows, suggestions.",
    "suggestions should be 2-4 short Thai follow-up questions.",
  ].join("\n\n");

  const llmResult = await chatWithConfiguredLlm({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 420,
    temperature: 0,
    responseFormat: "json_object",
  });

  if (!llmResult.ok) {
    return llmResult;
  }

  const plan = parseGeneratedSqlPlan(llmResult.content);
  if (!plan) {
    return {
      ok: false,
      provider: llmResult.provider,
      error: "LLM_SQL_PLAN_PARSE_FAILED",
      detail: "The LLM did not return a valid SQL plan JSON payload",
    };
  }

  return {
    ok: true,
    provider: llmResult.provider,
    model: llmResult.model,
    plan,
  };
}

export async function refineAdminAiAnswerWithLlm(input: RefineInput): Promise<RefineResult> {
  const { systemPrompt, userPrompt } = buildPrompts(input);
  const llmResult = await chatWithConfiguredLlm({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 220,
    temperature: 0.1,
  });

  if (!llmResult.ok) return llmResult;

  return {
    ok: true,
    answer: llmResult.content,
    model: llmResult.model,
    provider: llmResult.provider,
  };
}
