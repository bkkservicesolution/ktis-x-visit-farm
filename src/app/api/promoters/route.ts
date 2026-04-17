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

