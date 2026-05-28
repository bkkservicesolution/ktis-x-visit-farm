/**
 * List plots/farmers from snapshot when the question asks "which farmers/plots…".
 */
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const nf = new Intl.NumberFormat("th-TH");
const MAX_LIST = 40;

type SnapshotRow = {
  id: string;
  farmer_first_name: string;
  farmer_last_name: string;
  contract_no: string;
  submitter_display_name: string;
  answers: unknown;
};

type ListMatch = {
  name: string;
  contract: string;
  submitter: string;
  reasons: string[];
};

type FarmerListKind =
  | "weed"
  | "grass_overgrown"
  | "disease"
  | "pest"
  | "water_shortage"
  | "promoter_help";

function qObj(answers: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = answers[key];
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function choice(answers: Record<string, unknown>, key: string): string {
  return str(qObj(answers, key).choice);
}

function farmerName(row: SnapshotRow): string {
  return `${row.farmer_first_name} ${row.farmer_last_name}`.trim() || "—";
}

function isFarmerListQuestion(text: string): boolean {
  return (
    /(?:ชาวไร่|เกษตรกร).*(?:คนไหน|ใครบ้าง|รายชื่อ|มีบ้าง|ไหนบ้าง)/u.test(text) ||
    /(?:คนไหน|ใครบ้าง|รายชื่อ).*(?:ชาวไร่|เกษตรกร)/u.test(text) ||
    /(?:แปลง|ไร่).*(?:ใดบ้าง|ไหนบ้าง|อะไรบ้าง|มีบ้าง|บ้างที่)/u.test(text) ||
    /(?:ใดบ้าง|ไหนบ้าง|รายชื่อ).*(?:แปลง|ไร่|ชาวไร่)/u.test(text) ||
    (/ความช่วยเหลือ/u.test(text) &&
      /(?:ใด|ไหน|บ้าง|รายชื่อ|แปลง|ชาวไร่|นักส่งเสริม)/u.test(text))
  );
}

function detectFarmerListKind(text: string): FarmerListKind | null {
  if (/ความช่วยเหลือ/u.test(text) && /(?:นักส่งเสริม|ส่งเสริม)/u.test(text)) {
    return "promoter_help";
  }

  if (
    /ขาดน้ำ|น้ำไม่(?:พอ|เพียง)|ยังไม่มีวิธี.*ความชื้น|ไม่มีวิธีจัดการความชื้น/u.test(text) ||
    (/ความชื้น|น้ำเพียงพอ/u.test(text) && /(?:ชาวไร่|เกษตรกร|รายชื่อ|คนไหน)/u.test(text))
  ) {
    return "water_shortage";
  }

  if (/หญ้ารก|ไม่ทันเวลา.*หญ้า/u.test(text)) {
    return "grass_overgrown";
  }

  if (/วัชพืช/u.test(text) && !/หญ้ารก/u.test(text)) {
    return "weed";
  }

  if (/ศัตรูพืช|แมลงศัตรู/u.test(text)) {
    return "pest";
  }

  if (/(?:มี)?โรค|แส้ดำ|โรคไม่ลาม/u.test(text) && !/ศัตรู|แมลง/u.test(text)) {
    return "disease";
  }

  return null;
}

function weedReasons(answers: Record<string, unknown>): string[] {
  const reasons: string[] = [];
  if (choice(answers, "q3") === "b") {
    reasons.push("ข้อ 3: ไม่ทันเวลา หญ้ารก");
  }
  if (choice(answers, "q4") === "a") {
    reasons.push("ข้อ 4: พบวัชพืชร้ายแรงในแปลง");
  }
  return reasons;
}

function grassOvergrownReasons(answers: Record<string, unknown>): string[] {
  if (choice(answers, "q3") === "b") {
    return ["ข้อ 3: ไม่ทันเวลา หญ้ารก"];
  }
  return [];
}

function diseaseReasons(answers: Record<string, unknown>): string[] {
  if (choice(answers, "q6") === "b") {
    return ["ข้อ 6: ไม่สามารถจัดการโรคแส้ดำได้"];
  }
  return [];
}

function pestReasons(answers: Record<string, unknown>): string[] {
  if (choice(answers, "q9") === "a") {
    const detail = str(qObj(answers, "q9").detail);
    return [`ข้อ 9: มีแมลงศัตรูที่ต้องการความช่วยเหลือ${detail ? ` (${detail})` : ""}`];
  }
  return [];
}

function waterShortageReasons(answers: Record<string, unknown>): string[] {
  if (choice(answers, "q10") === "b") {
    return ["ข้อ 10: ยังไม่มีวิธีจัดการความชื้นในดิน"];
  }
  return [];
}

function promoterHelpReasons(answers: Record<string, unknown>): string[] {
  const reasons: string[] = [];
  if (choice(answers, "q5") === "a") {
    const detail = str(qObj(answers, "q5").detail);
    reasons.push(`ข้อ 5 ต้องการคำแนะนำวิชาการเรื่องวัชพืช${detail ? `: ${detail}` : ""}`);
  }
  if (choice(answers, "q7") === "a") {
    const detail = str(qObj(answers, "q7").detail);
    reasons.push(`ข้อ 7 ต้องการความช่วยเหลือเรื่องโรคอ้อย${detail ? `: ${detail}` : ""}`);
  }
  if (choice(answers, "q9") === "a") {
    const detail = str(qObj(answers, "q9").detail);
    reasons.push(`ข้อ 9 ต้องการความช่วยเหลือเรื่องแมลง${detail ? `: ${detail}` : ""}`);
  }
  return reasons;
}

const LIST_HEADERS: Record<FarmerListKind, { title: string; criteria: string }> = {
  weed: {
    title: "ชาวไร่/แปลงที่มีปัญหาวัชพืช",
    criteria: "ข้อ 3 เลือก “ไม่ทันเวลา หญ้ารก” และ/หรือ ข้อ 4 เลือก “พบวัชพืชร้ายแรงในแปลง”",
  },
  grass_overgrown: {
    title: "ชาวไร่/แปลงที่มีหญ้ารก",
    criteria: "ข้อ 3 เลือก “ไม่ทันเวลา หญ้ารก”",
  },
  disease: {
    title: "ชาวไร่/แปลงที่มีปัญหาโรค",
    criteria: "ข้อ 6 เลือก “ไม่สามารถจัดการโรคแส้ดำได้”",
  },
  pest: {
    title: "ชาวไร่/แปลงที่มีศัตรูพืช",
    criteria: "ข้อ 9 เลือก “มีแมลงศัตรูที่ต้องการความช่วยเหลือ”",
  },
  water_shortage: {
    title: "ชาวไร่/แปลงที่ขาดน้ำ/ยังไม่มีวิธีรักษาความชื้น",
    criteria: "ข้อ 10 เลือก “ยังไม่มีวิธีจัดการความชื้นในดิน”",
  },
  promoter_help: {
    title: "แปลงที่ต้องการความช่วยเหลือจากทีมวิชาการ",
    criteria: "ข้อ 5 / 7 / 9 ในแบบสำรวจ (ทีมวิชาการ)",
  },
};

function matchReasons(answers: Record<string, unknown>, kind: FarmerListKind): string[] {
  switch (kind) {
    case "weed":
      return weedReasons(answers);
    case "grass_overgrown":
      return grassOvergrownReasons(answers);
    case "disease":
      return diseaseReasons(answers);
    case "pest":
      return pestReasons(answers);
    case "water_shortage":
      return waterShortageReasons(answers);
    case "promoter_help":
      return promoterHelpReasons(answers);
    default:
      return [];
  }
}

async function fetchAllSnapshotRows(): Promise<SnapshotRow[]> {
  const pageSize = 500;
  const out: SnapshotRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabaseAdmin()
      .from("heart4rooms_surveys_snapshot_v1")
      .select("id, farmer_first_name, farmer_last_name, contract_no, submitter_display_name, answers")
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);
    const page = (data ?? []) as SnapshotRow[];
    out.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  return out;
}

