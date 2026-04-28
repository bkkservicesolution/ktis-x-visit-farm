import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE, KTISX_USER_ID_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Row = {
  id: string;
  created_at: string;
  promoter_id: string | null;
  submitter_display_name: string;
  farmer_first_name: string;
  farmer_last_name: string;
  contract_no: string;
};

type Response =
  | { ok: true; rows: Row[]; count: number }
  | { ok: false; error: string; detail?: unknown };

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export async function GET(req: Request) {
  const role = await getRole();
  if (!role) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" } satisfies Response, { status: 401 });

  const userId = (await cookies()).get(KTISX_USER_ID_COOKIE)?.value?.trim() ?? "";
  if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" } satisfies Response, { status: 401 });

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  const { data, error, count } = await supabaseAdmin()
    .from("heart4rooms_surveys")
    .select("id,created_at,promoter_id,submitter_display_name,farmer_first_name,farmer_last_name,contract_no", {
      count: "exact",
    })
    .eq("created_by_user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message } satisfies Response, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: (data ?? []) as Row[], count: count ?? 0 } satisfies Response);
}

