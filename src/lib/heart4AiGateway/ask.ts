import { getAdminAiDomainSystemPrompt } from "@/lib/adminAiDomainKnowledge";
import { tryAnswerDomainKnowledgeQuestion } from "@/lib/adminAiDomainKnowledge";
import { tryAnswerHarvestStatsQuestion } from "@/lib/adminAiHarvestStats";
import { tryAnswerSurveyMetaQuestion } from "@/lib/adminAiSurveyMeta";
import { tryAnswerSurveyAggregateWithDataset } from "@/lib/adminAiSurveyAggregates";
import {
  tryAnswerContractLookupFromRows,
  isContractLookupQuestion,
  extractContractNoFromQuestion,
} from "@/lib/adminAiContractLookup";
import { tryAnswerSurveyListFromRows } from "@/lib/adminAiSurveyListQuery";
import { getHeart4AiGatewayConfig } from "@/lib/heart4AiGateway/config";
import { beginGatewayChat, endGatewayChat } from "@/lib/heart4AiGateway/gatewayChatPriority";
import {
  addLearnedExample,
  loadLearnedExamplesForPrompt,
  parseTeachingFromMessage,
} from "@/lib/heart4AiGateway/learnedExamples";
import { ollamaChat, type OllamaChatMessage } from "@/lib/heart4AiGateway/ollama";
import { searchRag, startRagIndexBuild, isRagIndexReady } from "@/lib/heart4AiGateway/ragIndex";
import {
  appendSessionTurn,
  getOrCreateSessionId,
  getSessionHistoryForPrompt,
} from "@/lib/heart4AiGateway/sessionMemory";
import {
  buildCompactAggregatesContext,
  buildOpenChatUserContext,
  findSurveyByContract,
  loadHeart4DataStore,
  surveyToContractRow,
  type Heart4DataStore,
} from "@/lib/heart4AiGateway/store";

import type {
  Heart4GatewayChatError,
  Heart4GatewayChatResult,
  Heart4GatewayChatSuccess,
  Heart4GatewayIntent,
} from "@/lib/heart4AiGateway/gatewayTypes";

export type {
  Heart4GatewayChatError,
  Heart4GatewayChatResult,
  Heart4GatewayChatSuccess,
  Heart4GatewayIntent,
} from "@/lib/heart4AiGateway/gatewayTypes";

let storeInit: Promise<Heart4DataStore> | null = null;

export function getGatewayStoreInit(): Promise<Heart4DataStore> {
  if (!storeInit) {
    storeInit = loadHeart4DataStore().then((store) => {
      startRagIndexBuild(store);
      return store;
    });
  }
  return storeInit;
}

function success(
  question: string,
  sessionId: string,
  intent: Heart4GatewayIntent,
  answer: string,
  relations: string[],
  model: string,
  started: number,
): Heart4GatewayChatSuccess {
  return {
    ok: true,
    status: 200,
    mode: "heart4_gateway_v1",
    sessionId,
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
      duration_ms: Date.now() - started,
      normalized_sql: "",
      relations,
    },
    llm: { provider: "ollama", model },
    suggestions: [],
    ragReady: isRagIndexReady(),
  };
}

async function summarizeWithOllama(input: {
  question: string;
  factsText: string;
  sessionId: string;
  systemExtra?: string;
}): Promise<{ answer: string; model: string } | Heart4GatewayChatError> {
  const learned = await loadLearnedExamplesForPrompt();
  const history = getSessionHistoryForPrompt(input.sessionId, 5);

  const messages: OllamaChatMessage[] = [
    {
      role: "system",
      content: [
        getAdminAiDomainSystemPrompt(),
        input.systemExtra ?? "",
        learned,
        "",
        "งาน: ตอบคำถามจากข้อมูลที่ให้เท่านั้น ห้ามแต่งตัวเลข",
        "ตอบภาษาไทย ชัดเจน ละเอียดพอสมควร เป็นมิตร",
      ]
        .filter(Boolean)
        .join("\n"),
    },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    {
      role: "user",
      content: [`คำถาม: ${input.question}`, "", "ข้อมูลจากระบบ:", input.factsText].join("\n"),
    },
  ];

  const llm = await ollamaChat({ messages, maxTokens: 900, temperature: 0.25 });
  if (!llm.ok) {
    return {
      ok: false,
      status: 503,
      error: llm.error,
      message: "Ollama ตอบไม่สำเร็จ — ตรวจว่าเปิด Ollama และโมเดลพร้อม",
      detail: llm.detail,
    };
  }
  return { answer: llm.content, model: llm.model };
}

