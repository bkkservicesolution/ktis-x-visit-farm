import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readFile } from "node:fs/promises";
import path from "node:path";
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

type LabelMap = {
  questions: Record<string, string>;
  choices: Record<string, Record<string, string>>;
  multi: Record<string, Record<string, string>>;
};

async function loadLabelMap(): Promise<LabelMap> {
  const filePath = path.join(process.cwd(), "src", "lib", "heart4rooms-map.json");
  const raw = await readFile(filePath, "utf8");
  const cleaned = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw; // strip BOM if present
  return JSON.parse(cleaned) as LabelMap;
}

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function getObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function renderQ(qKey: string, answers: Record<string, unknown>, map: LabelMap): string {
  const v = getObj(answers[qKey]);
  const choice = s(v.choice);
  const label = choice && map.choices[qKey]?.[choice] ? map.choices[qKey][choice] : "";

  const extras: string[] = [];
  for (const [k, val] of Object.entries(v)) {
    if (k === "choice") continue;
    const sv = s(val);
    if (sv) extras.push(`${k}: ${sv}`);
  }
  const extraText = extras.length ? ` (${extras.join(" | ")})` : "";
  return (label || "").trim() ? `${label}${extraText}` : extraText ? extraText : "";
}

function renderMulti(key: string, answers: Record<string, unknown>, map: LabelMap): string {
  const arr = Array.isArray(answers[key]) ? (answers[key] as unknown[]) : [];
  const labels = arr
    .map((x) => s(x))
    .filter(Boolean)
    .map((code) => map.multi[key]?.[code] ?? code);
  return labels.join("; ");
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
      "id,created_at,created_by_username,promoter_id,submitter_display_name,farmer_first_name,farmer_last_name,contract_no,answers",
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

  const rows =
    (data ?? []) as unknown as {
      id: string;
      created_at: string;
      created_by_username: string | null;
      promoter_id: string | null;
      submitter_display_name: string;
      farmer_first_name: string;
      farmer_last_name: string;
      contract_no: string;
      answers: unknown;
    }[];

  const headerBase = [
    "created_at",
    "created_by_username",
    "promoter_id",
    "submitter_display_name",
    "farmer_first_name",
    "farmer_last_name",
    "contract_no",
  ];

  const qCols: { key: string; label: string }[] = [];
  for (let i = 1; i <= 38; i++) {
    const key = `q${i}`;
    const label = map.questions[key] ? map.questions[key] : `ข้อ ${i}`;
    qCols.push({ key, label });
  }

  const multiCols = Object.keys(map.multi).sort();

  const header = [...headerBase, ...qCols.map((c) => c.label), ...multiCols].map(escapeCsv).join(",");
  const lines: string[] = [header];

  for (const r of rows) {
    const ans = getObj(r.answers);
    const qVals = qCols.map((c) => renderQ(c.key, ans, map));
    const mVals = multiCols.map((k) => renderMulti(k, ans, map));

    const line = [
      r.created_at,
      r.created_by_username ?? "",
      r.promoter_id ?? "",
      r.submitter_display_name,
      r.farmer_first_name,
      r.farmer_last_name,
      r.contract_no,
      ...qVals,
      ...mVals,
    ]
      .map(escapeCsv)
      .join(",");

    lines.push(line);
  }

  const csv = lines.join("\n");
  const ts = new Date().toISOString().replaceAll(":", "-");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=\"ktisx_heart4rooms_${ts}.csv\"`,
      "cache-control": "no-store",
    },
  });
}

