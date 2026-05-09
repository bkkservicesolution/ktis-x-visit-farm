import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { LabelMap } from "@/lib/heart4roomsExport";
import { buildHeart4RoomsExcelBuffer, type Heart4ExportRow } from "@/lib/heart4roomsExport";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
// Image fetch + sharp encode + ExcelJS writeBuffer for ~1k rows takes well over
// the 10s/15s default. 300s is the Pro-plan ceiling; Hobby caps at 60s.
export const maxDuration = 300;

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

async function loadLabelMap(): Promise<LabelMap> {
  const filePath = path.join(process.cwd(), "src", "lib", "heart4rooms-map.json");
  const raw = await readFile(filePath, "utf8");
  const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  return JSON.parse(cleaned) as LabelMap;
}

type ExportFilters = {
  q: string;
  promoter_id: string;
  from: string;
  to: string;
  ids: string[];
};

function parseIds(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim());
  if (typeof raw === "string") return raw.split(",").map((x) => x.trim()).filter(Boolean);
  return [];
}

function parseGetFilters(req: Request): ExportFilters {
  const url = new URL(req.url);
  return {
    q: (url.searchParams.get("q") ?? "").trim(),
    promoter_id: (url.searchParams.get("promoter_id") ?? "").trim(),
    from: (url.searchParams.get("from") ?? "").trim(),
    to: (url.searchParams.get("to") ?? "").trim(),
    ids: parseIds(url.searchParams.get("ids")),
  };
}

async function parsePostFilters(req: Request): Promise<ExportFilters> {
  const body = (await req.json().catch(() => null)) as Partial<{
    q: unknown;
    promoter_id: unknown;
    from: unknown;
    to: unknown;
    ids: unknown;
  }> | null;
  return {
    q: typeof body?.q === "string" ? body.q.trim() : "",
    promoter_id: typeof body?.promoter_id === "string" ? body.promoter_id.trim() : "",
    from: typeof body?.from === "string" ? body.from.trim() : "",
    to: typeof body?.to === "string" ? body.to.trim() : "",
    ids: parseIds(body?.ids),
  };
}

async function buildExportResponse(filters: ExportFilters, signal: AbortSignal): Promise<Response> {
  const map = await loadLabelMap();

  // Supabase enforces a per-request row cap (db.max_rows, default 1000).
  // Page through with explicit ranges so exports cover the full result set.
  const PAGE_SIZE = 1000;
  const HARD_CAP = 100_000;
  const buildQuery = () => {
    let qb = supabaseAdmin()
      .from("heart4rooms_surveys")
      .select(
        "id,created_at,created_by_username,promoter_id,submitter_display_name,farmer_first_name,farmer_last_name,contract_no,answers,attachments",
      )
      .order("created_at", { ascending: false });
    if (filters.ids.length > 0) qb = qb.in("id", filters.ids);
    if (filters.promoter_id) qb = qb.eq("promoter_id", filters.promoter_id);
    if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
      qb = qb.gte("created_at", `${filters.from}T00:00:00.000Z`);
    }
    if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
      qb = qb.lte("created_at", `${filters.to}T23:59:59.999Z`);
    }
    if (filters.q) {
      qb = qb.or(
        [
          `contract_no.ilike.%${filters.q}%`,
          `farmer_first_name.ilike.%${filters.q}%`,
          `farmer_last_name.ilike.%${filters.q}%`,
          `submitter_display_name.ilike.%${filters.q}%`,
        ].join(","),
      );
    }
    return qb;
  };

  const rows: Heart4ExportRow[] = [];
  for (let offset = 0; offset < HARD_CAP; offset += PAGE_SIZE) {
    if (signal.aborted) {
      return NextResponse.json({ ok: false, error: "ABORTED" }, { status: 499 });
    }
    const { data, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
    }
    const chunk = (data ?? []) as Heart4ExportRow[];
    if (chunk.length === 0) break;
    rows.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
  }

  const buf = await buildHeart4RoomsExcelBuffer(rows, map);
  const ts = new Date().toISOString().replaceAll(":", "-");

  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="ktisx_heart4rooms_${ts}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  return buildExportResponse(parseGetFilters(req), req.signal);
}

// POST variant exists so the admin client can send a large `ids` list (1k+ UUIDs
// would overflow most URL length limits) and so we never sit on a job/SSE flow
// that doesn't survive Vercel's per-instance lambda model.
export async function POST(req: Request) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  const filters = await parsePostFilters(req);
  return buildExportResponse(filters, req.signal);
}
