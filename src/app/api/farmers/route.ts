import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

type FarmerRow = {
  contract_no: string;
  title: string;
  first_name: string;
  last_name: string;
};

function toFarmerRow(r: unknown): FarmerRow {
  const row = r as Record<string, unknown>;
  return {
    contract_no: row["เลขสัญญาชาวไร่"] == null ? "" : String(row["เลขสัญญาชาวไร่"]),
    title: row["คำนำหน้าชื่อ"] == null ? "" : String(row["คำนำหน้าชื่อ"]),
    first_name: row["ชื่อ"] == null ? "" : String(row["ชื่อ"]),
    last_name: row["นามสกุล"] == null ? "" : String(row["นามสกุล"]),
  };
}

function uniq(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const s = String(v ?? "").trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export async function GET(req: Request) {
  const role = await getRole();
  if (!role) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  // For non-ASCII / Thai identifiers, PostgREST filters are most reliable when quoted.
  const COL_CONTRACT = '"เลขสัญญาชาวไร่"';
  const COL_TITLE = '"คำนำหน้าชื่อ"';
  const COL_FIRST = '"ชื่อ"';
  const COL_LAST = '"นามสกุล"';

  const url = new URL(req.url);
  const step = (url.searchParams.get("step") ?? "first").trim(); // first | last | contract
  const q = (url.searchParams.get("q") ?? "").trim();
  const first = (url.searchParams.get("first") ?? "").trim();
  const last = (url.searchParams.get("last") ?? "").trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 50);

  const baseQuery = () =>
    // supabase-js select typings don't accept non-identifier column names (Thai),
    // so we intentionally bypass them and map the result ourselves.
    ((supabaseAdmin().from("farmers") as any).select("*") as any);

  if (step === "first") {
    if (!q || q.length < 1) return NextResponse.json({ ok: true, rows: [] });
    let query = baseQuery().limit(250) as any;
    query = query.ilike(COL_FIRST, `%${q}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });

    const rows = (data ?? []).map((x: unknown) => toFarmerRow(x));
    const options = uniq(rows.map((r: FarmerRow) => r.first_name)).slice(0, limit);
    return NextResponse.json({ ok: true, rows: options.map((v) => ({ value: v })) });
  }

  if (step === "last") {
    if (!first) return NextResponse.json({ ok: true, rows: [] });
    let query = baseQuery().limit(500) as any;
    query = query.eq(COL_FIRST, first);
    if (q) query = query.ilike(COL_LAST, `%${q}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });

    const rows = (data ?? []).map((x: unknown) => toFarmerRow(x));
    const options = uniq(rows.map((r: FarmerRow) => r.last_name)).slice(0, limit);
    return NextResponse.json({ ok: true, rows: options.map((v) => ({ value: v })) });
  }

  if (step === "contract") {
    if (!first || !last) return NextResponse.json({ ok: true, rows: [] });
    let query = baseQuery().limit(200) as any;
    query = query.eq(COL_FIRST, first).eq(COL_LAST, last);
    if (q) query = query.ilike(COL_CONTRACT, `%${q}%`);

    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });

    const rows = (data ?? []).map((x: unknown) => toFarmerRow(x)).filter((r: FarmerRow) => r.contract_no);
    const options = uniq(rows.map((r: FarmerRow) => r.contract_no)).slice(0, limit);
    return NextResponse.json({ ok: true, rows: options.map((v) => ({ value: v })) });
  }

  return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
}

