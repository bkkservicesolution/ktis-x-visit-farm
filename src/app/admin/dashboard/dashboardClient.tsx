"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Row = {
  id: string;
  created_at: string;
  promoter_id: string | null;
  promoter_name: string;
  farmer_first_name: string;
  farmer_last_name: string;
  contract_no: string;
  land_id: string | null;
  segmentation: "A" | "B" | "C" | "D" | null;
  area_rai: number | null;
  target_yield_ton_per_rai: number | null;
  planting_window: "before_31_jan" | "after_31_jan" | null;
  cane_type: "new" | "ratoon" | null;
  next_appointment: string | null;
  farm_images: string[] | null;
};

type ListResponse =
  | { ok: true; rows: Row[]; count: number }
  | { ok: false; error: string; detail?: unknown };

type Promoter = { id: string; full_name: string };
type PromotersResponse =
  | { ok: true; rows: Promoter[] }
  | { ok: false; error: string; detail?: unknown };

type ReadinessChecklist = {
  water: boolean;
  weeds: boolean;
  smut: boolean;
  borer: boolean;
  fertilize: boolean;
};

type SupportRequests = { items: string[]; other: string };

type DetailRow = {
  id: string;
  created_at: string;
  promoter_id: string | null;
  promoter_name: string;
  farmer_first_name: string;
  farmer_last_name: string;
  contract_no: string;
  land_id: string | null;
  cane_type: "new" | "ratoon" | null;
  ratoon_no: number | null;
  area_rai: number | null;
  planting_window: "before_31_jan" | "after_31_jan" | null;
  target_yield_ton_per_rai: number | null;
  farm_images: string[] | null;
  readiness_checklist: ReadinessChecklist | null;
  segmentation: "A" | "B" | "C" | "D" | null;
  obstacles: string[] | null;
  support_requests: SupportRequests | null;
  reward_preferences: string[] | null;
  promoter_notes: string | null;
  next_appointment: string | null;
};

type DetailResponse =
  | { ok: true; row: DetailRow }
  | { ok: false; error: string; detail?: unknown; message?: unknown };

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function formatDateOnly(isoOrDate: string | null | undefined): string {
  if (!isoOrDate) return "—";
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return d.toLocaleDateString("th-TH", { dateStyle: "medium" });
}

