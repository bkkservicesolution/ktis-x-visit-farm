import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getHeart4AiGatewayConfig } from "@/lib/heart4AiGateway/config";
import { waitUntilNoGatewayChat } from "@/lib/heart4AiGateway/gatewayChatPriority";
import { cosineSimilarity, ollamaEmbed } from "@/lib/heart4AiGateway/ollama";
import type { Heart4DataStore } from "@/lib/heart4AiGateway/store";

export type RagChunk = {
  id: string;
  surveyId: string;
  contractNo: string;
  content: string;
  embedding: number[];
};

type RagCacheFile = {
  version: 1;
  embedModel: string;
  surveyCount: number;
  contentHash: string;
  chunks: Array<{ id: string; surveyId: string; contractNo: string; content: string; embedding: number[] }>;
};

const EMBED_BATCH = 8;

let index: RagChunk[] | null = null;
let indexReady = false;
let indexBuilding = false;

const ragProgress = {
  embedded: 0,
  total: 0,
  startedAt: null as number | null,
  lastLoggedPct: -1,
};

export function getRagBuildProgress(): {
  building: boolean;
  ready: boolean;
  embedded: number;
  total: number;
  percent: number;
  startedAt: string | null;
} {
  const percent =
    ragProgress.total > 0 ? Math.round((ragProgress.embedded / ragProgress.total) * 100) : 0;
  return {
    building: indexBuilding,
    ready: indexReady,
    embedded: ragProgress.embedded,
    total: ragProgress.total,
    percent,
    startedAt: ragProgress.startedAt ? new Date(ragProgress.startedAt).toISOString() : null,
  };
}

function hashSurveys(store: Heart4DataStore): string {
  return createHash("sha256")
    .update(`${store.surveyCount}:${store.loadedAt}:${store.surveysJsonPath}`)
    .digest("hex");
}

function chunkContent(decodedText: string, surveyId: string, contractNo: string): string {
  const max = 6000;
  const head = `survey_id: ${surveyId} | สัญญา: ${contractNo}\n`;
  const body = decodedText.length > max ? `${decodedText.slice(0, max)}\n(ตัดข้อความ…)` : decodedText;
  return head + body;
}

async function loadCache(store: Heart4DataStore, embedModel: string): Promise<RagChunk[] | null> {
  const cfg = getHeart4AiGatewayConfig();
  try {
    const raw = await readFile(cfg.ragCachePath, "utf8");
    const parsed = JSON.parse(raw) as RagCacheFile;
    if (
      parsed?.version === 1 &&
      parsed.embedModel === embedModel &&
      parsed.surveyCount === store.surveyCount &&
      parsed.contentHash === hashSurveys(store) &&
      Array.isArray(parsed.chunks) &&
      parsed.chunks.length > 0
    ) {
      return parsed.chunks.map((c) => ({
        id: c.id,
        surveyId: c.surveyId,
        contractNo: c.contractNo,
        content: c.content,
        embedding: c.embedding,
      }));
    }
  } catch {
    return null;
  }
  return null;
}

async function saveCache(store: Heart4DataStore, chunks: RagChunk[], embedModel: string): Promise<void> {
  const cfg = getHeart4AiGatewayConfig();
  const payload: RagCacheFile = {
    version: 1,
    embedModel,
    surveyCount: store.surveyCount,
    contentHash: hashSurveys(store),
    chunks: chunks.map((c) => ({
      id: c.id,
      surveyId: c.surveyId,
      contractNo: c.contractNo,
      content: c.content,
      embedding: c.embedding,
    })),
  };
  await mkdir(path.dirname(cfg.ragCachePath), { recursive: true });
  await writeFile(cfg.ragCachePath, JSON.stringify(payload), "utf8");
}

