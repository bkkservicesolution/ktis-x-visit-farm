"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ChatSuccessResponse = {
  ok: true;
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
  llm: null | {
    provider: "gemini";
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

export function AdminAiChatPanel() {
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [inputRows, setInputRows] = useState(1);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro-assistant",
      role: "assistant",
      text: "สวัสดีครับ ผมพร้อมช่วยตอบคำถามจากข้อมูลจริงของแบบสอบถามหัวใจ 4 ห้อง โดยค้นหาข้อมูลที่เกี่ยวข้องจากฐานความรู้ แล้วสรุปให้อ่านง่าย คุณพิมพ์ถามได้เลยครับ",
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  const latestAssistantMessage = [...messages].reverse().find((message) => message.role === "assistant")?.text;
  const mascotSpeech = pending
    ? "กำลังค้นคำตอบจากข้อมูลจริงของแบบสอบถามให้อยู่นะครับ..."
    : latestAssistantMessage ?? "พิมพ์ถามเป็นประโยคธรรมชาติได้เลยครับ ระบบจะค้นจากฐานความรู้ RAG แล้วสรุปให้";

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
    setInputRows(1);

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
    <section className="relative overflow-hidden rounded-[36px] border border-border bg-card/90 p-3 shadow-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.14),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.12),_transparent_28%)]" />

      <div className="relative grid gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-[30px] border border-border bg-white/90 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium tracking-wide text-muted">KTIS X AI ASSISTANT</div>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">ผู้ช่วยข้อมูลหัวใจ 4 ห้อง</h2>
            </div>
            <div className="rounded-full border border-border bg-background px-3 py-1 text-[11px] font-semibold text-muted">
              ใช้ข้อมูลจริง
            </div>
          </div>

          <div className="relative mt-5 rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] px-4 py-4 shadow-inner">
            <div className="relative rounded-[26px] border border-border bg-card px-4 py-4 text-sm leading-6 text-foreground shadow-sm">
              <div className="absolute -left-2 top-8 h-4 w-4 rotate-45 border-b border-r border-border bg-card" />
              {mascotSpeech}
            </div>

            <div className="relative mt-6 overflow-hidden rounded-[26px] border border-border bg-white px-4 py-3 shadow-sm">
              <video
                className="relative z-10 mx-auto block h-[260px] w-auto select-none bg-white object-contain"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-label="KTISX Mascot"
                poster="/brand/logo.png?v=2"
              >
                <source src="/mascotktisxanimate.mp4" type="video/mp4" />
              </video>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-border bg-background px-4 py-3 text-xs leading-5 text-muted">
              พิมพ์ถามได้เองตามธรรมชาติ เช่น จำนวน, การเปรียบเทียบ, สรุปคำตอบปลายเปิด หรือแนวโน้มจากแบบสอบถาม
            </div>
            <Link
              href="/admin/heart4rooms"
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
            >
              กลับไปหน้าข้อมูลหัวใจ 4 ห้อง
            </Link>
          </div>
        </aside>

        <div className="flex min-h-[78vh] flex-col overflow-hidden rounded-[30px] border border-border bg-white/95 shadow-sm">
          <div className="border-b border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] px-5 py-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs font-medium tracking-wide text-muted">Natural Language Analytics Chat</div>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">ถามคำถามเหมือนคุยกับผู้ช่วยจริง</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                  ระบบจะค้นหาข้อมูลที่เกี่ยวข้องจากฐานความรู้ (RAG) ของแบบสอบถาม แล้วให้ AI สรุปคำตอบจากข้อมูลที่ค้นได้เท่านั้น
                </p>
              </div>

            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
              {messages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div className={`flex max-w-[90%] gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                      <div
                        className={`mt-1 flex shrink-0 items-center justify-center text-sm font-semibold ${
                          isUser
                            ? "h-10 w-10 rounded-2xl border border-foreground bg-foreground text-background shadow-sm"
                            : "h-14 w-14 bg-transparent text-foreground"
                        }`}
                      >
                        {isUser ? (
                          "คุณ"
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src="/brand/mascot-v2.png"
                            alt="KTISX AI"
                            className="h-14 w-14 scale-x-[-1] select-none object-contain"
                          />
                        )}
                      </div>

                      <div
                        className={`rounded-[28px] border px-4 py-4 shadow-sm ${
                          isUser
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-background text-foreground"
                        }`}
                      >
                        <div className={`whitespace-pre-wrap text-sm leading-7 ${isUser ? "text-background" : "text-foreground"}`}>
                          {message.text}
                        </div>

                        {!isUser && message.response?.suggestions?.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {message.response.suggestions.slice(0, 4).map((item) => (
                              <button
                                key={item}
                                type="button"
                                disabled={pending}
                                onClick={() => void submitQuestion(item)}
                                className="inline-flex items-center justify-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-foreground/5 disabled:opacity-60"
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}

              {pending ? (
                <div className="flex justify-start">
                  <div className="flex max-w-[85%] gap-3">
                    <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center bg-transparent text-sm font-semibold text-foreground">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/brand/mascot-v2.png"
                        alt="KTISX AI"
                        className="h-14 w-14 scale-x-[-1] select-none object-contain"
                      />
                    </div>
                    <div className="rounded-[28px] border border-border bg-background px-4 py-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-accent [animation-delay:-0.2s]" />
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-accent [animation-delay:-0.1s]" />
                        <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-accent" />
                      </div>
                      <div className="mt-3 text-sm text-muted">กำลังค้นคำตอบจากข้อมูลจริง...</div>
                    </div>
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-border bg-[linear-gradient(180deg,rgba(248,250,252,0.8),rgba(255,255,255,0.98))] px-4 py-4 sm:px-6">
            <div className="mx-auto w-full max-w-4xl">
              <div className="rounded-[28px] border border-border bg-background p-3 shadow-sm">
                <textarea
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value);
                    setInputRows(Math.min(6, Math.max(1, e.target.value.split("\n").length)));
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submitQuestion();
                    }
                  }}
                  rows={inputRows}
                  spellCheck={false}
                  placeholder="ถามเรื่องข้อมูลหัวใจ 4 ห้องได้เลย (ถามเป็นประโยคสนทนา)"
                  className="w-full resize-none border-0 bg-transparent px-2 py-2 text-sm leading-7 text-foreground outline-none placeholder:text-zinc-400"
                />

                <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-muted">Enter เพื่อส่ง • Shift + Enter เพื่อขึ้นบรรทัดใหม่</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        setMessages([
                          {
                            id: "intro-assistant",
                            role: "assistant",
                            text: "สวัสดีครับ ผมพร้อมช่วยตอบคำถามจากข้อมูลจริงของแบบสอบถามหัวใจ 4 ห้อง โดยค้นหาข้อมูลที่เกี่ยวข้องจากฐานความรู้ แล้วสรุปให้อ่านง่าย คุณพิมพ์ถามได้เลยครับ",
                          },
                        ])
                      }
                      className="inline-flex items-center justify-center rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/5 disabled:opacity-60"
                    >
                      เริ่มใหม่
                    </button>
                    <button
                      type="button"
                      disabled={pending || !question.trim()}
                      onClick={() => void submitQuestion()}
                      className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-60"
                    >
                      {pending ? "กำลังตอบ..." : "ส่งคำถาม"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
