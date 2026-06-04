import type { Heart4ExportRow } from "@/lib/heart4roomsExport";
import {
  decodeHeart4SurveyForAdminAi,
  type DecodedFactLine,
  type Heart4SurveyRowForDecode,
} from "@/lib/heart4roomsSurveyDecoder";

export const HEART4_JSON_EXPORT_SCHEMA_VERSION = 1 as const;

export type Heart4JsonExportSurvey = {
  id: string;
  created_at: string;
  created_by_username: string | null;
  promoter_id: string | null;
  submitter_display_name: string;
  farmer_first_name: string;
  farmer_last_name: string;
  contract_no: string;
  answers: Record<string, unknown>;
  /** บรรทัดภาษาไทยถอดจาก answers — ให้ LLM อ่านโดยไม่ต้องเดารหัส a/b/c */
  decoded_facts?: DecodedFactLine[];
  /** รวม decoded_facts เป็นข้อความเดียว (สะดวกส่งเข้า prompt) */
  decoded_text?: string;
};

export type Heart4RoomsJsonExportDataset = {
  schemaVersion: typeof HEART4_JSON_EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  source: "heart4rooms_surveys";
  includeDecoded: boolean;
  surveyCount: number;
  surveys: Heart4JsonExportSurvey[];
  note?: string;
};

function normalizeAnswers(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function rowToDecodeInput(row: Heart4ExportRow): Heart4SurveyRowForDecode {
  return {
    id: row.id,
    created_at: row.created_at,
    farmer_first_name: row.farmer_first_name,
    farmer_last_name: row.farmer_last_name,
    contract_no: row.contract_no,
    submitter_display_name: row.submitter_display_name,
    answers: normalizeAnswers(row.answers),
  };
}

function factsToDecodedText(facts: DecodedFactLine[]): string {
  return facts.map((f) => f.human_text).join("\n\n");
}

export function buildHeart4RoomsJsonExportDataset(
  rows: Heart4ExportRow[],
  options?: { includeDecoded?: boolean },
): Heart4RoomsJsonExportDataset {
  const includeDecoded = options?.includeDecoded !== false;

  const surveys: Heart4JsonExportSurvey[] = rows.map((row) => {
    const answers = normalizeAnswers(row.answers);
    const base: Heart4JsonExportSurvey = {
      id: row.id,
      created_at: row.created_at,
      created_by_username: row.created_by_username,
      promoter_id: row.promoter_id,
      submitter_display_name: row.submitter_display_name,
      farmer_first_name: row.farmer_first_name,
      farmer_last_name: row.farmer_last_name,
      contract_no: row.contract_no,
      answers,
    };

    if (!includeDecoded) return base;

    const decoded_facts = decodeHeart4SurveyForAdminAi(rowToDecodeInput(row));
    return {
      ...base,
      decoded_facts,
      decoded_text: factsToDecodedText(decoded_facts),
    };
  });

  return {
    schemaVersion: HEART4_JSON_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    source: "heart4rooms_surveys",
    includeDecoded,
    surveyCount: surveys.length,
    surveys,
    note: includeDecoded
      ? "decoded_facts/decoded_text ถอดจาก heart4SurveyCatalog — ใช้กับ AI แนะนำมากกว่า answers ดิบ"
      : "export แบบ answers ดิบเท่านั้น — ต้องมี catalog/decoder ฝั่ง AI เอง",
  };
}
