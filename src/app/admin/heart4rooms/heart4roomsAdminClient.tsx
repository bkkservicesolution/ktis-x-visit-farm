"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Heart4SurveySteps, type Heart4SurveyStepsProps } from "@/app/surveys/heart4rooms/heart4SurveySteps";

type Row = {
  id: string;
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
  created_at: string;
  created_by_user_id: string;
  submitter_display_name: string;
  submitter_manual: boolean;
  answers: unknown;
  attachments: unknown;
};

type DetailResponse =
  | { ok: true; row: DetailRow }
  | { ok: false; error: string; detail?: unknown };

type PatchResponse =
  | { ok: true; row: DetailRow }
  | { ok: false; error: string; detail?: unknown };

function getFarmerRoleLabel(rawAnswers: unknown): string {
  const answers =
    rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers)
      ? (rawAnswers as Record<string, unknown>)
      : {};

  const roleRaw = answers.farmer_role;
  const role = typeof roleRaw === "string" ? roleRaw.trim() : "";

  const otherRaw = answers.farmer_role_other;
  const other = typeof otherRaw === "string" ? otherRaw.trim() : "";
  const otherText = other;

  if (role === "owner") return "เจ้าของไร่";
  if (role === "worker") return "ลูกไร่";
  if (role === "other") return otherText ? `อื่นๆ: ${otherText}` : "อื่นๆ";
  return "";
}

function getFarmerRoleValue(rawAnswers: unknown): { role: "owner" | "worker" | "other" | ""; other: string } {
  const answers =
    rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers)
      ? (rawAnswers as Record<string, unknown>)
      : {};

  const roleRaw = answers.farmer_role;
  const role = typeof roleRaw === "string" ? roleRaw.trim() : "";
  const effectiveRole = role === "owner" || role === "worker" || role === "other" ? role : "";

  const otherRaw = answers.farmer_role_other;
  const other = typeof otherRaw === "string" ? otherRaw : "";

  return { role: effectiveRole as "owner" | "worker" | "other" | "", other: other.trim() };
}

