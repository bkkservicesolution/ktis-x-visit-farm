import { getAdminAiDomainSystemPrompt } from "@/lib/adminAiDomainKnowledge";

type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type LlmChatSuccess = {
  ok: true;
  content: string;
  model: string;
  provider: "gemini";
};

type LlmChatError = {
  ok: false;
  error: string;
  detail: string;
  provider: "gemini";
};

type LlmChatResult = LlmChatSuccess | LlmChatError;

type RefineSuccess = {
  ok: true;
  answer: string;
  model: string;
  provider: "gemini";
};

type RefineError = {
  ok: false;
  error: string;
  detail: string;
  provider: "gemini";
};

export type RefineResult = RefineSuccess | RefineError;

export type AdminAiLlmProvider = "gemini";

function normalizeEnvValue(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function chatWithGemini(options: {
  messages: LlmMessage[];
  maxTokens: number;
  temperature: number;
  responseFormat?: "json_object";
}): Promise<LlmChatResult> {
  const apiKey = normalizeEnvValue(process.env.GEMINI_API_KEY);
  const model = normalizeEnvValue(process.env.GEMINI_MODEL) ?? "gemini-3.1-flash-lite";
  if (!apiKey) {
    return {
      ok: false,
      provider: "gemini",
      error: "GEMINI_NOT_CONFIGURED",
      detail: "Set GEMINI_API_KEY for Gemini chat and embeddings",
    };
  }

  const systemText = options.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n")
    .trim();

  const contents = options.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = {
    ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
    contents,
    generationConfig: {
      temperature: options.temperature,
      maxOutputTokens: options.maxTokens,
      ...(options.responseFormat ? { responseMimeType: "application/json" } : {}),
    },
  };

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  } catch (error) {
    return {
      ok: false,
      provider: "gemini",
      error: "GEMINI_REQUEST_FAILED",
      detail: error instanceof Error ? error.message : "unknown error",
    };
  }

  const json = (await response.json().catch(() => null)) as
    | {
        error?: unknown;
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: unknown }>;
          };
        }>;
      }
    | null;

  if (!response.ok) {
    let detail = `gemini returned HTTP ${response.status}`;
    if (
      json?.error &&
      typeof json.error === "object" &&
      "message" in json.error &&
      typeof (json.error as { message?: unknown }).message === "string"
    ) {
      detail = (json.error as { message: string }).message;
    }
    return {
      ok: false,
      provider: "gemini",
      error: "GEMINI_HTTP_ERROR",
      detail,
    };
  }

  const content =
    typeof json?.candidates?.[0]?.content?.parts?.[0]?.text === "string"
      ? (json?.candidates?.[0]?.content?.parts?.[0]?.text as string).trim()
      : "";

  if (!content) {
    return {
      ok: false,
      provider: "gemini",
      error: "GEMINI_EMPTY_RESPONSE",
      detail: "gemini returned an empty assistant message",
    };
  }

  return {
    ok: true,
    provider: "gemini",
    content,
    model,
  };
}

export async function generateAdminAiRagAnswer(input: {
  question: string;
  contextBlocks: string[];
}): Promise<RefineResult> {
  const contextText =
    input.contextBlocks.length > 0
      ? input.contextBlocks.map((block, index) => `[${index + 1}]\n${block}`).join("\n\n")
      : "ไม่มีข้อมูลที่เกี่ยวข้อง";

  const systemPrompt = [
    getAdminAiDomainSystemPrompt(),
    "",
    "งานเฉพาะรอบนี้: วิเคราะห์และตอบจากบล็อก context ที่ค้นหาได้ด้านล่าง",
    "ตัวเลข จำนวน สัดส่วน จากแบบสำรวมชาวไร่: ใช้เฉพาะใน context เท่านั้น ห้ามแต่ง",
    "ถ้า context ไม่พอ ให้บอกชัดว่าข้อมูลที่ค้นหาได้ไม่เพียงพอ",
    "ความยาวคำตอบ: กระชับ 2–6 ประโยค เหมาะกับแชทแอดมิน",
  ].join("\n");

  const userPrompt = [
    `คำถาม: ${input.question}`,
    "ข้อมูลที่ค้นหาได้จากระบบ:",
    contextText,
    "โปรดตอบโดยอิงจากข้อมูลข้างต้นเท่านั้น",
  ].join("\n\n");

  const llmResult = await chatWithGemini({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 480,
    temperature: 0.2,
  });

  if (!llmResult.ok) return llmResult;

  return {
    ok: true,
    answer: llmResult.content,
    model: llmResult.model,
    provider: llmResult.provider,
  };
}
