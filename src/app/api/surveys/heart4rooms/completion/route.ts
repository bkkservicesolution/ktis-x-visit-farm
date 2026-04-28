import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CompletionRow = {
  id: string;
  username: string;
  promoter_id: string | null;
  full_name: string | null;
  status: "filled" | "missing";
};

type ResponseOk = { ok: true; rows: CompletionRow[]; count: number };
type ResponseErr = { ok: false; error: string; detail?: unknown };

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

function normalizeStatus(v: string): "filled" | "missing" {
  return v === "missing" ? "missing" : "filled";
}

export async function GET(req: Request) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" } satisfies ResponseErr, { status: 403 });

  const url = new URL(req.url);
  const status = normalizeStatus((url.searchParams.get("status") ?? "").trim());
  const q = (url.searchParams.get("q") ?? "").trim();

  const { data: surveyUsers, error: surveyUsersErr } = await supabaseAdmin()
    .from("heart4rooms_surveys")
    .select("created_by_user_id");

  if (surveyUsersErr) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: surveyUsersErr.message } satisfies ResponseErr, { status: 500 });
  }

  const filledSet = new Set(
    (Array.isArray(surveyUsers) ? surveyUsers : [])
      .map((r) => (r as { created_by_user_id?: unknown }).created_by_user_id)
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim()),
  );

  let usersQuery = supabaseAdmin()
    .from("ktisx_users")
    .select("id,username,role,full_name,promoter_id")
    .eq("role", "user")
    .order("promoter_id", { ascending: true })
    .order("username", { ascending: true });

  if (q) {
    usersQuery = usersQuery.or([`username.ilike.%${q}%`, `full_name.ilike.%${q}%`, `promoter_id.ilike.%${q}%`].join(","));
  }

  const { data: users, error: usersErr } = await usersQuery;
  if (usersErr) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: usersErr.message } satisfies ResponseErr, { status: 500 });
  }

  const rows = (Array.isArray(users) ? users : [])
    .map((u) => {
      const id = String((u as { id?: unknown }).id ?? "").trim();
      const username = String((u as { username?: unknown }).username ?? "").trim();
      const promoter_idRaw = (u as { promoter_id?: unknown }).promoter_id;
      const promoter_id =
        promoter_idRaw === null || promoter_idRaw === undefined ? null : String(promoter_idRaw).trim() || null;
      const full_nameRaw = (u as { full_name?: unknown }).full_name;
      const full_name =
        full_nameRaw === null || full_nameRaw === undefined ? null : String(full_nameRaw).trim() || null;

      const isFilled = id ? filledSet.has(id) : false;
      const rowStatus: "filled" | "missing" = isFilled ? "filled" : "missing";

      return { id, username, promoter_id, full_name, status: rowStatus } satisfies CompletionRow;
    })
    .filter((r) => r.id && r.username)
    .filter((r) => r.status === status);

  return NextResponse.json({ ok: true, rows, count: rows.length } satisfies ResponseOk);
}

