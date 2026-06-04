/** Types สำหรับ Vercel proxy ↔ VM gateway (ไม่ดึงโค้ด Ollama/RAG เข้า Next bundle) */

export type Heart4GatewayIntent = {
  id: string;
  label: string;
  confidence: number;
  matched_keywords: string[];
};

export type Heart4GatewayChatSuccess = {
  ok: true;
  status: 200;
  mode: "heart4_gateway_v1";
  sessionId: string;
  question: string;
  intent: Heart4GatewayIntent;
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
  llm: { provider: "ollama"; model: string };
  suggestions: string[];
  ragReady: boolean;
};

export type Heart4GatewayChatError = {
  ok: false;
  status: 400 | 500 | 503;
  error: string;
  message: string;
  detail?: string;
};

export type Heart4GatewayChatResult = Heart4GatewayChatSuccess | Heart4GatewayChatError;
