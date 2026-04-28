"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type CompletionRow = {
  id: string;
  username: string;
  promoter_id: string | null;
  full_name: string | null;
  status: "filled" | "missing";
};

type CompletionResponse =
  | { ok: true; rows: CompletionRow[]; count: number }
  | { ok: false; error: string; detail?: unknown };

export function Heart4RoomsHeaderActions() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"filled" | "missing">("filled");
  const [q, setQ] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CompletionRow[]>([]);
  const [count, setCount] = useState(0);

  const title = useMemo(() => {
    const label = tab === "filled" ? "กรอกแล้ว" : "ยังไม่กรอก";
    return `${label} ${count.toLocaleString("th-TH")} รายการ`;
  }, [count, tab]);

  async function load(nextTab: "filled" | "missing", nextQ: string) {
    setPending(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      sp.set("status", nextTab);
      if (nextQ.trim()) sp.set("q", nextQ.trim());
      const res = await fetch(`/api/surveys/heart4rooms/completion?${sp.toString()}`, { method: "GET" });
      const json = (await res.json().catch(() => null)) as CompletionResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        setError("โหลดข้อมูลไม่สำเร็จ");
        setRows([]);
        setCount(0);
        return;
      }
      setRows(json.rows);
      setCount(json.count);
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => void load(tab, q), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => void load(tab, q), 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, q]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center rounded-2xl bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90"
        >
          ตรวจสอบการกรอกข้อมูล
        </button>
        <Link
          href="/surveys/heart4rooms"
          className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
        >
          ไปหน้ากรอกแบบสอบถาม
        </Link>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center"
              role="dialog"
              aria-modal="true"
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
              }}
            >
              <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />
              <div className="relative w-full max-w-2xl overflow-hidden rounded-t-3xl border border-border bg-card shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:rounded-3xl">
                <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">ตรวจสอบการกรอกข้อมูล</div>
                    <div className="mt-1 text-xs text-muted">{title}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-2xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/5"
                  >
                    ปิด
                  </button>
                </div>

                <div className="px-5 py-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex rounded-2xl border border-border bg-background p-1">
                      <button
                        type="button"
                        onClick={() => setTab("filled")}
                        className={`inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          tab === "filled" ? "bg-foreground text-background" : "text-foreground hover:bg-foreground/5"
                        }`}
                      >
                        กรอกแล้ว
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab("missing")}
                        className={`inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          tab === "missing" ? "bg-foreground text-background" : "text-foreground hover:bg-foreground/5"
                        }`}
                      >
                        ยังไม่กรอก
                      </button>
                    </div>

                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="ค้นหา: username / promoter_id / ชื่อ"
                      className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 sm:w-[360px]"
                    />
                  </div>

                  {error ? (
                    <div className="mt-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">
                      {error}
                    </div>
                  ) : null}

                  <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-background">
                    <div className="max-h-[65vh] overflow-auto">
                      {pending ? (
                        <div className="px-4 py-6 text-sm text-muted">กำลังโหลด…</div>
                      ) : rows.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-muted">ไม่พบข้อมูล</div>
                      ) : (
                        <div className="divide-y divide-border">
                          {rows.map((r) => (
                            <div key={r.id} className="px-4 py-4">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <div className="break-words text-sm font-semibold text-foreground">{r.username}</div>
                                  <div className="mt-1 text-xs text-muted">
                                    {r.promoter_id ? r.promoter_id : "ไม่มีข้อมูล promoter id"}
                                    {" - "}
                                    {r.full_name ? r.full_name : "-"}
                                  </div>
                                </div>
                                <div
                                  className={`mt-2 inline-flex w-fit items-center justify-center rounded-2xl border px-3 py-1 text-xs font-semibold sm:mt-0 ${
                                    r.status === "filled"
                                      ? "border-foreground/15 bg-foreground/[0.06] text-foreground"
                                      : "border-accent/20 bg-accent/[0.08] text-accent"
                                  }`}
                                >
                                  {r.status === "filled" ? "กรอกแล้ว" : "ยังไม่กรอก"}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

