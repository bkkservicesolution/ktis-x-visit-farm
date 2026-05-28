import { type AdminAiLlmProvider, summarizeSurveyStatsWithGemini } from "@/lib/adminAiLlmBackend";
import { tryAnswerHarvestStatsQuestion } from "@/lib/adminAiHarvestStats";
import { tryAnswerDomainKnowledgeQuestion } from "@/lib/adminAiDomainKnowledge";
import { tryAnswerSurveyMetaQuestion } from "@/lib/adminAiSurveyMeta";
import { tryAnswerSurveyAggregateQuestion } from "@/lib/adminAiSurveyAggregates";
import { tryAnswerSurveyListQuestion } from "@/lib/adminAiSurveyListQuery";

export type AdminAiChatSuccess = {
  ok: true;
  status: 200;
  mode: "rag_v1";
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
  llm: {
    provider: AdminAiLlmProvider;
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

function successFromAnswer(
  question: string,
  intent: AdminAiChatSuccess["intent"],
  answer: string,
  relations: string[],
  model: string,
): AdminAiChatSuccess {
  return {
    ok: true,
    status: 200,
    mode: "rag_v1",
    question,
    intent,
    answer,
    sql: "",
    max_rows: 0,
    result: {
      columns: [],
      rows: [],
      row_count: 0,
      truncated: false,
      duration_ms: 0,
      normalized_sql: "",
      relations,
    },
    llm: {
      provider: "gemini",
      model,
    },
    suggestions: [],
  };
}

function answerWithGuidance(question: string): AdminAiChatSuccess {
  return successFromAnswer(
    question,
    {
      id: "guided",
      label: "แนะนำวิธีถาม",
      confidence: 1,
      matched_keywords: [],
    },
    [
      "ยังจับคำถามนี้ไม่ชัดพอครับ ลองระบุเลขข้อหรือหัวข้อให้ชัดขึ้น เช่น",
      "• มีชาวไร่คนไหนบ้างที่มีวัชพืช / หญ้ารก / โรค / ศัตรูพืช / ขาดน้ำ",
      "• มีกี่แปลงที่พบศัตรูพืช / วัชพืชร้ายแรง",
      "• ส่วนใหญ่เลือกวิธีจัดการวัชพืชแบบไหน (ข้อ 3)",
      "• % อ้อยไฟไหม้ปี 2568",
    ].join("\n"),
    [],
    "guided_v1",
  );
}

async function answerFromSurveyStats(
  question: string,
  factsText: string,
  options?: { skipSummarize?: boolean },
): Promise<AdminAiChatSuccess> {
  const llm =
    options?.skipSummarize === true
      ? { ok: false as const, error: "SKIP", detail: "" }
      : await summarizeSurveyStatsWithGemini({ question, factsText });
  const answer = llm.ok && "answer" in llm && llm.answer ? llm.answer : factsText;

  return successFromAnswer(
    question,
    {
      id: "survey_aggregates",
      label: "สรุปจากแบบสำรวจทั้งชุด",
      confidence: 1,
      matched_keywords: [],
    },
    answer,
    ["heart4rooms-survey-aggregates.json"],
    llm.ok ? llm.model : "survey_aggregates_v1",
  );
}

export async function askAdminAi(question: string): Promise<AdminAiChatResult> {
  const trimmed = question.trim();
  if (!trimmed) {
    return {
      ok: false,
      status: 400,
      error: "EMPTY_QUESTION",
      message: "กรุณาพิมพ์คำถามก่อนส่ง",
    };
  }

  const harvestAnswer = tryAnswerHarvestStatsQuestion(trimmed);
  if (harvestAnswer) {
    return successFromAnswer(
      trimmed,
      {
        id: "harvest_stats",
        label: "ข้อมูลการเก็บเกี่ยว 2568-2569",
        confidence: 1,
        matched_keywords: [],
      },
      harvestAnswer,
      ["harvest-stats-2568-2569.json"],
      "harvest_stats_v1",
    );
  }

  const domainAnswer = tryAnswerDomainKnowledgeQuestion(trimmed);
  if (domainAnswer) {
    return successFromAnswer(
      trimmed,
      {
        id: "domain_knowledge",
        label: "ความรู้องค์กร KTIS / หัวใจ 4 ห้อง",
        confidence: 1,
        matched_keywords: [],
      },
      domainAnswer,
      ["adminAiDomainKnowledge"],
      "domain_knowledge_v1",
    );
  }

  const metaAnswer = tryAnswerSurveyMetaQuestion(trimmed);
  if (metaAnswer) {
    return successFromAnswer(
      trimmed,
      {
        id: "survey_schema",
        label: "โครงสร้างแบบสอบถาม",
        confidence: 1,
        matched_keywords: [],
      },
      metaAnswer,
      ["heart4SurveyCatalog"],
      "survey_catalog_v1",
    );
  }

  try {
    const listFacts = await tryAnswerSurveyListQuestion(trimmed);
    if (listFacts) {
      return answerFromSurveyStats(trimmed, listFacts, { skipSummarize: true });
    }
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: "SURVEY_LIST_QUERY_FAILED",
      message: "ค้นหารายชื่อแปลงจากแบบสำรวจไม่สำเร็จ",
      detail: error instanceof Error ? error.message : "unknown error",
    };
  }

  const aggregateFacts = await tryAnswerSurveyAggregateQuestion(trimmed);
  if (aggregateFacts) {
    return answerFromSurveyStats(trimmed, aggregateFacts);
  }

  return answerWithGuidance(trimmed);
}
