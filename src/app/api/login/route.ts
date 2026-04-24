import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { KTISX_ROLE_COOKIE, KTISX_USER_ID_COOKIE, type KtisxRole } from "@/lib/authConstants";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as null | {
    username?: unknown;
    password?: unknown;
  };
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("ktisx_users")
    .select("id,role")
    .eq("username", username)
    .eq("password", password)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  }

  const role = (data?.role === "user" || data?.role === "admin" ? data.role : null) as KtisxRole | null;
  const id = data?.id ? String(data.id) : "";
  if (!role || !id) {
    return NextResponse.json({ ok: false, error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, id, role });
  res.cookies.set(KTISX_ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  res.cookies.set(KTISX_USER_ID_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return res;
}

