import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { HEART4_ADMIN_AI_SCHEMA_HELP } from "@/lib/adminAiSqlTool";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";

export const runtime = "nodejs";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export async function GET() {
  const role = await getRole();
  if (role !== "admin") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    ...HEART4_ADMIN_AI_SCHEMA_HELP,
  });
}
