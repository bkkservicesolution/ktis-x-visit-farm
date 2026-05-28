import { NextResponse } from "next/server";
import { reindexHeart4RoomsRag } from "@/lib/adminAiRagStore";
import { canAccessAdminAiRag } from "@/lib/adminAiRagAccess";

export const runtime = "nodejs";
export const maxDuration = 300;

type RequestBody = {
  mode?: unknown;
};

export async function POST(req: Request) {
  if (!(await canAccessAdminAiRag())) {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as RequestBody | null;
  const mode = body?.mode === "incremental" || body?.mode === "full" ? body.mode : undefined;

  const result = await reindexHeart4RoomsRag({ mode });
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result, { status: 200 });
}
