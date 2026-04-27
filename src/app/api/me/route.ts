import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE, KTISX_USER_ID_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export async function GET() {
  const role = await getRole();
  if (!role) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const userId = (await cookies()).get(KTISX_USER_ID_COOKIE)?.value?.trim() ?? "";
  if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const { data: userRow, error: userErr } = await supabaseAdmin()
    .from("ktisx_users")
    .select("id,username,promoter_id,full_name")
    .eq("id", userId)
    .maybeSingle();

  if (userErr) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: userErr.message }, { status: 500 });
  }
  if (!userRow) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const username = typeof userRow.username === "string" ? userRow.username : "";
  const promoterId =
    userRow.promoter_id === null || userRow.promoter_id === undefined
      ? null
      : String(userRow.promoter_id).trim() || null;

  const promoterFullName =
    userRow.full_name === null || userRow.full_name === undefined ? null : String(userRow.full_name).trim() || null;

  return NextResponse.json({
    ok: true,
    role,
    userId: String(userRow.id),
    username,
    promoter_id: promoterId,
    promoter_full_name: promoterFullName,
  });
}
