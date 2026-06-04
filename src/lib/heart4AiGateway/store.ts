import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { Heart4JsonExportSurvey, Heart4RoomsJsonExportDataset } from "@/lib/heart4roomsJsonExport";
import {
  buildSurveyAggregatesFromAnswerRows,
  type SurveyAggregateDataset,
} from "@/lib/heart4SurveyAggregateBuilder";
import { HEART4_SURVEY_QUESTIONS } from "@/lib/heart4SurveyCatalog";
import { getHeart4AiGatewayConfig } from "@/lib/heart4AiGateway/config";

export type Heart4StoreSurvey = Heart4JsonExportSurvey & {
  attachments?: unknown;
};

export type Heart4DataStore = {
  loadedAt: string;
  surveysJsonPath: string;
  surveyCount: number;
  surveys: Heart4StoreSurvey[];
  aggregates: SurveyAggregateDataset;
  byContract: Map<string, Heart4StoreSurvey[]>;
  listRows: Array<{
    id: string;
    farmer_first_name: string;
    farmer_last_name: string;
    contract_no: string;
    submitter_display_name: string;
    answers: unknown;
  }>;
};

let cached: Heart4DataStore | null = null;

function normalizeAnswers(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function indexByContract(surveys: Heart4StoreSurvey[]): Map<string, Heart4StoreSurvey[]> {
  const map = new Map<string, Heart4StoreSurvey[]>();
  for (const s of surveys) {
    const key = s.contract_no?.trim();
    if (!key) continue;
    const arr = map.get(key) ?? [];
    arr.push(s);
    map.set(key, arr);
  }
  for (const [, arr] of map) {
    arr.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  return map;
}

async function tryLoadAggregatesFromFile(
  filePath: string,
  surveyCount: number,
): Promise<SurveyAggregateDataset | null> {
  try {
    const st = await stat(filePath);
    if (!st.isFile()) return null;
    const raw = await readFile(filePath, "utf8");
    const data = JSON.parse(raw) as SurveyAggregateDataset;
    if (data?.surveyCount && data.questions) return data;
  } catch {
    return null;
  }
  void surveyCount;
  return null;
}

export async function loadHeart4DataStore(force = false): Promise<Heart4DataStore> {
  if (cached && !force) return cached;

  const cfg = getHeart4AiGatewayConfig();
  const raw = await readFile(cfg.surveysJson, "utf8");
  const dataset = JSON.parse(raw) as Heart4RoomsJsonExportDataset;

  if (!dataset?.surveys?.length) {
    throw new Error(`HEART4_SURVEYS_EMPTY: ${cfg.surveysJson}`);
  }

  const surveys = dataset.surveys as Heart4StoreSurvey[];

  let aggregates = await tryLoadAggregatesFromFile(cfg.aggregatesJson, surveys.length);
  if (!aggregates || aggregates.surveyCount !== surveys.length) {
    aggregates = buildSurveyAggregatesFromAnswerRows(
      surveys.map((s) => ({ answers: s.answers, snapshot_cutoff: dataset.exportedAt ?? null })),
      { source: "heart4rooms-surveys-decoded.json", exportXlsx: null },
    );
    await mkdir(path.dirname(cfg.aggregatesJson), { recursive: true });
    await writeFile(cfg.aggregatesJson, JSON.stringify(aggregates, null, 2), "utf8");
  }

  const listRows = surveys.map((s) => ({
    id: s.id,
    farmer_first_name: s.farmer_first_name,
    farmer_last_name: s.farmer_last_name,
    contract_no: s.contract_no,
    submitter_display_name: s.submitter_display_name,
    answers: s.answers,
  }));

  cached = {
    loadedAt: new Date().toISOString(),
    surveysJsonPath: cfg.surveysJson,
    surveyCount: surveys.length,
    surveys,
    aggregates,
    byContract: indexByContract(surveys),
    listRows,
  };

  return cached;
}

export function getHeart4DataStoreSync(): Heart4DataStore | null {
  return cached;
}

export function findSurveyByContract(store: Heart4DataStore, contractRaw: string): Heart4StoreSurvey[] {
  const candidates = new Set<string>();
  const trimmed = contractRaw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed) candidates.add(trimmed);
  if (digits) {
    candidates.add(digits);
    candidates.add(digits.padStart(6, "0"));
    const noLead = digits.replace(/^0+/, "");
    if (noLead) candidates.add(noLead);
  }
  const out: Heart4StoreSurvey[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    for (const row of store.byContract.get(c) ?? []) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
  }
  if (out.length > 0) return out.slice(0, 5);
  if (digits) {
    for (const s of store.surveys) {
      if (s.contract_no.includes(digits) && !seen.has(s.id)) {
        seen.add(s.id);
        out.push(s);
        if (out.length >= 5) break;
      }
    }
  }
  return out;
}

export function surveyToContractRow(s: Heart4StoreSurvey) {
  return {
    id: s.id,
    created_at: s.created_at,
    contract_no: s.contract_no,
    farmer_first_name: s.farmer_first_name,
    farmer_last_name: s.farmer_last_name,
    submitter_display_name: s.submitter_display_name,
    promoter_id: s.promoter_id,
    answers: s.answers,
    attachments: s.attachments ?? {},
  };
}

export function buildCompactCatalogContext(): string {
  const lines = HEART4_SURVEY_QUESTIONS.map(
    (q) => `ข้อ ${q.number} (${q.key}) [${q.sectionLabel}]: ${q.prompt}`,
  );
  return ["โครงสร้างแบบสำรวจ Heart4Rooms (ข้อ 1–38):", ...lines].join("\n");
}

/** Context สำหรับแชทเปิด — คำถามทั่วไปส่งแค่จำนวนรวม ไม่ยัด catalog+สถิติ 38 ข้อทุกครั้ง */
export function buildOpenChatUserContext(input: {
  question: string;
  aggregates: SurveyAggregateDataset;
  aggregatesMaxChars: number;
  ragText: string;
}): string {
  const nf = new Intl.NumberFormat("th-TH");
  const wantsDetail =
    /(?:ข้อ|คำถาม)\s*\d|q\d{1,2}\b|ส่วนใหญ่|เปอร์เซ็น|ตัวเลือก|เปรียบเทียบ|มากที่สุด|นิยม/iu.test(
      input.question,
    );

  const summary = [
    `จำนวนแบบสำรวจในระบบ: ${nf.format(input.aggregates.surveyCount)} ราย`,
    input.aggregates.builtAt ? `สรุปสถิติเมื่อ: ${input.aggregates.builtAt}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const catalog = wantsDetail
    ? buildCompactCatalogContext()
    : "โครงสร้างแบบ Heart4Rooms: 38 ข้อ — ถามพร้อมเลขข้อ (เช่น ข้อ 5) เพื่อดูโจทย์และตัวเลือก";

  const stats = wantsDetail
    ? buildCompactAggregatesContext(input.aggregates, input.aggregatesMaxChars)
    : summary;

  return [catalog, "", stats, "", input.ragText].join("\n\n");
}

export function buildCompactAggregatesContext(aggregates: SurveyAggregateDataset, maxChars = 12000): string {
  const nf = new Intl.NumberFormat("th-TH");
  const header = [
    "สถิติสรุปจากแบบสำรวจทั้งชุด:",
    `จำนวนราย: ${nf.format(aggregates.surveyCount)}`,
    aggregates.builtAt ? `สร้างสรุปเมื่อ: ${aggregates.builtAt}` : null,
  ].filter(Boolean);

  const blocks: string[] = [];
  const keys = Object.keys(aggregates.questions).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });

  for (const key of keys) {
    const q = aggregates.questions[key];
    if (!q) continue;
    const part: string[] = [`[${key}] ${q.title}`];
    for (const b of q.mainChoice.slice(0, 6)) {
      part.push(`  • ${b.label}: ${nf.format(b.count)} (${b.pct}%)`);
    }
    blocks.push(part.join("\n"));
  }

  let body = [...header, "", ...blocks].join("\n\n");
  if (body.length > maxChars) {
    body = `${body.slice(0, maxChars)}\n(ตัดส่วนสถิติ — ถามระบุเลขข้อได้แม่นยำกว่า)`;
  }
  return body;
}
