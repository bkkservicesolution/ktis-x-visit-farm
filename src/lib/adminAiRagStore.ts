import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { embedTextsWithGemini } from "@/lib/adminAiEmbeddings";
import {
  buildAdminAiDomainKnowledgeChunks,
  verifyAdminAiDomainKnowledge,
} from "@/lib/adminAiDomainKnowledge";
import {
  buildHarvestStatsKnowledgeChunks,
  verifyHarvestStatsDataset,
} from "@/lib/adminAiHarvestStats";
import {
  buildHeart4SurveySchemaChunks,
  getHeart4QuestionDef,
  heart4QuestionTitleTh,
  verifyHeart4SurveyCatalog,
} from "@/lib/heart4SurveyCatalog";
import {
  decodeHeart4SurveyForAdminAi,
  type DecodedFactLine,
  type Heart4SurveyRowForDecode,
} from "@/lib/heart4roomsSurveyDecoder";

/** Smaller batches + cooldown reduce Gemini 429 "Resource exhausted" during full reindex. */
const EMBED_BATCH_SIZE = 12;
const EMBED_BATCH_COOLDOWN_MS = 450;
const INSERT_BATCH_SIZE = 50;
// Vector inserts can be slow; keep this small to avoid Postgres statement timeout.
const CHUNK_INSERT_BATCH_SIZE = 6;
const SURVEY_PAGE_SIZE = 100;

type SurveyRowSelect = Heart4SurveyRowForDecode & { snapshot_cutoff?: string | null };

export type RagChunkInsert = {
  survey_id: string | null;
  created_at: string | null;
  section_key: string | null;
  section_label: string | null;
  question_key: string;
  question_label: string | null;
  field_key: string | null;
  field_label: string | null;
  text_kind: string | null;
  choice_code: string | null;
  choice_label: string | null;
  chunk_kind: string;
  chunk_index: number;
  content: string;
  content_hash: string;
  token_estimate: number;
  embedding: number[];
  embedded_at: string;
  source_view: string;
};

