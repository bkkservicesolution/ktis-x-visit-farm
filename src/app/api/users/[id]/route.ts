import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE, KTISX_USER_ID_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

function normalizeRole(v: unknown): "user" | "admin" | null {
  if (v === "user" || v === "admin") return v;
  return null;
}

async function upsertPromoterFromUser(promoter_id: string | null, full_name: string | null) {
  const id = typeof promoter_id === "string" ? promoter_id.trim() : "";
  const name = typeof full_name === "string" ? full_name.trim() : "";
  if (!id || !name) return;

  const { error } = await supabaseAdmin().from("promoters").upsert({ id, full_name: name }, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const id = String((await params).id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Missing id" }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("ktisx_users")
    .select("id,created_at,username,password,role,full_name,promoter_id")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    row: {
      id: String((data as { id: unknown }).id),
      created_at: String((data as { created_at: unknown }).created_at),
      username: String((data as { username: unknown }).username ?? ""),
      password: String((data as { password: unknown }).password ?? ""),
      role: (String((data as { role: unknown }).role) === "admin" ? "admin" : "user") as "admin" | "user",
      full_name:
        (data as { full_name?: unknown }).full_name === null || (data as { full_name?: unknown }).full_name === undefined
          ? null
          : String((data as { full_name?: unknown }).full_name),
      promoter_id:
        (data as { promoter_id?: unknown }).promoter_id === null || (data as { promoter_id?: unknown }).promoter_id === undefined
          ? null
          : String((data as { promoter_id?: unknown }).promoter_id),
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const id = String((await params).id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Missing id" }, { status: 400 });

  const { data: before, error: beforeErr } = await supabaseAdmin()
    .from("ktisx_users")
    .select("promoter_id,full_name")
    .eq("id", id)
    .maybeSingle();
  if (beforeErr) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: beforeErr.message }, { status: 500 });

  const body = (await req.json().catch(() => null)) as null | {
    username?: unknown;
    password?: unknown;
    role?: unknown;
    full_name?: unknown;
    promoter_id?: unknown;
  };

  const patch: Record<string, unknown> = {};

  if (typeof body?.username === "string") {
    const v = body.username.trim();
    if (!v) return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Invalid username" }, { status: 400 });
    patch.username = v;
  }

  if (typeof body?.full_name === "string") {
    const v = body.full_name.trim();
    if (!v) return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Invalid full_name" }, { status: 400 });
    patch.full_name = v;
  }

  if (body && Object.prototype.hasOwnProperty.call(body, "promoter_id")) {
    if (body.promoter_id === null || body.promoter_id === undefined) patch.promoter_id = null;
    else if (typeof body.promoter_id === "string") patch.promoter_id = body.promoter_id.trim() || null;
    else return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Invalid promoter_id" }, { status: 400 });
  }

  if (body && Object.prototype.hasOwnProperty.call(body, "role")) {
    const r = normalizeRole(body.role);
    if (!r) return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Invalid role" }, { status: 400 });
    patch.role = r;
  }

  // Password: only update when provided AND non-empty
  if (typeof body?.password === "string") {
    if (!body.password) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Invalid password" }, { status: 400 });
    }
    patch.password = body.password;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "No fields to update" }, { status: 400 });
  }

  const nextPromoterId =
    Object.prototype.hasOwnProperty.call(patch, "promoter_id")
      ? (patch.promoter_id === null || patch.promoter_id === undefined ? null : String(patch.promoter_id))
      : before?.promoter_id === null || before?.promoter_id === undefined
        ? null
        : String(before.promoter_id);
  const nextFullName =
    Object.prototype.hasOwnProperty.call(patch, "full_name")
      ? (patch.full_name === null || patch.full_name === undefined ? null : String(patch.full_name))
      : before?.full_name === null || before?.full_name === undefined
        ? null
        : String(before.full_name);

  const { error } = await supabaseAdmin().from("ktisx_users").update(patch).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });

  try {
    await upsertPromoterFromUser(nextPromoterId, nextFullName);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "DB_ERROR", detail: e instanceof Error ? e.message : "promoter upsert failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const id = String((await params).id ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Missing id" }, { status: 400 });

  const meId = (await cookies()).get(KTISX_USER_ID_COOKIE)?.value?.trim() ?? "";
  if (meId && meId === id) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Cannot delete current user" }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from("ktisx_users").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