function Heart4Preview({
  answers,
  editable,
  setField,
  mergeField,
  toggleMulti,
}: {
  answers: Heart4SurveyStepsProps["answers"];
  editable: boolean;
  setField: Heart4SurveyStepsProps["setField"];
  mergeField: Heart4SurveyStepsProps["mergeField"];
  toggleMulti: Heart4SurveyStepsProps["toggleMulti"];
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-xs font-medium text-muted">คำถามและคำตอบ (แสดงตามแบบฟอร์ม)</div>
      <div className="mt-3 max-h-[52vh] overflow-auto pr-1">
        <div className={editable ? "space-y-8" : "pointer-events-none select-none space-y-8"}>
          {Array.from({ length: 9 }, (_, i) => i + 1).map((step) => (
            <div key={step} className="rounded-3xl border border-border bg-card p-4">
              <div className="text-xs font-semibold tracking-wide text-muted">หน้าที่ {step}/9</div>
              <div className="mt-3">
                <Heart4SurveySteps
                  step={step}
                  answers={answers}
                  setField={setField}
                  mergeField={mergeField}
                  toggleMulti={toggleMulti}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const [exportOpen, setExportOpen] = useState(false);
  const [exportStarting, setExportStarting] = useState(false);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportDone, setExportDone] = useState(0);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportStatus, setExportStatus] = useState<"idle" | "pending" | "running" | "done" | "cancelled" | "error">("idle");
  const [exportError, setExportError] = useState<string | null>(null);
  const exportEsRef = useRef<EventSource | null>(null);
  const exportStartLockRef = useRef(false);
  const [exportNotice, setExportNotice] = useState<{ open: boolean; text: string; tone: "ok" | "error" }>({
    open: false,
    text: "",
    tone: "ok",
  });

  /** `null` until loaded from server (Vercel uses sync; local dev uses job+SSE). */
  const [exportApiMode, setExportApiMode] = useState<"sync" | "job" | null>(null);

  const [dialogMode, setDialogMode] = useState<"view" | "edit">("view");
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [editSubmitter, setEditSubmitter] = useState("");
  const [editFarmerFirst, setEditFarmerFirst] = useState("");
  const [editFarmerLast, setEditFarmerLast] = useState("");
  const [editContractNo, setEditContractNo] = useState("");
  const [editAnswers, setEditAnswers] = useState<Heart4SurveyStepsProps["answers"]>({});

  const title = useMemo(() => `ทั้งหมด ${count.toLocaleString("th-TH")} รายการ`, [count]);

  const selectedCount = useMemo(() => Object.values(selectedIds).filter(Boolean).length, [selectedIds]);

  const exportLocked = exportStarting || exportStatus === "pending" || exportStatus === "running";

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/surveys/heart4rooms/export/settings")
      .then((r) => r.json().catch(() => null))
      .then((j: { mode?: string } | null) => {
        if (cancelled) return;
        setExportApiMode(j?.mode === "sync" ? "sync" : "job");
      })
      .catch(() => {
        if (!cancelled) setExportApiMode("job");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const exportPercent = useMemo(() => {
    if (exportTotal <= 0) return 0;
    return Math.max(0, Math.min(100, Math.floor((exportDone / exportTotal) * 100)));
  }, [exportDone, exportTotal]);

  async function sleep(ms: number) {
    await new Promise((r) => setTimeout(r, ms));
  }

  async function downloadExportFile(jobId: string, filename: string | null) {
    const fileEndpoint = `/api/surveys/heart4rooms/export/jobs/${encodeURIComponent(jobId)}/file`;

    // The export job writes the XLSX asynchronously; on some environments the
    // job may be marked done slightly before the file becomes readable.
    // If the API returns 202 (NOT_READY), wait briefly and retry.
    let res: Response | null = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      res = await fetch(fileEndpoint, { method: "GET" });
      if (res.status !== 202) break;
      await sleep(250);
    }
    if (!res || !res.ok) {
      let detail = "";
      try {
        const j = (await res?.json().catch(() => null)) as { error?: string; status?: string } | null;
        if (j?.error) detail = j.status ? `${j.error} (${j.status})` : j.error;
      } catch {
        // ignore
      }
      throw new Error(detail ? `DOWNLOAD_FAILED:${detail}` : "DOWNLOAD_FAILED");
    }

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = blobUrl;
      if (filename) a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  async function cancelExport() {
    if (!exportJobId) return;
    try {
      await fetch(`/api/surveys/heart4rooms/export/jobs/${encodeURIComponent(exportJobId)}/cancel`, { method: "POST" });
    } finally {
      exportEsRef.current?.close();
      exportEsRef.current = null;
      setExportStatus("cancelled");
      setExportError(null);
      setExportJobId(null);
      setExportOpen(false);
      setExportNotice({
        open: true,
        tone: "ok",
        text: exportTotal > 0 ? `ยกเลิกการดาวน์โหลดแล้ว (${exportDone.toLocaleString("th-TH")}/${exportTotal.toLocaleString("th-TH")} รายการ)` : "ยกเลิกการดาวน์โหลดแล้ว",
      });
    }
  }

  async function startExport(kind: "all" | "selected") {
    if (exportLocked) return;
    if (exportStartLockRef.current) return;
    if (exportApiMode === null) return;

    const ids =
      kind === "selected"
        ? Object.entries(selectedIds)
            .filter(([, v]) => v)
            .map(([id]) => id)
        : [];

    if (kind === "selected" && ids.length === 0) return;

    exportStartLockRef.current = true;
    setExportStarting(true);
    setExportError(null);
    setExportOpen(true);
    setExportJobId(null);
    setExportDone(0);
    setExportTotal(0);
    setExportStatus("pending");

    async function syncExportDownload() {
      setExportStatus("running");
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (promoterId.trim()) sp.set("promoter_id", promoterId.trim());
      if (from) sp.set("from", from);
      if (to) sp.set("to", to);
      if (ids.length) sp.set("ids", ids.join(","));

      const ctl = new AbortController();
      const hangTimer = window.setTimeout(() => ctl.abort(), 315_000);

      let res: Response;
      try {
        res = await fetch(`/api/surveys/heart4rooms/export?${sp.toString()}`, {
          method: "GET",
          signal: ctl.signal,
        });
      } catch (err) {
        clearTimeout(hangTimer);
        const aborted = err instanceof DOMException ? err.name === "AbortError" : (err as Error)?.name === "AbortError";
        setExportError(
          aborted
            ? "รอเกิน ~5 นาที ไม่ได้รับไฟล์ (โปรดให้ผู้ดูแลเช็คฟังก์ชัน export ใน Vercel / timeout)"
            : "โหลดไฟล์ไม่สำเร็จ (เครือข่ายหรือเซิร์ฟเวอร์)",
        );
        setExportStatus("error");
        return;
      }
      clearTimeout(hangTimer);

      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string; detail?: unknown } | null;
        const detail =
          typeof j?.detail === "string"
            ? j.detail
            : j?.detail && typeof j.detail === "object"
              ? JSON.stringify(j.detail)
              : "";
        const msg = [j?.error, detail].filter(Boolean).join(": ") || `HTTP ${res.status}`;
        setExportError(`Export ไม่สำเร็จ (${msg})`);
        setExportStatus("error");
        return;
      }

      const cd = res.headers.get("content-disposition");
      let filename: string | null = null;
      if (cd) {
        const star = cd.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
        const plain = cd.match(/filename="([^"]+)"/i);
        const raw = (star?.[1] ?? plain?.[1] ?? "").trim();
        if (raw) {
          try {
            filename = decodeURIComponent(raw.replace(/^"(.*)"$/, "$1"));
          } catch {
            filename = raw.replace(/^"(.*)"$/, "$1");
          }
        }
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = blobUrl;
        if (filename) a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(blobUrl);
      }

      const n = kind === "all" ? count : ids.length;
      setExportNotice({
        open: true,
        tone: "ok",
        text: n > 0 ? `ดาวน์โหลด ${n.toLocaleString("th-TH")} รายการเสร็จสิ้น` : "ดาวน์โหลดเสร็จสิ้น",
      });
      setExportOpen(false);
      setExportStatus("idle");
    }

    try {
      if (exportApiMode === "sync") {
        await syncExportDownload();
        return;
      }

      const res = await fetch("/api/surveys/heart4rooms/export/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          q: q.trim(),
          promoter_id: promoterId.trim(),
          from,
          to,
          ids: ids.join(","),
        }),
      });

      const json = (await res.json().catch(() => null)) as { ok?: boolean; jobId?: string; error?: string } | null;
      if (!res.ok || !json || json.ok !== true || !json.jobId) {
        setExportError("เริ่ม export ไม่สำเร็จ");
        setExportStatus("error");
        return;
      }
      setExportJobId(json.jobId);
    } finally {
      setExportStarting(false);
      exportStartLockRef.current = false;
    }
  }

  useEffect(() => {
    if (!exportJobId) return;

    exportEsRef.current?.close();

    const es = new EventSource(`/api/surveys/heart4rooms/export/jobs/${encodeURIComponent(exportJobId)}/events`);
    exportEsRef.current = es;

    const onProgress = (e: MessageEvent<string>) => {
      try {
        const data = JSON.parse(e.data) as {
          status?: "pending" | "running" | "done" | "cancelled" | "error";
          done?: number;
          total?: number;
          error?: string | null;
          filename?: string | null;
        };
        if (data.status) setExportStatus(data.status);
        if (typeof data.total === "number") setExportTotal(data.total);
        if (typeof data.done === "number") setExportDone(data.done);
        if (data.status === "error") setExportError(data.error || "Export ล้มเหลว");
        if (data.status === "cancelled") {
          es.close();
          exportEsRef.current = null;
          setExportOpen(false);
        }
        if (data.status === "done") {
          es.close();
          exportEsRef.current = null;
          const total = typeof data.total === "number" ? data.total : exportTotal;
          const filename = typeof data.filename === "string" ? data.filename : null;
          void (async () => {
            try {
              await downloadExportFile(exportJobId, filename);
              setExportNotice({
                open: true,
                tone: "ok",
                text: total > 0 ? `ดาวน์โหลด ${total.toLocaleString("th-TH")} รายการเสร็จสิ้น` : "ดาวน์โหลดเสร็จสิ้น",
              });
            } catch {
              setExportNotice({ open: true, tone: "error", text: "ดาวน์โหลดไม่สำเร็จ (โปรดลองอีกครั้ง)" });
            } finally {
              setExportJobId(null);
              setExportOpen(false);
              setExportStatus("idle");
            }
          })();
        }
      } catch {
        // ignore parse errors
      }
    };

    const onError = () => {
      setExportError("เชื่อมต่อสถานะ export ไม่สำเร็จ");
      setExportStatus("error");
      es.close();
      exportEsRef.current = null;
    };

    es.addEventListener("progress", onProgress as EventListener);
    es.onerror = onError;

    return () => {
      es.removeEventListener("progress", onProgress as EventListener);
      es.close();
      if (exportEsRef.current === es) exportEsRef.current = null;
    };
  }, [exportJobId, exportTotal]);

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
    const t = window.setTimeout(() => {
      void load(0);
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const t = window.setTimeout(() => {
      void loadDetail(selectedId);
    }, 0);
    return () => window.clearTimeout(t);
  }, [selectedId]);

  useEffect(() => {
    if (!detail || !selectedId) return;
    const t = window.setTimeout(() => {
      setSaveError(null);
      setEditSubmitter(detail.submitter_display_name ?? "");
      setEditFarmerFirst(detail.farmer_first_name ?? "");
      setEditFarmerLast(detail.farmer_last_name ?? "");
      setEditContractNo(detail.contract_no ?? "");
      setEditAnswers(
        detail.answers && typeof detail.answers === "object" && !Array.isArray(detail.answers)
          ? (detail.answers as Heart4SurveyStepsProps["answers"])
          : {},
      );
    }, 0);
    return () => window.clearTimeout(t);
  }, [detail, selectedId]);

  function setField(key: string, value: unknown) {
    setEditAnswers((a) => ({ ...a, [key]: value }));
  }

  function mergeField(key: string, partial: Record<string, unknown>) {
    setEditAnswers((a) => {
      const cur = (a[key] && typeof a[key] === "object" && !Array.isArray(a[key]) ? a[key] : {}) as Record<string, unknown>;
      return { ...a, [key]: { ...cur, ...partial } };
    });
  }

  function toggleMulti(key: string, code: string) {
    setEditAnswers((a) => {
      const cur = Array.isArray(a[key]) ? ([...(a[key] as string[])] as string[]) : [];
      const i = cur.indexOf(code);
      if (i >= 0) cur.splice(i, 1);
      else cur.push(code);
      return { ...a, [key]: cur };
    });
  }

  async function onSave() {
    if (!selectedId || !detail) return;
    if (savePending) return;
    setSaveError(null);

    setSavePending(true);
    try {
      const res = await fetch(`/api/surveys/heart4rooms/${encodeURIComponent(selectedId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          submitter_display_name: editSubmitter,
          farmer_first_name: editFarmerFirst,
          farmer_last_name: editFarmerLast,
          contract_no: editContractNo,
          answers: editAnswers,
        }),
      });
      const json = (await res.json().catch(() => null)) as PatchResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        setSaveError("บันทึกไม่สำเร็จ");
        return;
      }

      setDetail(json.row);
      setRows((cur) =>
        cur.map((x) =>
          x.id !== json.row.id
            ? x
            : {
                ...x,
                submitter_display_name: json.row.submitter_display_name,
                farmer_first_name: json.row.farmer_first_name,
                farmer_last_name: json.row.farmer_last_name,
                contract_no: json.row.contract_no,
              },
        ),
      );
      setDialogMode("view");
    } finally {
      setSavePending(false);
    }
  }

  const pages = useMemo(() => Math.max(1, Math.ceil(count / limit)), [count]);
  const canPrev = page > 0 && !pending;
  const canNext = page < pages - 1 && !pending;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-xs font-medium text-muted">ค้นหา</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ชื่อ/นามสกุล/สัญญา"
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

          <div className="flex flex-wrap items-center gap-2">
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

            <button
              type="button"
              disabled={pending || exportLocked || exportApiMode === null}
              onClick={() => void startExport("all")}
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-40"
            >
              {exportApiMode === null ? "กำลังเตรียม Export…" : exportLocked ? "กำลัง Export…" : "Export ทั้งหมด"}
            </button>

            <button
              type="button"
              disabled={pending || exportLocked || selectedCount === 0 || exportApiMode === null}
              onClick={() => void startExport("selected")}
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-40"
            >
              Export ที่เลือก ({selectedCount})
            </button>
          </div>
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

      {exportNotice.open ? (
        <div
          className={`rounded-3xl border px-4 py-3 text-sm shadow-sm ${
            exportNotice.tone === "ok"
              ? "border-foreground/15 bg-foreground/[0.04] text-foreground"
              : "border-accent/20 bg-accent/[0.06] text-accent"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold">{exportNotice.tone === "ok" ? "สำเร็จ" : "เกิดข้อผิดพลาด"}</div>
              <div className="mt-1 text-xs opacity-90">{exportNotice.text}</div>
            </div>
            <button
              type="button"
              onClick={() => setExportNotice({ open: false, text: "", tone: "ok" })}
              className="shrink-0 rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-foreground/5"
            >
              ปิด
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-border bg-background">
        <div className="hidden grid-cols-10 gap-3 border-b border-border bg-card px-4 py-3 text-xs font-semibold text-muted sm:grid">
          <div className="col-span-1">เลือก</div>
          <div className="col-span-3">ชาวไร่</div>
          <div className="col-span-2">สัญญา</div>
          <div className="col-span-2">ผู้กรอก</div>
          <div className="col-span-2 text-right">การทำงาน</div>
        </div>
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div
              key={r.id}
              className="text-left text-sm text-foreground transition hover:bg-foreground/5"
            >
              <div className="px-4 py-4 sm:hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={!!selectedIds[r.id]}
                        onChange={(e) => setSelectedIds((cur) => ({ ...cur, [r.id]: e.target.checked }))}
                        className="mt-1"
                      />
                      <div className="min-w-0">
                        <div className="break-words text-sm font-semibold text-foreground">
                          {r.farmer_first_name} {r.farmer_last_name}
                        </div>
                        <div className="mt-1 text-xs text-muted">สัญญา {r.contract_no}</div>
                        <div className="mt-1 text-xs text-muted">ผู้กรอก {r.submitter_display_name || "-"}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDialogMode("view");
                      setSelectedId(r.id);
                    }}
                    className="inline-flex min-w-[96px] flex-1 items-center justify-center rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
                  >
                    ดู
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDialogMode("edit");
                      setSelectedId(r.id);
                    }}
                    className="inline-flex min-w-[96px] flex-1 items-center justify-center rounded-2xl bg-foreground px-3 py-2 text-xs font-semibold text-background shadow-sm transition hover:bg-foreground/90"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    disabled={deletePending}
                    onClick={() => void onDelete(r.id)}
                    className="inline-flex min-w-[96px] flex-1 items-center justify-center rounded-2xl bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                  >
                    ลบ
                  </button>
                </div>
              </div>

              <div className="hidden px-4 py-3 sm:grid sm:grid-cols-10 sm:gap-3">
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={!!selectedIds[r.id]}
                    onChange={(e) => setSelectedIds((cur) => ({ ...cur, [r.id]: e.target.checked }))}
                  />
                </div>

                <div className="col-span-3 font-semibold">
                {r.farmer_first_name} {r.farmer_last_name}
                </div>

                <div className="col-span-2">{r.contract_no}</div>

                <div className="col-span-2 truncate text-xs text-muted">{r.submitter_display_name}</div>

                <div className="col-span-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDialogMode("view");
                      setSelectedId(r.id);
                    }}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-foreground/5"
                  >
                    ดู
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDialogMode("edit");
                      setSelectedId(r.id);
                    }}
                    className="rounded-xl bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition hover:bg-foreground/90"
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
                      <div className="text-sm font-semibold text-foreground">
                        {dialogMode === "edit" ? "แก้ไข" : "รายละเอียด"}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted">{selectedId}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {dialogMode === "view" ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!detail) return;
                            setSaveError(null);
                            setDialogMode("edit");
                            setEditSubmitter(detail.submitter_display_name ?? "");
                            setEditFarmerFirst(detail.farmer_first_name ?? "");
                            setEditFarmerLast(detail.farmer_last_name ?? "");
                            setEditContractNo(detail.contract_no ?? "");
                            setEditAnswers(
                              detail.answers && typeof detail.answers === "object" && !Array.isArray(detail.answers)
                                ? (detail.answers as Heart4SurveyStepsProps["answers"])
                                : {},
                            );
                          }}
                          className="rounded-2xl bg-foreground px-3 py-2 text-sm font-semibold text-background transition hover:bg-foreground/90"
                        >
                          แก้ไข
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={savePending}
                          onClick={() => {
                            setSaveError(null);
                            setDialogMode("view");
                          }}
                          className="rounded-2xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/5 disabled:opacity-40"
                        >
                          ดู
                        </button>
                      )}
                      {dialogMode === "edit" ? (
                        <button
                          type="button"
                          disabled={savePending}
                          onClick={() => void onSave()}
                          className="rounded-2xl bg-foreground px-3 py-2 text-sm font-semibold text-background transition hover:bg-foreground/90 disabled:opacity-40"
                        >
                          {savePending ? "กำลังบันทึก…" : "บันทึก"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="rounded-2xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/5"
                      >
                        ปิด
                      </button>
                    </div>
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
                            <div className="text-xs font-medium text-muted">ผู้กรอก</div>
                            {dialogMode === "edit" ? (
                              <input
                                value={editSubmitter}
                                onChange={(e) => setEditSubmitter(e.target.value)}
                                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                              />
                            ) : (
                              <div className="mt-1 text-sm font-semibold text-foreground">{detail.submitter_display_name}</div>
                            )}
                          </div>
                          <div className="rounded-2xl border border-border bg-background p-3">
                            <div className="text-xs font-medium text-muted">เลขที่สัญญา</div>
                            {dialogMode === "edit" ? (
                              <input
                                value={editContractNo}
                                onChange={(e) => setEditContractNo(e.target.value)}
                                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                              />
                            ) : (
                              <div className="mt-1 text-sm font-semibold text-foreground">{detail.contract_no}</div>
                            )}
                          </div>
                        </div>

                        {saveError ? (
                          <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">
                            {saveError}
                          </div>
                        ) : null}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-border bg-background p-3">
                            <div className="text-xs font-medium text-muted">ชาวไร่: ชื่อ</div>
                            {dialogMode === "edit" ? (
                              <input
                                value={editFarmerFirst}
                                onChange={(e) => setEditFarmerFirst(e.target.value)}
                                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                              />
                            ) : (
                              <div className="mt-1 text-sm font-semibold text-foreground">{detail.farmer_first_name}</div>
                            )}
                          </div>
                          <div className="rounded-2xl border border-border bg-background p-3">
                            <div className="text-xs font-medium text-muted">ชาวไร่: นามสกุล</div>
                            {dialogMode === "edit" ? (
                              <input
                                value={editFarmerLast}
                                onChange={(e) => setEditFarmerLast(e.target.value)}
                                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                              />
                            ) : (
                              <div className="mt-1 text-sm font-semibold text-foreground">{detail.farmer_last_name}</div>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-background p-3">
                          <div className="text-xs font-medium text-muted">ชาวไร่: มีสถานะเป็น</div>
                          {dialogMode === "edit" ? (
                            <div className="mt-2 space-y-2">
                              {(() => {
                                const v = getFarmerRoleValue(editAnswers);
                                return (
                                  <>
                                    <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
                                      <input
                                        type="radio"
                                        name="admin_farmer_role"
                                        checked={v.role === "owner"}
                                        onChange={() => {
                                          setField("farmer_role", "owner");
                                          setField("farmer_role_other", "");
                                        }}
                                        className="mt-1"
                                      />
                                      <span>เจ้าของไร่</span>
                                    </label>
                                    <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
                                      <input
                                        type="radio"
                                        name="admin_farmer_role"
                                        checked={v.role === "worker"}
                                        onChange={() => {
                                          setField("farmer_role", "worker");
                                          setField("farmer_role_other", "");
                                        }}
                                        className="mt-1"
                                      />
                                      <span>ลูกไร่</span>
                                    </label>
                                    <div className="space-y-2">
                                      <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
                                        <input
                                          type="radio"
                                          name="admin_farmer_role"
                                          checked={v.role === "other"}
                                          onChange={() => {
                                            setField("farmer_role", "other");
                                          }}
                                          className="mt-1"
                                        />
                                        <span>อื่นๆ</span>
                                      </label>
                                      {v.role === "other" ? (
                                        <input
                                          value={v.other}
                                          onChange={(e) => {
                                            setField("farmer_role_other", e.target.value);
                                          }}
                                          className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                                          placeholder="โปรดระบุสถานะอื่น"
                                        />
                                      ) : null}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="mt-1 text-sm font-semibold text-foreground">
                              {getFarmerRoleLabel(detail.answers) || "-"}
                            </div>
                          )}
                        </div>

                        <Heart4Preview
                          answers={dialogMode === "edit" ? editAnswers : (detail.answers as Heart4SurveyStepsProps["answers"]) ?? {}}
                          editable={dialogMode === "edit"}
                          setField={dialogMode === "edit" ? setField : (() => {})}
                          mergeField={dialogMode === "edit" ? mergeField : (() => {})}
                          toggleMulti={dialogMode === "edit" ? toggleMulti : (() => {})}
                        />

                        <details className="rounded-2xl border border-border bg-background p-4">
                          <summary className="cursor-pointer text-xs font-medium text-muted">
                            ข้อมูลดิบ (answers)
                          </summary>
                          <pre className="mt-3 overflow-auto rounded-2xl border border-border bg-card p-3 text-xs text-foreground">
                            {JSON.stringify(dialogMode === "edit" ? editAnswers : (detail.answers ?? null), null, 2)}
                          </pre>
                        </details>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null
        : null}

      {exportOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center"
              role="dialog"
              aria-modal="true"
            >
              <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />
              <div className="relative w-full max-w-lg overflow-hidden rounded-t-3xl border border-border bg-card shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:rounded-3xl">
                <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 grid h-10 w-10 place-items-center rounded-2xl border border-border bg-background text-foreground">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66 4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66 4.24-4.24"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">กำลัง Export</div>
                      <div className="mt-1 text-xs text-muted">
                        {exportApiMode === "sync" && exportStatus === "running"
                          ? `กำลังสร้างไฟล์บนเซิร์ฟเวอร์ — ในโหมดออนไลน์จะไม่ฝังรูปในเซลล์เป็นค่าเริ่มต้น (ยังมีลิงก์รูป) เพื่อไม่ให้ค้าง/หมดเวลา`
                          : exportTotal > 0
                            ? `${exportDone.toLocaleString("th-TH")}/${exportTotal.toLocaleString("th-TH")} รายการ`
                            : "กำลังเตรียมข้อมูล…"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-5">
                  {exportError ? (
                    <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">
                      {exportError}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="h-3 overflow-hidden rounded-full border border-border bg-background">
                        <div
                          className="h-full rounded-full bg-foreground transition-[width] duration-200"
                          style={{
                            width: exportTotal > 0 ? `${exportPercent}%` : "0%",
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted">
                        <div>
                          {exportTotal > 0
                            ? `${exportPercent}%`
                            : exportStatus === "pending"
                              ? "กำลังเริ่ม…"
                              : exportStatus === "idle"
                                ? "กำลังเริ่ม…"
                                : "กำลังทำงาน…"}
                        </div>
                        <div>
                          {exportStatus === "done"
                            ? "เสร็จแล้ว กำลังดาวน์โหลด…"
                            : exportStatus === "running"
                              ? "กำลังสร้างไฟล์…"
                              : exportStatus === "pending"
                                ? "กำลังเตรียม…"
                                : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={exportApiMode !== "job" || !exportJobId || !exportLocked}
                        onClick={() => void cancelExport()}
                        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path
                            d="M7 7l10 10M17 7 7 17"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                        </svg>
                        ยกเลิกการดาวน์โหลด
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

