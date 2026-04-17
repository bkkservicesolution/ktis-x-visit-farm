import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { KTISX_ROLE_COOKIE } from "@/lib/authConstants";

async function isAdmin(): Promise<boolean> {
  return (await cookies()).get(KTISX_ROLE_COOKIE)?.value === "admin";
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin()))
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | null
    | {
        promoter_name?: unknown;
        farmer_first_name?: unknown;
        farmer_last_name?: unknown;
        contract_no?: unknown;
      };

  const update: Record<string, string> = {};
  if (typeof body?.promoter_name === "string") update.promoter_name = body.promoter_name.trim();
  if (typeof body?.farmer_first_name === "string")
    update.farmer_first_name = body.farmer_first_name.trim();
  if (typeof body?.farmer_last_name === "string")
    update.farmer_last_name = body.farmer_last_name.trim();
  if (typeof body?.contract_no === "string") update.contract_no = body.contract_no.trim();

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from("onsite_visit_forms").update(update).eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin()))
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const { error } = await supabaseAdmin().from("onsite_visit_forms").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

