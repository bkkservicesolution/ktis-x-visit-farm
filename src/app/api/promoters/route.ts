import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type PromoterRow = { id: string; full_name: string };

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export async function GET() {
  const role = await getRole();
  if (!role) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const { data, error } = await supabaseAdmin()
    .from("promoters")
    .select("id,full_name")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { ok: false, error: "DB_ERROR", detail: error.message },
      { status: 500 },
    );
  }

  const rows = ((data ?? []) as PromoterRow[]).map((r) => ({
    id: String(r.id),
    full_name: String(r.full_name),
  }));

  return NextResponse.json({ ok: true, rows });
}

export async function POST(req: Request) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as null | { id?: unknown; full_name?: unknown };
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const full_name = typeof body?.full_name === "string" ? body.full_name.trim() : "";
  if (!id) return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Missing id" }, { status: 400 });
  if (!full_name)
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Missing full_name" }, { status: 400 });

  const { error } = await supabaseAdmin().from("promoters").upsert({ id, full_name }, { onConflict: "id" });
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

