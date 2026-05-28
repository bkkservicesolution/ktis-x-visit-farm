"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type RagStatus = {
  ok: true;
  embeddedChunks: number;
  snapshotCount: number;
  decodedFactsCount: number;
  snapshotCutoff: string | null;
  snapshotAt: string | null;
  aggregatesSurveyCount: number | null;
  aggregatesBuiltAt: string | null;
  aggregatesCutoff: string | null;
};

type LogLine = {
  id: string;
  at: string;
  level: "info" | "ok" | "error";
  text: string;
};

function defaultCutoffLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(23, 59, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatThai(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function pushLog(setter: React.Dispatch<React.SetStateAction<LogLine[]>>, level: LogLine["level"], text: string) {
  setter((prev) => [
    ...prev,
    { id: crypto.randomUUID(), at: new Date().toISOString(), level, text },
  ]);
}

export function RagIndexAdminClient() {
  const [status, setStatus] = useState<RagStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [cutoffLocal, setCutoffLocal] = useState(defaultCutoffLocal);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [aggregatesBusy, setAggregatesBusy] = useState(false);
  const [reindexBusy, setReindexBusy] = useState(false);
  const [reindexMode, setReindexMode] = useState<"incremental" | "full" | null>(null);
  const [confirmFullOpen, setConfirmFullOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ai/rag/status", { cache: "no-store" });
      const json = (await res.json()) as RagStatus | { ok: false; error: string; detail?: string };
      if (!res.ok || !json.ok) {
        setStatusError((json as { detail?: string; error?: string }).detail ?? (json as { error?: string }).error ?? "โหลดสถานะไม่สำเร็จ");
        return;
      }
      setStatusError(null);
      setStatus(json);
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : "โหลดสถานะไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logs]);

  useEffect(() => {
    if (!reindexBusy) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    pollRef.current = setInterval(() => {
      void refreshStatus();
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [reindexBusy, refreshStatus]);

  const targetChunks = useMemo(() => {
    if (!status?.snapshotCount) return null;
    return status.snapshotCount + 47;
  }, [status?.snapshotCount]);

  const progressPct = useMemo(() => {
    if (!targetChunks || !status) return null;
    return Math.min(100, Math.round((status.embeddedChunks / targetChunks) * 100));
  }, [status, targetChunks]);

  async function runSnapshot() {
    if (snapshotBusy || reindexBusy) return;
    setSnapshotBusy(true);
    pushLog(setLogs, "info", `เริ่มสร้าง Snapshot (cutoff: ${cutoffLocal})…`);

    try {
      const cutoffIso = new Date(cutoffLocal).toISOString();
      const res = await fetch("/api/admin/ai/rag/snapshot", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cutoff: cutoffIso }),
      });
      const json = (await res.json()) as { ok: boolean; inserted?: number; cutoff?: string; error?: string; detail?: string };
      if (!res.ok || !json.ok) {
        pushLog(setLogs, "error", `Snapshot ล้มเหลว: ${json.detail ?? json.error ?? res.status}`);
        return;
      }
      pushLog(setLogs, "ok", `Snapshot สำเร็จ — ก็อป ${json.inserted?.toLocaleString("th-TH") ?? "?"} แบบ (cutoff ${formatThai(json.cutoff ?? cutoffIso)})`);
      await refreshStatus();
    } catch (e) {
      pushLog(setLogs, "error", `Snapshot ล้มเหลว: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setSnapshotBusy(false);
    }
  }

  async function runReindex(mode: "incremental" | "full") {
    if (snapshotBusy || reindexBusy) return;
    if (mode === "full") setConfirmFullOpen(false);

    setReindexBusy(true);
    setReindexMode(mode);
    const label = mode === "full" ? "Full reindex (truncate)" : "Incremental reindex";
    pushLog(setLogs, "info", `เริ่ม ${label}… (ดู terminal dev server สำหรับ log ละเอียด)`);

    try {
      const res = await fetch("/api/admin/ai/rag/reindex", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        surveyRows?: number;
        decodedFactRows?: number;
        totalChunks?: number;
        durationMs?: number;
        error?: string;
        detail?: string;
      };

      if (!res.ok || !json.ok) {
        pushLog(setLogs, "error", `Reindex ล้มเหลว: ${json.detail ?? json.error ?? res.status}`);
        return;
      }

      const sec = json.durationMs ? Math.round(json.durationMs / 1000) : 0;
      pushLog(
        setLogs,
        "ok",
        `Reindex สำเร็จ — แบบสำรวจ ${json.surveyRows?.toLocaleString("th-TH") ?? "?"} รายการ, chunks ${json.totalChunks?.toLocaleString("th-TH") ?? "?"} (${sec}s)`,
      );
      await refreshStatus();
    } catch (e) {
      pushLog(setLogs, "error", `Reindex ล้มเหลว: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setReindexBusy(false);
      setReindexMode(null);
    }
  }

  async function runAggregates() {
    if (snapshotBusy || reindexBusy || aggregatesBusy) return;
    setAggregatesBusy(true);
    pushLog(setLogs, "info", "เริ่มอัปเดตสถิติสำหรับ AI (aggregates)…");

    try {
      const res = await fetch("/api/admin/ai/rag/aggregates", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json()) as {
        ok: boolean;
        surveyCount?: number;
        snapshotCutoff?: string;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.ok) {
        pushLog(setLogs, "error", `อัปเดตสถิติล้มเหลว: ${json.detail ?? json.error ?? res.status}`);
        return;
      }
      pushLog(
        setLogs,
        "ok",
        `อัปเดตสถิติสำเร็จ — ${json.surveyCount?.toLocaleString("th-TH") ?? "?"} แบบ (cutoff ${formatThai(json.snapshotCutoff ?? null)})`,
      );
      await refreshStatus();
    } catch (e) {
      pushLog(setLogs, "error", `อัปเดตสถิติล้มเหลว: ${e instanceof Error ? e.message : "unknown"}`);
    } finally {
      setAggregatesBusy(false);
    }
  }

  const busy = snapshotBusy || reindexBusy || aggregatesBusy;

  const aggregatesStale =
    status?.snapshotCount != null &&
    status.aggregatesSurveyCount != null &&
    status.snapshotCount > 0 &&
    status.aggregatesSurveyCount !== status.snapshotCount;

  return (
    <div className="space-y-4">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-medium tracking-wide text-muted">Admin • RAG Index</div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">จัดการฐานความรู้ AI (RAG)</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              1) Snapshot → 2) Reindex (ถ้าต้องการ) → 3) อัปเดตสถิติสำหรับแชท AI (จำเป็นหลัง Snapshot ใหม่)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/ai"
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
            >
              ไปหน้าแชท AI
            </Link>
            <button
              type="button"
              onClick={() => void refreshStatus()}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-50"
            >
              รีเฟรชสถานะ
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Chunks (มี embedding)" value={status?.embeddedChunks} loading={!status && !statusError} />
        <StatCard label="แบบใน Snapshot" value={status?.snapshotCount} loading={!status && !statusError} />
        <StatCard label="สถิติ AI (aggregates)" value={status?.aggregatesSurveyCount} loading={!status && !statusError} />
        <StatCard label="Decoded facts" value={status?.decodedFactsCount} loading={!status && !statusError} />
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="text-xs font-medium text-muted">สถิติ AI อัปเดตเมื่อ</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{formatThai(status?.aggregatesBuiltAt ?? null)}</div>
          <div className="mt-1 text-xs text-muted">Snapshot {formatThai(status?.snapshotCutoff ?? null)}</div>
        </div>
      </section>

      {aggregatesStale ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-foreground">
          สถิติ AI ยังเป็นชุดเก่า ({status?.aggregatesSurveyCount?.toLocaleString("th-TH")} แบบ) แต่ Snapshot มี{" "}
          {status?.snapshotCount?.toLocaleString("th-TH")} แบบ — กด「อัปเดตสถิติสำหรับ AI」ในขั้นที่ 3
        </div>
      ) : null}

      {statusError ? (
        <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">{statusError}</div>
      ) : null}

      {reindexBusy && progressPct !== null ? (
        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">
                กำลัง Reindex ({reindexMode === "full" ? "Full" : "Incremental"})
              </div>
              <div className="text-xs text-muted">อัปเดตทุก ~3 วินาทีจากจำนวน chunks</div>
            </div>
            <div className="text-sm font-semibold tabular-nums text-foreground">{progressPct}%</div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full bg-foreground transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          {targetChunks ? (
            <div className="mt-2 text-xs text-muted">
              {status?.embeddedChunks.toLocaleString("th-TH")} / ~{targetChunks.toLocaleString("th-TH")} chunks (ประมาณ)
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border bg-background text-sm font-bold text-foreground">
              1
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">สร้าง Snapshot</h2>
              <p className="mt-1 text-sm text-muted">
                ก็อปแบบสำรวจจากตารางต้นทางมาเก็บในตาราง snapshot ให้ข้อมูล “นิ่ง” ถึงวันที่กำหนด
              </p>
            </div>
          </div>

          <label className="mt-5 block text-xs font-medium text-muted">Cutoff (ถึงวันเวลานี้)</label>
          <input
            type="datetime-local"
            value={cutoffLocal}
            onChange={(e) => setCutoffLocal(e.target.value)}
            disabled={busy}
            className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50"
          />

          <button
            type="button"
            onClick={() => void runSnapshot()}
            disabled={busy}
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-50"
          >
            {snapshotBusy ? "กำลังสร้าง Snapshot…" : "สร้าง Snapshot"}
          </button>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border bg-background text-sm font-bold text-foreground">
              2
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">สร้าง Embedding (Reindex)</h2>
              <p className="mt-1 text-sm text-muted">
                อ่านจาก Snapshot — โหมดใหม่ ~1 แบบสำรวจ = 1 chunk (เร็วกว่าเดิมมาก)
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => void runReindex("incremental")}
              disabled={busy || !status?.snapshotCount}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-50"
            >
              {reindexBusy && reindexMode === "incremental" ? "กำลัง Incremental…" : "Reindex แบบ Incremental (แนะนำ)"}
            </button>
            <p className="text-xs text-muted">ไม่ลบ index เดิม — index เฉพาะแบบที่ยังไม่มีในระบบ</p>

            <button
              type="button"
              onClick={() => setConfirmFullOpen(true)}
              disabled={busy || !status?.snapshotCount}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent shadow-sm transition hover:bg-accent/15 disabled:opacity-50"
            >
              {reindexBusy && reindexMode === "full" ? "กำลัง Full reindex…" : "Reindex แบบ Full (ลบ index เดิม)"}
            </button>
            <p className="text-xs text-accent">Full จะ truncate chunks + decoded facts ทั้งหมด แล้วสร้างใหม่</p>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border bg-background text-sm font-bold text-foreground">
              3
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">อัปเดตสถิติสำหรับ AI</h2>
              <p className="mt-1 text-sm text-muted">
                สรุปตัวเลขทุกข้อจาก Snapshot ให้แชท AI ใช้ (กี่แปลง / ส่วนใหญ่เลือกอะไร) — ทำหลัง Snapshot ทุกครั้ง
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void runAggregates()}
            disabled={busy || !status?.snapshotCount}
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-50"
          >
            {aggregatesBusy ? "กำลังอัปเดตสถิติ…" : "อัปเดตสถิติสำหรับ AI"}
          </button>
          <p className="mt-3 text-xs text-muted">ใช้เวลาประมาณ 10–30 วินาที — ไม่ต้อง restart server</p>
        </section>
      </div>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">บันทึกการทำงาน</h2>
          <button
            type="button"
            onClick={() => setLogs([])}
            className="text-xs font-medium text-muted hover:text-foreground"
          >
            ล้าง
          </button>
        </div>
        <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-border bg-background p-3 font-mono text-xs leading-5">
          {logs.length === 0 ? (
            <p className="text-muted">ยังไม่มีบันทึก — กดปุ่มด้านบนเพื่อเริ่ม</p>
          ) : (
            logs.map((line) => (
              <div
                key={line.id}
                className={
                  line.level === "error"
                    ? "text-accent"
                    : line.level === "ok"
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground"
                }
              >
                <span className="text-muted">[{formatThai(line.at)}]</span> {line.text}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </section>

      {confirmFullOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="ปิด"
            onClick={() => setConfirmFullOpen(false)}
            className="absolute inset-0 bg-foreground/40"
          />
          <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">ยืนยัน Full Reindex?</h3>
            <p className="mt-2 text-sm text-muted">
              การดำเนินการนี้จะลบข้อมูล RAG ทั้งหมด (chunks + decoded facts) แล้วสร้างใหม่จาก Snapshot ปัจจุบัน
              ใช้เวลาหลายนาที และระหว่างรัน AI อาจตอบคำถามจากข้อมูลไม่ครบ
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmFullOpen(false)}
                className="inline-flex flex-1 items-center justify-center rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => void runReindex("full")}
                className="inline-flex flex-1 items-center justify-center rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm"
              >
                ยืนยัน Full
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | null | undefined;
  loading: boolean;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
        {loading ? "…" : value != null ? value.toLocaleString("th-TH") : "—"}
      </div>
    </div>
  );
}
