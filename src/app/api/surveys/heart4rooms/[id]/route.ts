import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const surveyId = String(id ?? "").trim();
  if (!surveyId) return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("heart4rooms_surveys")
    .select(
      "id,created_at,created_by_user_id,created_by_username,promoter_id,submitter_display_name,submitter_manual,farmer_first_name,farmer_last_name,contract_no,answers,attachments",
    )
    .eq("id", surveyId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({ ok: true, row: data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const surveyId = String(id ?? "").trim();
  if (!surveyId) return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });

  const { error } = await supabaseAdmin().from("heart4rooms_surveys").delete().eq("id", surveyId);
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

