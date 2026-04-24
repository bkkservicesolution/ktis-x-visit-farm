"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Row = {
  id: string;
  created_at: string;
  created_by_username: string | null;
  promoter_id: string | null;
  submitter_display_name: string;
  farmer_first_name: string;
  farmer_last_name: string;
  contract_no: string;
};

type ListResponse =
  | { ok: true; rows: Row[]; count: number }
  | { ok: false; error: string; detail?: unknown };

type DetailRow = Row & {
  created_by_user_id: string;
  submitter_manual: boolean;
  answers: unknown;
  attachments: unknown;
};

type DetailResponse =
  | { ok: true; row: DetailRow }
  | { ok: false; error: string; detail?: unknown };

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

export function Heart4RoomsAdminClient() {
  const [q, setQ] = useState("");
  const [promoterId, setPromoterId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;

  const [pending, setPending] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailRow | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const title = useMemo(() => `ทั้งหมด ${count.toLocaleString("th-TH")} รายการ`, [count]);

  async function load(pageOverride?: number) {
    setPending(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (promoterId.trim()) sp.set("promoter_id", promoterId.trim());
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      sp.set("limit", String(limit));
      const p = typeof pageOverride === "number" ? pageOverride : page;
      sp.set("offset", String(p * limit));

      const res = await fetch(`/api/surveys/heart4rooms?${sp.toString()}`, { method: "GET" });
      const json = (await res.json().catch(() => null)) as ListResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        setError("โหลดข้อมูลไม่สำเร็จ");
        return;
      }
      setRows(json.rows);
      setCount(json.count);
    } finally {
      setPending(false);
    }
  }

  async function loadDetail(id: string) {
    setDetailPending(true);
    setDetailError(null);
    setDetail(null);
    try {
      const res = await fetch(`/api/surveys/heart4rooms/${encodeURIComponent(id)}`, { method: "GET" });
      const json = (await res.json().catch(() => null)) as DetailResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        setDetailError("โหลดรายละเอียดไม่สำเร็จ");
        return;
      }
      setDetail(json.row);
    } finally {
      setDetailPending(false);
    }
  }

  async function onDelete(id: string) {
    if (deletePending) return;
    const ok = window.confirm("ต้องการลบรายการนี้ใช่หรือไม่?");
    if (!ok) return;

    setDeletePending(true);
    try {
      const res = await fetch(`/api/surveys/heart4rooms/${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !json || json.ok !== true) {
        window.alert("ลบไม่สำเร็จ");
        return;
      }

      setSelectedId((cur) => (cur === id ? null : cur));
      setRows((cur) => cur.filter((x) => x.id !== id));
      setCount((c) => Math.max(0, c - 1));
    } finally {
      setDeletePending(false);
    }
  }

  useEffect(() => {
    void load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void loadDetail(selectedId);
  }, [selectedId]);

  const pages = useMemo(() => Math.max(1, Math.ceil(count / limit)), [count]);
  const canPrev = page > 0 && !pending;
  const canNext = page < pages - 1 && !pending;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-medium text-muted">ค้นหา</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ชื่อ/นามสกุล/สัญญา/ผู้กรอก"
              className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-muted">promoter_id</div>
            <input
              value={promoterId}
              onChange={(e) => setPromoterId(e.target.value)}
              placeholder="เช่น 0343"
              className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-muted">ตั้งแต่</div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-muted">ถึง</div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setPage(0);
              void load(0);
            }}
            className="inline-flex items-center justify-center rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-40"
          >
            ค้นหา/รีเฟรช
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => {
              const p = Math.max(0, page - 1);
              setPage(p);
              void load(p);
            }}
            className="rounded-2xl border border-border bg-background px-3 py-2 font-semibold text-foreground transition hover:bg-foreground/5 disabled:opacity-40"
          >
            ก่อนหน้า
          </button>
          <div className="text-xs text-muted">
            หน้า {page + 1}/{pages}
          </div>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => {
              const p = Math.min(pages - 1, page + 1);
              setPage(p);
              void load(p);
            }}
            className="rounded-2xl border border-border bg-background px-3 py-2 font-semibold text-foreground transition hover:bg-foreground/5 disabled:opacity-40"
          >
            ถัดไป
          </button>
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">{error}</div> : null}

      <div className="overflow-hidden rounded-3xl border border-border bg-background">
        <div className="grid grid-cols-14 gap-3 border-b border-border bg-card px-4 py-3 text-xs font-semibold text-muted">
          <div className="col-span-3">เวลา</div>
          <div className="col-span-3">ชาวไร่</div>
          <div className="col-span-2">สัญญา</div>
          <div className="col-span-2">ผู้กรอก</div>
          <div className="col-span-2">promoter_id</div>
          <div className="col-span-2 text-right">การทำงาน</div>
        </div>
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-14 gap-3 px-4 py-3 text-left text-sm text-foreground transition hover:bg-foreground/5"
            >
              <div className="col-span-3 text-xs text-muted">{formatDate(r.created_at)}</div>
              <div className="col-span-3 font-semibold">
                {r.farmer_first_name} {r.farmer_last_name}
              </div>
              <div className="col-span-2">{r.contract_no}</div>
              <div className="col-span-2 truncate text-xs text-muted">{r.submitter_display_name}</div>
              <div className="col-span-2 truncate text-xs text-muted">{r.promoter_id ?? "—"}</div>
              <div className="col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-foreground/5"
                >
                  แก้ไข
                </button>
                <button
                  type="button"
                  disabled={deletePending}
                  onClick={() => void onDelete(r.id)}
                  className="rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
          {rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">ไม่พบข้อมูล</div>
          ) : null}
        </div>
      </div>

      {selectedId
        ? typeof document !== "undefined"
          ? createPortal(
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
                role="dialog"
                aria-modal="true"
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) setSelectedId(null);
                }}
              >
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />
                <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_70px_rgba(0,0,0,0.38)]">
                  <div className="flex items-center justify-between border-b border-border px-5 py-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">รายละเอียด</div>
                      <div className="mt-1 truncate text-xs text-muted">{selectedId}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="rounded-2xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/5"
                    >
                      ปิด
                    </button>
                  </div>

                  <div className="max-h-[70vh] overflow-auto px-5 py-4">
                    {detailPending ? (
                      <div className="text-sm text-muted">กำลังโหลด…</div>
                    ) : detailError ? (
                      <div className="text-sm text-accent">{detailError}</div>
                    ) : detail ? (
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-border bg-background p-3">
                            <div className="text-xs font-medium text-muted">เวลา</div>
                            <div className="mt-1 text-sm font-semibold text-foreground">{formatDate(detail.created_at)}</div>
                          </div>
                          <div className="rounded-2xl border border-border bg-background p-3">
                            <div className="text-xs font-medium text-muted">ชาวไร่</div>
                            <div className="mt-1 text-sm font-semibold text-foreground">
                              {detail.farmer_first_name} {detail.farmer_last_name}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-border bg-background p-3">
                            <div className="text-xs font-medium text-muted">เลขที่สัญญา</div>
                            <div className="mt-1 text-sm font-semibold text-foreground">{detail.contract_no}</div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-background p-4">
                          <div className="text-xs font-medium text-muted">ข้อมูลดิบ (answers)</div>
                          <pre className="mt-3 overflow-auto rounded-2xl border border-border bg-card p-3 text-xs text-foreground">
                            {JSON.stringify(detail.answers ?? null, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null
        : null}
    </div>
  );
}

