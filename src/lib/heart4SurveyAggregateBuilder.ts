/**
 * Build per-question choice/method counts from raw survey answers (same source as Excel export).
 */
import {
  getHeart4QuestionDef,
  heart4ChoiceLabel,
  heart4QuestionTitleTh,
  HEART4_MULTI_LABELS,
  HEART4_SURVEY_QUESTIONS,
  type Heart4QuestionDef,
} from "@/lib/heart4SurveyCatalog";

export type AggregateBucket = { label: string; count: number; pct: number };

export type QuestionAggregate = {
  questionKey: string;
  title: string;
  answeredCount: number;
  mainChoice: AggregateBucket[];
  methods: AggregateBucket[];
};

export type SurveyAggregateDataset = {
  source: string;
  snapshotCutoff: string | null;
  builtAt: string;
  surveyCount: number;
  exportXlsx: string | null;
  questions: Record<string, QuestionAggregate>;
};

type MutableCounts = Map<string, number>;

type MutableQuestionAgg = {
  questionKey: string;
  title: string;
  answered: number;
  mainChoice: MutableCounts;
  methods: MutableCounts;
};

function qObj(answers: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = answers[key];
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function qArr(answers: Record<string, unknown>, key: string): string[] {
  const v = answers[key];
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function bump(map: MutableCounts, label: string) {
  if (!label) return;
  map.set(label, (map.get(label) ?? 0) + 1);
}

function sortedBuckets(map: MutableCounts, total: number): AggregateBucket[] {
  return [...map.entries()]
    .map(([label, count]) => ({
      label,
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function accumulateMultiCodes(
  map: MutableCounts,
  multiKey: string,
  codes: string[],
) {
  const labels = HEART4_MULTI_LABELS[multiKey];
  for (const code of codes) {
    const label = labels?.[code] ?? `รหัส ${code}`;
    bump(map, label);
  }
}

function accumulateQuestion(agg: MutableQuestionAgg, def: Heart4QuestionDef, answers: Record<string, unknown>) {
  const qKey = def.key;
  let touched = false;

  if (def.number >= 29 && def.number <= 33) {
    const obj = qObj(answers, qKey);
    const score = str(obj.score);
    if (score) {
      touched = true;
      bump(agg.mainChoice, `คะแนน ${score}/10`);
    }
    return touched;
  }

  if (qKey === "q16") {
    const multi = qArr(answers, "q16_multi");
    const other = str(qObj(answers, "q16").other);
    if (multi.length || other) {
      touched = true;
      accumulateMultiCodes(agg.methods, "q16_multi", multi);
      if (other) bump(agg.methods, `อื่นๆ: ${other}`);
    }
    return touched;
  }

  if (qKey === "q25") {
    const multi = qArr(answers, "q25_opts");
    const other = str(qObj(answers, "q25").otherText);
    if (multi.length || other) {
      touched = true;
      accumulateMultiCodes(agg.methods, "q25_opts", multi);
      if (other) bump(agg.methods, `อื่นๆ: ${other}`);
    }
    return touched;
  }

  if (qKey === "q27") {
    const multi = qArr(answers, "q27_multi");
    if (multi.length) {
      touched = true;
      const labels = HEART4_MULTI_LABELS.q27_multi;
      for (const code of multi) bump(agg.methods, labels?.[code] ?? code);
    }
    return touched;
  }

  if (qKey === "q35") {
    const multi = qArr(answers, "q35_multi");
    if (multi.length) {
      touched = true;
      accumulateMultiCodes(agg.methods, "q35_multi", multi);
    }
    return touched;
  }

  if (qKey === "q36") {
    const multi = qArr(answers, "q36_multi");
    const leg = str(qObj(answers, "q36").choice);
    const codes = multi.length ? multi : leg ? [leg] : [];
    if (codes.length) {
      touched = true;
      for (const code of codes) {
        bump(agg.mainChoice, heart4ChoiceLabel(def, code));
      }
    }
    return touched;
  }

  const obj = qObj(answers, qKey);
  const methodsKey = `${qKey}_methods`;
  const multiKey = `${qKey}_multi`;
  const methods = qArr(answers, methodsKey);
  const multi = qArr(answers, multiKey);
  const choice = str(obj.choice);

  if (methods.length) {
    touched = true;
    accumulateMultiCodes(agg.methods, methodsKey, methods);
  }
  if (multi.length && HEART4_MULTI_LABELS[multiKey]) {
    touched = true;
    accumulateMultiCodes(agg.methods, multiKey, multi);
  }
  if (choice) {
    touched = true;
    bump(agg.mainChoice, heart4ChoiceLabel(def, choice));
  }

  if (qKey === "q34") {
    const past = str(obj.tonsPast);
    const target = str(obj.tonsTarget);
    if (past || target) {
      touched = true;
      if (past) bump(agg.mainChoice, `ตันต่อไร่ปีที่แล้ว: ${past}`);
      if (target) bump(agg.mainChoice, `เป้าหมายปีหน้า: ${target}`);
    }
  }

  return touched;
}

export function buildSurveyAggregatesFromAnswerRows(
  rows: Array<{ answers: unknown; snapshot_cutoff?: string | null }>,
  meta: { source: string; exportXlsx: string | null },
): SurveyAggregateDataset {
  const mutable = new Map<string, MutableQuestionAgg>();

  for (const def of HEART4_SURVEY_QUESTIONS) {
    mutable.set(def.key, {
      questionKey: def.key,
      title: def.prompt,
      answered: 0,
      mainChoice: new Map(),
      methods: new Map(),
    });
  }

  let snapshotCutoff: string | null = null;

  for (const row of rows) {
    if (row.snapshot_cutoff && !snapshotCutoff) snapshotCutoff = row.snapshot_cutoff;
    const answers =
      row.answers && typeof row.answers === "object" && !Array.isArray(row.answers)
        ? (row.answers as Record<string, unknown>)
        : {};

    for (const def of HEART4_SURVEY_QUESTIONS) {
      const agg = mutable.get(def.key)!;
      if (accumulateQuestion(agg, def, answers)) agg.answered += 1;
    }
  }

  const surveyCount = rows.length;
  const questions: Record<string, QuestionAggregate> = {};

  for (const [key, agg] of mutable) {
    questions[key] = {
      questionKey: key,
      title: agg.title,
      answeredCount: agg.answered,
      mainChoice: sortedBuckets(agg.mainChoice, surveyCount),
      methods: sortedBuckets(agg.methods, surveyCount),
    };
  }

  return {
    source: meta.source,
    snapshotCutoff,
    builtAt: new Date().toISOString(),
    surveyCount,
    exportXlsx: meta.exportXlsx,
    questions,
  };
}

export function formatQuestionAggregateSummary(q: QuestionAggregate, surveyCount: number): string {
  const nf = new Intl.NumberFormat("th-TH");
  const lines: string[] = [
    `จากแบบสำรวจ ${nf.format(surveyCount)} ราย — ${heart4QuestionTitleTh(q.questionKey)}`,
  ];

  if (q.mainChoice.length) {
    lines.push("", "คำตอบหลัก:");
    for (const b of q.mainChoice.slice(0, 12)) {
      lines.push(`- ${b.label}: ${nf.format(b.count)} ราย (${b.pct}%)`);
    }
  }

  if (q.methods.length) {
    lines.push("", "วิธีจัดการ / ตัวเลือกย่อย (ชาวไร่เลือกได้มากกว่า 1 ข้อ):");
    for (const b of q.methods.slice(0, 15)) {
      lines.push(`- ${b.label}: ${nf.format(b.count)} ครั้ง (${b.pct}%)`);
    }
  }

  if (!q.mainChoice.length && !q.methods.length) {
    lines.push("", "ไม่มีข้อมูลตัวเลือกสรุปได้สำหรับข้อนี้");
  }

  return lines.join("\n");
}
