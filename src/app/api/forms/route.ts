import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: "BAD_REQUEST", message }, { status: 400 });
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
  const i = Math.trunc(n);
  return Number.isFinite(i) ? i : null;
}

export async function POST(req: Request) {
  const role = await getRole();
  if (!role) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | null
    | {
        promoter_id?: unknown;
        promoter_name?: unknown;
        farmer_first_name?: unknown;
        farmer_last_name?: unknown;
        contract_no?: unknown;
        farm_images?: unknown;
        land_id?: unknown;
        cane_type?: unknown; // 'new' | 'ratoon'
        ratoon_no?: unknown;
        area_rai?: unknown;
        planting_window?: unknown; // 'before_31_jan' | 'after_31_jan'
        target_yield_ton_per_rai?: unknown;
        readiness_checklist?: unknown; // { water, weeds, smut, borer, fertilize } booleans
        segmentation?: unknown; // 'A'|'B'|'C'|'D'
        obstacles?: unknown; // string[]
        support_requests?: unknown; // { items: string[], other?: string }
        reward_preferences?: unknown; // string[]
        promoter_notes?: unknown;
        next_appointment?: unknown; // yyyy-mm-dd
      };

  const promoter_id = typeof body?.promoter_id === "string" ? body.promoter_id.trim() : "";
  const promoter_name = typeof body?.promoter_name === "string" ? body.promoter_name.trim() : "";
  const farmer_first_name =
    typeof body?.farmer_first_name === "string" ? body.farmer_first_name.trim() : "";
  const farmer_last_name =
    typeof body?.farmer_last_name === "string" ? body.farmer_last_name.trim() : "";
  const contract_no = typeof body?.contract_no === "string" ? body.contract_no.trim() : "";
  const farm_images = Array.isArray(body?.farm_images)
    ? (body?.farm_images.filter((x) => typeof x === "string") as string[]).slice(0, 5)
    : [];

  const land_id = typeof body?.land_id === "string" ? body.land_id.trim() : "";
  const cane_type =
    body?.cane_type === "new" || body?.cane_type === "ratoon" ? body.cane_type : null;
  const ratoon_no = toIntOrNull(body?.ratoon_no);
  const area_rai = toNumberOrNull(body?.area_rai);
  const planting_window =
    body?.planting_window === "before_31_jan" || body?.planting_window === "after_31_jan"
      ? body.planting_window
      : null;
  const target_yield_ton_per_rai = toNumberOrNull(body?.target_yield_ton_per_rai);

  const segmentation =
    body?.segmentation === "A" ||
    body?.segmentation === "B" ||
    body?.segmentation === "C" ||
    body?.segmentation === "D"
      ? body.segmentation
      : null;

  const obstacles = Array.isArray(body?.obstacles)
    ? (body?.obstacles.filter((x) => typeof x === "string") as string[]).slice(0, 50)
    : [];

  const reward_preferences = Array.isArray(body?.reward_preferences)
    ? (body?.reward_preferences.filter((x) => typeof x === "string") as string[]).slice(0, 50)
    : [];

  const promoter_notes = typeof body?.promoter_notes === "string" ? body.promoter_notes.trim() : "";

  const next_appointment =
    typeof body?.next_appointment === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.next_appointment)
      ? body.next_appointment
      : null;

  const readinessRaw = body?.readiness_checklist;
  const readiness_checklist =
    readinessRaw && typeof readinessRaw === "object" && !Array.isArray(readinessRaw)
      ? {
          water: Boolean((readinessRaw as { water?: unknown }).water),
          weeds: Boolean((readinessRaw as { weeds?: unknown }).weeds),
          smut: Boolean((readinessRaw as { smut?: unknown }).smut),
          borer: Boolean((readinessRaw as { borer?: unknown }).borer),
          fertilize: Boolean((readinessRaw as { fertilize?: unknown }).fertilize),
        }
      : {};

  const supportRaw = body?.support_requests;
  const support_requests =
    supportRaw && typeof supportRaw === "object" && !Array.isArray(supportRaw)
      ? {
          items: Array.isArray((supportRaw as { items?: unknown }).items)
            ? (((supportRaw as { items?: unknown }).items as unknown[]).filter(
                (x) => typeof x === "string",
              ) as string[]).slice(0, 50)
            : [],
          other:
            typeof (supportRaw as { other?: unknown }).other === "string"
              ? String((supportRaw as { other?: unknown }).other).trim()
              : "",
        }
      : { items: [], other: "" };

  if (!promoter_id) return badRequest("Missing promoter_id");
  if (!promoter_name) return badRequest("Missing promoter_name");
  if (!farmer_first_name) return badRequest("Missing farmer_first_name");
  if (!farmer_last_name) return badRequest("Missing farmer_last_name");
  if (!contract_no) return badRequest("Missing contract_no");
  if (farm_images.length > 5) return badRequest("Too many images");
  if (cane_type === "ratoon" && (ratoon_no === null || ratoon_no < 1)) {
    return badRequest("Missing or invalid ratoon_no");
  }

  const { data, error } = await supabaseAdmin()
    .from("onsite_visit_forms")
    .insert({
      promoter_id,
      promoter_name,
      farmer_first_name,
      farmer_last_name,
      contract_no,
      farm_images,
      land_id: land_id || null,
      cane_type,
      ratoon_no: cane_type === "ratoon" ? ratoon_no : null,
      area_rai,
      planting_window,
      target_yield_ton_per_rai,
      readiness_checklist,
      segmentation,
      obstacles,
      support_requests,
      reward_preferences,
      promoter_notes: promoter_notes || null,
      next_appointment,
    })
    .select("id")
    .single();

  if (error || !data) {
    const detail = error?.message ?? null;
    // Common misconfiguration: DB schema not migrated yet to include promoter_id
    if (
      detail &&
      (detail.includes('column "promoter_id"') || detail.includes("'promoter_id'")) &&
      (detail.includes("does not exist") || detail.includes("schema cache"))
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "DB_SCHEMA_MISMATCH",
          message:
            "โครงสร้างตารางยังไม่อัปเดต กรุณารันไฟล์ SQL ในโฟลเดอร์ supabase/ (อย่างน้อย alter_onsite_visit_forms_add_step_fields.sql) แล้วลองใหม่",
          detail,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "DB_ERROR", detail },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: data.id });
}

export async function GET(req: Request) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  let query = supabaseAdmin()
    .from("onsite_visit_forms")
    .select("id,created_at,promoter_name,farmer_first_name,farmer_last_name,contract_no", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.or(
      [
        `contract_no.ilike.%${q}%`,
        `promoter_name.ilike.%${q}%`,
        `farmer_first_name.ilike.%${q}%`,
        `farmer_last_name.ilike.%${q}%`,
      ].join(","),
    );
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: "DB_ERROR", detail: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, rows: data ?? [], count: count ?? 0 });
}

