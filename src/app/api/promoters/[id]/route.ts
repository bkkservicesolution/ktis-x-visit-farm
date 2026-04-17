import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE } from "@/lib/authConstants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function isAdmin(): Promise<boolean> {
  return (await cookies()).get(KTISX_ROLE_COOKIE)?.value === "admin";
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as null | { full_name?: unknown };
  const full_name = typeof body?.full_name === "string" ? body.full_name.trim() : "";
  if (!full_name)
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Missing full_name" }, { status: 400 });

  const { error } = await supabaseAdmin().from("promoters").update({ full_name }).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const { error } = await supabaseAdmin().from("promoters").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

