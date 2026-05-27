import { embedTextWithGemini } from "@/lib/adminAiEmbeddings";
import { type AdminAiLlmProvider, generateAdminAiRagAnswer } from "@/lib/adminAiLlmBackend";
import { getRagChunkCount, matchRagChunks } from "@/lib/adminAiRagStore";

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
  rag?: {
    chunk_count: number;
    retrieved_count: number;
    embedding_model: string;
    top_similarity: number;
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

async function answerWithRag(question: string): Promise<AdminAiChatResult> {
  let chunkCount = 0;
  try {
    chunkCount = await getRagChunkCount();
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: "RAG_INDEX_UNAVAILABLE",
      message: "ยังเชื่อมต่อฐานความรู้ RAG ไม่ได้",
      detail: error instanceof Error ? error.message : "unknown error",
    };
  }

  if (chunkCount === 0) {
    return {
      ok: false,
      status: 400,
      error: "RAG_INDEX_EMPTY",
      message: "ยังไม่มีข้อมูลในฐานความรู้ RAG กรุณารันการสร้าง embedding ก่อน",
      detail:
        "เรียก POST /api/admin/ai/rag/reindex หลังรัน supabase/heart4rooms_ai_rag_v1.sql และ heart4rooms_ai_decoded_facts_v1.sql ใน Supabase",
    };
  }

  const embedResult = await embedTextWithGemini(question);
  if (!embedResult.ok) {
    return {
      ok: false,
      status: 500,
      error: embedResult.error,
      message: "แปลงคำถามเป็น embedding ไม่สำเร็จ",
      detail: embedResult.detail,
    };
  }

  let matchedChunks;
  try {
    matchedChunks = await matchRagChunks({
      embedding: embedResult.embedding,
      matchCount: 10,
    });
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: "RAG_RETRIEVAL_FAILED",
      message: "ค้นหาข้อมูลที่เกี่ยวข้องไม่สำเร็จ",
      detail: error instanceof Error ? error.message : "unknown error",
    };
  }

  if (matchedChunks.length === 0) {
    return {
      ok: false,
      status: 400,
      error: "RAG_NO_MATCHES",
      message: "ไม่พบข้อมูลที่เกี่ยวข้องกับคำถามนี้",
    };
  }

  const llmResult = await generateAdminAiRagAnswer({
    question,
    contextBlocks: matchedChunks.map((chunk) => chunk.content),
  });

  if (!llmResult.ok) {
    return {
      ok: false,
      status: 500,
      error: llmResult.error,
      message: "สรุปคำตอบด้วย Gemini ไม่สำเร็จ",
      detail: llmResult.detail,
    };
  }

  const topSimilarity = matchedChunks[0]?.similarity ?? 0;

  return {
    ok: true,
    status: 200,
    mode: "rag_v1",
    question,
    intent: {
      id: "rag_retrieval",
      label: "ค้นหาจากฐานความรู้ RAG",
      confidence: Math.max(0, Math.min(topSimilarity, 1)),
      matched_keywords: [],
    },
    answer: llmResult.answer,
    sql: "",
    max_rows: matchedChunks.length,
    result: {
      columns: ["chunk_kind", "question_key", "similarity"],
      rows: matchedChunks.map((chunk) => [chunk.chunk_kind, chunk.question_key, chunk.similarity]),
      row_count: matchedChunks.length,
      truncated: false,
      duration_ms: 0,
      normalized_sql: "",
      relations: ["heart4rooms_ai_chunks"],
    },
    llm: {
      provider: llmResult.provider,
      model: llmResult.model,
    },
    rag: {
      chunk_count: chunkCount,
      retrieved_count: matchedChunks.length,
      embedding_model: embedResult.model,
      top_similarity: topSimilarity,
    },
    suggestions: [],
  };
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

  return answerWithRag(trimmed);
}
