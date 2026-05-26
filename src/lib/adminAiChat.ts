import { executeAdminReadonlySql, type AdminAiReadonlySqlSuccess } from "@/lib/adminAiReadonlySqlServer";
import { getAdminAiBackendMode, refineAdminAiAnswerWithLlm } from "@/lib/adminAiLlmBackend";

type ChatIntentPlan = {
  id: string;
  label: string;
  confidence: number;
  matchedKeywords: string[];
  sql: string;
  maxRows: number;
  suggestions: string[];
  answer: (result: AdminAiReadonlySqlSuccess) => string;
};

export type AdminAiChatSuccess = {
  ok: true;
  status: 200;
  mode: "rule_based_v1" | "ollama_refine_v1" | "llama_cpp_refine_v1";
  question: string;
  intent: {
    id: string;
    label: string;
    confidence: number;
    matched_keywords: string[];
  };
  answer: string;
  sql: string;
  max_rows: number;
  result: {
    columns: string[];
    rows: unknown[][];
    row_count: number;
    truncated: boolean;
    duration_ms: number;
    normalized_sql: string;
    relations: string[];
  };
  llm: null | {
    provider: "ollama" | "llama_cpp";
    model: string;
  };
  suggestions: string[];
};

export type AdminAiChatError = {
  ok: false;
  status: 400 | 500;
  error: string;
  message: string;
  detail?: string;
  suggestions?: string[];
};

export type AdminAiChatResult = AdminAiChatSuccess | AdminAiChatError;

const DEFAULT_SUGGESTIONS = [
  "มีคนไม่เคยได้ยินเรื่องหัวใจ 4 ห้องกี่คน",
  "สรุปคำตอบข้อ 1 ให้หน่อย",
  "โรคอ้อยที่ชาวไร่เจอมีอะไรบ้าง",
  "มีกี่รายที่กังวลเรื่องราคาอ้อย",
  "ค่าเฉลี่ยข้อ 29 คือเท่าไร",
] as const;

function normalizeQuestion(question: string): string {
  return question.replace(/\s+/g, " ").trim().toLowerCase();
}

function hasAny(text: string, candidates: readonly string[]): string[] {
  return candidates.filter((candidate) => text.includes(candidate));
}