export type RagMatchedChunk = {
  id: string;
  survey_id: string | null;
  question_key: string;
  field_key: string | null;
  question_label: string | null;
  field_label: string | null;
  chunk_kind: string;
  content: string;
  similarity: number;
};

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function hashContent(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

function buildDecodedFactChunkContent(survey: SurveyRowSelect, fact: DecodedFactLine): string {
  const farmer = `${survey.farmer_first_name} ${survey.farmer_last_name}`.trim();
  const title =
    fact.question_key === "meta" ? "ข้อมูลแบบสำรวจ (หัวข้อ)" : heart4QuestionTitleTh(fact.question_key);
  const lines = [
    `[${fact.section_label}] ${title}`,
    fact.field_key ? `(ฟิลด์: ${fact.field_key})` : null,
    "",
    fact.human_text,
    "",
    `ชาวไร่: ${farmer}`,
    `สัญญา: ${survey.contract_no}`,
    `ผู้กรอก: ${survey.submitter_display_name}`,
  ];
  return lines.filter((x) => x !== null).join("\n");
}

function buildSurveySummaryChunkContent(survey: SurveyRowSelect, facts: DecodedFactLine[]): string {
  const farmer = `${survey.farmer_first_name} ${survey.farmer_last_name}`.trim();
  const header = [
    "[สรุปแบบสำรวจหัวใจ 4 ห้อง — 1 แบบสำรวจ/1 chunk]",
    survey.snapshot_cutoff ? `snapshot_cutoff: ${survey.snapshot_cutoff}` : null,
    `survey_id: ${survey.id}`,
    `วันที่กรอก: ${survey.created_at}`,
    `ชาวไร่: ${farmer}`,
    `สัญญา: ${survey.contract_no}`,
    `ผู้กรอก: ${survey.submitter_display_name}`,
  ].filter(Boolean);

  const body: string[] = [];
  for (const fact of facts) {
    body.push(buildDecodedFactChunkContent(survey, fact));
    body.push("\n---\n");
  }

  return `${header.join("\n")}\n\n${body.join("\n")}`.trim();
}

async function getAlreadyIndexedSurveyIds(surveyIds: string[]): Promise<Set<string>> {
  if (surveyIds.length === 0) return new Set();
  const { data, error } = await supabaseAdmin()
    .from("heart4rooms_ai_chunks")
    .select("survey_id")
    .in("survey_id", surveyIds)
    .eq("chunk_kind", "survey_summary")
    .limit(surveyIds.length);
  if (error) throw new Error(error.message);
  const out = new Set<string>();
  for (const row of (data ?? []) as Array<{ survey_id: string | null }>) {
    if (row.survey_id) out.add(String(row.survey_id));
  }
  return out;
}

async function fetchSurveyPage(offset: number): Promise<SurveyRowSelect[]> {
  const { data, error } = await supabaseAdmin()
    .from("heart4rooms_surveys_snapshot_v1")
    .select("id, created_at, farmer_first_name, farmer_last_name, contract_no, submitter_display_name, answers, snapshot_cutoff")
    .order("created_at", { ascending: true })
    .range(offset, offset + SURVEY_PAGE_SIZE - 1);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SurveyRowSelect[];
}

type DecodedFactInsert = {
  survey_id: string;
  created_at: string;
  section_key: string;
  section_label: string;
  question_key: string;
  field_key: string | null;
  human_text: string;
};

async function insertDecodedFactBatch(rows: DecodedFactInsert[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabaseAdmin().from("heart4rooms_ai_decoded_facts").insert(rows);
  if (error) {
    throw new Error(error.message);
  }
}

function isRetryableDbInsertFailure(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("statement timeout") || m.includes("canceling statement") || m.includes("timeout");
}

async function insertChunkBatch(rows: Omit<RagChunkInsert, "embedded_at">[]): Promise<void> {
  if (rows.length === 0) return;

  const embeddedAt = new Date().toISOString();
  const payload = rows.map((row) => ({
    ...row,
    embedded_at: embeddedAt,
  }));

  // Use upsert so incremental runs can safely re-run without duplicate errors.
  for (let attempt = 1; attempt <= 5; attempt++) {
    const { error } = await supabaseAdmin()
      .from("heart4rooms_ai_chunks")
      .upsert(payload, { onConflict: "content_hash", ignoreDuplicates: true });
    if (!error) return;
    if (attempt >= 5 || !isRetryableDbInsertFailure(error.message)) {
      throw new Error(error.message);
    }
    await new Promise((r) => setTimeout(r, 800 * attempt));
  }
}

export async function getRagChunkCount(): Promise<number> {
  const { data, error } = await supabaseAdmin().rpc("heart4rooms_ai_rag_chunk_count_v1");
  if (error) {
    throw new Error(error.message);
  }
  return typeof data === "number" ? data : Number(data ?? 0);
}

export async function matchRagChunks(input: {
  embedding: number[];
  matchCount?: number;
  questionKey?: string | null;
  fieldKey?: string | null;
}): Promise<RagMatchedChunk[]> {
  const { data, error } = await supabaseAdmin().rpc("heart4rooms_ai_match_chunks_v1", {
    query_embedding: input.embedding,
    match_count: input.matchCount ?? 8,
    filter_question_key: input.questionKey ?? null,
    filter_field_key: input.fieldKey ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RagMatchedChunk[]).map((row) => ({
    ...row,
    similarity: Number(row.similarity ?? 0),
  }));
}

export type ReindexRagResult =
  | {
      ok: true;
      surveyRows: number;
      decodedFactRows: number;
      totalChunks: number;
      durationMs: number;
    }
  | { ok: false; error: string; detail: string };

export type ReindexMode = "full" | "incremental";

/**
 * Truncates chunks + decoded facts, re-reads heart4rooms_surveys, writes decoded rows and embeddings.
 * Requires `heart4rooms_ai_decoded_facts` + updated `heart4rooms_ai_rag_truncate_v1` (see supabase/heart4rooms_ai_decoded_facts_v1.sql).
 */
function logReindexProgress(message: string): void {
  console.log(`[heart4rooms RAG reindex] ${message}`);
}

export async function reindexHeart4RoomsRag(input?: { mode?: ReindexMode }): Promise<ReindexRagResult> {
  const startedAt = Date.now();
  const mode: ReindexMode = input?.mode ?? "full";
  logReindexProgress("started (truncate + decode + embed — may take many minutes)");

  const catalogCheck = verifyHeart4SurveyCatalog();
  if (!catalogCheck.ok) {
    return {
      ok: false,
      error: "SURVEY_CATALOG_INVALID",
      detail: catalogCheck.errors.join("; "),
    };
  }

  const domainCheck = verifyAdminAiDomainKnowledge();
  if (!domainCheck.ok) {
    return {
      ok: false,
      error: "DOMAIN_KNOWLEDGE_INVALID",
      detail: domainCheck.errors.join("; "),
    };
  }

  const harvestCheck = verifyHarvestStatsDataset();
  if (!harvestCheck.ok) {
    return {
      ok: false,
      error: "HARVEST_STATS_INVALID",
      detail: harvestCheck.errors.join("; "),
    };
  }

  if (mode === "full") {
    const { error: truncateError } = await supabaseAdmin().rpc("heart4rooms_ai_rag_truncate_v1");
    if (truncateError) {
      return {
        ok: false,
        error: "RAG_TRUNCATE_FAILED",
        detail: truncateError.message,
      };
    }
  } else {
    logReindexProgress("mode=incremental (no truncate; will only index missing surveys)");
  }

  const schemaResult = await embedStaticKnowledgeChunks({
    items: buildHeart4SurveySchemaChunks().map((item) => ({
      question_key: item.question_key,
      question_label: heart4QuestionTitleTh(item.question_key),
      section_key: getHeart4QuestionDef(item.question_key)?.sectionKey ?? null,
      section_label: getHeart4QuestionDef(item.question_key)?.sectionLabel ?? null,
      content: item.content,
      content_hash: hashContent(["survey_schema", item.question_key, item.content]),
    })),
    chunk_kind: "survey_schema",
    text_kind: "schema",
    source_view: "heart4SurveyCatalog",
  });
  if (!schemaResult.ok) {
    return schemaResult;
  }
  logReindexProgress(`embedded ${schemaResult.chunkCount} survey_schema chunks`);

  const domainResult = await embedStaticKnowledgeChunks({
    items: buildAdminAiDomainKnowledgeChunks().map((item) => ({
      question_key: item.question_key,
      question_label: item.title,
      section_key: "domain",
      section_label: "ความรู้องค์กร KTIS",
      content: item.content,
      content_hash: hashContent(["domain_knowledge", item.question_key, item.content]),
    })),
    chunk_kind: "domain_knowledge",
    text_kind: "domain",
    source_view: "adminAiDomainKnowledge",
  });
  if (!domainResult.ok) {
    return domainResult;
  }
  logReindexProgress(`embedded ${domainResult.chunkCount} domain_knowledge chunks`);

  const harvestResult = await embedStaticKnowledgeChunks({
    items: buildHarvestStatsKnowledgeChunks().map((item) => ({
      question_key: item.question_key,
      question_label: item.title,
      section_key: "harvest",
      section_label: "ข้อมูลการเก็บเกี่ยว 2568-2569",
      content: item.content,
      content_hash: hashContent(["harvest_stats", item.question_key, item.content]),
    })),
    chunk_kind: "harvest_stats",
    text_kind: "harvest",
    source_view: "harvest-stats-2568-2569.json",
  });
  if (!harvestResult.ok) {
    return harvestResult;
  }
  logReindexProgress(`embedded ${harvestResult.chunkCount} harvest_stats chunks`);

  let surveyRows = 0;
  let decodedFactRows = 0;
  let offset = 0;

  while (true) {
    const page = await fetchSurveyPage(offset);
    if (page.length === 0) break;

    surveyRows += page.length;
    logReindexProgress(`loaded survey page (total surveys so far: ${surveyRows})`);

    const decodedBatch: DecodedFactInsert[] = [];
    const summaries: Array<{ survey: SurveyRowSelect; facts: DecodedFactLine[] }> = [];
    const existing = await getAlreadyIndexedSurveyIds(page.map((p) => p.id));

    for (const survey of page) {
      if (existing.has(survey.id)) continue;
      const facts = decodeHeart4SurveyForAdminAi(survey);
      for (const fact of facts) {
        decodedBatch.push({
          survey_id: survey.id,
          created_at: survey.created_at,
          section_key: fact.section_key,
          section_label: fact.section_label,
          question_key: fact.question_key,
          field_key: fact.field_key,
          human_text: fact.human_text,
        });
      }
      summaries.push({ survey, facts });
    }

    for (let i = 0; i < decodedBatch.length; i += INSERT_BATCH_SIZE) {
      await insertDecodedFactBatch(decodedBatch.slice(i, i + INSERT_BATCH_SIZE));
    }
    decodedFactRows += decodedBatch.length;

    type PendingChunk = Omit<RagChunkInsert, "embedding" | "embedded_at">;
    const pending: PendingChunk[] = summaries.map(({ survey, facts }, index) => {
      const content = buildSurveySummaryChunkContent(survey, facts);
      return {
        survey_id: survey.id,
        created_at: survey.created_at,
        section_key: "survey",
        section_label: "แบบสำรวจหัวใจ 4 ห้อง",
        question_key: "survey_summary",
        question_label: "สรุปแบบสำรวจ (1 survey/1 chunk)",
        field_key: null,
        field_label: null,
        text_kind: "decoded",
        choice_code: null,
        choice_label: null,
        chunk_kind: "survey_summary",
        chunk_index: index,
        content,
        content_hash: hashContent(["survey_summary", survey.id, survey.snapshot_cutoff ?? ""]),
        token_estimate: estimateTokens(content),
        source_view: "heart4rooms_surveys_snapshot_v1",
      };
    });

    const embedBatchTotal = Math.ceil(pending.length / EMBED_BATCH_SIZE) || 0;
    for (let index = 0; index < pending.length; index += EMBED_BATCH_SIZE) {
      const batch = pending.slice(index, index + EMBED_BATCH_SIZE);
      const batchNo = Math.floor(index / EMBED_BATCH_SIZE) + 1;
      logReindexProgress(
        `embedding batch ${batchNo}/${embedBatchTotal} (${batch.length} chunks, ${decodedFactRows} facts total so far)`,
      );
      const embedResult = await embedTextsWithGemini(batch.map((item) => item.content));
      if (!embedResult.ok) {
        return embedResult;
      }

      const ready = batch.map((item, batchIndex) => ({
        ...item,
        embedding: embedResult.embeddings[batchIndex] ?? [],
      }));

      for (let insertIndex = 0; insertIndex < ready.length; insertIndex += CHUNK_INSERT_BATCH_SIZE) {
        await insertChunkBatch(ready.slice(insertIndex, insertIndex + CHUNK_INSERT_BATCH_SIZE));
      }

      if (index + EMBED_BATCH_SIZE < pending.length) {
        await new Promise((r) => setTimeout(r, EMBED_BATCH_COOLDOWN_MS));
      }
    }

    if (page.length < SURVEY_PAGE_SIZE) break;
    offset += SURVEY_PAGE_SIZE;
  }

  const totalChunks = await getRagChunkCount();
  const durationMs = Date.now() - startedAt;
  logReindexProgress(
    `done in ${Math.round(durationMs / 1000)}s — surveys=${surveyRows} facts=${decodedFactRows} chunks=${totalChunks}`,
  );

  return {
    ok: true,
    surveyRows,
    decodedFactRows,
    totalChunks,
    durationMs,
  };
}

type StaticEmbedResult = { ok: true; chunkCount: number } | { ok: false; error: string; detail: string };

type StaticKnowledgeItem = {
  question_key: string;
  question_label: string;
  section_key: string | null;
  section_label: string | null;
  content: string;
  content_hash: string;
};

async function embedStaticKnowledgeChunks(input: {
  items: StaticKnowledgeItem[];
  chunk_kind: string;
  text_kind: string;
  source_view: string;
}): Promise<StaticEmbedResult> {
  type PendingChunk = Omit<RagChunkInsert, "embedding" | "embedded_at">;
  const pending: PendingChunk[] = input.items.map((item, index) => ({
    survey_id: null,
    created_at: null,
    section_key: item.section_key,
    section_label: item.section_label,
    question_key: item.question_key,
    question_label: item.question_label,
    field_key: null,
    field_label: null,
    text_kind: input.text_kind,
    choice_code: null,
    choice_label: null,
    chunk_kind: input.chunk_kind,
    chunk_index: index,
    content: item.content,
    content_hash: item.content_hash,
    token_estimate: estimateTokens(item.content),
    source_view: input.source_view,
  }));

  for (let index = 0; index < pending.length; index += EMBED_BATCH_SIZE) {
    const batch = pending.slice(index, index + EMBED_BATCH_SIZE);
    const embedResult = await embedTextsWithGemini(batch.map((item) => item.content));
    if (!embedResult.ok) {
      return { ok: false, error: embedResult.error, detail: embedResult.detail };
    }

    const ready = batch.map((item, batchIndex) => ({
      ...item,
      embedding: embedResult.embeddings[batchIndex] ?? [],
    }));

    for (let insertIndex = 0; insertIndex < ready.length; insertIndex += INSERT_BATCH_SIZE) {
      await insertChunkBatch(ready.slice(insertIndex, insertIndex + INSERT_BATCH_SIZE));
    }

    if (index + EMBED_BATCH_SIZE < pending.length) {
      await new Promise((r) => setTimeout(r, EMBED_BATCH_COOLDOWN_MS));
    }
  }

  return { ok: true, chunkCount: pending.length };
}
