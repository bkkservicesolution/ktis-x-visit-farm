"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Heart4SurveySteps, type Heart4SurveyStepsProps } from "@/app/surveys/heart4rooms/heart4SurveySteps";

type Row = {
  id: string;
  created_at: string;
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
  created_by_username: string | null;
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

function getFarmerRoleLabel(rawAnswers: unknown): string {
  const answers =
    rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers)
      ? (rawAnswers as Record<string, unknown>)
      : {};

  const roleRaw = answers.farmer_role;
  const role = typeof roleRaw === "string" ? roleRaw.trim() : "";

  const otherRaw = answers.farmer_role_other;
  const other = typeof otherRaw === "string" ? otherRaw.trim() : "";

  if (role === "owner") return "เจ้าของไร่";
  if (role === "worker") return "ลูกไร่";
  if (role === "other") return other ? `อื่นๆ: ${other}` : "อื่นๆ";
  return "";
}

function Heart4Preview({ answers }: { answers: Heart4SurveyStepsProps["answers"] }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-xs font-medium text-muted">คำถามและคำตอบ (แสดงตามแบบฟอร์ม)</div>
      <div className="mt-3 max-h-[52vh] overflow-auto pr-1">
        <div className="pointer-events-none select-none space-y-8">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((step) => (
            <div key={step} className="rounded-3xl border border-border bg-card p-4">
              <div className="text-xs font-semibold tracking-wide text-muted">หน้าที่ {step}/9</div>
              <div className="mt-3">
                <Heart4SurveySteps
                  step={step}
                  answers={answers}
                  setField={() => {}}
                  mergeField={() => {}}
                  toggleMulti={() => {}}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Heart4RoomsHistoryClient() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailPending, setDetailPending] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailRow | null>(null);

  const title = useMemo(() => `ทั้งหมด ${count.toLocaleString("th-TH")} รายการ`, [count]);

  async function load() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/surveys/heart4rooms/mine?limit=100&offset=0", { method: "GET" });
      const json = (await res.json().catch(() => null)) as ListResponse | null;
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

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const t = window.setTimeout(() => {
      void loadDetail(selectedId);
    }, 0);
    return () => window.clearTimeout(t);
  }, [selectedId]);

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <button
          type="button"
          disabled={pending}
          onClick={() => void load()}
          className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
        >
          รีเฟรช
        </button>
      </div>

      {error ? <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">{error}</div> : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <div className="divide-y divide-border">
          {pending ? (
            <div className="px-4 py-6 text-sm text-muted">กำลังโหลด…</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted">ยังไม่มีประวัติการตอบ</div>
          ) : (
            rows.map((r) => (
              <div key={r.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="break-words text-sm font-semibold text-foreground">
                      {r.farmer_first_name} {r.farmer_last_name}
                    </div>
                    <div className="mt-1 text-xs text-muted">สัญญา {r.contract_no}</div>
                    <div className="mt-1 text-xs text-muted">ผู้กรอก {r.submitter_display_name || "-"}</div>
                    <div className="mt-1 text-xs text-muted">{formatDate(r.created_at)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
                  >
                    ดูรายละเอียด
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedId && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center"
              role="dialog"
              aria-modal="true"
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) setSelectedId(null);
              }}
            >
              <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />
              <div className="relative w-full max-w-3xl overflow-hidden rounded-t-3xl border border-border bg-card shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:rounded-3xl">
                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">รายละเอียด</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="rounded-2xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-foreground/5"
                  >
                    ปิด
                  </button>
                </div>

                <div className="max-h-[75vh] overflow-auto px-5 py-4">
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
                          <div className="mt-1 text-sm font-semibold text-foreground">{detail.submitter_display_name}</div>
                        </div>
                        <div className="rounded-2xl border border-border bg-background p-3">
                          <div className="text-xs font-medium text-muted">เลขที่สัญญา</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">{detail.contract_no}</div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-border bg-background p-3">
                          <div className="text-xs font-medium text-muted">ชาวไร่: ชื่อ</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">{detail.farmer_first_name}</div>
                        </div>
                        <div className="rounded-2xl border border-border bg-background p-3">
                          <div className="text-xs font-medium text-muted">ชาวไร่: นามสกุล</div>
                          <div className="mt-1 text-sm font-semibold text-foreground">{detail.farmer_last_name}</div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border bg-background p-3">
                        <div className="text-xs font-medium text-muted">ชาวไร่: มีสถานะเป็น</div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                          {getFarmerRoleLabel(detail.answers) || "-"}
                        </div>
                      </div>

                      <Heart4Preview
                        answers={
                          detail.answers && typeof detail.answers === "object" && !Array.isArray(detail.answers)
                            ? (detail.answers as Heart4SurveyStepsProps["answers"])
                            : {}
                        }
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

