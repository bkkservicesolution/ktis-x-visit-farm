import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { LabelMap } from "@/lib/heart4roomsExport";
import { buildHeart4RoomsExcelBuffer } from "@/lib/heart4roomsExport";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { fetchAllHeart4RoomsSurveysForExport } from "@/lib/fetchHeart4RoomsSurveysForExport";

export const runtime = "nodejs";

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

  const { rows, error } = await fetchAllHeart4RoomsSurveysForExport({
    ids,
    promoter_id,
    from,
    to,
    q,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error }, { status: 500 });
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
