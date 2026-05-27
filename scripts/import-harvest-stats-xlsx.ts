#!/usr/bin/env node
/**
 * Regenerate data/harvest-stats-2568-2569.json from the Excel source.
 * Default path: data/harvest-stats-2568-2569.xlsx
 *
 * Usage:
 *   npx tsx scripts/import-harvest-stats-xlsx.ts
 *   npx tsx scripts/import-harvest-stats-xlsx.ts "C:\path\to\file.xlsx"
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ExcelJS from "exceljs";

type CompanyKey = "KTIS" | "TIS" | "KTIS3";

type HarvestRow = {
  metricKey: string;
  labelTh: string;
  unit: string;
  KTIS: number;
  TIS: number;
  KTIS3: number;
  total: number;
  isPercent?: boolean;
};

const METRIC_KEYS: Record<string, string> = {
  "พื้นที่ทั้งหมด": "total_area",
  "ประมาณอ้อยสะสม": "cane_accumulated",
  "อ้อยสด": "fresh_cane",
  "อ้อยไฟไหม้": "burned_cane",
  "%อ้อยไฟไหม้": "burned_cane_pct",
  CCS: "ccs",
  "จำนวนรถสะสม": "trucks_accumulated",
};

function cellNum(ws: ExcelJS.Worksheet, row: number, col: number): number {
  const cell = ws.getCell(row, col);
  const v = cell.result !== undefined ? cell.result : cell.value;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function cellStr(ws: ExcelJS.Worksheet, row: number, col: number): string {
  const cell = ws.getCell(row, col);
  const v = cell.result !== undefined ? cell.result : cell.value;
  return v == null ? "" : String(v).trim();
}

async function main(): Promise<void> {
  const xlsxPath = resolve(
    process.argv[2] ?? "data/harvest-stats-2568-2569.xlsx",
  );
  const outPath = resolve("data/harvest-stats-2568-2569.json");

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error("no worksheet");

  const rows: HarvestRow[] = [];
  for (let r = 2; r <= 8; r++) {
    const label = cellStr(ws, r, 1);
    const metricKey = METRIC_KEYS[label];
    if (!metricKey) continue;

    const ktis = cellNum(ws, r, 2);
    const tis = cellNum(ws, r, 3);
    const ktis3 = cellNum(ws, r, 4);
    const total = cellNum(ws, r, 5);
    const unit = cellStr(ws, r, 6);

    const row: HarvestRow = {
      metricKey,
      labelTh: label,
      unit,
      KTIS: ktis,
      TIS: tis,
      KTIS3: ktis3,
      total,
    };
    if (metricKey === "burned_cane_pct") {
      row.isPercent = true;
      row.KTIS = ktis * 100;
      row.TIS = tis * 100;
      row.KTIS3 = ktis3 * 100;
      row.total = total * 100;
    }
    rows.push(row);
  }

  const payload = {
    sourceFile: xlsxPath.split(/[/\\]/).pop() ?? "harvest-stats.xlsx",
    seasonLabel: "ปีการเก็บเกี่ยว 2568-2569",
    updatedLabel: "31 มีนาคม 2569",
    importedAt: new Date().toISOString().slice(0, 10),
    companies: [
      { key: "KTIS", code: "K", nameTh: "เกษตรไทยอินเตอร์เนชันแนลชูการ์ (KTIS)" },
      { key: "TIS", code: "T", nameTh: "น้ำตาลไทยเอกลักษณ์ (TIS)" },
      { key: "KTIS3", code: "R", nameTh: "รวมผลอุตสาหกรรมนครสวรรค์ (KTIS3)" },
    ],
    rows,
  };

  writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outPath} (${rows.length} metrics from ${xlsxPath})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
