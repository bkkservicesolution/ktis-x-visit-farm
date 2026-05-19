"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Heart4SurveySteps,
  type Heart4SurveyStepsProps,
} from "@/app/surveys/heart4rooms/heart4SurveySteps";

type DetailRow = {
  id: string;
  created_at: string;
  created_by_user_id: string;
  created_by_username: string | null;
  promoter_id: string | null;
  submitter_display_name: string;
  submitter_manual: boolean;
  farmer_first_name: string;
  farmer_last_name: string;
  contract_no: string;
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

function ReadOnlyAllSteps({ answers }: { answers: Heart4SurveyStepsProps["answers"] }) {
  const noop = () => {};
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-xs font-medium text-muted">คำถามและคำตอบ (แสดงตามแบบฟอร์ม)</div>
      <div className="mt-3 pointer-events-none select-none space-y-8">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((step) => (
          <div key={step} className="rounded-3xl border border-border bg-card p-4">
            <div className="text-xs font-semibold tracking-wide text-muted">หน้าที่ {step}/9</div>
            <div className="mt-3">
              <Heart4SurveySteps
                step={step}
                answers={answers}
                setField={noop}
                mergeField={noop}
                toggleMulti={noop}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Heart4RoomsViewClient({ id }: { id: string }) {
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setPending(true);
      setError(null);
      try {
        const res = await fetch(`/api/surveys/heart4rooms/${encodeURIComponent(id)}`, {
          method: "GET",
          cache: "no-store",
        });
        const json = (await res.json().catch(() => null)) as DetailResponse | null;
        if (cancelled) return;
        if (!res.ok || !json || json.ok !== true) {
          setError("โหลดรายละเอียดไม่สำเร็จ");
          return;
        }
        setDetail(json.row);
      } finally {
        if (!cancelled) setPending(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (pending) {
    return <div className="text-sm text-muted">กำลังโหลด…</div>;
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">
          {error}
        </div>
        <div>
          <Link
            href="/admin/heart4rooms"
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
          >
            ← กลับไปรายการ
          </Link>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const answers =
    detail.answers && typeof detail.answers === "object" && !Array.isArray(detail.answers)
      ? (detail.answers as Heart4SurveyStepsProps["answers"])
      : ({} as Heart4SurveyStepsProps["answers"]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="text-xs font-medium text-muted">เวลา</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {formatDate(detail.created_at)}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="text-xs font-medium text-muted">ผู้กรอก</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {detail.submitter_display_name || "-"}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="text-xs font-medium text-muted">เลขที่สัญญา</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {detail.contract_no || "-"}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="text-xs font-medium text-muted">ชาวไร่: ชื่อ</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {detail.farmer_first_name || "-"}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-background p-3">
          <div className="text-xs font-medium text-muted">ชาวไร่: นามสกุล</div>
          <div className="mt-1 text-sm font-semibold text-foreground">
            {detail.farmer_last_name || "-"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background p-3">
        <div className="text-xs font-medium text-muted">ชาวไร่: มีสถานะเป็น</div>
        <div className="mt-1 text-sm font-semibold text-foreground">
          {getFarmerRoleLabel(detail.answers) || "-"}
        </div>
      </div>

      <ReadOnlyAllSteps answers={answers} />

      <details className="rounded-2xl border border-border bg-background p-4">
        <summary className="cursor-pointer text-xs font-medium text-muted">
          ข้อมูลดิบ (answers)
        </summary>
        <pre className="mt-3 overflow-auto rounded-2xl border border-border bg-card p-3 text-xs text-foreground">
          {JSON.stringify(detail.answers ?? null, null, 2)}
        </pre>
      </details>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Link
          href="/admin/heart4rooms"
          className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
        >
          ← กลับไปรายการ
        </Link>
      </div>
    </div>
  );
}
