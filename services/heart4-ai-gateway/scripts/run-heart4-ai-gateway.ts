/**
 * Heart4 AI Gateway — รันบน VM คู่กับ Ollama (ไม่ใช่ส่วนของ Next.js deploy)
 *
 * จากโฟลเดอร์นี้: npm start
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { getHeart4AiGatewayConfig } from "@/lib/heart4AiGateway/config";
import { askHeart4Gateway, getGatewayStoreInit } from "@/lib/heart4AiGateway/ask";
import { addLearnedExample } from "@/lib/heart4AiGateway/learnedExamples";
import { getRagBuildProgress, isRagIndexReady } from "@/lib/heart4AiGateway/ragIndex";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function checkAuth(req: IncomingMessage): boolean {
  const cfg = getHeart4AiGatewayConfig();
  if (!cfg.secret) return true;
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return token === cfg.secret;
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "GET" && url.pathname === "/health") {
    let surveys = 0;
    try {
      const store = await getGatewayStoreInit();
      surveys = store.surveyCount;
    } catch {
      surveys = 0;
    }
    const cfg = getHeart4AiGatewayConfig();
    const rag = getRagBuildProgress();
    json(res, 200, {
      ok: true,
      service: "heart4-ai-gateway",
      surveys,
      ragReady: isRagIndexReady(),
      ragBuildSkipped: cfg.skipRagBuild,
      ragBuilding: rag.building,
      ragProgress: rag,
    });
    return;
  }

  if (!checkAuth(req)) {
    json(res, 401, { ok: false, error: "UNAUTHORIZED", message: "Invalid gateway secret" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/v1/chat") {
    const raw = await readBody(req);
    const body = JSON.parse(raw || "{}") as { question?: string; sessionId?: string };
    const question = typeof body.question === "string" ? body.question : "";
    const t0 = Date.now();
    console.log("[heart4-ai-gateway] chat start:", question.slice(0, 80));
    const result = await askHeart4Gateway({ question, sessionId: body.sessionId ?? null });
    console.log(`[heart4-ai-gateway] chat done ${Date.now() - t0}ms ok=${result.ok}`);
    const status = result.ok ? 200 : result.status;
    json(res, status, result);
    return;
  }

  if (req.method === "POST" && url.pathname === "/v1/teach") {
    const raw = await readBody(req);
    const body = JSON.parse(raw || "{}") as { question?: string; answer?: string; note?: string };
    if (!body.question?.trim() || !body.answer?.trim()) {
      json(res, 400, { ok: false, error: "INVALID", message: "ต้องมี question และ answer" });
      return;
    }
    const ex = await addLearnedExample({
      question: body.question,
      answer: body.answer,
      note: body.note,
    });
    json(res, 200, { ok: true, example: ex });
    return;
  }

  json(res, 404, { ok: false, error: "NOT_FOUND" });
}

async function main(): Promise<void> {
  const cfg = getHeart4AiGatewayConfig();
  console.log("[heart4-ai-gateway] loading surveys…", cfg.surveysJson);
  await getGatewayStoreInit();
  console.log("[heart4-ai-gateway] data loaded; RAG building in background");

  const server = createServer((req, res) => {
    void handle(req, res).catch((err) => {
      console.error(err);
      json(res, 500, {
        ok: false,
        error: "INTERNAL",
        message: err instanceof Error ? err.message : "error",
      });
    });
  });

  server.listen(cfg.port, () => {
    console.log(`[heart4-ai-gateway] listening on http://127.0.0.1:${cfg.port}`);
    console.log("[heart4-ai-gateway] POST /v1/chat  GET /health");
  });
}

void main();
