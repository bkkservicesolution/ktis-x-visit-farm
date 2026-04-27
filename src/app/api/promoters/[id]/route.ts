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
  const oldId = String(id ?? "").trim();
  if (!oldId) return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Missing id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as null | { id?: unknown; full_name?: unknown };
  const nextId = typeof body?.id === "string" ? body.id.trim() : "";
  const full_name = typeof body?.full_name === "string" ? body.full_name.trim() : "";
  if (!nextId) return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Missing id" }, { status: 400 });
  if (!full_name)
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Missing full_name" }, { status: 400 });

  // Same id: simple update
  if (nextId === oldId) {
    const { error } = await supabaseAdmin().from("promoters").update({ full_name }).eq("id", oldId);
    if (error) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Renaming id: refuse if target already exists (avoid silent merges/overwrites)
  const { data: target, error: targetErr } = await supabaseAdmin().from("promoters").select("id").eq("id", nextId).maybeSingle();
  if (targetErr) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: targetErr.message }, { status: 500 });
  if (target?.id) {
    return NextResponse.json(
      {
        ok: false,
        error: "ID_CONFLICT",
        message: `มีรหัสนักส่งเสริม "${nextId}" อยู่แล้ว กรุณาใช้รหัสอื่น หรือลบรายการเดิมก่อน`,
      },
      { status: 409 },
    );
  }

  const { error: insertErr } = await supabaseAdmin().from("promoters").insert({ id: nextId, full_name });
  if (insertErr) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: insertErr.message }, { status: 500 });

  const admin = supabaseAdmin();

  const { error: usersErr } = await admin.from("ktisx_users").update({ promoter_id: nextId }).eq("promoter_id", oldId);
  if (usersErr) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: usersErr.message }, { status: 500 });

  const { error: formsErr } = await admin.from("onsite_visit_forms").update({ promoter_id: nextId }).eq("promoter_id", oldId);
  if (formsErr) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: formsErr.message }, { status: 500 });

  const { error: surveysErr } = await admin.from("heart4rooms_surveys").update({ promoter_id: nextId }).eq("promoter_id", oldId);
  if (surveysErr) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: surveysErr.message }, { status: 500 });

  // Keep denormalized promoter_name aligned with latest promoter full_name for historical rows
  const { error: formsNameErr } = await admin.from("onsite_visit_forms").update({ promoter_name: full_name }).eq("promoter_id", nextId);
  if (formsNameErr) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: formsNameErr.message }, { status: 500 });

  const { error: delErr } = await admin.from("promoters").delete().eq("id", oldId);
  if (delErr) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: delErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const { error } = await supabaseAdmin().from("promoters").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

