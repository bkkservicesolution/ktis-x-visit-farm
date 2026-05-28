/**
 * Full-survey statistics from data/heart4rooms-survey-aggregates.json
 * (built from snapshot — อัปเดตผ่านหน้า /admin/ai/rag).
 */
import {
  formatQuestionAggregateSummary,
  type QuestionAggregate,
  type SurveyAggregateDataset,
} from "@/lib/heart4SurveyAggregateBuilder";
import { loadSurveyAggregatesDataset } from "@/lib/heart4SurveyAggregatesStore";

const nf = new Intl.NumberFormat("th-TH");

const QUESTION_NUM_PATTERNS = [
  /(?:ข้อ|คำถาม(?:ที่)?|question\s*#?)\s*(\d{1,2})\b/i,
  /\bq(\d{1,2})\b/i,
];

const TOPIC_QUESTIONS: Array<{ keywords: RegExp; keys: string[] }> = [
  { keywords: /ศัตรูพืช|แมลงศัตรู|โรคอ้อย|ระบาด/u, keys: ["q4", "q6", "q7", "q8"] },
  {
    keywords: /ความช่วยเหลือ|นักส่งเสริม|ทีมวิชาการ/u,
    keys: ["q5", "q7", "q9"],
  },
  { keywords: /วัชพืช|หญ้าไม่รก|จัดการ.*หญ้า/u, keys: ["q3", "q4", "q5"] },
  { keywords: /แส้ดำ/u, keys: ["q6", "q7"] },
  { keywords: /หนอนกอ/u, keys: ["q8", "q9"] },
  { keywords: /ความชื้น|ใบ.*30|ใบ.*100/u, keys: ["q10", "q11"] },
  { keywords: /น้ำ|ให้น้ำ|แหล่งน้ำ/u, keys: ["q12", "q13", "q14", "q15"] },
  { keywords: /ปุ๋ย|อินทรีย์/u, keys: ["q16", "q17", "q18", "q19", "q24", "q25"] },
  { keywords: /ความพึงพอใจ|คะแนน.*โรงงาน/u, keys: ["q29", "q30", "q31", "q32", "q33"] },
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

function isAggregateStatsQuestion(text: string): boolean {
  return (
    /(?:กี่|จำนวน|ทั้งหมด|รวม|มี).*?(?:คน|ราย|แบบ|ชาวไร่|แปลง)/u.test(text) ||
    /(?:ส่วนใหญ่|มากที่สุด|นิยม|บ่อย|เยอะ|เปอร์เซ็น|สัดส่วน|เปรียบเทียบ)/u.test(text) ||
    /(?:เลือก|ตอบ).*?(?:อะไร|แบบไหน|บ่อย)/u.test(text) ||
    /สรุป.*(?:คำตอบ|ผล|ตัวเลือก)/u.test(text) ||
    (/วัชพืช/u.test(text) && /(?:กี่|จำนวน|มี|พบ|แปลง)/u.test(text)) ||
    (/(?:ศัตรูพืช|แมลง|โรค|ระบาด)/u.test(text) && /(?:กี่|จำนวน|มี|พบ|แปลง|สรุป)/u.test(text)) ||
    (/ความช่วยเหลือ/u.test(text) &&
      /(?:กี่|จำนวน|มี|พบ)/u.test(text) &&
      !/(?:ใดบ้าง|ไหนบ้าง|รายชื่อ)/u.test(text))
  );
}

function findChoiceCount(q: QuestionAggregate | undefined, pattern: RegExp): number | null {
  if (!q) return null;
  const hit = q.mainChoice.find((b) => pattern.test(b.label));
  return hit?.count ?? null;
}

/** สรุป “พบปัญหา” ตามข้อที่เกี่ยวกับศัตรู/โรค/วัชพืช (แต่ละข้อนับแยก — 1 แปลงอาจซ้อนหลายข้อ) */
function formatPestInPlotAnswer(ds: SurveyAggregateDataset): string {
  const q4 = ds.questions.q4;
  const q6 = ds.questions.q6;
  const q7 = ds.questions.q7;
  const q8 = ds.questions.q8;

  const weedSerious = findChoiceCount(q4, /^a\.\s*พบในแปลง/);
  const smutFail = findChoiceCount(q6, /^b\.\s*ไม่สามารถจัดการได้/);
  const otherDisease = findChoiceCount(q7, /^a\.\s*มี/);
  const borerFail = findChoiceCount(q8, /^b\.\s*ไม่สามารถจัดการได้/);

  const lines = [
    `จากแบบสำรวจ ${nf.format(ds.surveyCount)} ราย (1 แบบ ≈ 1 แปลง) — แยกตามข้อในแบบ:`,
    "",
    weedSerious != null
      ? `• ข้อ 4 พบวัชพืชร้ายแรงในแปลง: ${nf.format(weedSerious)} แปลง`
      : null,
    smutFail != null ? `• ข้อ 6 จัดการแส้ดำไม่ได้: ${nf.format(smutFail)} แปลง` : null,
    otherDisease != null
      ? `• ข้อ 7 มีโรคอ้อยอื่นที่ต้องการความช่วยเหลือ: ${nf.format(otherDisease)} แปลง`
      : null,
    borerFail != null ? `• ข้อ 8 จัดการหนอนกอไม่ได้: ${nf.format(borerFail)} แปลง` : null,
    "",
    "หมายเหตุ: ตัวเลขแต่ละข้อนับแยกกัน แปลงเดียวอาจถูกนับมากกว่าหนึ่งข้อหากมีหลายปัญหา",
  ].filter((x): x is string => Boolean(x));

  return lines.join("\n");
}

function isPestInPlotCountQuestion(text: string): boolean {
  return (
    /(?:ศัตรูพืช|แมลง|โรค|ระบาด|แส้ดำ|หนอน)/u.test(text) &&
    /(?:กี่|จำนวน|มี).*แปลง|แปลง.*(?:กี่|พบ)|พบ.*(?:ศัตรู|โรค|แมลง|วัชพืช)/u.test(text)
  );
}

/** ข้อ 4 — พบวัชพืชร้ายแรงในแปลง (1 แบบสำรวจ ≈ 1 แปลง) */
function formatWeedInPlotAnswer(ds: SurveyAggregateDataset): string | null {
  const q4 = ds.questions.q4;
  if (!q4) return null;

  const found = q4.mainChoice.find((b) => /พบในแปลง/.test(b.label) && !/ไม่พบ/.test(b.label));
  const notFound = q4.mainChoice.find((b) => /ไม่พบในแปลง/.test(b.label));
  const otherPlot = q4.mainChoice.find((b) => /แปลงคนอื่น/.test(b.label));

  const lines = [
    `จากแบบสำรวจ ${nf.format(ds.surveyCount)} ราย (ข้อ 4: พบวัชพืชร้ายแรงในแปลงหรือไม่)`,
    "",
    found
      ? `พบวัชพืชร้ายแรงในแปลง: ${nf.format(found.count)} แปลง (${found.pct}%)`
      : null,
    notFound
      ? `ไม่พบวัชพืชร้ายแรงในแปลง: ${nf.format(notFound.count)} แปลง (${notFound.pct}%)`
      : null,
    otherPlot
      ? `เคยพบในของแปลงคนอื่น (ระบุเพิ่ม): ${nf.format(otherPlot.count)} แปลง (${otherPlot.pct}%)`
      : null,
  ].filter((x): x is string => Boolean(x));

  return lines.join("\n");
}

function isWeedInPlotCountQuestion(text: string): boolean {
  return (
    /วัชพืช/u.test(text) &&
    /(?:กี่|จำนวน|มี).*แปลง|แปลง.*(?:กี่|พบ)|พบ.*วัชพืช.*แปลง/u.test(text)
  );
}

function resolveQuestionKeys(text: string): string[] {
  const num = parseQuestionNumber(text);
  if (num) return [`q${num}`];

  for (const topic of TOPIC_QUESTIONS) {
    if (topic.keywords.test(text)) return topic.keys;
  }

  return [];
}

function getQuestionAgg(ds: SurveyAggregateDataset, key: string): QuestionAggregate | null {
  return ds.questions[key] ?? null;
}

function verifySurveyAggregatesDataset(
  ds: SurveyAggregateDataset | null,
): { ok: true; data: SurveyAggregateDataset } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!ds?.surveyCount || ds.surveyCount < 1) {
    errors.push("ยังไม่มีไฟล์สรุปสถิติ — กดปุ่มอัปเดตสถิติ AI ที่หน้า /admin/ai/rag");
  }
  if (!ds?.questions?.q3) errors.push("questions.q3 missing");
  if (errors.length || !ds) return { ok: false, errors };
  return { ok: true, data: ds };
}

