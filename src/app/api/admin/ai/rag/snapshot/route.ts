import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { canAccessAdminAiRag } from "@/lib/adminAiRagAccess";

export const runtime = "nodejs";

type RequestBody = {
  /** ISO string; defaults to yesterday 23:59:59 in Asia/Bangkok-ish local time. */
  cutoff?: unknown;
};

function defaultCutoffIso(): string {
  // Use server local time; set to "yesterday end of day".
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export async function POST(req: Request) {
  if (!(await canAccessAdminAiRag())) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as RequestBody | null;
  const cutoff = typeof body?.cutoff === "string" && body.cutoff.trim() ? body.cutoff.trim() : defaultCutoffIso();

  const { data, error } = await supabaseAdmin().rpc("heart4rooms_surveys_snapshot_refresh_v1", {
    cutoff,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "SNAPSHOT_REFRESH_FAILED", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, cutoff, inserted: Number(data ?? 0) }, { status: 200 });
}

