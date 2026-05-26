import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { executeAdminReadonlySql } from "@/lib/adminAiReadonlySqlServer";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";

export const runtime = "nodejs";

type RequestBody = {
  sql?: unknown;
  max_rows?: unknown;
};

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export async function POST(req: Request) {
  const role = await getRole();
  if (role !== "admin") {
    return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as RequestBody | null;
  const sql = typeof body?.sql === "string" ? body.sql : "";
  const result = await executeAdminReadonlySql(sql, body?.max_rows, 100);
  const { status, ...json } = result;

  if (!json.ok) {
    return NextResponse.json(json, { status });
  }

  return NextResponse.json(
    {
      ok: true,
      columns: json.columns,
      rows: json.rows,
      row_count: json.row_count,
      truncated: json.truncated,
      duration_ms: json.duration_ms,
      normalized_sql: json.normalized_sql,
      relations: json.relations,
    },
    { status },
  );
}