function isSurveyStructureOnly(text: string): boolean {
  return (
    /(?:ถาม|คำถาม|โจทย์|หัวข้อ).{0,30}(?:อะไร|ว่าอะไร|เรื่องอะไร|ว่าไร)/u.test(text) ||
    /(?:กี่|มี|ทั้งหมด).*ตัวเลือก/u.test(text) ||
    /(?:มี|ได้).*เลือก.*(?:กี่|เท่าไหร่)/u.test(text) ||
    /โครงสร้าง.*(?:ข้อ|คำถาม)/u.test(text)
  );
}

/** Deterministic full-population stats from all surveys in aggregates JSON. */
export async function tryAnswerSurveyAggregateQuestion(question: string): Promise<string | null> {
  const trimmed = question.trim();
  if (!trimmed) return null;

  const check = verifySurveyAggregatesDataset(await loadSurveyAggregatesDataset());
  if (!check.ok) {
    return "ยังไม่มีข้อมูลสรุปสถิติแบบสำรวจ — ไปที่เมนู จัดการ RAG Index แล้วกด「อัปเดตสถิติสำหรับ AI」(หลัง Snapshot)";
  }

  const ds = check.data;

  const qNum = parseQuestionNumber(trimmed);
  if (qNum && !isSurveyStructureOnly(trimmed)) {
    const agg = getQuestionAgg(ds, `q${qNum}`);
    if (agg) return formatQuestionAggregateSummary(agg, ds.surveyCount);
  }

  if (!isAggregateStatsQuestion(trimmed)) return null;

  if (/(?:กี่|จำนวน|ทั้งหมด).*แบบ/u.test(trimmed) && !parseQuestionNumber(trimmed)) {
    const cutoffNote = ds.snapshotCutoff
      ? ` (ข้อมูลถึงวันที่ ${new Date(ds.snapshotCutoff).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })})`
      : "";
    return `มีแบบสำรวจหัวใจ 4 ห้องในระบบ ${nf.format(ds.surveyCount)} ราย${cutoffNote}`;
  }

  if (isPestInPlotCountQuestion(trimmed)) {
    return formatPestInPlotAnswer(ds);
  }

  if (isWeedInPlotCountQuestion(trimmed)) {
    return formatWeedInPlotAnswer(ds);
  }

  let keys = resolveQuestionKeys(trimmed);
  if (keys.length === 0) return null;

  if (keys.length > 1 && /(?:วิธี|เลือก|จัดการ|ส่วนใหญ่)/u.test(trimmed) && keys.includes("q3")) {
    keys = ["q3"];
  }

  if (keys.length > 1 && /พบ.*วัชพืช|วัชพืชร้ายแรง/u.test(trimmed) && keys.includes("q4")) {
    keys = ["q4"];
  }

  const parts: string[] = [];

  for (const key of keys.slice(0, 3)) {
    const agg = getQuestionAgg(ds, key);
    if (!agg) continue;
    parts.push("");
    parts.push(formatQuestionAggregateSummary(agg, ds.surveyCount));
  }

  if (parts.length === 0) {
    const num = parseQuestionNumber(trimmed);
    if (num) return `ยังไม่มีสรุปสถิติสำหรับข้อ ${num} ในระบบ`;
    return null;
  }

  return parts.join("\n\n");
}

export async function buildSurveyAggregateKnowledgeChunks(): Promise<
  Array<{
    question_key: string;
    title: string;
    content: string;
  }>
> {
  const check = verifySurveyAggregatesDataset(await loadSurveyAggregatesDataset());
  if (!check.ok) return [];
  const ds = check.data;

  return [
    {
      question_key: "survey_population",
      title: "จำนวนแบบสำรวจใน snapshot",
      content: [
        `จำนวนแบบสำรวจหัวใจ 4 ห้องใน snapshot: ${nf.format(ds.surveyCount)} ราย`,
        ds.snapshotCutoff ? `snapshot_cutoff: ${ds.snapshotCutoff}` : "",
        "คำถามสถิติรวม (กี่คนเลือก / ส่วนใหญ่) ใช้ heart4rooms-survey-aggregates.json",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
}
