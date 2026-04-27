import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type UserRow = {
  id: string;
  created_at: string;
  username: string;
  role: "user" | "admin";
  full_name: string | null;
  promoter_id: string | null;
};

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

function normalizeRole(v: unknown): "user" | "admin" | null {
  if (v === "user" || v === "admin") return v;
  return null;
}

export async function GET(req: Request) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  let query = supabaseAdmin()
    .from("ktisx_users")
    .select("id,created_at,username,role,full_name,promoter_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.or(
      [
        `username.ilike.%${q}%`,
        `full_name.ilike.%${q}%`,
      ].join(","),
    );
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });

  const rows = (Array.isArray(data) ? data : []).map((r) => ({
    id: String((r as { id: unknown }).id),
    created_at: String((r as { created_at: unknown }).created_at),
    username: String((r as { username: unknown }).username ?? ""),
    role: (String((r as { role: unknown }).role) === "admin" ? "admin" : "user") as "admin" | "user",
    full_name:
      (r as { full_name?: unknown }).full_name === null || (r as { full_name?: unknown }).full_name === undefined
        ? null
        : String((r as { full_name?: unknown }).full_name),
    promoter_id:
      (r as { promoter_id?: unknown }).promoter_id === null || (r as { promoter_id?: unknown }).promoter_id === undefined
        ? null
        : String((r as { promoter_id?: unknown }).promoter_id),
  })) as UserRow[];

  return NextResponse.json({ ok: true, rows, count: count ?? rows.length });
}

export async function POST(req: Request) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as null | {
    username?: unknown;
    password?: unknown;
    role?: unknown;
    full_name?: unknown;
    promoter_id?: unknown;
  };

  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const nextRole = normalizeRole(body?.role);
  const full_name = typeof body?.full_name === "string" ? body.full_name.trim() : "";
  const promoter_id =
    body?.promoter_id === null || body?.promoter_id === undefined
      ? null
      : typeof body.promoter_id === "string"
        ? body.promoter_id.trim() || null
        : null;

  if (!username) return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Missing username" }, { status: 400 });
  if (!password) return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Missing password" }, { status: 400 });
  if (!nextRole) return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Missing/invalid role" }, { status: 400 });
  if (!full_name) return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Missing full_name" }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("ktisx_users")
    .insert({ username, password, role: nextRole, full_name, promoter_id })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error?.message ?? "insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: String((data as { id: unknown }).id) });
}

