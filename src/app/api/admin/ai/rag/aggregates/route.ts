import { NextResponse } from "next/server";
import { buildAndSaveSurveyAggregatesFromSnapshot } from "@/lib/heart4SurveyAggregatesStore";
import { canAccessAdminAiRag } from "@/lib/adminAiRagAccess";

export const runtime = "nodejs";

export async function POST() {
  if (!(await canAccessAdminAiRag())) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const result = await buildAndSaveSurveyAggregatesFromSnapshot();
  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === "SNAPSHOT_EMPTY" ? 400 : 500 });
  }

  return NextResponse.json({
    ok: true,
    surveyCount: result.surveyCount,
    snapshotCutoff: result.snapshotCutoff,
    builtAt: result.builtAt,
  });
}
