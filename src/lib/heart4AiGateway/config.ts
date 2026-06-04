import path from "node:path";

function envStr(key: string): string | null {
  const v = process.env[key]?.trim();
  return v ? v : null;
}

export function getHeart4AiGatewayConfig() {
  const dataDir = envStr("HEART4_AI_DATA_DIR") ?? path.join(process.cwd(), "data");
  const surveysJson =
    envStr("HEART4_AI_SURVEYS_JSON") ??
    path.join(dataDir, "heart4rooms-surveys-decoded.json");
  const aggregatesJson =
    envStr("HEART4_AI_AGGREGATES_JSON") ??
    path.join(dataDir, "heart4rooms-survey-aggregates.json");
  const learnedPath =
    envStr("HEART4_AI_LEARNED_JSON") ?? path.join(dataDir, "heart4-ai-learned-examples.json");
  const ragCachePath =
    envStr("HEART4_AI_RAG_CACHE") ?? path.join(dataDir, "heart4-ai-rag-cache.json");

  return {
    port: Number(envStr("HEART4_AI_GATEWAY_PORT") ?? "8787"),
    secret: envStr("KTIS_AI_GATEWAY_SECRET") ?? envStr("HEART4_AI_GATEWAY_SECRET"),
    ollamaBaseUrl: envStr("OLLAMA_BASE_URL") ?? "http://127.0.0.1:11434",
    chatModel: envStr("OLLAMA_MODEL") ?? "qwen2.5:7b",
    embedModel: envStr("OLLAMA_EMBED_MODEL") ?? "nomic-embed-text",
    surveysJson,
    aggregatesJson,
    learnedPath,
    ragCachePath,
    ragTopK: Number(envStr("HEART4_AI_RAG_TOP_K") ?? "12"),
    sessionTtlMs: Number(envStr("HEART4_AI_SESSION_TTL_MS") ?? String(2 * 60 * 60 * 1000)),
    maxSessionTurns: Number(envStr("HEART4_AI_MAX_SESSION_TURNS") ?? "12"),
    maxLearnedExamples: Number(envStr("HEART4_AI_MAX_LEARNED") ?? "40"),
    /** จำกัดขนาดสถิติใน prompt แชทเปิด (ลดเวลา qwen บน VM) */
    chatAggregatesMaxChars: Number(envStr("HEART4_AI_CHAT_AGGREGATES_CHARS") ?? "4500"),
    ollamaChatTimeoutMs: Number(envStr("OLLAMA_CHAT_TIMEOUT_MS") ?? "180000"),
    /** 1/true = ไม่ build RAG ในพื้นหลัง (แชทเร็วขึ้น ใช้สถิติ+Ollama อย่างเดียว) */
    skipRagBuild:
      envStr("HEART4_AI_SKIP_RAG_BUILD") === "1" ||
      envStr("HEART4_AI_SKIP_RAG_BUILD")?.toLowerCase() === "true",
  };
}

