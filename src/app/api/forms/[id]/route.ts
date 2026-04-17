import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { KTISX_ROLE_COOKIE } from "@/lib/authConstants";

async function isAdmin(): Promise<boolean> {
  return (await cookies()).get(KTISX_ROLE_COOKIE)?.value === "admin";
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toIntOrNull(v: unknown): number | null {
  const n = toNumberOrNull(v);
  if (n === null) return null;
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const { data, error } = await supabaseAdmin()
    .from("onsite_visit_forms")
    .select(
      [
        "id",
        "created_at",
        "promoter_id",
        "promoter_name",
        "farmer_first_name",
        "farmer_last_name",
        "contract_no",
        "land_id",
        "cane_type",
        "ratoon_no",
        "area_rai",
        "planting_window",
        "target_yield_ton_per_rai",
        "farm_images",
        "readiness_checklist",
        "segmentation",
        "obstacles",
        "support_requests",
        "reward_preferences",
        "promoter_notes",
        "next_appointment",
      ].join(","),
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, row: data });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin()))
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | null
    | {
        promoter_id?: unknown;
        promoter_name?: unknown;
        farmer_first_name?: unknown;
        farmer_last_name?: unknown;
        contract_no?: unknown;
        land_id?: unknown;
        cane_type?: unknown;
        ratoon_no?: unknown;
        area_rai?: unknown;
        planting_window?: unknown;
        target_yield_ton_per_rai?: unknown;
        readiness_checklist?: unknown;
        segmentation?: unknown;
        obstacles?: unknown;
        support_requests?: unknown;
        reward_preferences?: unknown;
        promoter_notes?: unknown;
        next_appointment?: unknown;
      };

  const update: Record<string, unknown> = {};
  if (typeof body?.promoter_id === "string") update.promoter_id = body.promoter_id.trim();
  if (typeof body?.promoter_name === "string") update.promoter_name = body.promoter_name.trim();
  if (typeof body?.farmer_first_name === "string")
    update.farmer_first_name = body.farmer_first_name.trim();
  if (typeof body?.farmer_last_name === "string")
    update.farmer_last_name = body.farmer_last_name.trim();
  if (typeof body?.contract_no === "string") update.contract_no = body.contract_no.trim();
  if (typeof body?.land_id === "string") update.land_id = body.land_id.trim() || null;

  if (body?.cane_type === "new" || body?.cane_type === "ratoon" || body?.cane_type === null) {
    update.cane_type = body.cane_type;
  }
  if ("ratoon_no" in (body ?? {})) {
    const n = toIntOrNull(body?.ratoon_no);
    update.ratoon_no = n;
  }
  if ("area_rai" in (body ?? {})) update.area_rai = toNumberOrNull(body?.area_rai);
  if (body?.planting_window === "before_31_jan" || body?.planting_window === "after_31_jan" || body?.planting_window === null) {
    update.planting_window = body.planting_window;
  }
  if ("target_yield_ton_per_rai" in (body ?? {})) {
    update.target_yield_ton_per_rai = toNumberOrNull(body?.target_yield_ton_per_rai);
  }

  if ("readiness_checklist" in (body ?? {})) {
    const raw = body?.readiness_checklist;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      update.readiness_checklist = {
        water: Boolean((raw as { water?: unknown }).water),
        weeds: Boolean((raw as { weeds?: unknown }).weeds),
        smut: Boolean((raw as { smut?: unknown }).smut),
        borer: Boolean((raw as { borer?: unknown }).borer),
        fertilize: Boolean((raw as { fertilize?: unknown }).fertilize),
      };
    } else {
      update.readiness_checklist = {};
    }
  }

  if (body?.segmentation === "A" || body?.segmentation === "B" || body?.segmentation === "C" || body?.segmentation === "D" || body?.segmentation === null) {
    update.segmentation = body.segmentation;
  }

  if ("obstacles" in (body ?? {})) {
    update.obstacles = Array.isArray(body?.obstacles)
      ? (body?.obstacles.filter((x) => typeof x === "string") as string[]).slice(0, 50)
      : [];
  }
  if ("reward_preferences" in (body ?? {})) {
    update.reward_preferences = Array.isArray(body?.reward_preferences)
      ? (body?.reward_preferences.filter((x) => typeof x === "string") as string[]).slice(0, 50)
      : [];
  }
  if ("support_requests" in (body ?? {})) {
    const raw = body?.support_requests;
    update.support_requests =
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? {
            items: Array.isArray((raw as { items?: unknown }).items)
              ? (((raw as { items?: unknown }).items as unknown[]).filter(
                  (x) => typeof x === "string",
                ) as string[]).slice(0, 50)
              : [],
            other: typeof (raw as { other?: unknown }).other === "string" ? String((raw as { other?: unknown }).other).trim() : "",
          }
        : { items: [], other: "" };
  }

  if (typeof body?.promoter_notes === "string") update.promoter_notes = body.promoter_notes.trim() || null;
  if ("next_appointment" in (body ?? {})) {
    update.next_appointment =
      typeof body?.next_appointment === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.next_appointment)
        ? body.next_appointment
        : null;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
  }

  // DB constraint: cane_type=ratoon requires ratoon_no
  if (update.cane_type === "ratoon" && (update.ratoon_no === null || update.ratoon_no === undefined)) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: "Missing ratoon_no for cane_type=ratoon" },
      { status: 400 },
    );
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

