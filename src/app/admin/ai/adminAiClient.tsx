"use client";

import { useEffect, useMemo, useState } from "react";

type SchemaHelpResponse =
  | {
      ok: true;
      version: string;
      domain: string;
      views: {
        name: string;
        purpose: string;
        important_columns: string[];
        sample_questions: string[];
      }[];
      conventions: string[];
      example_questions: string[];
    }
  | { ok: false; error: string; message?: string; detail?: string };

type SqlRunResponse =
  | {
      ok: true;
      columns: string[];
      rows: unknown[][];
      row_count: number;
      truncated: boolean;
      duration_ms: number;
      normalized_sql: string;
      relations: string[];
    }
  | { ok: false; error: string; message?: string; detail?: string };

type SqlExample = {
  label: string;
  sql: string;
  maxRows?: number;
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

export function AdminAiClient() {
  const sqlExamples = useMemo<SqlExample[]>(
    () => [
      {
        label: "นับคนไม่เคยได้ยิน",
        sql: "select count(*) as never_heard_count from public.heart4rooms_ai_core_v2 where q1_choice = 'b'",
        maxRows: 20,
      },
      {
        label: "สรุปคำตอบข้อ 1",
        sql: "select q1_choice_label, count(*) as total from public.heart4rooms_ai_core_v2 group by q1_choice_label order by total desc",
        maxRows: 20,
      },
      {
        label: "โรคอ้อยที่ชาวไร่ระบุ",
        sql: "select text_value, count(*) as total from public.heart4rooms_ai_open_text_v1 where question_key = 'q7' group by text_value order by total desc limit 20",
        maxRows: 50,
      },
      {
        label: "ความกังวลเรื่องราคาอ้อย",
        sql: "select text_value, count(*) as total from public.heart4rooms_ai_open_text_v1 where question_key = 'q26' and field_key = 'worry' group by text_value order by total desc limit 20",
        maxRows: 50,
      },
    ],
    [],
  );

  const [schemaPending, setSchemaPending] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [schema, setSchema] = useState<SchemaHelpResponse | null>(null);

  const [sql, setSql] = useState(sqlExamples[0]?.sql ?? "");
  const [maxRows, setMaxRows] = useState(String(sqlExamples[0]?.maxRows ?? 50));
  const [runPending, setRunPending] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<SqlRunResponse | null>(null);

  async function loadSchema() {
    setSchemaPending(true);
    setSchemaError(null);
    try {
      const res = await fetch("/api/admin/ai/tools/schema-help", { method: "GET", cache: "no-store" });
      const json = (await res.json().catch(() => null)) as SchemaHelpResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        setSchema(null);
        setSchemaError(json && "message" in json && typeof json.message === "string" ? json.message : "โหลด schema help ไม่สำเร็จ");
        return;
      }
      setSchema(json);
    } finally {
      setSchemaPending(false);
    }
  }

  async function runSql() {
    setRunPending(true);
    setRunError(null);
    try {
      const res = await fetch("/api/admin/ai/tools/run-readonly-sql", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sql,
          max_rows: Number(maxRows),
        }),
      });
      const json = (await res.json().catch(() => null)) as SqlRunResponse | null;
      if (!json) {
        setRunResult(null);
        setRunError("รัน SQL ไม่สำเร็จ");
        return;
      }

      if (json.ok !== true) {
        setRunResult(json);
        const detail = typeof json.detail === "string" && json.detail.trim() ? json.detail.trim() : null;
        const message = typeof json.message === "string" && json.message.trim() ? json.message.trim() : "รัน SQL ไม่สำเร็จ";
        setRunError(detail ? `${message}\n${detail}` : message);
        return;
      }

      if (!res.ok) {
        setRunResult(null);
        setRunError("รัน SQL ไม่สำเร็จ");
        return;
      }

      setRunResult(json);
    } finally {
      setRunPending(false);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadSchema();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-medium tracking-wide text-muted">Developer Tools</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">Schema และ SQL runner สำหรับตรวจสอบ</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              ส่วนนี้ยังคงไว้สำหรับตรวจสอบ data layer ด้วยตนเอง เมื่ออยากเช็ก schema, SQL, หรือผลลัพธ์ดิบที่ AI chat v1 ใช้อ้างอิง
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-background px-4 py-3 text-xs text-muted">
            ใช้งานเฉพาะ
            <span className="ml-1 font-semibold text-foreground">Admin tools</span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-foreground">Schema Help</div>
            <div className="mt-1 text-xs text-muted">ดู view ที่ AI จะได้รับอนุญาตให้ใช้ใน v1</div>
          </div>
          <button
            type="button"
            disabled={schemaPending}
            onClick={() => void loadSchema()}
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
          >
            {schemaPending ? "กำลังโหลด..." : "รีโหลด Schema"}
          </button>
        </div>

        {schemaError ? (
          <div className="mt-4 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">{schemaError}</div>
        ) : null}

        {schema && schema.ok === true ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {schema.views.map((view) => (
                <div key={view.name} className="rounded-2xl border border-border bg-background p-4">
                  <div className="text-sm font-semibold text-foreground">{view.name}</div>
                  <p className="mt-2 text-sm leading-6 text-muted">{view.purpose}</p>

                  <div className="mt-4">
                    <div className="text-xs font-medium text-muted">Important columns</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {view.important_columns.map((column) => (
                        <span
                          key={column}
                          className="inline-flex rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground"
                        >
                          {column}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-xs font-medium text-muted">Sample questions</div>
                    <div className="mt-2 space-y-2">
                      {view.sample_questions.map((question) => (
                        <div key={question} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
                          {question}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="text-sm font-semibold text-foreground">Conventions</div>
                <div className="mt-3 space-y-2">
                  {schema.conventions.map((item) => (
                    <div key={item} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="text-sm font-semibold text-foreground">Example questions</div>
                <div className="mt-3 space-y-2">
                  {schema.example_questions.map((item) => (
                    <div key={item} className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground">Read-only SQL Runner</div>
            <div className="mt-1 text-xs text-muted">ใช้ลอง query กับ views ที่อนุญาตก่อนต่อเข้ากับ orchestration ของ AI</div>
          </div>

          <div className="flex flex-wrap gap-2">
            {sqlExamples.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => {
                  setSql(example.sql);
                  setMaxRows(String(example.maxRows ?? 50));
                }}
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          <label className="block">
            <span className="text-xs font-medium text-muted">SQL</span>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              rows={8}
              spellCheck={false}
              className="mt-2 w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 font-mono text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
          </label>

          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-xs font-medium text-muted">Max rows</span>
              <input
                value={maxRows}
                onChange={(e) => setMaxRows(e.target.value)}
                inputMode="numeric"
                className="mt-2 w-28 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
              />
            </label>

            <button
              type="button"
              disabled={runPending}
              onClick={() => void runSql()}
              className="inline-flex items-center justify-center rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-60"
            >
              {runPending ? "กำลังรัน..." : "Run SQL"}
            </button>

            <button
              type="button"
              onClick={() => {
                setRunError(null);
                setRunResult(null);
              }}
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
            >
              ล้างผลลัพธ์
            </button>
          </div>
        </div>

        {runError ? (
          <div className="mt-4 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">{runError}</div>
        ) : null}

        {runResult ? (
          <div className="mt-4 space-y-4">
            {runResult.ok === true ? (
              <>
                <div className="grid gap-3 lg:grid-cols-4">
                  <div className="rounded-2xl border border-border bg-background p-3">
                    <div className="text-xs font-medium text-muted">Rows</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{runResult.row_count.toLocaleString("th-TH")}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-3">
                    <div className="text-xs font-medium text-muted">Columns</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{runResult.columns.length.toLocaleString("th-TH")}</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-3">
                    <div className="text-xs font-medium text-muted">Duration</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{runResult.duration_ms} ms</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-3">
                    <div className="text-xs font-medium text-muted">Truncated</div>
                    <div className="mt-1 text-sm font-semibold text-foreground">{runResult.truncated ? "Yes" : "No"}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="text-xs font-medium text-muted">Relations</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {runResult.relations.map((relation) => (
                      <span
                        key={relation}
                        className="inline-flex rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground"
                      >
                        {relation}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 text-xs font-medium text-muted">Normalized SQL</div>
                  <pre className="mt-2 overflow-auto rounded-2xl border border-border bg-card p-3 text-xs text-foreground">
                    {runResult.normalized_sql}
                  </pre>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-background">
                  {runResult.rows.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-muted">Query สำเร็จ แต่ไม่มีข้อมูล</div>
                  ) : (
                    <div className="overflow-auto">
                      <table className="min-w-full border-collapse text-left text-sm">
                        <thead className="bg-foreground/[0.04]">
                          <tr>
                            {runResult.columns.map((column) => (
                              <th key={column} className="whitespace-nowrap px-4 py-3 font-semibold text-foreground">
                                {column}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {runResult.rows.map((row, rowIdx) => (
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
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">
                {typeof runResult.message === "string" ? runResult.message : "รัน SQL ไม่สำเร็จ"}
                {typeof runResult.detail === "string" ? `\n${runResult.detail}` : ""}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
