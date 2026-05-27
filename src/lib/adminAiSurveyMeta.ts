/**
 * Deterministic answers for survey structure questions (no RAG / no LLM).
 */
import {
  formatHeart4QuestionSchemaText,
  getHeart4QuestionDef,
  type Heart4QuestionDef,
} from "@/lib/heart4SurveyCatalog";

const QUESTION_NUM_PATTERNS = [
  /(?:ข้อ|คำถาม(?:ที่)?|question\s*#?)\s*(\d{1,2})\b/i,
  /\bq(\d{1,2})\b/i,
];

function parseQuestionNumber(text: string): number | null {
  for (const re of QUESTION_NUM_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 38) return n;
  }
  return null;
}

function isSurveyStructureQuestion(text: string): boolean {
  return (
    /(?:ถาม|คำถาม|โจทย์|หัวข้อ).{0,30}(?:อะไร|ว่าอะไร|เรื่องอะไร|ว่าไร)/u.test(text) ||
    /(?:กี่|มี|ทั้งหมด).*ตัวเลือก/u.test(text) ||
    /(?:มี|ได้).*เลือก.*(?:กี่|เท่าไหร่)/u.test(text) ||
    /(?:list|รายการ).*ตัวเลือก/iu.test(text) ||
    /โครงสร้าง.*(?:ข้อ|คำถาม)/u.test(text)
  );
}

function countOptions(def: Heart4QuestionDef): { main: number; sub: number; total: number } {
  const main = def.options?.length ?? 0;
  const sub = (def.subGroups ?? []).reduce((sum, g) => sum + g.options.length, 0);
  return { main, sub, total: main + sub };
}

function formatOptionCountAnswer(def: Heart4QuestionDef): string {
  const { main, sub } = countOptions(def);
  const lines: string[] = [`ข้อ ${def.number}`];

  if (main > 0) {
    lines.push(`ตัวเลือกหลัก ${main} ข้อ:`);
    for (const o of def.options!) lines.push(`- ${o.label}`);
  } else {
    lines.push("ไม่มีตัวเลือกแบบติ๊ก/วงกลม — เป็นช่องกรอกข้อความหรือหลายช่องย่อย");
  }

  if (sub > 0) {
    lines.push("");
    lines.push(`ตัวเลือกย่อยรวม ${sub} ข้อ:`);
    for (const g of def.subGroups ?? []) {
      lines.push(`${g.label}:`);
      for (const o of g.options) lines.push(`  - ${o.label}`);
    }
  }

  if (def.fields?.length) {
    lines.push("");
    lines.push(`ช่องกรอกเพิ่มเติม: ${def.fields.join(", ")}`);
  }

  return lines.join("\n");
}

/** Returns Thai answer from canonical catalog, or null if not a schema/meta question. */
export function tryAnswerSurveyMetaQuestion(question: string): string | null {
  const trimmed = question.trim();
  if (!trimmed || !isSurveyStructureQuestion(trimmed)) return null;

  const num = parseQuestionNumber(trimmed);
  if (!num) return null;

  const def = getHeart4QuestionDef(num);
  if (!def) return null;

  if (/(?:กี่|มี|ทั้งหมด).*ตัวเลือก/u.test(trimmed) || /(?:มี|ได้).*เลือก.*(?:กี่|เท่าไหร่)/u.test(trimmed)) {
    return formatOptionCountAnswer(def);
  }

  return formatHeart4QuestionSchemaText(def);
}

export function verifySurveyMetaHandler(): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  const q5What = tryAnswerSurveyMetaQuestion("ข้อ 5 ถามว่าอะไร");
  if (!q5What || !q5What.includes("หญ้าไม่รก") || q5What.includes("เตรียมดิน")) {
    errors.push("meta q5 must describe หญ้าไม่รก weed question, not soil prep");
  }

  const q1Count = tryAnswerSurveyMetaQuestion("ข้อ 1 มีกี่ตัวเลือก");
  if (!q1Count || !q1Count.includes("2 ข้อ")) {
    errors.push("meta q1 option count must be 2");
  }

  const q5Count = tryAnswerSurveyMetaQuestion("ข้อ 5 มีกี่ตัวเลือก");
  if (!q5Count || !q5Count.includes("2 ข้อ")) {
    errors.push("meta q5 option count must be 2");
  }

  if (tryAnswerSurveyMetaQuestion("สรุปผลชาวไร่ข้อ 5")) {
    errors.push("farmer-data question must not match meta handler");
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true };
}