function hasAll(text: string, candidates: readonly string[]): boolean {
  return candidates.every((candidate) => text.includes(candidate));
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function asText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function formatCount(value: number): string {
  return value.toLocaleString("th-TH");
}

function formatGroupedTop(result: AdminAiReadonlySqlSuccess, emptyMessage: string, heading: string) {
  if (result.rowObjects.length === 0) return emptyMessage;
  const lines = result.rowObjects
    .map((row) => {
      const label = asText(row.text_value ?? row.q1_choice_label ?? row.label ?? row.choice_label) || "(ไม่ระบุ)";
      const total = asNumber(row.total ?? row.count ?? row.never_heard_count);
      return `- ${label}: ${formatCount(total)} ราย`;
    })
    .slice(0, 8);
  return `${heading}\n${lines.join("\n")}`;
}

function buildAverageAnswer(result: AdminAiReadonlySqlSuccess, label: string) {
  const row = result.rowObjects[0] ?? {};
  const averageScore = asNumber(row.average_score);
  const answeredCount = asNumber(row.answered_count);
  if (!answeredCount) {
    return `ยังไม่พบข้อมูลคะแนนสำหรับ${label}`;
  }
  return `ค่าเฉลี่ย${label}อยู่ที่ ${averageScore.toFixed(2)} จากคำตอบ ${formatCount(answeredCount)} ราย`;
}

function planAdminAiQuestion(question: string): ChatIntentPlan | null {
  const normalized = normalizeQuestion(question);

  const scoreMatch = normalized.match(/(?:ข้อ|q)\s*(29|30|31|32|33)\b/);
  if (scoreMatch && hasAny(normalized, ["เฉลี่ย", "ค่าเฉลี่ย", "คะแนน"]).length > 0) {
    const questionNo = scoreMatch[1];
    const column = `q${questionNo}_score_num`;
    return {
      id: "average-score",
      label: `ค่าเฉลี่ยข้อ ${questionNo}`,
      confidence: 0.92,
      matchedKeywords: [`ข้อ ${questionNo}`, ...hasAny(normalized, ["เฉลี่ย", "ค่าเฉลี่ย", "คะแนน"])],
      sql: `select avg(${column})::numeric(10, 2) as average_score, count(${column}) as answered_count from public.heart4rooms_ai_core_v2 where ${column} is not null`,
      maxRows: 5,
      suggestions: ["ค่าเฉลี่ยข้อ 30 คือเท่าไร", "ค่าเฉลี่ยข้อ 33 คือเท่าไร"],
      answer: (result) => buildAverageAnswer(result, `ข้อ ${questionNo}`),
    };
  }

  if (hasAny(normalized, ["ราคาอ้อย"]).length > 0 && hasAny(normalized, ["กังวล", "ห่วง"]).length > 0) {
    const countKeywords = hasAny(normalized, ["กี่", "กี่คน", "กี่ราย", "จำนวน"]);
    if (countKeywords.length > 0) {
      return {
        id: "price-worry-count",
        label: "นับผู้ที่กังวลเรื่องราคาอ้อย",
        confidence: 0.95,
        matchedKeywords: ["ราคาอ้อย", ...hasAny(normalized, ["กังวล", "ห่วง"]), ...countKeywords],
        sql: "select count(*) as worried_count from public.heart4rooms_ai_core_v2 where q26_choice = 'c'",
        maxRows: 5,
        suggestions: ["สรุปความกังวลเรื่องราคาอ้อย", "สรุปคำตอบข้อ 26 ให้หน่อย"],
        answer: (result) => {
          const row = result.rowObjects[0] ?? {};
          const worriedCount = asNumber(row.worried_count);
          return `พบ ${formatCount(worriedCount)} รายที่ตอบว่ากังวลเรื่องราคาอ้อย`;
        },
      };
    }

    if (hasAny(normalized, ["อะไรบ้าง", "มีอะไร", "สรุป", "ประเด็น"]).length > 0) {
      return {
        id: "price-worry-themes",
        label: "สรุปประเด็นกังวลเรื่องราคาอ้อย",
        confidence: 0.9,
        matchedKeywords: ["ราคาอ้อย", ...hasAny(normalized, ["กังวล", "ห่วง", "อะไรบ้าง", "มีอะไร", "สรุป", "ประเด็น"])],
        sql: "select text_value, count(*) as total from public.heart4rooms_ai_open_text_v1 where question_key = 'q26' and field_key = 'worry' and nullif(trim(text_value), '') is not null group by text_value order by total desc limit 10",
        maxRows: 10,
        suggestions: ["มีกี่รายที่กังวลเรื่องราคาอ้อย", "สรุปคำตอบข้อ 26 ให้หน่อย"],
        answer: (result) =>
          formatGroupedTop(result, "ยังไม่พบข้อความความกังวลเรื่องราคาอ้อย", "ประเด็นที่ชาวไร่กังวลเรื่องราคาอ้อยที่พบมากสุดคือ:"),
      };
    }
  }

  if (hasAny(normalized, ["ข้อ 26", "q26"]).length > 0 && hasAny(normalized, ["สรุป", "แจกแจง", "แยก"]).length > 0) {
    return {
      id: "price-awareness-breakdown",
      label: "สรุปคำตอบข้อ 26",
      confidence: 0.89,
      matchedKeywords: [...hasAny(normalized, ["ข้อ 26", "q26", "สรุป", "แจกแจง", "แยก"])],
      sql: "select q26_choice_label, count(*) as total from public.heart4rooms_ai_core_v2 group by q26_choice_label order by total desc",
      maxRows: 10,
      suggestions: ["มีกี่รายที่กังวลเรื่องราคาอ้อย", "สรุปความกังวลเรื่องราคาอ้อย"],
      answer: (result) =>
        formatGroupedTop(result, "ยังไม่พบข้อมูลคำตอบข้อ 26", "สรุปคำตอบข้อ 26 เรื่องราคาอ้อยคือ:"),
    };
  }

  const diseaseKeywords = hasAny(normalized, ["โรคอ้อย", "โรค", "แส้ดำ"]);
  if (diseaseKeywords.length > 0 && hasAny(normalized, ["อะไรบ้าง", "เจอ", "พบ", "ระบุ", "พูดถึง"]).length > 0) {
    return {
      id: "disease-topics",
      label: "สรุปโรคอ้อยที่ชาวไร่ระบุ",
      confidence: 0.9,
      matchedKeywords: [...diseaseKeywords, ...hasAny(normalized, ["อะไรบ้าง", "เจอ", "พบ", "ระบุ", "พูดถึง"])],
      sql: "select text_value, count(*) as total from public.heart4rooms_ai_open_text_v1 where question_key = 'q7' and nullif(trim(text_value), '') is not null group by text_value order by total desc limit 10",
      maxRows: 10,
      suggestions: ["โรคอ้อยที่ชาวไร่เจอบ่อยสุดคืออะไร", "มีคนไม่เคยได้ยินเรื่องหัวใจ 4 ห้องกี่คน"],
      answer: (result) =>
        formatGroupedTop(result, "ยังไม่พบข้อมูลข้อความโรคอ้อยจากข้อ 7", "โรคอ้อยหรือปัญหาที่ชาวไร่ระบุบ่อยที่สุดคือ:"),
    };
  }

  const neverHeardKeywords = hasAny(normalized, ["ไม่เคยได้ยิน", "ยังไม่เคยได้ยิน", "ไม่รู้จัก"]);
  if (hasAny(normalized, ["หัวใจ 4 ห้อง", "4 ห้อง"]).length > 0 && neverHeardKeywords.length > 0 && hasAny(normalized, ["กี่", "กี่คน", "กี่ราย", "จำนวน"]).length > 0) {
    return {
      id: "never-heard-count",
      label: "นับผู้ที่ไม่เคยได้ยินเรื่องหัวใจ 4 ห้อง",
      confidence: 0.97,
      matchedKeywords: ["หัวใจ 4 ห้อง", ...neverHeardKeywords, ...hasAny(normalized, ["กี่", "กี่คน", "กี่ราย", "จำนวน"])],
      sql: "select count(*) as never_heard_count from public.heart4rooms_ai_core_v2 where q1_choice = 'b'",
      maxRows: 5,
      suggestions: ["สรุปคำตอบข้อ 1 ให้หน่อย", "โรคอ้อยที่ชาวไร่เจอมีอะไรบ้าง"],
      answer: (result) => {
        const row = result.rowObjects[0] ?? {};
        const count = asNumber(row.never_heard_count);
        return `พบ ${formatCount(count)} รายที่ตอบว่าไม่เคยได้ยินเรื่องหัวใจ 4 ห้อง`;
      },
    };
  }

  if (
    (hasAny(normalized, ["หัวใจ 4 ห้อง", "4 ห้อง"]).length > 0 && hasAny(normalized, ["เคยได้ยิน", "ได้ยิน", "รู้จัก", "รับรู้"]).length > 0) ||
    hasAll(normalized, ["ข้อ 1", "สรุป"])
  ) {
    return {
      id: "awareness-breakdown",
      label: "สรุปคำตอบเรื่องการรับรู้หัวใจ 4 ห้อง",
      confidence: 0.88,
      matchedKeywords: [...hasAny(normalized, ["หัวใจ 4 ห้อง", "4 ห้อง", "เคยได้ยิน", "ได้ยิน", "รู้จัก", "รับรู้", "ข้อ 1", "สรุป"])],
      sql: "select q1_choice_label, count(*) as total from public.heart4rooms_ai_core_v2 group by q1_choice_label order by total desc",
      maxRows: 10,
      suggestions: ["มีคนไม่เคยได้ยินเรื่องหัวใจ 4 ห้องกี่คน", "สรุปคำตอบข้อ 26 ให้หน่อย"],
      answer: (result) =>
        formatGroupedTop(result, "ยังไม่พบข้อมูลคำตอบข้อ 1", "สรุปคำตอบเรื่องการรับรู้หัวใจ 4 ห้องคือ:"),
    };
  }

  return null;
}

export async function askAdminAi(question: string): Promise<AdminAiChatResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return {
      ok: false,
      status: 400,
      error: "EMPTY_QUESTION",
      message: "กรุณาพิมพ์คำถามก่อนส่ง",
      suggestions: [...DEFAULT_SUGGESTIONS],
    };
  }

  const plan = planAdminAiQuestion(trimmed);
  if (!plan) {
    return {
      ok: false,
      status: 400,
      error: "QUESTION_NOT_SUPPORTED",
      message: "ตอนนี้ AI chat v1 ยังรองรับคำถามบางรูปแบบก่อน เช่น การนับ, การสรุปข้อ 1, โรคอ้อยจากข้อ 7, ความกังวลเรื่องราคาอ้อย, และค่าเฉลี่ยข้อ 29-33",
      suggestions: [...DEFAULT_SUGGESTIONS],
    };
  }

  const sqlResult = await executeAdminReadonlySql(plan.sql, plan.maxRows, plan.maxRows);
  if (!sqlResult.ok) {
    return {
      ok: false,
      status: sqlResult.status,
      error: sqlResult.error,
      message: sqlResult.message,
      detail: sqlResult.detail,
      suggestions: plan.suggestions,
    };
  }

  let answer = "";
  try {
    answer = plan.answer(sqlResult);
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: "ANSWER_FORMAT_FAILED",
      message: "ระบบ query ได้แล้ว แต่สรุปคำตอบไม่สำเร็จ",
      detail: error instanceof Error ? error.message : "unknown error",
      suggestions: plan.suggestions,
    };
  }

  let mode: AdminAiChatSuccess["mode"] = "rule_based_v1";
  let llm: AdminAiChatSuccess["llm"] = null;
  const backendMode = getAdminAiBackendMode();

  if (backendMode !== "rule_based") {
    const llmResult = await refineAdminAiAnswerWithLlm({
      question: trimmed,
      intentLabel: plan.label,
      draftAnswer: answer,
      sql: plan.sql,
      columns: sqlResult.columns,
      rows: sqlResult.rows,
    });

    if (!llmResult.ok) {
      return {
        ok: false,
        status: 500,
        error: llmResult.error,
        message:
          llmResult.provider === "ollama"
            ? "เชื่อมต่อ Ollama ไม่สำเร็จ"
            : "เชื่อมต่อ llama.cpp server ไม่สำเร็จ",
        detail: llmResult.detail,
        suggestions: plan.suggestions,
      };
    }

    answer = llmResult.answer;
    mode = llmResult.provider === "ollama" ? "ollama_refine_v1" : "llama_cpp_refine_v1";
    llm = {
      provider: llmResult.provider,
      model: llmResult.model,
    };
  }

  return {
    ok: true,
    status: 200,
    mode,
    question: trimmed,
    intent: {
      id: plan.id,
      label: plan.label,
      confidence: plan.confidence,
      matched_keywords: plan.matchedKeywords,
    },
    answer,
    sql: plan.sql,
    max_rows: plan.maxRows,
    result: {
      columns: sqlResult.columns,
      rows: sqlResult.rows,
      row_count: sqlResult.row_count,
      truncated: sqlResult.truncated,
      duration_ms: sqlResult.duration_ms,
      normalized_sql: sqlResult.normalized_sql,
      relations: sqlResult.relations,
    },
    llm,
    suggestions: plan.suggestions,
  };
}
