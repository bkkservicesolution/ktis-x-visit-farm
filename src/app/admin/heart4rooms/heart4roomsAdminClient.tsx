"use client";

import Link from "next/link";
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

function Heart4EditPreview({
  answers,
  setField,
  mergeField,
  toggleMulti,
}: {
  answers: Heart4SurveyStepsProps["answers"];
  setField: Heart4SurveyStepsProps["setField"];
  mergeField: Heart4SurveyStepsProps["mergeField"];
  toggleMulti: Heart4SurveyStepsProps["toggleMulti"];
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-xs font-medium text-muted">คำถามและคำตอบ (แสดงตามแบบฟอร์ม)</div>
      <div className="mt-3 max-h-[52vh] overflow-auto pr-1">
        <div className="space-y-8">
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

/** ไม่ใช้ ref ใน component เพื่อไม่ให้จำนวน hook เปลี่ยนแล้ว Fast Refresh สับสนกับ useEffect เดิม */
let lastHeart4ExportDownloadJobId: string | null = null;

type Heart4ExportApiMode = "sync" | "job";

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      return star[1].trim();
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1]?.trim() ?? null;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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

  const [exportApiMode, setExportApiMode] = useState<Heart4ExportApiMode | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportStarting, setExportStarting] = useState(false);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [exportDone, setExportDone] = useState(0);
  const [exportTotal, setExportTotal] = useState(0);
  const [exportStatus, setExportStatus] = useState<"idle" | "pending" | "running" | "done" | "cancelled" | "error">("idle");
  const [exportStage, setExportStage] = useState<"images" | "rows" | "writing" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportEsRef = useRef<EventSource | null>(null);
  const exportPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exportAbortRef = useRef<AbortController | null>(null);
  const exportStartLockRef = useRef(false);
  const [exportNotice, setExportNotice] = useState<{
    open: boolean;
    text: string;
    tone: "ok" | "error";
    jobId?: string | null;
  }>({
    open: false,
    text: "",
    tone: "ok",
    jobId: null,
  });

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

  const exportPercent = useMemo(() => {
    if (exportTotal <= 0) return 0;
    return Math.max(0, Math.min(100, Math.floor((exportDone / exportTotal) * 100)));
  }, [exportDone, exportTotal]);

  /** ให้เบราว์เซอร์ดาวน์โหลดแบบสตรีม — ไม่โหลดทั้งไฟล์เข้า RAM เป็น Blob (ลดโอกาสพังเมื่อไฟล์ใหญ่/ใช้เวลานาน แม้ Network ขึ้น 200) */
  function triggerExportFileDownload(jobId: string, filename: string | null) {
    const path = `/api/surveys/heart4rooms/export/jobs/${encodeURIComponent(jobId)}/file`;
    const a = document.createElement("a");
    a.href = path;
    if (filename) a.download = filename;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function closeExportStreams() {
    exportEsRef.current?.close();
    exportEsRef.current = null;
    if (exportPollRef.current) {
      clearInterval(exportPollRef.current);
      exportPollRef.current = null;
    }
    exportAbortRef.current?.abort();
    exportAbortRef.current = null;
  }

  async function resolveExportApiMode(): Promise<Heart4ExportApiMode> {
    if (exportApiMode) return exportApiMode;
    try {
      const res = await fetch("/api/surveys/heart4rooms/export/settings", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as { mode?: string } | null;
      const mode: Heart4ExportApiMode = json?.mode === "job" ? "job" : "sync";
      setExportApiMode(mode);
      return mode;
    } catch {
      const mode: Heart4ExportApiMode = "sync";
      setExportApiMode(mode);
      return mode;
    }
  }

  useEffect(() => {
    void resolveExportApiMode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cancelExport() {
    if (exportAbortRef.current) {
      closeExportStreams();
      setExportStatus("cancelled");
      setExportStage(null);
      setExportError(null);
      setExportJobId(null);
      setExportOpen(false);
      setExportNotice({
        open: true,
        tone: "ok",
        text: "ยกเลิกการดาวน์โหลดแล้ว",
        jobId: null,
      });
      return;
    }
    if (!exportJobId) return;
    try {
      await fetch(`/api/surveys/heart4rooms/export/jobs/${encodeURIComponent(exportJobId)}/cancel`, { method: "POST" });
    } finally {
      closeExportStreams();
      setExportStatus("cancelled");
      setExportStage(null);
      setExportError(null);
      setExportJobId(null);
      setExportOpen(false);
      setExportNotice({
        open: true,
        tone: "ok",
        text: exportTotal > 0 ? `ยกเลิกการดาวน์โหลดแล้ว (${exportDone.toLocaleString("th-TH")}/${exportTotal.toLocaleString("th-TH")} รายการ)` : "ยกเลิกการดาวน์โหลดแล้ว",
        jobId: null,
      });
    }
  }

  async function retryExportDownload(jobId: string) {
    try {
      const res = await fetch(`/api/surveys/heart4rooms/export/jobs/${encodeURIComponent(jobId)}/status`, {
        method: "GET",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; status?: string; filename?: string | null }
        | null;
      if (res.ok && data?.ok && data.status === "done") {
        triggerExportFileDownload(jobId, data.filename ?? null);
        setExportNotice({ open: true, tone: "ok", text: "ดาวน์โหลดเสร็จสิ้น", jobId: null });
        return;
      }
      if (data?.status === "cancelled") {
        setExportNotice({ open: true, tone: "error", text: "งาน export ถูกยกเลิกไปแล้ว", jobId: null });
        return;
      }
      if (data?.status === "error") {
        setExportNotice({ open: true, tone: "error", text: "งาน export ล้มเหลว โปรดลอง export ใหม่", jobId: null });
        return;
      }
      setExportNotice({
        open: true,
        tone: "error",
        text: "ไฟล์ยังไม่พร้อม กรุณาลองอีกครั้งใน 5 วินาที",
        jobId,
      });
    } catch {
      setExportNotice({
        open: true,
        tone: "error",
        text: "ลองดาวน์โหลดไม่สำเร็จ — ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง",
        jobId,
      });
    }
  }

  function buildExportQueryParams(ids: string[]): URLSearchParams {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (promoterId.trim()) sp.set("promoter_id", promoterId.trim());
    if (from) sp.set("from", from);
    if (to) sp.set("to", to);
    if (ids.length) sp.set("ids", ids.join(","));
    return sp;
  }

  async function startExportSync(ids: string[]) {
    const ac = new AbortController();
    exportAbortRef.current = ac;
    setExportStatus("running");
    setExportStage("writing");

    try {
      const sp = buildExportQueryParams(ids);
      const res = await fetch(`/api/surveys/heart4rooms/export?${sp.toString()}`, {
        method: "GET",
        cache: "no-store",
        signal: ac.signal,
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setExportError(json?.error === "DB_ERROR" ? "โหลดข้อมูลไม่สำเร็จ" : "Export ไม่สำเร็จ");
        setExportStatus("error");
        return;
      }

      const blob = await res.blob();
      const ts = new Date().toISOString().replaceAll(":", "-");
      const filename =
        filenameFromContentDisposition(res.headers.get("content-disposition")) ??
        `ktisx_heart4rooms_${ts}.xlsx`;
      triggerBlobDownload(blob, filename);
      setExportNotice({ open: true, tone: "ok", text: "ดาวน์โหลดเสร็จสิ้น", jobId: null });
      setExportOpen(false);
      setExportStatus("idle");
      setExportStage(null);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setExportError("Export ไม่สำเร็จ — ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง");
      setExportStatus("error");
    } finally {
      exportAbortRef.current = null;
    }
  }

  async function startExportJob(ids: string[]) {
    try {
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

  async function startExport(kind: "all" | "selected") {
    if (exportLocked) return;
    if (exportStartLockRef.current) return;
    exportStartLockRef.current = true;
    lastHeart4ExportDownloadJobId = null;
    setExportStarting(true);
    setExportError(null);
    setExportOpen(true);
    setExportJobId(null);
    setExportDone(0);
    setExportTotal(0);
    setExportStatus("pending");
    setExportStage(null);

    const ids =
      kind === "selected"
        ? Object.entries(selectedIds)
            .filter(([, v]) => v)
            .map(([id]) => id)
        : [];

    const mode = await resolveExportApiMode();
    if (mode === "sync") {
      setExportStarting(false);
      try {
        await startExportSync(ids);
      } finally {
        exportStartLockRef.current = false;
      }
      return;
    }

    await startExportJob(ids);
  }

  /**
   * จัดการ progress ของ export job:
   * - ใช้ SSE (`/events`) เป็นช่องทางหลัก
   * - ถ้า SSE error → ลอง reconnect แบบ exponential backoff สูงสุด 2 ครั้ง
   * - ถ้ายัง error อีก → ตกลงไปใช้การ poll JSON `/status` ทุก 2 วินาที (ทนต่อ event loop block / multi-instance)
   * - ทั้ง 2 ทางเจอ status=done → trigger ดาวน์โหลดไฟล์
   * deps ยาว 2 ช่องคงที่ ([jobId, pad]) — ไม่ผูก exportTotal เพื่อไม่ให้ปิด/เปิด SSE ทุกครั้งที่ตัวเลขความคืบหน้าเปลี่ยน
   */
  useEffect(() => {
    if (!exportJobId) return;
    const jobId = exportJobId;

    closeExportStreams();

    let cancelled = false;
    let sseAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    type ProgressData = {
      status?: "pending" | "running" | "done" | "cancelled" | "error";
      stage?: "images" | "rows" | "writing" | null;
      done?: number;
      total?: number;
      error?: string | null;
      filename?: string | null;
    };

    const applyProgress = (data: ProgressData) => {
      if (data.status) setExportStatus(data.status);
      if (data.stage === "images" || data.stage === "rows" || data.stage === "writing") {
        setExportStage(data.stage);
      }
      if (typeof data.total === "number") setExportTotal(data.total);
      if (typeof data.done === "number") setExportDone(data.done);
      if (data.status === "error") setExportError(data.error || "Export ล้มเหลว");
      if (data.status === "cancelled") {
        closeExportStreams();
        setExportOpen(false);
      }
      if (data.status === "done") {
        if (lastHeart4ExportDownloadJobId === jobId) return;
        lastHeart4ExportDownloadJobId = jobId;
        closeExportStreams();
        const total = typeof data.total === "number" ? data.total : 0;
        const filename = typeof data.filename === "string" ? data.filename : null;
        try {
          triggerExportFileDownload(jobId, filename);
          setExportNotice({
            open: true,
            tone: "ok",
            text: total > 0 ? `ดาวน์โหลด ${total.toLocaleString("th-TH")} รายการเสร็จสิ้น` : "ดาวน์โหลดเสร็จสิ้น",
            jobId: null,
          });
        } catch {
          setExportNotice({
            open: true,
            tone: "error",
            text: "ดาวน์โหลดไม่สำเร็จ — กดปุ่ม “ลองดาวน์โหลดไฟล์” เพื่อลองอีกครั้ง",
            jobId,
          });
        } finally {
          setExportJobId(null);
          setExportOpen(false);
          setExportStatus("idle");
          setExportStage(null);
        }
      }
    };

    const startPolling = () => {
      if (cancelled || exportPollRef.current) return;
      exportPollRef.current = setInterval(async () => {
        if (cancelled) return;
        try {
          const res = await fetch(
            `/api/surveys/heart4rooms/export/jobs/${encodeURIComponent(jobId)}/status`,
            { method: "GET", cache: "no-store" },
          );
          if (res.status === 404) {
            if (exportPollRef.current) {
              clearInterval(exportPollRef.current);
              exportPollRef.current = null;
            }
            setExportError("ไม่พบงาน export (อาจหมดอายุหรือเซิร์ฟเวอร์รีสตาร์ท)");
            setExportStatus("error");
            return;
          }
          const data = (await res.json().catch(() => null)) as
            | (ProgressData & { ok?: boolean })
            | null;
          if (data && data.ok !== false) applyProgress(data);
        } catch {
          // ปล่อยให้ poll ครั้งถัดไปลองใหม่
        }
      }, 2000);
    };

    const connectSse = () => {
      if (cancelled) return;

      const es = new EventSource(
        `/api/surveys/heart4rooms/export/jobs/${encodeURIComponent(jobId)}/events`,
      );
      exportEsRef.current = es;

      const onProgress = (e: MessageEvent<string>) => {
        try {
          const data = JSON.parse(e.data) as ProgressData;
          /** มี payload เข้ามาแล้ว ถือว่าเชื่อมต่อสำเร็จ — reset attempt + เลิกแจ้ง error ค้าง */
          if (sseAttempt > 0) sseAttempt = 0;
          setExportError(null);
          applyProgress(data);
        } catch {
          // ignore parse errors
        }
      };

      const onError = () => {
        es.close();
        if (exportEsRef.current === es) exportEsRef.current = null;
        if (cancelled) return;

        sseAttempt += 1;
        if (sseAttempt <= 2) {
          const delay = sseAttempt === 1 ? 1000 : 3000;
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connectSse();
          }, delay);
          return;
        }

        /** SSE ล้มเหลวซ้ำ → ไม่ถือเป็น fatal ทันที สลับไป poll status ก่อน */
        startPolling();
      };

      es.addEventListener("progress", onProgress as EventListener);
      es.onerror = onError;
    };

    connectSse();

    return () => {
      cancelled = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      closeExportStreams();
    };
    /* deps คงที่ 2 ช่อง ([jobId, pad]) เพื่อให้ Fast Refresh ระหว่างพัฒนาไม่ throw "deps changed size" */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exportJobId, 0]);

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
      setSelectedId(null);
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
              disabled={pending || exportLocked}
              onClick={() => void startExport("all")}
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-40"
            >
              {exportLocked ? "กำลัง Export…" : "Export ทั้งหมด"}
            </button>

            <button
              type="button"
              disabled={pending || exportLocked || selectedCount === 0}
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
            <div className="flex shrink-0 items-center gap-2">
              {exportNotice.tone === "error" && exportNotice.jobId ? (
                <button
                  type="button"
                  onClick={() => exportNotice.jobId && void retryExportDownload(exportNotice.jobId)}
                  className="rounded-2xl bg-foreground px-3 py-2 text-xs font-semibold text-background transition hover:bg-foreground/90"
                >
                  ลองดาวน์โหลดไฟล์
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setExportNotice({ open: false, text: "", tone: "ok", jobId: null })}
                className="rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-foreground/5"
              >
                ปิด
              </button>
            </div>
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
                  <Link
                    href={`/admin/heart4rooms/${encodeURIComponent(r.id)}`}
                    className="inline-flex min-w-[96px] flex-1 items-center justify-center rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
                  >
                    ดู
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
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
                  <Link
                    href={`/admin/heart4rooms/${encodeURIComponent(r.id)}`}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-foreground/5"
                  >
                    ดู
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
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
                      <div className="text-sm font-semibold text-foreground">แก้ไข</div>
                      <div className="mt-1 truncate text-xs text-muted">{selectedId}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={savePending}
                        onClick={() => void onSave()}
                        className="rounded-2xl bg-foreground px-3 py-2 text-sm font-semibold text-background transition hover:bg-foreground/90 disabled:opacity-40"
                      >
                        {savePending ? "กำลังบันทึก…" : "บันทึก"}
                      </button>
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
                            <input
                              value={editSubmitter}
                              onChange={(e) => setEditSubmitter(e.target.value)}
                              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                            />
                          </div>
                          <div className="rounded-2xl border border-border bg-background p-3">
                            <div className="text-xs font-medium text-muted">เลขที่สัญญา</div>
                            <input
                              value={editContractNo}
                              onChange={(e) => setEditContractNo(e.target.value)}
                              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                            />
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
                            <input
                              value={editFarmerFirst}
                              onChange={(e) => setEditFarmerFirst(e.target.value)}
                              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                            />
                          </div>
                          <div className="rounded-2xl border border-border bg-background p-3">
                            <div className="text-xs font-medium text-muted">ชาวไร่: นามสกุล</div>
                            <input
                              value={editFarmerLast}
                              onChange={(e) => setEditFarmerLast(e.target.value)}
                              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                            />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-background p-3">
                          <div className="text-xs font-medium text-muted">ชาวไร่: มีสถานะเป็น</div>
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
                        </div>

                        <Heart4EditPreview
                          answers={editAnswers}
                          setField={setField}
                          mergeField={mergeField}
                          toggleMulti={toggleMulti}
                        />

                        <details className="rounded-2xl border border-border bg-background p-4">
                          <summary className="cursor-pointer text-xs font-medium text-muted">
                            ข้อมูลดิบ (answers)
                          </summary>
                          <pre className="mt-3 overflow-auto rounded-2xl border border-border bg-card p-3 text-xs text-foreground">
                            {JSON.stringify(editAnswers, null, 2)}
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
                        {exportTotal > 0
                          ? `${exportDone.toLocaleString("th-TH")}/${exportTotal.toLocaleString("th-TH")} รายการ`
                          : "กำลังเตรียมข้อมูล…"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-5">
                  {exportError ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">
                        {exportError}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {exportJobId ? (
                          <button
                            type="button"
                            onClick={() => exportJobId && void retryExportDownload(exportJobId)}
                            className="inline-flex flex-1 items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background transition hover:bg-foreground/90"
                          >
                            ลองดาวน์โหลดไฟล์
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            closeExportStreams();
                            setExportOpen(false);
                            setExportError(null);
                            setExportJobId(null);
                            setExportStatus("idle");
                            setExportStage(null);
                          }}
                          className="inline-flex flex-1 items-center justify-center rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-foreground/5"
                        >
                          ปิด
                        </button>
                      </div>
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
                            : exportStage === "writing"
                              ? "กำลังเขียนไฟล์ Excel…"
                              : exportStage === "rows"
                                ? "กำลังเรียงข้อมูลลงชีต…"
                                : exportStage === "images"
                                  ? "กำลังเตรียมรูปภาพ…"
                                  : exportStatus === "running"
                                    ? "กำลังสร้างไฟล์…"
                                    : exportStatus === "pending"
                                      ? "กำลังเตรียม…"
                                      : ""}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!exportLocked}
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