async function openAnswerWithRag(input: {
  question: string;
  store: Heart4DataStore;
  sessionId: string;
}): Promise<{ answer: string; model: string } | Heart4GatewayChatError> {
  const cfg = getHeart4AiGatewayConfig();
  const ragBlocks = await searchRag(input.store, input.question);
  const ragText =
    ragBlocks.length > 0
      ? ["ข้อมูลแบบสำรวจที่ค้นหาเจอ (RAG):", ...ragBlocks].join("\n\n---\n\n").slice(0, 8000)
      : "ยังไม่มี RAG chunk — ใช้สถิติสรุปและโครงสร้างข้อถามเป็นหลัก";
  const userContext = buildOpenChatUserContext({
    question: input.question,
    aggregates: input.store.aggregates,
    aggregatesMaxChars: cfg.chatAggregatesMaxChars,
    ragText,
  });
  const learned = await loadLearnedExamplesForPrompt();
  const history = getSessionHistoryForPrompt(input.sessionId, 5);

  const messages: OllamaChatMessage[] = [
    {
      role: "system",
      content: [
        getAdminAiDomainSystemPrompt(),
        learned,
        "",
        "งาน: ตอบคำถามเกี่ยวกับแบบสำรวจหัวใจ 4 ห้องจาก context",
        "ตัวเลขรวมใช้จากสถิติสรุปเท่านั้น ห้ามแต่ง",
        "ถ้าข้อมูลไม่พอ บอกตรงๆ และแนะนำถามให้ชัด (เลขข้อ/เลขสัญญา)",
        "ตอบภาษาไทย กระชับ มีเหตุผลจากข้อมูล",
      ].join("\n"),
    },
    ...history.map((h) => ({ role: h.role, content: h.content })),
    {
      role: "user",
      content: [`คำถาม: ${input.question}`, "", userContext].join("\n"),
    },
  ];

  const promptChars = messages.reduce((n, m) => n + m.content.length, 0);
  console.log(`[heart4-ai-gateway] ollama prompt ~${promptChars} chars`);

  const llm = await ollamaChat({ messages, maxTokens: 500, temperature: 0.35 });
  if (!llm.ok) {
    return {
      ok: false,
      status: 503,
      error: llm.error,
      message: "Ollama ตอบไม่สำเร็จ",
      detail: llm.detail,
    };
  }
  return { answer: llm.content, model: llm.model };
}

export async function askHeart4Gateway(input: {
  question: string;
  sessionId?: string | null;
  teach?: boolean;
}): Promise<Heart4GatewayChatResult> {
  const started = Date.now();
  const trimmed = input.question.trim();
  if (!trimmed) {
    return { ok: false, status: 400, error: "EMPTY_QUESTION", message: "กรุณาพิมพ์คำถาม" };
  }

  beginGatewayChat();
  try {
    return await askHeart4GatewayInner(input, trimmed, started);
  } finally {
    endGatewayChat();
  }
}

