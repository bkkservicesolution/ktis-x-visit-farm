import { getHeart4AiGatewayConfig } from "@/lib/heart4AiGateway/config";

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  at: string;
};

type Session = {
  id: string;
  turns: ChatTurn[];
  updatedAt: number;
};

const sessions = new Map<string, Session>();

function pruneSessions(): void {
  const cfg = getHeart4AiGatewayConfig();
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now - s.updatedAt > cfg.sessionTtlMs) sessions.delete(id);
  }
}

export function getOrCreateSessionId(sessionId: string | null | undefined): string {
  pruneSessions();
  const id = sessionId?.trim() || crypto.randomUUID();
  if (!sessions.has(id)) {
    sessions.set(id, { id, turns: [], updatedAt: Date.now() });
  }
  return id;
}

export function appendSessionTurn(sessionId: string, role: "user" | "assistant", content: string): void {
  const s = sessions.get(sessionId);
  if (!s) return;
  s.turns.push({ role, content, at: new Date().toISOString() });
  const cfg = getHeart4AiGatewayConfig();
  if (s.turns.length > cfg.maxSessionTurns * 2) {
    s.turns = s.turns.slice(-cfg.maxSessionTurns * 2);
  }
  s.updatedAt = Date.now();
}

export function getSessionHistoryForPrompt(
  sessionId: string,
  maxTurns = 6,
): Array<{ role: "user" | "assistant"; content: string }> {
  const s = sessions.get(sessionId);
  if (!s) return [];
  return s.turns.slice(-maxTurns * 2).map((t) => ({ role: t.role, content: t.content }));
}

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}
