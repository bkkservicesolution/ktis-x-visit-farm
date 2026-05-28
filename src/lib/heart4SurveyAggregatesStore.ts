import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildSurveyAggregatesFromAnswerRows,
  type SurveyAggregateDataset,
} from "@/lib/heart4SurveyAggregateBuilder";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const SURVEY_AGGREGATES_FILENAME = "heart4rooms-survey-aggregates.json";

function aggregatesPath(): string {
  return join(process.cwd(), "data", SURVEY_AGGREGATES_FILENAME);
}

type AggregatesCache = {
  mtimeMs: number;
  data: SurveyAggregateDataset;
};

const g = globalThis as typeof globalThis & {
  __ktisx_survey_aggregates_cache__?: AggregatesCache | null;
};

export function clearSurveyAggregatesCache(): void {
  g.__ktisx_survey_aggregates_cache__ = null;
}

export async function loadSurveyAggregatesDataset(): Promise<SurveyAggregateDataset | null> {
  const path = aggregatesPath();
  try {
    const fileStat = await stat(path);
    const cached = g.__ktisx_survey_aggregates_cache__;
    if (cached && cached.mtimeMs === fileStat.mtimeMs) {
      return cached.data;
    }
    const raw = await readFile(path, "utf8");
    const data = JSON.parse(raw) as SurveyAggregateDataset;
    g.__ktisx_survey_aggregates_cache__ = { mtimeMs: fileStat.mtimeMs, data };
    return data;
  } catch {
    return null;
  }
}

async function fetchAllSnapshotRowsForAggregates(): Promise<
  Array<{ answers: unknown; snapshot_cutoff: string | null }>
> {
  const pageSize = 500;
  const out: Array<{ answers: unknown; snapshot_cutoff: string | null }> = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabaseAdmin()
      .from("heart4rooms_surveys_snapshot_v1")
      .select("answers, snapshot_cutoff")
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);
    const page = data ?? [];
    out.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return out;
}

export type BuildSurveyAggregatesResult =
  | {
      ok: true;
      surveyCount: number;
      snapshotCutoff: string | null;
      builtAt: string;
      path: string;
    }
  | { ok: false; error: string; detail?: string };

export async function buildAndSaveSurveyAggregatesFromSnapshot(): Promise<BuildSurveyAggregatesResult> {
  try {
    const rows = await fetchAllSnapshotRowsForAggregates();
    if (rows.length === 0) {
      return {
        ok: false,
        error: "SNAPSHOT_EMPTY",
        detail: "ยังไม่มีข้อมูลใน snapshot — สร้าง Snapshot ก่อน",
      };
    }

    const dataset = buildSurveyAggregatesFromAnswerRows(rows, {
      source: "heart4rooms_surveys_snapshot_v1",
      exportXlsx: null,
    });

    const path = aggregatesPath();
    await writeFile(path, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
    clearSurveyAggregatesCache();

    return {
      ok: true,
      surveyCount: dataset.surveyCount,
      snapshotCutoff: dataset.snapshotCutoff,
      builtAt: dataset.builtAt,
      path,
    };
  } catch (error) {
    return {
      ok: false,
      error: "AGGREGATES_BUILD_FAILED",
      detail: error instanceof Error ? error.message : "unknown error",
    };
  }
}