async function buildIndex(store: Heart4DataStore): Promise<RagChunk[]> {
  const cfg = getHeart4AiGatewayConfig();
  const cached = await loadCache(store, cfg.embedModel);
  if (cached) {
    ragProgress.total = cached.length;
    ragProgress.embedded = cached.length;
    ragProgress.startedAt = ragProgress.startedAt ?? Date.now();
    console.log(`[heart4-ai-gateway] RAG loaded from cache: ${cached.length} chunks`);
    return cached;
  }

  const items = store.surveys
    .filter((s) => s.decoded_text && s.decoded_text.length > 80)
    .map((s) => ({
      surveyId: s.id,
      contractNo: s.contract_no,
      content: chunkContent(s.decoded_text!, s.id, s.contract_no),
    }));

  ragProgress.total = items.length;
  ragProgress.embedded = 0;
  ragProgress.startedAt = Date.now();
  ragProgress.lastLoggedPct = -1;
  console.log(`[heart4-ai-gateway] RAG build start: ${items.length} surveys to embed`);

  const chunks: RagChunk[] = [];
  for (let i = 0; i < items.length; i += EMBED_BATCH) {
    await waitUntilNoGatewayChat();
    const batch = items.slice(i, i + EMBED_BATCH);
    const embed = await ollamaEmbed(batch.map((b) => b.content));
    if (!embed.ok) throw new Error(`${embed.error}: ${embed.detail}`);
    for (let j = 0; j < batch.length; j++) {
      const b = batch[j]!;
      chunks.push({
        id: `${b.surveyId}_0`,
        surveyId: b.surveyId,
        contractNo: b.contractNo,
        content: b.content,
        embedding: embed.vectors[j]!,
      });
    }
    ragProgress.embedded = Math.min(ragProgress.embedded + batch.length, ragProgress.total);
    const pct = Math.round((ragProgress.embedded / ragProgress.total) * 100);
    if (pct >= ragProgress.lastLoggedPct + 5 || ragProgress.embedded >= ragProgress.total) {
      ragProgress.lastLoggedPct = pct;
      const elapsed = Math.round((Date.now() - (ragProgress.startedAt ?? Date.now())) / 1000);
      console.log(
        `[heart4-ai-gateway] RAG progress ${ragProgress.embedded}/${ragProgress.total} (${pct}%) elapsed ${elapsed}s`,
      );
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("[heart4-ai-gateway] RAG build saving cache…");
  await saveCache(store, chunks, cfg.embedModel);
  ragProgress.embedded = ragProgress.total;
  console.log(`[heart4-ai-gateway] RAG build done: ${chunks.length} chunks`);
  return chunks;
}

export function isRagIndexReady(): boolean {
  return indexReady;
}

export async function ensureRagIndex(store: Heart4DataStore): Promise<void> {
  if (indexReady || indexBuilding) return;
  indexBuilding = true;
  try {
    index = await buildIndex(store);
    indexReady = true;
  } finally {
    indexBuilding = false;
  }
}

export function startRagIndexBuild(store: Heart4DataStore): void {
  const cfg = getHeart4AiGatewayConfig();
  if (cfg.skipRagBuild) {
    console.log("[heart4-ai-gateway] RAG build skipped (HEART4_AI_SKIP_RAG_BUILD)");
    return;
  }
  if (indexReady || indexBuilding) return;
  void ensureRagIndex(store).catch((err) => {
    console.error("[heart4-ai-gateway] RAG index build failed:", err);
  });
}

export async function searchRag(store: Heart4DataStore, question: string): Promise<string[]> {
  // อย่าบล็อกแชทรอ embed ทั้ง 5k+ รายการ — ใช้สถิติ/โครงสร้างก่อน จน ragReady
  if (!indexReady || !index?.length) return [];

  const cfg = getHeart4AiGatewayConfig();
  const qEmbed = await ollamaEmbed([question]);
  if (!qEmbed.ok) return [];
  const qVec = qEmbed.vectors[0]!;
  const chunks = index;

  const scored = chunks
    .map((c) => ({ c, score: cosineSimilarity(qVec, c.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, cfg.ragTopK);

  return scored.map((s) => `[ความคล้าย ${(s.score * 100).toFixed(1)}%]\n${s.c.content}`);
}
