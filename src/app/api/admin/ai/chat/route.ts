import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { askAdminAi } from "@/lib/adminAiChat";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";

export const runtime = "nodejs";

type RequestBody = {
  question?: unknown;
};

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export async function POST(req: Request) {
  const role = await getRole();
  if (role !== "admin") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as RequestBody | null;
  const question = typeof body?.question === "string" ? body.question : "";
  const result = await askAdminAi(question);
  const { status, ...json } = result;
  return NextResponse.json(json, { status });
}
