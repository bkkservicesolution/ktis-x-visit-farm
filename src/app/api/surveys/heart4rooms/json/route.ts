import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { fetchAllHeart4RoomsSurveysForExport } from "@/lib/fetchHeart4RoomsSurveysForExport";
import { buildHeart4RoomsJsonExportDataset } from "@/lib/heart4roomsJsonExport";

export const runtime = "nodejs";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export async function GET(req: Request) {
  const role = await getRole();
  if (role !== "admin") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const promoter_id = (url.searchParams.get("promoter_id") ?? "").trim();
  const from = (url.searchParams.get("from") ?? "").trim();
  const to = (url.searchParams.get("to") ?? "").trim();
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const includeDecoded = url.searchParams.get("include_decoded") !== "0";

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

  const dataset = buildHeart4RoomsJsonExportDataset(rows, { includeDecoded });
  const ts = new Date().toISOString().replaceAll(":", "-");
  const body = JSON.stringify(dataset, null, 2);

  return new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="ktisx_heart4rooms${includeDecoded ? "_decoded" : ""}_${ts}.json"`,
      "cache-control": "no-store",
    },
  });
}
