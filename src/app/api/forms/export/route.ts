import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

function escapeCsv(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

function fmtJson(v: unknown): string {
  try {
    return JSON.stringify(v ?? null);
  } catch {
    return "";
  }
}

export async function GET(req: Request) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const segmentation = (url.searchParams.get("segmentation") ?? "").trim();
  const promoter_id = (url.searchParams.get("promoter_id") ?? "").trim();
  const from = (url.searchParams.get("from") ?? "").trim();
  const to = (url.searchParams.get("to") ?? "").trim();

  let query = supabaseAdmin()
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
    .order("created_at", { ascending: false });

  if (segmentation && ["A", "B", "C", "D"].includes(segmentation)) query = query.eq("segmentation", segmentation);
  if (promoter_id) query = query.eq("promoter_id", promoter_id);
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) query = query.lte("created_at", `${to}T23:59:59.999Z`);

  if (q) {
    query = query.or(
      [
        `contract_no.ilike.%${q}%`,
        `promoter_name.ilike.%${q}%`,
        `farmer_first_name.ilike.%${q}%`,
        `farmer_last_name.ilike.%${q}%`,
        `land_id.ilike.%${q}%`,
      ].join(","),
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  }

  type ExportRow = {
    id: string;
    created_at: string;
    promoter_id: string | null;
    promoter_name: string;
    farmer_first_name: string;
    farmer_last_name: string;
    contract_no: string;
    land_id: string | null;
    cane_type: string | null;
    ratoon_no: number | null;
    area_rai: number | null;
    planting_window: string | null;
    target_yield_ton_per_rai: number | null;
    farm_images: unknown;
    readiness_checklist: unknown;
    segmentation: string | null;
    obstacles: unknown;
    support_requests: unknown;
    reward_preferences: unknown;
    promoter_notes: string | null;
    next_appointment: string | null;
  };

  const rows = (data ?? []) as unknown as ExportRow[];
  const header = [
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
    "segmentation",
    "next_appointment",
    "farm_images",
    "readiness_checklist",
    "obstacles",
    "support_requests",
    "reward_preferences",
    "promoter_notes",
    "id",
  ];

  const lines: string[] = [];
  lines.push(header.join(","));
  for (const r of rows) {
    lines.push(
      [
        r.created_at,
        r.promoter_id,
        r.promoter_name,
        r.farmer_first_name,
        r.farmer_last_name,
        r.contract_no,
        r.land_id,
        r.cane_type,
        r.ratoon_no,
        r.area_rai,
        r.planting_window,
        r.target_yield_ton_per_rai,
        r.segmentation,
        r.next_appointment,
        fmtJson(r.farm_images),
        fmtJson(r.readiness_checklist),
        fmtJson(r.obstacles),
        fmtJson(r.support_requests),
        fmtJson(r.reward_preferences),
        r.promoter_notes,
        r.id,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }

  const csv = lines.join("\n");
  const ts = new Date().toISOString().replaceAll(":", "-");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=\"ktisx_onsite_visit_forms_${ts}.csv\"`,
      "cache-control": "no-store",
    },
  });
}

