"use client";

import { useMemo, useState } from "react";

type ChatSuccessResponse = {
  ok: true;
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

type ChatErrorResponse = {
  ok: false;
  error: string;
  message?: string;
  detail?: string;
  suggestions?: string[];
};

type ChatResponse = ChatSuccessResponse | ChatErrorResponse;

type ChatMessage =
  | {
      id: string;
      role: "user";
      text: string;
    }
  | {
      id: string;
      role: "assistant";
      text: string;
      response?: ChatResponse;
    };

function stringifyCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function ChatResultTable({ response }: { response: ChatSuccessResponse }) {
  if (response.result.rows.length === 0) {
    return <div className="rounded-2xl border border-border bg-background px-4 py-6 text-sm text-muted">Query สำเร็จ แต่ไม่มีข้อมูล</div>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="overflow-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-foreground/[0.04]">
            <tr>
              {response.result.columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {response.result.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="border-t border-border align-top">
                {row.map((cell, cellIdx) => (
                  <td key={`${rowIdx}-${cellIdx}`} className="max-w-[360px] whitespace-pre-wrap px-4 py-3 text-foreground">
                    {stringifyCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminAiChatPanel() {
  const quickQuestions = useMemo(
    () => [
      "มีคนไม่เคยได้ยินเรื่องหัวใจ 4 ห้องกี่คน",
      "สรุปคำตอบข้อ 1 ให้หน่อย",
      "โรคอ้อยที่ชาวไร่เจอมีอะไรบ้าง",
      "มีกี่รายที่กังวลเรื่องราคาอ้อย",
      "สรุปความกังวลเรื่องราคาอ้อย",
      "ค่าเฉลี่ยข้อ 29 คือเท่าไร",
    ],
    [],
  );

  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro-assistant",
      role: "assistant",
      text: "AI chat v1 พร้อมใช้งานแล้ว ตอนนี้รองรับคำถามเชิงนับและสรุปบางรูปแบบก่อน โดยระบบจะเลือก SQL ที่ปลอดภัยให้เองและแสดงหลักฐานประกอบทุกครั้ง",
    },
  ]);

  async function submitQuestion(sourceQuestion?: string) {
    const nextQuestion = (sourceQuestion ?? question).trim();
    if (!nextQuestion || pending) return;

    const userMessage: ChatMessage = {
      id: `user-${crypto.randomUUID()}`,
      role: "user",
      text: nextQuestion,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPending(true);
    setQuestion("");

    try {
      const res = await fetch("/api/admin/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ question: nextQuestion }),
      });

      const json = (await res.json().catch(() => null)) as ChatResponse | null;
      const fallbackText = "AI chat ตอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";

      if (!json) {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${crypto.randomUUID()}`,
            role: "assistant",
            text: fallbackText,
          },
        ]);
        return;
      }

      if (json.ok !== true) {
        const message = typeof json.message === "string" && json.message.trim() ? json.message.trim() : fallbackText;
        const detail = typeof json.detail === "string" && json.detail.trim() ? json.detail.trim() : "";
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${crypto.randomUUID()}`,
            role: "assistant",
            text: detail ? `${message}\n${detail}` : message,
            response: json,
          },
        ]);
        return;
      }

      const answerText = !res.ok ? fallbackText : json.answer;
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${crypto.randomUUID()}`,
          role: "assistant",
          text: answerText,
          response: json,
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">AI Chat v1</div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            ตอนนี้หน้า chat ใช้งานกับ SQL tools ได้จริงแล้ว และสามารถต่อ backend LLM ภายนอกผ่าน environment variables
            ได้ เช่น Ollama หรือ llama.cpp server เพื่อช่วยเรียบเรียงคำตอบจากผลลัพธ์จริง
          </p>
          <p className="mt-2 text-xs text-muted">
            รองรับดีในคำถามกลุ่ม: การนับข้อ 1, การสรุปโรคอ้อยจากข้อ 7, ความกังวลเรื่องราคาอ้อย, และค่าเฉลี่ยข้อ 29-33
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background px-4 py-3 text-xs text-muted">
          Orchestration
          <span className="ml-1 font-semibold text-foreground">rule_based_v1</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quickQuestions.map((item) => (
          <button
            key={item}
            type="button"
            disabled={pending}
            onClick={() => void submitQuestion(item)}
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        <label className="block">
          <span className="text-xs font-medium text-muted">คำถาม</span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            spellCheck={false}
            placeholder="เช่น มีคนไม่เคยได้ยินเรื่องหัวใจ 4 ห้องกี่คน"
            className="mt-2 w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => void submitQuestion()}
            className="inline-flex items-center justify-center rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-60"
          >
            {pending ? "กำลังคิด..." : "ถาม AI"}
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={() =>
              setMessages([
                {
                  id: "intro-assistant",
                  role: "assistant",
                  text: "AI chat v1 พร้อมใช้งานแล้ว ตอนนี้รองรับคำถามเชิงนับและสรุปบางรูปแบบก่อน โดยระบบจะเลือก SQL ที่ปลอดภัยให้เองและแสดงหลักฐานประกอบทุกครั้ง",
                },
              ])
            }
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
          >
            ล้างบทสนทนา
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {messages.map((message) => {
          const isUser = message.role === "user";
          return (
            <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`w-full max-w-4xl rounded-3xl border px-4 py-4 shadow-sm ${
                  isUser
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground"
                }`}
              >
                <div className={`text-xs font-medium ${isUser ? "text-background/70" : "text-muted"}`}>
                  {isUser ? "คุณ" : "AI ผู้ช่วยข้อมูล"}
                </div>
                <div className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${isUser ? "text-background" : "text-foreground"}`}>
                  {message.text}
                </div>

                {!isUser && message.response && message.response.ok === true ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 lg:grid-cols-4">
                      <div className="rounded-2xl border border-border bg-card p-3">
                        <div className="text-xs font-medium text-muted">Intent</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">{message.response.intent.label}</div>
                      </div>
                      <div className="rounded-2xl border border-border bg-card p-3">
                        <div className="text-xs font-medium text-muted">Confidence</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                          {Math.round(message.response.intent.confidence * 100)}%
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border bg-card p-3">
                        <div className="text-xs font-medium text-muted">Rows</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                          {message.response.result.row_count.toLocaleString("th-TH")}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border bg-card p-3">
                        <div className="text-xs font-medium text-muted">Duration</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">{message.response.result.duration_ms} ms</div>
                      </div>
                    </div>

                    {message.response.llm ? (
                      <div className="rounded-2xl border border-border bg-card p-4">
                        <div className="text-xs font-medium text-muted">LLM backend</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                          {message.response.llm.provider}: {message.response.llm.model}
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-2xl border border-border bg-card p-4">
                      <div className="text-xs font-medium text-muted">Matched keywords</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.response.intent.matched_keywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>

                      <div className="mt-4 text-xs font-medium text-muted">SQL ที่ระบบใช้</div>
                      <pre className="mt-2 overflow-auto rounded-2xl border border-border bg-background p-3 text-xs text-foreground">
                        {message.response.sql}
                      </pre>

                      <div className="mt-4 text-xs font-medium text-muted">Relations</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {message.response.result.relations.map((relation) => (
                          <span
                            key={relation}
                            className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground"
                          >
                            {relation}
                          </span>
                        ))}
                      </div>
                    </div>

                    <ChatResultTable response={message.response} />

                    {message.response.suggestions.length > 0 ? (
                      <div className="rounded-2xl border border-border bg-card p-4">
                        <div className="text-xs font-medium text-muted">ลองถามต่อ</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {message.response.suggestions.map((item) => (
                            <button
                              key={item}
                              type="button"
                              disabled={pending}
                              onClick={() => void submitQuestion(item)}
                              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!isUser && message.response && message.response.ok === false && message.response.suggestions?.length ? (
                  <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                    <div className="text-xs font-medium text-muted">ตัวอย่างที่ถามได้ตอนนี้</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.response.suggestions.map((item) => (
                        <button
                          key={item}
                          type="button"
                          disabled={pending}
                          onClick={() => void submitQuestion(item)}
                          className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
