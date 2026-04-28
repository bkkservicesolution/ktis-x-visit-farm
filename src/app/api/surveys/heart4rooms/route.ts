import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE, KTISX_USER_ID_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

const DEFAULT_ATTACHMENT_KEYS: Record<string, null> = {
  q1_pr_image: null,
  q4_weed_image: null,
  q21_split_cane_media: null,
  q23_brochure: null,
  q26_cane_price_pr: null,
};

function mergeAttachments(bodyAttachments: unknown): Record<string, unknown> {
  const base: Record<string, unknown> = { ...DEFAULT_ATTACHMENT_KEYS };
  if (bodyAttachments && typeof bodyAttachments === "object" && !Array.isArray(bodyAttachments)) {
    Object.assign(base, bodyAttachments as Record<string, unknown>);
  }
  return base;
}

export async function POST(req: Request) {
  const role = await getRole();
  if (!role) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const userId = (await cookies()).get(KTISX_USER_ID_COOKIE)?.value?.trim() ?? "";
  if (!userId) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as null | {
    submitter_display_name?: unknown;
    submitter_manual?: unknown;
    promoter_id?: unknown;
    farmer_first_name?: unknown;
    farmer_last_name?: unknown;
    contract_no?: unknown;
    answers?: unknown;
    attachments?: unknown;
  };

  const submitter_display_name =
    typeof body?.submitter_display_name === "string" ? body.submitter_display_name.trim() : "";
  const submitter_manual = Boolean(body?.submitter_manual);
  const promoter_id =
    body?.promoter_id === null || body?.promoter_id === undefined
      ? null
      : typeof body.promoter_id === "string"
        ? body.promoter_id.trim() || null
        : null;
  const farmer_first_name =
    typeof body?.farmer_first_name === "string" ? body.farmer_first_name.trim() : "";
  const farmer_last_name =
    typeof body?.farmer_last_name === "string" ? body.farmer_last_name.trim() : "";
  const contract_no = typeof body?.contract_no === "string" ? body.contract_no.trim() : "";

  if (!submitter_display_name) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "Missing submitter_display_name" }, { status: 400 });
  }
  if (!farmer_first_name || !farmer_last_name || !contract_no) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: "Missing farmer fields" },
      { status: 400 },
    );
  }

  const answersRaw = body?.answers;
  const answers =
    answersRaw && typeof answersRaw === "object" && !Array.isArray(answersRaw)
      ? (answersRaw as Record<string, unknown>)
      : {};

  const attachments = mergeAttachments(body?.attachments);

  const { data: userRow, error: userErr } = await supabaseAdmin()
    .from("ktisx_users")
    .select("username,promoter_id")
    .eq("id", userId)
    .maybeSingle();

  if (userErr) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: userErr.message }, { status: 500 });
  }

  const created_by_username =
    typeof userRow?.username === "string" ? userRow.username : null;
  const userPromoterId =
    userRow?.promoter_id === null || userRow?.promoter_id === undefined
      ? null
      : String(userRow.promoter_id).trim() || null;

  const rowPromoterId = promoter_id ?? userPromoterId;

  const { data, error } = await supabaseAdmin()
    .from("heart4rooms_surveys")
    .insert({
      created_by_user_id: userId,
      created_by_username,
      promoter_id: rowPromoterId,
      submitter_display_name,
      submitter_manual,
      farmer_first_name,
      farmer_last_name,
      contract_no,
      answers,
      attachments,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "DB_ERROR", detail: error?.message ?? "insert failed" },
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
  const promoter_id = (url.searchParams.get("promoter_id") ?? "").trim();
  const from = (url.searchParams.get("from") ?? "").trim();
  const to = (url.searchParams.get("to") ?? "").trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  let query = supabaseAdmin()
    .from("heart4rooms_surveys")
    .select(
      "id,created_by_username,promoter_id,submitter_display_name,farmer_first_name,farmer_last_name,contract_no",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

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

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: "DB_ERROR", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: data ?? [], count: count ?? 0 });
}