async function askHeart4GatewayInner(
  input: { question: string; sessionId?: string | null; teach?: boolean },
  trimmed: string,
  started: number,
): Promise<Heart4GatewayChatResult> {
  const sessionId = getOrCreateSessionId(input.sessionId);
  appendSessionTurn(sessionId, "user", trimmed);

  const teaching = parseTeachingFromMessage(trimmed);
  if (teaching || input.teach) {
    if (teaching) {
      await addLearnedExample(teaching);
      const answer =
        "บันทึกคำถาม-คำตอบที่คุณสอนไว้แล้วครับ ระบบจะใช้เป็นตัวอย่างเมื่อมีคำถามคล้ายกันในอนาคต";
      appendSessionTurn(sessionId, "assistant", answer);
      return success(
        trimmed,
        sessionId,
        {
          id: "learned",
          label: "บันทึกตัวอย่างที่ผู้ใช้สอน",
          confidence: 1,
          matched_keywords: [],
        },
        answer,
        ["heart4-ai-learned-examples.json"],
        "learned_v1",
        started,
      );
    }
  }

  let store: Heart4DataStore;
  try {
    store = await getGatewayStoreInit();
  } catch (error) {
    const cfg = getHeart4AiGatewayConfig();
    return {
      ok: false,
      status: 503,
      error: "DATA_NOT_LOADED",
      message: "ยังโหลดไฟล์แบบสำรวจไม่ได้",
      detail: `${error instanceof Error ? error.message : "unknown"} (path: ${cfg.surveysJson})`,
    };
  }

  const harvest = tryAnswerHarvestStatsQuestion(trimmed);
  if (harvest) {
    appendSessionTurn(sessionId, "assistant", harvest);
    return success(
      trimmed,
      sessionId,
      { id: "harvest_stats", label: "ข้อมูลเก็บเกี่ยว", confidence: 1, matched_keywords: [] },
      harvest,
      ["harvest-stats-2568-2569.json"],
      "harvest_stats_v1",
      started,
    );
  }

  const domain = tryAnswerDomainKnowledgeQuestion(trimmed);
  if (domain) {
    const refined = await summarizeWithOllama({
      question: trimmed,
      factsText: domain,
      sessionId,
      systemExtra: "อธิบายความรู้องค์กรให้เข้าใจง่าย",
    });
    const answer = "answer" in refined ? refined.answer : domain;
    const model = "model" in refined ? refined.model : "domain_v1";
    appendSessionTurn(sessionId, "assistant", answer);
    return success(
      trimmed,
      sessionId,
      { id: "domain_knowledge", label: "ความรู้ KTIS", confidence: 1, matched_keywords: [] },
      answer,
      ["adminAiDomainKnowledge"],
      model,
      started,
    );
  }

  const meta = tryAnswerSurveyMetaQuestion(trimmed);
  if (meta) {
    appendSessionTurn(sessionId, "assistant", meta);
    return success(
      trimmed,
      sessionId,
      { id: "survey_schema", label: "โครงสร้างแบบสอบถาม", confidence: 1, matched_keywords: [] },
      meta,
      ["heart4SurveyCatalog"],
      "survey_catalog_v1",
      started,
    );
  }

  if (isContractLookupQuestion(trimmed)) {
    const contractRows = findSurveyByContract(store, extractContractNoFromQuestion(trimmed) ?? "");
    const contractAnswer = tryAnswerContractLookupFromRows(
      trimmed,
      contractRows.map(surveyToContractRow),
    );
    if (contractAnswer) {
      appendSessionTurn(sessionId, "assistant", contractAnswer);
      return success(
        trimmed,
        sessionId,
        { id: "contract_lookup", label: "ค้นหาเลขสัญญา", confidence: 1, matched_keywords: [] },
        contractAnswer,
        [store.surveysJsonPath],
        "contract_lookup_v1",
        started,
      );
    }
  }

  const listFacts = tryAnswerSurveyListFromRows(trimmed, store.listRows);
  if (listFacts) {
    const refined = await summarizeWithOllama({
      question: trimmed,
      factsText: listFacts,
      sessionId,
    });
    const answer = "answer" in refined ? refined.answer : listFacts;
    const model = "model" in refined ? refined.model : "survey_list_v1";
    appendSessionTurn(sessionId, "assistant", answer);
    return success(
      trimmed,
      sessionId,
      { id: "survey_list", label: "รายชื่อจากแบบสำรวจ", confidence: 1, matched_keywords: [] },
      answer,
      [store.surveysJsonPath],
      model,
      started,
    );
  }

  const aggFacts = tryAnswerSurveyAggregateWithDataset(trimmed, store.aggregates);
  if (aggFacts) {
    const refined = await summarizeWithOllama({ question: trimmed, factsText: aggFacts, sessionId });
    const answer = "answer" in refined ? refined.answer : aggFacts;
    const model = "model" in refined ? refined.model : "aggregates_v1";
    appendSessionTurn(sessionId, "assistant", answer);
    return success(
      trimmed,
      sessionId,
      { id: "survey_aggregates", label: "สถิติทั้งชุด", confidence: 1, matched_keywords: [] },
      answer,
      [store.surveysJsonPath],
      model,
      started,
    );
  }

  const open = await openAnswerWithRag({ question: trimmed, store, sessionId });
  if (!("answer" in open)) return open;

  appendSessionTurn(sessionId, "assistant", open.answer);
  return success(
    trimmed,
    sessionId,
    {
      id: "ollama_rag",
      label: "ตอบด้วย Ollama + RAG/สถิติ",
      confidence: 0.85,
      matched_keywords: [],
    },
    open.answer,
    [store.surveysJsonPath, "heart4-ai-rag-cache.json"],
    open.model,
    started,
  );
}
