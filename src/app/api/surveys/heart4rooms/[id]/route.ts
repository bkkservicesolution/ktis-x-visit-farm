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

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const surveyId = String(id ?? "").trim();
  if (!surveyId) return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as
    | null
    | {
        submitter_display_name?: unknown;
        farmer_first_name?: unknown;
        farmer_last_name?: unknown;
        contract_no?: unknown;
        answers?: unknown;
      };

  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  if ("submitter_display_name" in body) patch.submitter_display_name = s(body.submitter_display_name);
  if ("farmer_first_name" in body) patch.farmer_first_name = s(body.farmer_first_name);
  if ("farmer_last_name" in body) patch.farmer_last_name = s(body.farmer_last_name);
  if ("contract_no" in body) patch.contract_no = s(body.contract_no);
  if ("answers" in body) patch.answers = body.answers ?? {};

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("heart4rooms_surveys")
    .update(patch)
    .eq("id", surveyId)
    .select(
      "id,created_at,created_by_user_id,created_by_username,promoter_id,submitter_display_name,submitter_manual,farmer_first_name,farmer_last_name,contract_no,answers,attachments",
    )
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  }
  if (!data) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({ ok: true, row: data });
}

