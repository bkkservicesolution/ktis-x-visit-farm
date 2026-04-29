import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { LabelMap } from "@/lib/heart4roomsExport";
import { buildHeart4RoomsExcelBuffer, type Heart4ExportRow } from "@/lib/heart4roomsExport";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

export async function GET(req: Request) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const map = await loadLabelMap();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const promoter_id = (url.searchParams.get("promoter_id") ?? "").trim();
  const from = (url.searchParams.get("from") ?? "").trim();
  const to = (url.searchParams.get("to") ?? "").trim();
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  let query = supabaseAdmin()
    .from("heart4rooms_surveys")
    .select(
      "id,created_at,created_by_username,promoter_id,submitter_display_name,farmer_first_name,farmer_last_name,contract_no,answers,attachments",
    )
    .order("created_at", { ascending: false });

  if (ids.length > 0) query = query.in("id", ids);
  if (promoter_id) query = query.eq("promoter_id", promoter_id);
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) query = query.lte("created_at", `${to}T23:59:59.999Z`);
  if (q) {
    query = query.or(
      [
        `contract_no.ilike.%${q}%`,
        `farmer_first_name.ilike.%${q}%`,
        `farmer_last_name.ilike.%${q}%`,
        `submitter_display_name.ilike.%${q}%`,
      ].join(","),
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as Heart4ExportRow[];

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
