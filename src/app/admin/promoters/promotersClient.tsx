"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Promoter = { id: string; full_name: string };
type PromotersResponse =
  | { ok: true; rows: Promoter[] }
  | { ok: false; error: string; detail?: unknown };

type OkResponse = { ok: true } | { ok: false; error: string; detail?: unknown; message?: unknown };

function normalizeId(v: string): string {
  return v.trim();
}

function getErrorMessage(json: OkResponse | null, fallback: string): string {
  if (!json || json.ok === true) return fallback;
  if (typeof json.message === "string") return json.message;
  if (typeof json.detail === "string") return json.detail;
  return fallback;
}

export function PromotersClient() {
  const [q, setQ] = useState("");
  const [pending, setPending] = useState(false);
  const [rows, setRows] = useState<Promoter[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim();
    if (!s) return rows;
    return rows.filter((r) => r.id.includes(s) || r.full_name.includes(s));
  }, [q, rows]);

  async function load() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/promoters", { method: "GET" });
      const json = (await res.json().catch(() => null)) as PromotersResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        setError("โหลดรายชื่อไม่สำเร็จ");
        return;
      }
      setRows(json.rows);
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const id = normalizeId(newId);
    const full_name = newName.trim();
    if (!id || !full_name) {
      setError("กรุณากรอก id และชื่อให้ครบ");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/promoters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, full_name }),
      });
      const json = (await res.json().catch(() => null)) as OkResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        setError(getErrorMessage(json, "บันทึกไม่สำเร็จ"));
        return;
      }
      setNewId("");
      setNewName("");
      await load();
    } finally {
      setPending(false);
    }
  }

  async function onUpdate(id: string, full_name: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/promoters/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ full_name }),
      });
      const json = (await res.json().catch(() => null)) as OkResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        setError(getErrorMessage(json, "แก้ไขไม่สำเร็จ"));
        return;
      }
      await load();
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm(`ยืนยันลบ ${id}?`)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/promoters/${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as OkResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        setError(getErrorMessage(json, "ลบไม่สำเร็จ"));
        return;
      }
      await load();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted">ทั้งหมด {rows.length.toLocaleString("th-TH")} รายการ</div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา: id/ชื่อ"
            className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 sm:w-[360px]"
          />
          <button
            type="button"
            onClick={() => void load()}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
          >
            รีเฟรช
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">{error}</div>
      ) : null}

      <form onSubmit={onCreate} className="rounded-3xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">เพิ่ม/อัปเดตนักส่งเสริม</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr_140px]">
          <input
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            placeholder="รหัส (id)"
            className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ชื่อ-นามสกุล"
            className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-60"
          >
            {pending ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
        <div className="mt-2 text-xs text-muted">หมายเหตุ: ถ้า id ซ้ำ ระบบจะอัปเดตชื่อให้</div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="sm:hidden">
          <div className="divide-y divide-border bg-background">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted">{pending ? "กำลังโหลด..." : "ไม่พบข้อมูล"}</div>
            ) : (
              filtered.map((r) => (
                <div key={r.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{r.id}</div>
                      <div className="mt-1 break-words text-sm text-foreground">{r.full_name}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        const next = window.prompt(`แก้ไขชื่อของ ${r.id}`, r.full_name);
                        if (typeof next === "string" && next.trim()) void onUpdate(r.id, next.trim());
                      }}
                      className="rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
                    >
                      แก้ไข
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void onDelete(r.id)}
                      className="rounded-2xl bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-[820px] w-full border-collapse bg-background text-left text-sm">
            <thead className="bg-foreground/[0.04]">
              <tr className="text-foreground">
                <th className="px-4 py-3 font-semibold">รหัส</th>
                <th className="px-4 py-3 font-semibold">ชื่อ-นามสกุล</th>
                <th className="px-4 py-3 font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={3}>
                    {pending ? "กำลังโหลด..." : "ไม่พบข้อมูล"}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <PromoterRowItem
                    key={r.id}
                    row={r}
                    pending={pending}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PromoterRowItem({
  row,
  pending,
  onUpdate,
  onDelete,
}: {
  row: Promoter;
  pending: boolean;
  onUpdate: (id: string, full_name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.full_name);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(row.full_name);
  }, [row.full_name]);

  return (
    <tr className="border-t border-border">
      <td className="px-4 py-3 font-semibold text-foreground">{row.id}</td>
      <td className="px-4 py-3">
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
            disabled={pending}
          />
        ) : (
          <div className="text-foreground">{row.full_name}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setEditing(false);
                  setName(row.full_name);
                }}
                className="rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={pending || !name.trim()}
                onClick={() => {
                  void onUpdate(row.id, name.trim());
                  setEditing(false);
                }}
                className="rounded-2xl bg-foreground px-3 py-2 text-xs font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-60"
              >
                บันทึก
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={pending}
              onClick={() => setEditing(true)}
              className="rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
            >
              แก้ไข
            </button>
          )}

          <button
            type="button"
            disabled={pending}
            onClick={() => void onDelete(row.id)}
            className="rounded-2xl bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            ลบ
          </button>
        </div>
      </td>
    </tr>
  );
}

