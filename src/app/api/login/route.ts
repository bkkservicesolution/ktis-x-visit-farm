import { NextResponse } from "next/server";
import { roleFromAccessCode, KTISX_ROLE_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | { code?: unknown };
  const code = typeof body?.code === "string" ? body.code : "";

  const role = await roleFromAccessCode(code);
  if (!role) {
    return NextResponse.json({ ok: false, error: "INVALID_CODE" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(KTISX_ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return res;
}

