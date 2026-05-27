/**
 * Harvest season stats (area, cane, burned %, CCS, trucks) from data/harvest-stats-2568-2569.json.
 * Source Excel: data/harvest-stats-2568-2569.xlsx — regenerate JSON via scripts/import-harvest-stats-xlsx.ts
 */
import harvestData from "../../data/harvest-stats-2568-2569.json";
import type { DomainKnowledgeChunk } from "@/lib/adminAiDomainKnowledge";

export type HarvestCompanyKey = "KTIS" | "TIS" | "KTIS3";

export type HarvestStatsRow = {
  metricKey: string;
  labelTh: string;
  unit: string;
  KTIS: number;
  TIS: number;
  KTIS3: number;
  total: number;
  isPercent?: boolean;
};

export type HarvestStatsDataset = {
  sourceFile: string;
  seasonLabel: string;
  updatedLabel: string;
  importedAt: string;
  companies: Array<{ key: HarvestCompanyKey; code: string; nameTh: string }>;
  rows: HarvestStatsRow[];
};

export const HARVEST_STATS = harvestData as HarvestStatsDataset;

const nf = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

function formatValue(row: HarvestStatsRow, value: number): string {
  if (row.isPercent) return `${nf.format(value)}%`;
  if (row.unit === "CCS") return nf.format(value);
  return nf.format(value);
}

function rowLine(row: HarvestStatsRow, company?: HarvestCompanyKey): string {
  if (company) {
    return `${row.labelTh} (${company}): ${formatValue(row, row[company])} ${row.unit}`;
  }
  return [
    `${row.labelTh} — รวม: ${formatValue(row, row.total)} ${row.unit}`,
    `  KTIS: ${formatValue(row, row.KTIS)} | TIS: ${formatValue(row, row.TIS)} | KTIS3: ${formatValue(row, row.KTIS3)}`,
  ].join("\n");
}

export function getHarvestStatsRow(metricKey: string): HarvestStatsRow | undefined {
  return HARVEST_STATS.rows.find((r) => r.metricKey === metricKey);
}

export function formatHarvestStatsTableText(): string {
  const lines = [
    `[ข้อมูลการเก็บเกี่ยว — ${HARVEST_STATS.seasonLabel}]`,
    `อ้างอิงไฟล์: ${HARVEST_STATS.sourceFile} (อัปเดต ${HARVEST_STATS.updatedLabel})`,
    "",
  ];
  for (const row of HARVEST_STATS.rows) {
    lines.push(rowLine(row));
  }
  return lines.join("\n");
}

export function buildHarvestStatsKnowledgeChunks(): DomainKnowledgeChunk[] {
  const full = formatHarvestStatsTableText();
  const chunks: DomainKnowledgeChunk[] = [
    {
      question_key: "harvest_stats_overview",
      title: `สรุปการเก็บเกี่ยว ${HARVEST_STATS.seasonLabel}`,
      content: full,
    },
  ];

  const groups: Array<{ key: string; title: string; metricKeys: string[] }> = [
    {
      key: "harvest_stats_area",
      title: "พื้นที่เก็บเกี่ยว",
      metricKeys: ["total_area"],
    },
    {
      key: "harvest_stats_cane",
      title: "อ้อยสะสม อ้อยสด อ้อยไฟไหม้",
      metricKeys: ["cane_accumulated", "fresh_cane", "burned_cane", "burned_cane_pct"],
    },
    {
      key: "harvest_stats_ccs_trucks",
      title: "CCS และจำนวนรถ",
      metricKeys: ["ccs", "trucks_accumulated"],
    },
  ];

  for (const g of groups) {
    const rows = g.metricKeys.map((k) => getHarvestStatsRow(k)).filter(Boolean) as HarvestStatsRow[];
    chunks.push({
      question_key: g.key,
      title: g.title,
      content: [
        `[ข้อมูลการเก็บเกี่ยว — ${g.title}]`,
        `อัปเดต ${HARVEST_STATS.updatedLabel}`,
        "",
        ...rows.map((r) => rowLine(r)),
      ].join("\n"),
    });
  }

  return chunks;
}

function parseCompanyFromQuestion(q: string): HarvestCompanyKey | null {
  if (/\bKTIS3\b/i.test(q) || /นครสวรรค์/u.test(q)) return "KTIS3";
  if (/\bTIS\b/i.test(q) || /เอกลักษณ์/u.test(q)) return "TIS";
  if (/\bKTIS\b/i.test(q)) return "KTIS";
  return null;
}

function pickMetricFromQuestion(q: string): HarvestStatsRow | undefined {
  if (/พื้นที่|ไร่|เก็บเกี่ยว.*(ไร่|พื้นที่)/u.test(q)) return getHarvestStatsRow("total_area");
  if (/%.*ไฟไหม้|ไฟไหม้.*%|เปอร์เซ็นต์.*ไฟไหม้/u.test(q)) return getHarvestStatsRow("burned_cane_pct");
  if (/อ้อยไฟไหม้|ไฟไหม้/u.test(q)) return getHarvestStatsRow("burned_cane");
  if (/อ้อยสด/u.test(q)) return getHarvestStatsRow("fresh_cane");
  if (/อ้อยสะสม|ประมาณอ้อย/u.test(q)) return getHarvestStatsRow("cane_accumulated");
  if (/CCS/i.test(q)) return getHarvestStatsRow("ccs");
  if (/จำนวนรถ|รถสะสม/u.test(q)) return getHarvestStatsRow("trucks_accumulated");
  return undefined;
}

function isHarvestDataQuestion(q: string): boolean {
  return (
    /2568|2569/u.test(q) ||
    /เก็บเกี่ยว|อ้อยไฟไหม้|อ้อยสด|อ้อยสะสม|CCS|จำนวนรถ|พื้นที่ทั้งหมด|ไร่.*(KTIS|TIS)/iu.test(q)
  );
}

/** Deterministic answer from committed harvest JSON (no Supabase). */
export function tryAnswerHarvestStatsQuestion(question: string): string | null {
  const q = question.trim();
  if (!q || !isHarvestDataQuestion(q)) return null;

  const company = parseCompanyFromQuestion(q);
  const metric = pickMetricFromQuestion(q);

  if (metric) {
    const head = [
      `[${HARVEST_STATS.seasonLabel} — อัปเดต ${HARVEST_STATS.updatedLabel}]`,
      `แหล่งข้อมูล: ${HARVEST_STATS.sourceFile}`,
      "",
    ];
    if (company) {
      return [...head, rowLine(metric, company)].join("\n");
    }
    return [...head, rowLine(metric)].join("\n");
  }

  if (/สรุป|ทั้งหมด|ภาพรวม|ตาราง/u.test(q) || isHarvestDataQuestion(q)) {
    return formatHarvestStatsTableText();
  }

  return null;
}

export function verifyHarvestStatsDataset(): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const area = getHarvestStatsRow("total_area");
  if (!area || area.total !== 923467) errors.push("total_area total should be 923467");
  const burned = getHarvestStatsRow("burned_cane");
  if (!burned || burned.total !== 425031) errors.push("burned_cane total should be 425031");
  const fresh = getHarvestStatsRow("fresh_cane");
  if (!fresh || fresh.total !== 6987068) errors.push("fresh_cane total should be 6987068");
  if (errors.length) return { ok: false, errors };
  return { ok: true };
}