function toCsv(rows: Row[]): string {
  const header = [
    "created_at",
    "promoter_id",
    "promoter_name",
    "farmer_first_name",
    "farmer_last_name",
    "contract_no",
    "land_id",
    "segmentation",
    "next_appointment",
    "farm_images_count",
    "id",
  ];
  const escape = (v: string) => `"${v.replaceAll('"', '""')}"`;
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.created_at,
        r.promoter_id ?? "",
        r.promoter_name,
        r.farmer_first_name,
        r.farmer_last_name,
        r.contract_no,
        r.land_id ?? "",
        r.segmentation ?? "",
        r.next_appointment ?? "",
        String((r.farm_images ?? []).length),
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

const OBSTACLE_OPTIONS: { id: string; label: string }[] = [
  { id: "fertilizer_price", label: "ราคาปุ๋ย" },
  { id: "labor_cost", label: "ค่าแรง/ค่าพรวน" },
  { id: "irrigation_cost", label: "ต้นทุนการให้น้ำ" },
  { id: "chemical_cost", label: "ค่าสารเคมี" },
  { id: "next_year_cane_price", label: "ราคาอ้อยปีหน้า" },
];

const SUPPORT_OPTIONS: { id: string; label: string }[] = [
  { id: "increase_credit", label: "เพิ่มวงเงินบำรุงอ้อย" },
  { id: "water_source_support", label: "สนับสนุนการสร้างแหล่งน้ำ" },
  { id: "fuel_credit", label: "วงเงินน้ำมัน" },
];

const REWARD_OPTIONS: { id: string; label: string }[] = [
  { id: "trip", label: "ไปเที่ยว" },
  { id: "fertilizer_discount", label: "ส่วนลดปุ๋ย/ยา" },
  { id: "organic_fertilizer_bonus", label: "แถมปุ๋ยอินทรีย์" },
  { id: "new_seed_priority", label: "สิทธิจองพันธุ์ใหม่" },
  { id: "water_source_budget", label: "งบสร้างแหล่งน้ำ" },
];

function toggleMulti(current: string[], id: string): string[] {
  return current.includes(id) ? current.filter((x) => x !== id) : current.concat(id);
}

export function AdminDashboardClient() {
  const [q, setQ] = useState("");
  const [segmentation, setSegmentation] = useState<"" | "A" | "B" | "C" | "D">("");
  const [promoterId, setPromoterId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const limit = 50;
  const [pending, setPending] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [promotersLoading, setPromotersLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailRow | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [edit, setEdit] = useState<{
    promoter_id: string;
    land_id: string;
    cane_type: "" | "new" | "ratoon";
    ratoon_no: string;
    area_rai: string;
    planting_window: "" | "before_31_jan" | "after_31_jan";
    target_yield_ton_per_rai: string;
    segmentation: "" | "A" | "B" | "C" | "D";
    next_appointment: string;
    promoter_notes: string;
    readiness_checklist: ReadinessChecklist;
    obstacles: string[];
    support_requests: SupportRequests;
    reward_preferences: string[];
  }>({
    promoter_id: "",
    land_id: "",
    cane_type: "",
    ratoon_no: "",
    area_rai: "",
    planting_window: "",
    target_yield_ton_per_rai: "",
    segmentation: "",
    next_appointment: "",
    promoter_notes: "",
    readiness_checklist: { water: false, weeds: false, smut: false, borer: false, fertilize: false },
    obstacles: [],
    support_requests: { items: [], other: "" },
    reward_preferences: [],
  });

  const canExport = rows.length > 0 && !pending;
  const canExportFull = count > 0 && !pending;

  const title = useMemo(() => {
    const n = count.toLocaleString("th-TH");
    return `ทั้งหมด ${n} รายการ`;
  }, [count]);

  async function load(pageOverride?: number) {
    setPending(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (segmentation) sp.set("segmentation", segmentation);
      if (promoterId) sp.set("promoter_id", promoterId);
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      sp.set("limit", String(limit));
      const p = typeof pageOverride === "number" ? pageOverride : page;
      sp.set("offset", String(p * limit));

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

  useEffect(() => {
    let alive = true;
    async function loadPromoters() {
      setPromotersLoading(true);
      try {
        const res = await fetch("/api/promoters", { method: "GET" });
        const json = (await res.json().catch(() => null)) as PromotersResponse | null;
        if (!alive) return;
        if (!res.ok || !json || json.ok !== true) return;
        setPromoters(json.rows);
      } finally {
        if (alive) setPromotersLoading(false);
      }
    }
    void loadPromoters();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetail(null);
      setDetailError(null);
      setEditMode(false);
      return;
    }
    let alive = true;
    async function loadDetail(id: string) {
      setDetailPending(true);
      setDetailError(null);
      try {
        const res = await fetch(`/api/forms/${id}`, { method: "GET" });
        const json = (await res.json().catch(() => null)) as DetailResponse | null;
        if (!alive) return;
        if (!res.ok || !json || json.ok !== true) {
          setDetailError("โหลดรายละเอียดไม่สำเร็จ");
          return;
        }
        setDetail(json.row);
        setEditMode(false);
        setEdit({
          promoter_id: json.row.promoter_id ?? "",
          land_id: json.row.land_id ?? "",
          cane_type: json.row.cane_type ?? "",
          ratoon_no: json.row.ratoon_no ? String(json.row.ratoon_no) : "",
          area_rai: json.row.area_rai !== null && json.row.area_rai !== undefined ? String(json.row.area_rai) : "",
          planting_window: json.row.planting_window ?? "",
          target_yield_ton_per_rai:
            json.row.target_yield_ton_per_rai !== null && json.row.target_yield_ton_per_rai !== undefined
              ? String(json.row.target_yield_ton_per_rai)
              : "",
          segmentation: json.row.segmentation ?? "",
          next_appointment: json.row.next_appointment ?? "",
          promoter_notes: json.row.promoter_notes ?? "",
          readiness_checklist: json.row.readiness_checklist ?? {
            water: false,
            weeds: false,
            smut: false,
            borer: false,
            fertilize: false,
          },
          obstacles: json.row.obstacles ?? [],
          support_requests: json.row.support_requests ?? { items: [], other: "" },
          reward_preferences: json.row.reward_preferences ?? [],
        });
      } finally {
        if (alive) setDetailPending(false);
      }
    }
    void loadDetail(selectedId);
    return () => {
      alive = false;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!viewerUrl) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setViewerUrl(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerUrl]);

  async function onSaveEdit() {
    if (!selectedId) return;
    setDetailError(null);
    setDetailPending(true);
    try {
      const promoterFullName = promoters.find((p) => p.id === edit.promoter_id)?.full_name ?? "";
      const payload = {
        promoter_id: edit.promoter_id || null,
        promoter_name: promoterFullName || (detail?.promoter_name ?? ""),
        land_id: edit.land_id,
        cane_type: edit.cane_type || null,
        ratoon_no: edit.cane_type === "ratoon" ? Number(edit.ratoon_no) : null,
        area_rai: edit.area_rai ? Number(edit.area_rai) : null,
        planting_window: edit.planting_window || null,
        target_yield_ton_per_rai: edit.target_yield_ton_per_rai ? Number(edit.target_yield_ton_per_rai) : null,
        segmentation: edit.segmentation || null,
        next_appointment: edit.next_appointment || null,
        promoter_notes: edit.promoter_notes,
        readiness_checklist: edit.readiness_checklist,
        obstacles: edit.obstacles,
        support_requests: edit.support_requests,
        reward_preferences: edit.reward_preferences,
      };

      const res = await fetch(`/api/forms/${selectedId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; message?: unknown; detail?: unknown } | null;
      if (!res.ok || !json || json.ok !== true) {
        const msg =
          json && typeof json.message === "string"
            ? json.message
            : json && typeof json.detail === "string"
              ? json.detail
              : "บันทึกไม่สำเร็จ";
        setDetailError(msg);
        return;
      }

      await load(page);
      const res2 = await fetch(`/api/forms/${selectedId}`, { method: "GET" });
      const json2 = (await res2.json().catch(() => null)) as DetailResponse | null;
      if (res2.ok && json2 && json2.ok === true) setDetail(json2.row);
      setEditMode(false);
    } finally {
      setDetailPending(false);
    }
  }

  async function onDelete() {
    if (!selectedId) return;
    if (!window.confirm("ยืนยันลบรายการนี้?")) return;
    setDetailError(null);
    setDetailPending(true);
    try {
      const res = await fetch(`/api/forms/${selectedId}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; detail?: unknown } | null;
      if (!res.ok || !json || json.ok !== true) {
        const msg = json && typeof json.detail === "string" ? json.detail : "ลบไม่สำเร็จ";
        setDetailError(msg);
        return;
      }
      setSelectedId(null);
      setDetail(null);
      setPage(0);
      await load(0);
    } finally {
      setDetailPending(false);
    }
  }

  function onExportCsv() {
    const csv = toCsv(rows);
    const ts = new Date().toISOString().replaceAll(":", "-");
    download(`ktisx_onsite_visit_forms_${ts}.csv`, csv, "text/csv;charset=utf-8");
  }

  async function onExportFullCsv() {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (segmentation) sp.set("segmentation", segmentation);
    if (promoterId) sp.set("promoter_id", promoterId);
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    const res = await fetch(`/api/forms/export?${sp.toString()}`, { method: "GET" });
    if (!res.ok) {
      setError("Export ไม่สำเร็จ");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ktisx_onsite_visit_forms_full_${new Date().toISOString().replaceAll(":", "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const pages = useMemo(() => Math.max(1, Math.ceil(count / limit)), [count]);
  const pageLabel = useMemo(() => {
    const start = count === 0 ? 0 : page * limit + 1;
    const end = Math.min(count, (page + 1) * limit);
    return `${start.toLocaleString("th-TH")}–${end.toLocaleString("th-TH")}`;
  }, [count, page]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted">{title}</div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา: สัญญา/ชื่อ/นามสกุล/นักส่งเสริม/Land ID"
            className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 sm:w-[360px]"
          />
          <select
            value={segmentation}
            onChange={(e) => setSegmentation(e.target.value as "" | "A" | "B" | "C" | "D")}
            className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 sm:w-[220px]"
          >
            <option value="">ทุกกลุ่ม</option>
            <option value="A">กลุ่ม A</option>
            <option value="B">กลุ่ม B</option>
            <option value="C">กลุ่ม C</option>
            <option value="D">กลุ่ม D</option>
          </select>
          <select
            value={promoterId}
            onChange={(e) => setPromoterId(e.target.value)}
            disabled={promotersLoading}
            className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 sm:w-[260px] disabled:opacity-60"
          >
            <option value="">ทุกนักส่งเสริม</option>
            {promoters.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} - {p.full_name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 sm:w-[170px]"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 sm:w-[170px]"
          />
          <button
            onClick={() => {
              setPage(0);
              void load();
            }}
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
            Export (หน้านี้)
          </button>
          <button
            onClick={() => void onExportFullCsv()}
            disabled={!canExportFull}
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export (ทั้งหมด)
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="sm:hidden">
            <div className="divide-y divide-border bg-background">
              {rows.length === 0 ? (
                <div className="px-4 py-6 text-sm text-muted">
                  {pending ? "กำลังโหลด..." : "ไม่พบข้อมูล"}
                </div>
              ) : (
                rows.map((r) => {
                  const active = r.id === selectedId;
                  const imagesCount = (r.farm_images ?? []).length;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={`w-full px-4 py-4 text-left transition ${
                        active ? "bg-foreground/5" : "hover:bg-foreground/[0.03]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs text-muted">{formatDate(r.created_at)}</div>
                          <div className="mt-1 truncate text-sm font-semibold text-foreground">
                            {r.contract_no || "—"} • {r.farmer_first_name} {r.farmer_last_name}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span className="truncate">นักส่งเสริม: {r.promoter_name || "—"}</span>
                            <span>•</span>
                            <span className="truncate">Land: {r.land_id ?? "—"}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs text-muted">รูป</div>
                          <div className="text-sm font-semibold text-foreground">{imagesCount}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {r.segmentation ? (
                          <span className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground">
                            กลุ่ม {r.segmentation}
                          </span>
                        ) : (
                          <span className="text-xs text-muted">กลุ่ม —</span>
                        )}
                        <span className="text-xs text-muted">นัดหมาย: {formatDateOnly(r.next_appointment)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="min-w-[1100px] w-full border-collapse bg-background text-left text-sm">
              <thead className="bg-foreground/[0.04]">
                <tr className="text-foreground">
                  <th className="px-4 py-3 font-semibold">วันที่</th>
                  <th className="px-4 py-3 font-semibold">นักส่งเสริม</th>
                  <th className="px-4 py-3 font-semibold">เลขที่สัญญา</th>
                  <th className="px-4 py-3 font-semibold">ชื่อ</th>
                  <th className="px-4 py-3 font-semibold">นามสกุล</th>
                  <th className="px-4 py-3 font-semibold">Land ID</th>
                  <th className="px-4 py-3 font-semibold">กลุ่ม</th>
                  <th className="px-4 py-3 font-semibold">นัดหมาย</th>
                  <th className="px-4 py-3 font-semibold">รูป</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted" colSpan={9}>
                      {pending ? "กำลังโหลด..." : "ไม่พบข้อมูล"}
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const active = r.id === selectedId;
                    const imagesCount = (r.farm_images ?? []).length;
                    return (
                      <tr
                        key={r.id}
                        className={`border-t border-border cursor-pointer transition ${
                          active ? "bg-foreground/5" : "hover:bg-foreground/[0.03]"
                        }`}
                        onClick={() => setSelectedId(r.id)}
                      >
                        <td className="px-4 py-3 text-muted">{formatDate(r.created_at)}</td>
                        <td className="px-4 py-3">{r.promoter_name}</td>
                        <td className="px-4 py-3 font-medium">{r.contract_no}</td>
                        <td className="px-4 py-3">{r.farmer_first_name}</td>
                        <td className="px-4 py-3">{r.farmer_last_name}</td>
                        <td className="px-4 py-3">{r.land_id ?? "—"}</td>
                        <td className="px-4 py-3">
                          {r.segmentation ? (
                            <span className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground">
                              {r.segmentation}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{formatDateOnly(r.next_appointment)}</td>
                        <td className="px-4 py-3">
                          <span className="text-muted">{imagesCount}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="text-sm font-semibold text-foreground">รายละเอียด</div>
          <div className="mt-1 text-xs text-muted">
            เลือกรายการจากตารางเพื่อดูรายละเอียด (และแก้ไข/ลบ)
          </div>
          {detailError ? (
            <div className="mt-4 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">
              {detailError}
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            {!selectedId ? (
              <div className="py-6 text-sm text-muted">ยังไม่ได้เลือกรายการ</div>
            ) : detailPending && !detail ? (
              <div className="py-6 text-sm text-muted">กำลังโหลดรายละเอียด…</div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted">วันที่</div>
                    <div className="text-sm font-semibold text-foreground">{formatDate(detail.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={detailPending}
                      onClick={() => setEditMode((v) => !v)}
                      className="rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
                    >
                      {editMode ? "ปิดโหมดแก้ไข" : "แก้ไข"}
                    </button>
                    <button
                      type="button"
                      disabled={detailPending}
                      onClick={() => void onDelete()}
                      className="rounded-2xl bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                    >
                      ลบ
                    </button>
                  </div>
                </div>

                {!editMode ? (
                  <>
                    <div className="grid gap-3 rounded-2xl border border-border bg-background p-3 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted">นักส่งเสริม</div>
                          <div className="font-semibold text-foreground">{detail.promoter_name}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted">เลขที่สัญญา</div>
                          <div className="font-semibold text-foreground">{detail.contract_no}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted">ชื่อ-นามสกุล</div>
                          <div className="font-semibold text-foreground">
                            {detail.farmer_first_name} {detail.farmer_last_name}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted">Land ID</div>
                          <div className="font-semibold text-foreground">{detail.land_id ?? "—"}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs text-muted">กลุ่ม</div>
                          <div className="font-semibold text-foreground">{detail.segmentation ?? "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted">นัดหมาย</div>
                          <div className="font-semibold text-foreground">{formatDateOnly(detail.next_appointment)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-3">
                      <div className="text-xs font-semibold text-foreground">Checklist</div>
                      <div className="mt-2 grid gap-2 text-sm">
                        {(
                          [
                            ["water", "แหล่งน้ำ"] as const,
                            ["weeds", "วัชพืช"] as const,
                            ["smut", "โรคแส้ดำ"] as const,
                            ["borer", "หนอนกอ"] as const,
                            ["fertilize", "การบำรุง"] as const,
                          ]
                        ).map(([k, label]) => {
                          const c =
                            detail.readiness_checklist ?? ({
                              water: false,
                              weeds: false,
                              smut: false,
                              borer: false,
                              fertilize: false,
                            } satisfies ReadinessChecklist);
                          const v = Boolean(c[k]);
                          return (
                            <div key={k} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
                              <div className="text-foreground">{label}</div>
                              <div className={v ? "text-foreground font-semibold" : "text-accent font-semibold"}>
                                {v ? "ผ่าน" : "ไม่ผ่าน"}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-3">
                      <div className="text-xs font-semibold text-foreground">Insight & Support</div>
                      <div className="mt-2 space-y-2 text-sm">
                        <div className="rounded-xl border border-border bg-card px-3 py-2">
                          <div className="text-xs text-muted">อุปสรรค</div>
                          <div className="mt-1 text-foreground">
                            {(detail.obstacles ?? []).length ? (detail.obstacles ?? []).join(", ") : "—"}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-card px-3 py-2">
                          <div className="text-xs text-muted">Support</div>
                          <div className="mt-1 text-foreground">
                            {((detail.support_requests?.items ?? []) as string[]).length
                              ? (detail.support_requests?.items ?? []).join(", ")
                              : "—"}
                            {detail.support_requests?.other ? ` • อื่นๆ: ${detail.support_requests.other}` : ""}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border bg-card px-3 py-2">
                          <div className="text-xs text-muted">รางวัล</div>
                          <div className="mt-1 text-foreground">
                            {(detail.reward_preferences ?? []).length
                              ? (detail.reward_preferences ?? []).join(", ")
                              : "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-3">
                      <div className="text-xs font-semibold text-foreground">บันทึกของนักส่งเสริม</div>
                      <div className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                        {detail.promoter_notes ? detail.promoter_notes : "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-3">
                      <div className="text-xs font-semibold text-foreground">รูปแนบ</div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {(detail.farm_images ?? []).length === 0 ? (
                          <div className="col-span-3 text-sm text-muted">ไม่มีรูปแนบ</div>
                        ) : (
                          (detail.farm_images ?? []).map((url) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => setViewerUrl(url)}
                              className="group relative block w-full"
                              aria-label="ดูรูปขนาดใหญ่"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt="รูปแนบ"
                                className="aspect-square w-full rounded-2xl border border-border object-cover shadow-sm transition group-hover:opacity-90"
                              />
                            </button>
                          ))
                        )}
                      </div>
                      {(detail.farm_images ?? []).length > 0 ? (
                        <div className="mt-2 text-xs text-muted">คลิกที่รูปเพื่อขยายดู</div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border bg-background p-3">
                      <div className="text-xs font-semibold text-foreground">แก้ไขข้อมูล</div>
                      <div className="mt-3 grid gap-3">
                        <label className="block">
                          <span className="text-xs font-medium text-foreground">นักส่งเสริม</span>
                          <select
                            value={edit.promoter_id}
                            onChange={(e) => setEdit((cur) => ({ ...cur, promoter_id: e.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                          >
                            <option value="">—</option>
                            {promoters.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.id} - {p.full_name}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="text-xs font-medium text-foreground">Land ID</span>
                            <input
                              value={edit.land_id}
                              onChange={(e) => setEdit((cur) => ({ ...cur, land_id: e.target.value }))}
                              className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-medium text-foreground">กลุ่ม</span>
                            <select
                              value={edit.segmentation}
                              onChange={(e) =>
                                setEdit((cur) => ({
                                  ...cur,
                                  segmentation: e.target.value as "" | "A" | "B" | "C" | "D",
                                }))
                              }
                              className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                            >
                              <option value="">—</option>
                              <option value="A">A</option>
                              <option value="B">B</option>
                              <option value="C">C</option>
                              <option value="D">D</option>
                            </select>
                          </label>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="text-xs font-medium text-foreground">ประเภทอ้อย</span>
                            <select
                              value={edit.cane_type}
                              onChange={(e) =>
                                setEdit((cur) => ({
                                  ...cur,
                                  cane_type: e.target.value as "" | "new" | "ratoon",
                                }))
                              }
                              className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                            >
                              <option value="">—</option>
                              <option value="new">อ้อยใหม่</option>
                              <option value="ratoon">อ้อยตอ</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-xs font-medium text-foreground">ตอที่</span>
                            <input
                              value={edit.ratoon_no}
                              onChange={(e) => setEdit((cur) => ({ ...cur, ratoon_no: e.target.value }))}
                              disabled={edit.cane_type !== "ratoon"}
                              inputMode="numeric"
                              className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                            />
                          </label>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="text-xs font-medium text-foreground">พื้นที่ (ไร่)</span>
                            <input
                              value={edit.area_rai}
                              onChange={(e) => setEdit((cur) => ({ ...cur, area_rai: e.target.value }))}
                              inputMode="decimal"
                              className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-medium text-foreground">เป้าหมาย (ตัน/ไร่)</span>
                            <input
                              value={edit.target_yield_ton_per_rai}
                              onChange={(e) =>
                                setEdit((cur) => ({ ...cur, target_yield_ton_per_rai: e.target.value }))
                              }
                              inputMode="decimal"
                              className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                            />
                          </label>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block">
                            <span className="text-xs font-medium text-foreground">ช่วงปลูก/ตัด</span>
                            <select
                              value={edit.planting_window}
                              onChange={(e) =>
                                setEdit((cur) => ({
                                  ...cur,
                                  planting_window: e.target.value as "" | "before_31_jan" | "after_31_jan",
                                }))
                              }
                              className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                            >
                              <option value="">—</option>
                              <option value="before_31_jan">ก่อน 31 ม.ค.</option>
                              <option value="after_31_jan">หลัง 31 ม.ค.</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-xs font-medium text-foreground">นัดหมาย</span>
                            <input
                              type="date"
                              value={edit.next_appointment}
                              onChange={(e) => setEdit((cur) => ({ ...cur, next_appointment: e.target.value }))}
                              className="mt-2 w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-3">
                      <div className="text-xs font-semibold text-foreground">Checklist</div>
                      <div className="mt-2 grid gap-2">
                        {(
                          [
                            ["water", "แหล่งน้ำ"] as const,
                            ["weeds", "วัชพืช"] as const,
                            ["smut", "โรคแส้ดำ"] as const,
                            ["borer", "หนอนกอ"] as const,
                            ["fertilize", "การบำรุง"] as const,
                          ]
                        ).map(([k, label]) => {
                          const v = edit.readiness_checklist[k];
                          return (
                            <div key={k} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm">
                              <div className="text-foreground">{label}</div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEdit((cur) => ({
                                      ...cur,
                                      readiness_checklist: {
                                        ...cur.readiness_checklist,
                                        [k]: true,
                                      } as ReadinessChecklist,
                                    }))
                                  }
                                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm ${
                                    v
                                      ? "bg-foreground text-background"
                                      : "border border-border bg-background text-foreground hover:bg-foreground/5"
                                  }`}
                                >
                                  ผ่าน
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEdit((cur) => ({
                                      ...cur,
                                      readiness_checklist: {
                                        ...cur.readiness_checklist,
                                        [k]: false,
                                      } as ReadinessChecklist,
                                    }))
                                  }
                                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm ${
                                    !v
                                      ? "bg-accent text-white"
                                      : "border border-border bg-background text-foreground hover:bg-foreground/5"
                                  }`}
                                >
                                  ไม่ผ่าน
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-3">
                      <div className="text-xs font-semibold text-foreground">Insight & Support</div>
                      <div className="mt-3 space-y-3">
                        <div>
                          <div className="text-xs font-medium text-foreground">อุปสรรค</div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {OBSTACLE_OPTIONS.map((o) => (
                              <label key={o.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={edit.obstacles.includes(o.id)}
                                  onChange={() =>
                                    setEdit((cur) => ({ ...cur, obstacles: toggleMulti(cur.obstacles, o.id) }))
                                  }
                                />
                                {o.label}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-medium text-foreground">Support</div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {SUPPORT_OPTIONS.map((s) => (
                              <label key={s.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={edit.support_requests.items.includes(s.id)}
                                  onChange={() =>
                                    setEdit((cur) => ({
                                      ...cur,
                                      support_requests: {
                                        ...cur.support_requests,
                                        items: toggleMulti(cur.support_requests.items, s.id),
                                      },
                                    }))
                                  }
                                />
                                {s.label}
                              </label>
                            ))}
                          </div>
                          <input
                            value={edit.support_requests.other}
                            onChange={(e) =>
                              setEdit((cur) => ({ ...cur, support_requests: { ...cur.support_requests, other: e.target.value } }))
                            }
                            placeholder="อื่นๆ"
                            className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                          />
                        </div>

                        <div>
                          <div className="text-xs font-medium text-foreground">รางวัล</div>
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {REWARD_OPTIONS.map((r) => (
                              <label key={r.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={edit.reward_preferences.includes(r.id)}
                                  onChange={() =>
                                    setEdit((cur) => ({
                                      ...cur,
                                      reward_preferences: toggleMulti(cur.reward_preferences, r.id),
                                    }))
                                  }
                                />
                                {r.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-3">
                      <div className="text-xs font-semibold text-foreground">บันทึกของนักส่งเสริม</div>
                      <textarea
                        value={edit.promoter_notes}
                        onChange={(e) => setEdit((cur) => ({ ...cur, promoter_notes: e.target.value }))}
                        rows={4}
                        className="mt-2 w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        disabled={detailPending}
                        onClick={() => setEditMode(false)}
                        className="rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="button"
                        disabled={detailPending}
                        onClick={() => void onSaveEdit()}
                        className="rounded-2xl bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-60"
                      >
                        {detailPending ? "กำลังบันทึก..." : "บันทึก"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-sm text-muted">ไม่พบข้อมูล</div>
            )}
          </div>
        </div>
      </div>

      {viewerUrl
        ? typeof document !== "undefined"
          ? createPortal(
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
                role="dialog"
                aria-modal="true"
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) setViewerUrl(null);
                }}
              >
                <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
                <div className="relative max-h-[90vh] max-w-[90vw]">
                  <button
                    type="button"
                    onClick={() => setViewerUrl(null)}
                    className="absolute -right-3 -top-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg transition hover:bg-foreground/90 focus:outline-none focus:ring-4 focus:ring-accent/25"
                    aria-label="ปิด"
                  >
                    ×
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewerUrl}
                    alt="ดูรูป"
                    className="max-h-[90vh] max-w-[90vw] rounded-2xl border border-border bg-background shadow-2xl"
                  />
                </div>
              </div>,
              document.body,
            )
          : null
        : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted">
          แสดง {pageLabel} จากทั้งหมด {count.toLocaleString("th-TH")} รายการ
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending || page <= 0}
            onClick={() => {
              setPage(0);
              void load(0);
            }}
            className="rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
          >
            หน้าแรก
          </button>
          <button
            type="button"
            disabled={pending || page <= 0}
            onClick={() => {
              const next = Math.max(0, page - 1);
              setPage(next);
              void load(next);
            }}
            className="rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
          >
            ก่อนหน้า
          </button>
          <div className="text-xs text-muted">
            หน้า {Math.min(page + 1, pages).toLocaleString("th-TH")} / {pages.toLocaleString("th-TH")}
          </div>
          <button
            type="button"
            disabled={pending || page + 1 >= pages}
            onClick={() => {
              const next = Math.min(pages - 1, page + 1);
              setPage(next);
              void load(next);
            }}
            className="rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
          >
            ถัดไป
          </button>
        </div>
      </div>

    </div>
  );
}

