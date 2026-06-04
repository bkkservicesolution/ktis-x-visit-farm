import type { AdminAiChatResult } from "@/lib/adminAiChat";
import { getGatewayProxyConfig } from "@/lib/heart4AiGateway/gatewayProxyConfig";
import type { Heart4GatewayChatResult } from "@/lib/heart4AiGateway/gatewayTypes";

function mapGatewayToAdmin(result: Heart4GatewayChatResult): AdminAiChatResult {
  if (!result.ok) {
    return {
      ok: false,
      status: result.status === 400 ? 400 : 500,
      error: result.error,
      message: result.message,
      detail: result.detail,
    };
  }

  return {
    ok: true,
    status: 200,
    mode: "rag_v1",
    question: result.question,
    intent: result.intent,
    answer: result.answer,
    sql: result.sql,
    max_rows: result.max_rows,
    result: result.result,
    llm: { provider: "ollama", model: result.llm.model },
    suggestions: result.suggestions,
  };
}

export async function askAdminAiViaGateway(input: {
  question: string;
  sessionId?: string | null;
}): Promise<AdminAiChatResult & { sessionId?: string }> {
  const cfg = getGatewayProxyConfig();
  if (!cfg.url) {
    return {
      ok: false,
      status: 500,
      error: "GATEWAY_NOT_CONFIGURED",
      message: "ตั้งค่า KTIS_AI_GATEWAY_URL บน Vercel",
    };
  }

  const base = cfg.url.replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/v1/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cfg.secret ? { authorization: `Bearer ${cfg.secret}` } : {}),
      },
      body: JSON.stringify({
        question: input.question,
        sessionId: input.sessionId ?? null,
      }),
    });
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: "GATEWAY_UNREACHABLE",
      message: "เชื่อมต่อเครื่อง AI (VM) ไม่ได้",
      detail: error instanceof Error ? error.message : "unknown",
    };
  }

  const json = (await response.json().catch(() => null)) as Heart4GatewayChatResult | null;
  if (!json) {
    return {
      ok: false,
      status: 500,
      error: "GATEWAY_BAD_RESPONSE",
      message: "เครื่อง AI ตอบรูปแบบไม่ถูกต้อง",
    };
  }

  const mapped = mapGatewayToAdmin(json);
  if (mapped.ok && json.ok) {
    return { ...mapped, sessionId: json.sessionId };
  }
  return mapped;
}
