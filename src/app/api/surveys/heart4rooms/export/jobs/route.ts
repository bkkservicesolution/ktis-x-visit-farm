import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { LabelMap } from "@/lib/heart4roomsExport";
import { buildHeart4RoomsExcelBufferWithProgress, type Heart4ExportRow } from "@/lib/heart4roomsExport";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createHeart4RoomsExportJob,
  isHeart4RoomsExportJobCancelled,
  markHeart4RoomsExportJobDone,
  markHeart4RoomsExportJobCancelled,
  markHeart4RoomsExportJobError,
  markHeart4RoomsExportJobRunning,
  updateHeart4RoomsExportJobProgress,
} from "@/lib/heart4roomsExportJobs";

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

function parseBodyIds(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function POST(req: Request) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as
    | null
    | {
        q?: unknown;
        promoter_id?: unknown;
        from?: unknown;
        to?: unknown;
        ids?: unknown;
      };

  const q = typeof body?.q === "string" ? body.q.trim() : "";
  const promoter_id = typeof body?.promoter_id === "string" ? body.promoter_id.trim() : "";
  const from = typeof body?.from === "string" ? body.from.trim() : "";
  const to = typeof body?.to === "string" ? body.to.trim() : "";
  const ids = parseBodyIds(body?.ids);

  const job = createHeart4RoomsExportJob();

  void (async () => {
    try {
      if (isHeart4RoomsExportJobCancelled(job.id)) {
        markHeart4RoomsExportJobCancelled(job.id);
        return;
      }
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
        if (ids.length > 0) qb = qb.in("id", ids);
        if (promoter_id) qb = qb.eq("promoter_id", promoter_id);
        if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) qb = qb.gte("created_at", `${from}T00:00:00.000Z`);
        if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) qb = qb.lte("created_at", `${to}T23:59:59.999Z`);
        if (q) {
          qb = qb.or(
            [
              `contract_no.ilike.%${q}%`,
              `farmer_first_name.ilike.%${q}%`,
              `farmer_last_name.ilike.%${q}%`,
              `submitter_display_name.ilike.%${q}%`,
            ].join(","),
          );
        }
        return qb;
      };

      const rows: Heart4ExportRow[] = [];
      for (let offset = 0; offset < HARD_CAP; offset += PAGE_SIZE) {
        if (isHeart4RoomsExportJobCancelled(job.id)) {
          markHeart4RoomsExportJobCancelled(job.id);
          return;
        }
        const { data, error } = await buildQuery().range(offset, offset + PAGE_SIZE - 1);
        if (error) {
          markHeart4RoomsExportJobError(job.id, "DB_ERROR");
          return;
        }
        const chunk = (data ?? []) as Heart4ExportRow[];
        if (chunk.length === 0) break;
        rows.push(...chunk);
        if (chunk.length < PAGE_SIZE) break;
      }
      markHeart4RoomsExportJobRunning(job.id, rows.length);

      const buf = await buildHeart4RoomsExcelBufferWithProgress(rows, map, (p) => {
        if (isHeart4RoomsExportJobCancelled(job.id)) {
          throw new Error("CANCELLED");
        }
        updateHeart4RoomsExportJobProgress(job.id, p.done, p.total);
      });

      const ts = new Date().toISOString().replaceAll(":", "-");
      const filename = `ktisx_heart4rooms_${ts}.xlsx`;
      markHeart4RoomsExportJobDone(job.id, filename, buf);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "EXPORT_ERROR";
      if (msg === "CANCELLED") {
        markHeart4RoomsExportJobCancelled(job.id);
        return;
      }
      markHeart4RoomsExportJobError(job.id, msg);
    }
  })();

  return NextResponse.json({ ok: true, jobId: job.id });
}

