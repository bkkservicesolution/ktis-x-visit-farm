import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getRagChunkCount } from "@/lib/adminAiRagStore";
import { loadSurveyAggregatesDataset } from "@/lib/heart4SurveyAggregatesStore";
import { canAccessAdminAiRag } from "@/lib/adminAiRagAccess";

export const runtime = "nodejs";

export async function GET() {
  if (!(await canAccessAdminAiRag())) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const embeddedChunks = await getRagChunkCount();

    const { count: snapshotCount, error: snapErr } = await supabaseAdmin()
      .from("heart4rooms_surveys_snapshot_v1")
      .select("*", { count: "exact", head: true });

    const { data: snapMeta } = await supabaseAdmin()
      .from("heart4rooms_surveys_snapshot_v1")
      .select("snapshot_cutoff, snapshotted_at")
      .order("snapshotted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: decodedFacts, error: decErr } = await supabaseAdmin()
      .from("heart4rooms_ai_decoded_facts")
      .select("*", { count: "exact", head: true });

    if (snapErr) {
      return NextResponse.json({ ok: false, error: "SNAPSHOT_COUNT_FAILED", detail: snapErr.message }, { status: 500 });
    }
    if (decErr) {
      return NextResponse.json({ ok: false, error: "DECODED_COUNT_FAILED", detail: decErr.message }, { status: 500 });
    }

    const aggregates = await loadSurveyAggregatesDataset();

    return NextResponse.json({
      ok: true,
      embeddedChunks,
      snapshotCount: snapshotCount ?? 0,
      decodedFactsCount: decodedFacts ?? 0,
      snapshotCutoff: snapMeta?.snapshot_cutoff ?? null,
      snapshotAt: snapMeta?.snapshotted_at ?? null,
      aggregatesSurveyCount: aggregates?.surveyCount ?? null,
      aggregatesBuiltAt: aggregates?.builtAt ?? null,
      aggregatesCutoff: aggregates?.snapshotCutoff ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "RAG_STATUS_FAILED",
        detail: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    );
  }
}
