"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: string;
  created_at: string;
  promoter_name: string;
  farmer_first_name: string;
  farmer_last_name: string;
  contract_no: string;
};

type ListResponse =
  | { ok: true; rows: Row[]; count: number }
  | { ok: false; error: string; detail?: unknown };

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function toCsv(rows: Row[]): string {
  const header = [
    "created_at",
    "promoter_name",
    "farmer_first_name",
    "farmer_last_name",
    "contract_no",
    "id",
  ];
  const escape = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.created_at,
        r.promoter_name,
        r.farmer_first_name,
        r.farmer_last_name,
        r.contract_no,
        r.id,
      ]
        .map((v) => escape(String(v ?? "")))
        .join(","),
    );
  }
  return lines.join("\n");
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function AdminDashboardClient() {
  const [q, setQ] = useState("");
  const [pending, setPending] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canExport = rows.length > 0 && !pending;

  const title = useMemo(() => {
    const n = count.toLocaleString("th-TH");
    return `ทั้งหมด ${n} รายการ`;
  }, [count]);

  async function load() {
    setPending(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      sp.set("limit", "50");
      sp.set("offset", "0");

      const res = await fetch(`/api/forms?${sp.toString()}`, { method: "GET" });
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onExportCsv() {
    const csv = toCsv(rows);
    const ts = new Date().toISOString().replaceAll(":", "-");
    download(`ktisx_onsite_visit_forms_${ts}.csv`, csv, "text/csv;charset=utf-8");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted">{title}</div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา: เลขที่สัญญา/ชื่อ/นามสกุล/นักส่งเสริม"
            className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 sm:w-[360px]"
          />
          <button
            onClick={() => void load()}
            disabled={pending}
            className="inline-flex items-center justify-center rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "กำลังโหลด..." : "ค้นหา"}
          </button>
          <button
            onClick={onExportCsv}
            disabled={!canExport}
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export CSV
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full border-collapse bg-background text-left text-sm">
            <thead className="bg-foreground/[0.04]">
              <tr className="text-foreground">
                <th className="px-4 py-3 font-semibold">วันที่</th>
                <th className="px-4 py-3 font-semibold">นักส่งเสริม</th>
                <th className="px-4 py-3 font-semibold">ชื่อ</th>
                <th className="px-4 py-3 font-semibold">นามสกุล</th>
                <th className="px-4 py-3 font-semibold">เลขที่สัญญา</th>
                <th className="px-4 py-3 font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={6}>
                    {pending ? "กำลังโหลด..." : "ไม่พบข้อมูล"}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3 text-muted">{formatDate(r.created_at)}</td>
                    <td className="px-4 py-3">{r.promoter_name}</td>
                    <td className="px-4 py-3">{r.farmer_first_name}</td>
                    <td className="px-4 py-3">{r.farmer_last_name}</td>
                    <td className="px-4 py-3 font-medium">{r.contract_no}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted">เร็วๆ นี้</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-muted">
        หมายเหตุ: ในขั้นนี้ทำรายการ/ค้นหา/Export ก่อน จากนั้นจะเติมแก้ไข/ลบ/เพิ่มแบบละเอียด
      </div>
    </div>
  );
}

