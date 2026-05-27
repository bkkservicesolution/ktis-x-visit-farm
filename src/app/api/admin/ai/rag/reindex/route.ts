import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { reindexHeart4RoomsRag } from "@/lib/adminAiRagStore";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";

export const runtime = "nodejs";
export const maxDuration = 300;

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export async function POST() {
  const role = await getRole();
  if (role !== "admin") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const result = await reindexHeart4RoomsRag();
  if (!result.ok) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result, { status: 200 });
}