function formatListAnswer(kind: FarmerListKind, total: number, matches: ListMatch[]): string {
  const header = LIST_HEADERS[kind];
  const lines: string[] = [
    `${header.title}`,
    `เกณฑ์: ${header.criteria}`,
    "",
    `จากแบบสำรวจ ${nf.format(total)} ราย — พบ ${nf.format(matches.length)} ราย`,
  ];

  if (matches.length === 0) {
    lines.push("", "ไม่พบรายการที่ตรงเกณฑ์");
    return lines.join("\n");
  }

  lines.push("", `รายชื่อเกษตรกร (แสดงสูงสุด ${MAX_LIST} รายแรก):`);
  for (const m of matches.slice(0, MAX_LIST)) {
    lines.push(
      `• ${m.name} | สัญญา ${m.contract} | ผู้กรอก: ${m.submitter}`,
      `  ${m.reasons.join("；")}`,
    );
  }

  if (matches.length > MAX_LIST) {
    lines.push("", `…และอีก ${nf.format(matches.length - MAX_LIST)} ราย (ดูรายละเอียดได้จาก export Excel)`);
  }

  if (kind === "promoter_help") {
    lines.push("", "หมายเหตุ: แบบสอบถามถามถึง “ทีมวิชาการ” นักส่งเสริมเป็นผู้ลงพื้นที่ดูแลชาวไร่");
  }

  return lines.join("\n");
}

export async function tryAnswerSurveyListQuestion(question: string): Promise<string | null> {
  const trimmed = question.trim();
  if (!trimmed || !isFarmerListQuestion(trimmed)) return null;

  const kind = detectFarmerListKind(trimmed);
  if (!kind) {
    if (/ความช่วยเหลือ/u.test(trimmed)) return null;
    return null;
  }

  const rows = await fetchAllSnapshotRows();
  const matches: ListMatch[] = [];

  for (const row of rows) {
    const answers =
      row.answers && typeof row.answers === "object" && !Array.isArray(row.answers)
        ? (row.answers as Record<string, unknown>)
        : {};
    const reasons = matchReasons(answers, kind);
    if (reasons.length === 0) continue;
    matches.push({
      name: farmerName(row),
      contract: row.contract_no,
      submitter: row.submitter_display_name,
      reasons,
    });
  }

  return formatListAnswer(kind, rows.length, matches);
}
