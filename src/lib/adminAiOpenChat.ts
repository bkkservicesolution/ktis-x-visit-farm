/**
 * Build survey knowledge context for free-form Gemini answers.
 */
import { getAdminAiDomainSystemPrompt } from "@/lib/adminAiDomainKnowledge";
import { HEART4_SURVEY_QUESTIONS } from "@/lib/heart4SurveyCatalog";
import { loadSurveyAggregatesDataset } from "@/lib/heart4SurveyAggregatesStore";
import type { SurveyAggregateDataset } from "@/lib/heart4SurveyAggregateBuilder";

const nf = new Intl.NumberFormat("th-TH");
const MAX_AGGREGATE_CHARS = 14_000;

function buildSurveyCatalogIndex(): string {
  const lines = HEART4_SURVEY_QUESTIONS.map(
    (q) => `ข้อ ${q.number} (${q.key}) [${q.sectionLabel}]: ${q.prompt}`,
  );
  return ["โครงสร้างแบบสำรวจ Heart4Rooms (ข้อ 1–38):", ...lines].join("\n");
}

function compactAggregatesText(ds: SurveyAggregateDataset): string {
  const header = [
    "สถิติสรุปจากแบบสำรวจทั้งชุด (1 แบบ ≈ 1 แปลง):",
    `จำนวนราย: ${nf.format(ds.surveyCount)}`,
    ds.snapshotCutoff ? `snapshot_cutoff: ${ds.snapshotCutoff}` : null,
    ds.builtAt ? `สร้างสรุปเมื่อ: ${ds.builtAt}` : null,
  ].filter((x): x is string => Boolean(x));

  const blocks: string[] = [];
  const keys = Object.keys(ds.questions).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
    const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
    return na - nb;
  });

  for (const key of keys) {
    const q = ds.questions[key];
    if (!q) continue;
    const part: string[] = [`[${key}] ${q.title}`];
    for (const b of q.mainChoice.slice(0, 8)) {
      part.push(`  • ${b.label}: ${nf.format(b.count)} (${b.pct}%)`);
    }
    for (const b of q.methods.slice(0, 5)) {
      part.push(`  • ${b.label}: ${nf.format(b.count)} (${b.pct}%)`);
    }
    blocks.push(part.join("\n"));
  }

  let body = [...header, "", ...blocks].join("\n\n");
  if (body.length > MAX_AGGREGATE_CHARS) {
    body = `${body.slice(0, MAX_AGGREGATE_CHARS)}\n\n(ตัดข้อความสถิติบางส่วนเพื่อความยาว — ถามระบุเลขข้อได้แม่นยำกว่า)`;
  }
  return body;
}

/** Context block sent to Gemini when no deterministic handler matched. */
export async function buildAdminAiSurveyKnowledgeContext(): Promise<string> {
  const parts = [
    getAdminAiDomainSystemPrompt(),
    "",
    buildSurveyCatalogIndex(),
  ];

  const aggregates = await loadSurveyAggregatesDataset();
  if (aggregates?.surveyCount) {
    parts.push("", compactAggregatesText(aggregates));
  } else {
    parts.push(
      "",
      "หมายเหตุ: ยังไม่มีไฟล์สรุปสถิติทั้งชุด (heart4rooms-survey-aggregates.json) — ตอบได้เฉพาะโครงสร้างข้อถามและความรู้องค์กร ไม่มีตัวเลขรวมจากแบบสำรวจ",
    );
  }

  parts.push(
    "",
    "ความสามารถของระบบ (แนะนำผู้ใช้เมื่อถามรายชื่อ/พิกัด):",
    "- รายชื่อชาวไร่ตามปัญหา (วัชพืช/น้ำ/ปุ๋ย/โรค ฯลฯ): ถามชัด เช่น “ชาวไร่ใดบ้างที่ขาดน้ำ”",
    "- พิกัดเช็คอิน: ถาม “ขอพิกัดเลขที่สัญญา XXXXX”",
    "- สถิติรวม: ถาม “มีกี่แปลงที่…” หรือระบุเลขข้อ",
  );

  return parts.join("\n");
}
