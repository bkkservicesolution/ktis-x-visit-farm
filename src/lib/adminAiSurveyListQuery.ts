/**
 * List plots/farmers from snapshot when the question asks "which farmers/plots…"
 * or who should receive help in a given area (mapped to survey "problem" answers).
 */
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

type SurveyListTopic = {
  id: string;
  keywords: RegExp;
  title: string;
  criteria: string;
  note?: string;
  reasons: (answers: Record<string, unknown>) => string[];
};

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

function qArr(answers: Record<string, unknown>, key: string): string[] {
  const v = answers[key];
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

function multiHas(answers: Record<string, unknown>, key: string, code: string): boolean {
  return qArr(answers, key).includes(code);
}

function farmerName(row: SnapshotRow): string {
  return `${row.farmer_first_name} ${row.farmer_last_name}`.trim() || "—";
}

function detailSuffix(answers: Record<string, unknown>, qKey: string): string {
  const detail = str(qObj(answers, qKey).detail);
  return detail ? ` (${detail})` : "";
}

const TOPICS: SurveyListTopic[] = [
  {
    id: "water",
    keywords:
      /แหล่งน้ำ|ชลประทาน|ขาดน้ำ|น้ำไม่(?:พอ|เพียง)|ความชื้น|น้ำเพียงพอ|ด้านน้ำ|เรื่องน้ำ/u,
    title: "ชาวไร่/แปลงที่ควรได้รับความช่วยเหลือด้านน้ำ / แหล่งน้ำ",
    criteria:
      "ข้อ 10–11, 13–15 และปัญหาน้ำในข้อ 14 (ยังไม่มีวิธีจัดการความชื้น / ให้น้ำไม่ได้ / อยากสร้างแหล่งน้ำ / ปัญหาน้ำในไร่ / ต้องการช่วยจากชลประทาน ฯลฯ)",
    reasons(answers) {
      const reasons: string[] = [];
      if (choice(answers, "q10") === "b") reasons.push("ข้อ 10: ยังไม่มีวิธีจัดการความชื้นในดิน");
      if (choice(answers, "q11") === "a") reasons.push("ข้อ 11: ไม่สามารถให้น้ำจากแหล่งที่มีได้เลย");
      if (choice(answers, "q13") === "a") reasons.push("ข้อ 13: มีความประสงค์อยากสร้างแหล่งน้ำเพิ่ม");
      if (choice(answers, "q15") === "a") {
        reasons.push(`ข้อ 15: ต้องการความช่วยเหลือจากทีมชลประทาน${detailSuffix(answers, "q15")}`);
      }
      const q14 = qObj(answers, "q14");
      const q14a = str(q14.a);
      if (q14a === "i" || q14a === "ii" || q14a === "iii") {
        reasons.push(`ข้อ 14a: มีปัญหาเรื่องน้ำในไร่ (ตัวเลือก ${q14a})`);
      }
      if (str(q14.c) === "ii") reasons.push("ข้อ 14c: แหล่งน้ำยังไม่ครบทุกแปลง");
      return reasons;
    },
  },
  {
    id: "organic",
    keywords: /ปุ๋ยอินทรีย์|อินทรีย์|โครงสร้างดิน/u,
    title: "ชาวไร่/แปลงที่มีปัญหาด้านปุ๋ยอินทรีย์ / ปรับปรุงดิน",
    criteria: "ข้อ 24 — ไม่ได้ใส่ปุ๋ยอินทรีย์หรือวัสดุปรับปรุงดิน",
    reasons(answers) {
      if (multiHas(answers, "q24_uses", "v")) {
        return ["ข้อ 24: ไม่ได้ใส่ปุ๋ยอินทรีย์/วัสดุปรับปรุงดิน"];
      }
      return [];
    },
  },
  {
    id: "fertilizer",
    keywords: /(?:ด้าน|เรื่อง)?ปุ๋ย(?!อินทรีย์)|หัวใจพลัส.*ปุ๋ย|บำรุง.*ปุ๋ย/u,
    title: "ชาวไร่/แปลงที่มีปัญหาด้านปุ๋ย / ควรได้รับความช่วยเหลือด้านปุ๋ย",
    criteria:
      "ข้อ 18 (ไม่ใช้ปุ๋ยโรงงาน) และ/หรือ ข้อ 21 (ยังไม่ได้ทำบำรุง/ผ่ากอ) และ/หรือ ข้อ 27 (อุปสรรคด้านปุ๋ย)",
    reasons(answers) {
      const reasons: string[] = [];
      const q18 = choice(answers, "q18");
      if (q18 === "a") reasons.push("ข้อ 18: เคยใช้ปุ๋ยโรงงานแต่ปัจจุบันไม่ใช้");
      if (q18 === "c") reasons.push("ข้อ 18: ไม่ใช้ปุ๋ยโรงงานทั้งอดีต ปัจจุบัน และอนาคต");
      if (choice(answers, "q21") === "b") {
        reasons.push(`ข้อ 21: ยังไม่ได้ทำการบำรุง/ผ่ากอใส่ปุ๋ย${detailSuffix(answers, "q21")}`);
      }
      if (multiHas(answers, "q27_multi", "a")) {
        const note = str(qObj(answers, "q27").fertilizer);
        reasons.push(`ข้อ 27: มีอุปสรรคด้านปุ๋ย${note ? ` (${note})` : ""}`);
      }
      return reasons;
    },
  },
  {
    id: "weed_fail",
    keywords: /จัดการวัชพืชไม่(?:ได้|ทัน)|วัชพืช.*(?:ไม่(?:ได้|ทัน)|ล้มเหลว)/u,
    title: "ชาวไร่/แปลงที่จัดการวัชพืชไม่ได้",
    criteria: "ข้อ 3 (ไม่ทันเวลา หญ้ารก) และ/หรือ ข้อ 4 (พบวัชพืชร้ายแรงในแปลง)",
    reasons(answers) {
      const reasons: string[] = [];
      if (choice(answers, "q3") === "b") reasons.push("ข้อ 3: จัดการวัชพืชไม่ทันเวลา");
      if (choice(answers, "q4") === "a") reasons.push("ข้อ 4: พบวัชพืชร้ายแรงในแปลง");
      return reasons;
    },
  },
  {
    id: "grass",
    keywords: /หญ้ารก|ไม่ทันเวลา.*หญ้า/u,
    title: "ชาวไร่/แปลงที่มีหญ้ารก",
    criteria: "ข้อ 3 เลือก “ไม่ทันเวลา หญ้ารก”",
    reasons(answers) {
      if (choice(answers, "q3") === "b") return ["ข้อ 3: ไม่ทันเวลา หญ้ารก"];
      return [];
    },
  },
  {
    id: "weed",
    keywords: /วัชพืช|หญ้าไม่รก/u,
    title: "ชาวไร่/แปลงที่มีปัญหาวัชพืช / ควรได้รับความช่วยเหลือด้านวัชพืช",
    criteria:
      "ข้อ 3 (ไม่ทันเวลา หญ้ารก) และ/หรือ ข้อ 4 (พบวัชพืชร้ายแรง) และ/หรือ ข้อ 5 (ต้องการคำแนะนำวิชาการเรื่องวัชพืช)",
    reasons(answers) {
      const reasons: string[] = [];
      if (choice(answers, "q3") === "b") reasons.push("ข้อ 3: ไม่ทันเวลา หญ้ารก");
      if (choice(answers, "q4") === "a") reasons.push("ข้อ 4: พบวัชพืชร้ายแรงในแปลง");
      if (choice(answers, "q5") === "a") {
        reasons.push(`ข้อ 5: ต้องการคำแนะนำวิชาการเรื่องวัชพืช${detailSuffix(answers, "q5")}`);
      }
      return reasons;
    },
  },
  {
    id: "disease",
    keywords: /(?:ด้าน|เรื่อง)?โรค|แส้ดำ|โรคไม่ลาม/u,
    title: "ชาวไร่/แปลงที่มีปัญหาโรค / ควรได้รับความช่วยเหลือด้านโรค",
    criteria:
      "ข้อ 6 (จัดการแส้ดำไม่ได้) และ/หรือ ข้อ 7 (มีโรคอ้อยอื่นที่ต้องการความช่วยเหลือจากทีมวิชาการ)",
    reasons(answers) {
      const reasons: string[] = [];
      if (choice(answers, "q6") === "b") reasons.push("ข้อ 6: ไม่สามารถจัดการโรคแส้ดำได้");
      if (choice(answers, "q7") === "a") {
        reasons.push(`ข้อ 7: มีโรคอ้อยอื่นที่ต้องการความช่วยเหลือ${detailSuffix(answers, "q7")}`);
      }
      return reasons;
    },
  },
  {
    id: "pest",
    keywords: /ศัตรูพืช|แมลงศัตรู|หนอนกอ|ด้านแมลง/u,
    title: "ชาวไร่/แปลงที่มีศัตรูพืช / ควรได้รับความช่วยเหลือด้านศัตรูพืช",
    criteria:
      "ข้อ 8 (จัดการหนอนกอไม่ได้) และ/หรือ ข้อ 9 (มีแมลงศัตรูที่ต้องการความช่วยเหลือจากทีมวิชาการ)",
    reasons(answers) {
      const reasons: string[] = [];
      if (choice(answers, "q8") === "b") reasons.push("ข้อ 8: ไม่สามารถจัดการหนอนกอได้");
      if (choice(answers, "q9") === "a") {
        reasons.push(`ข้อ 9: มีแมลงศัตรูที่ต้องการความช่วยเหลือ${detailSuffix(answers, "q9")}`);
      }
      return reasons;
    },
  },
  {
    id: "soil",
    keywords: /(?:ด้าน|เรื่อง)?ดิน(?!ต)|ปรับปรุงดิน/u,
    title: "ชาวไร่/แปลงที่มีปัญหาด้านดิน",
    criteria: "ข้อ 24 — ไม่ได้ใส่ปุ๋ยอินทรีย์/วัสดุปรับปรุงดิน (หัวใจปรับโครงสร้างดิน)",
    reasons(answers) {
      if (multiHas(answers, "q24_uses", "v")) {
        return ["ข้อ 24: ไม่ได้ใส่ปุ๋ยอินทรีย์/วัสดุปรับปรุงดิน"];
      }
      return [];
    },
  },
  {
    id: "planting",
    keywords: /ปลูกไม่ทัน|ปลูก.*ทันเวลา|ด้านการปลูก/u,
    title: "ชาวไร่/แปลงที่ปลูกอ้อยไม่ทันเวลา",
    criteria: "ข้อ 2 เลือก “ไม่ทันเวลา”",
    reasons(answers) {
      if (choice(answers, "q2") === "b") return ["ข้อ 2: ปลูกอ้อยไม่ทันเวลา (ภายใน 31 ม.ค.)"];
      return [];
    },
  },
];

const PROMOTER_HELP_TOPIC: SurveyListTopic = {
  id: "promoter_help",
  keywords: /ความช่วยเหลือ.*(?:นักส่งเสริม|ส่งเสริม)|(?:นักส่งเสริม|ส่งเสริม).*ความช่วยเหลือ/u,
  title: "แปลงที่ต้องการความช่วยเหลือจากทีมวิชาการ (ข้อ 5 / 7 / 9)",
  criteria: "ข้อ 5 / 7 / 9 ในแบบสำรวจ — ถามถึงทีมวิชาการ",
  note: "แบบสอบถามถามถึง “ทีมวิชาการ” นักส่งเสริมเป็นผู้ลงพื้นที่ดูแลชาวไร่",
  reasons(answers) {
    const reasons: string[] = [];
    if (choice(answers, "q5") === "a") {
      reasons.push(`ข้อ 5: ต้องการคำแนะนำวิชาการเรื่องวัชพืช${detailSuffix(answers, "q5")}`);
    }
    if (choice(answers, "q7") === "a") {
      reasons.push(`ข้อ 7: ต้องการความช่วยเหลือเรื่องโรคอ้อย${detailSuffix(answers, "q7")}`);
    }
    if (choice(answers, "q9") === "a") {
      reasons.push(`ข้อ 9: ต้องการความช่วยเหลือเรื่องแมลง${detailSuffix(answers, "q9")}`);
    }
    return reasons;
  },
};

function isFarmerListQuestion(text: string): boolean {
  return (
    /ชาวไร่(?:ราย)?ใดบ้าง|ชาวไร่รายใด|รายใดควร|รายไหนควร/u.test(text) ||
    (/ควร(?:ให้)?(?:ความ)?ช่วยเหลือ|ต้องการความช่วยเหลือ|ช่วยเหลือด้าน/u.test(text) &&
      /(?:ชาวไร่|เกษตรกร|แปลง|ไร่|น้ำ|แหล่งน้ำ|วัช|โรค|ศัตรู|หญ้า|ปุ๋ย|ดิน|อินทรีย์|แมลง)/u.test(
        text,
      )) ||
    (/(?:ชาวไร่|เกษตรกร|แปลง).*(?:ควร|ต้องการ|มีปัญหา)/u.test(text) &&
      /(?:น้ำ|แหล่งน้ำ|วัช|โรค|ศัตรู|หญ้า|ปุ๋ย|ดิน|อินทรีย์)/u.test(text)) ||
    /(?:ชาวไร่|เกษตรกร).*(?:คนไหน|ใครบ้าง|รายชื่อ|มีบ้าง|ไหนบ้าง|รายใด)/u.test(text) ||
    /(?:คนไหน|ใครบ้าง|รายชื่อ|รายใด).*(?:ชาวไร่|เกษตรกร)/u.test(text) ||
    /(?:แปลง|ไร่).*(?:ใดบ้าง|ไหนบ้าง|อะไรบ้าง|มีบ้าง|บ้างที่)/u.test(text) ||
    /(?:ใดบ้าง|ไหนบ้าง|รายชื่อ).*(?:แปลง|ไร่|ชาวไร่)/u.test(text) ||
    (/ความช่วยเหลือ/u.test(text) &&
      /(?:ใด|ไหน|บ้าง|รายชื่อ|รายใด|แปลง|ชาวไร่|นักส่งเสริม|น้ำ|แหล่งน้ำ|ปุ๋ย|ดิน)/u.test(
        text,
      ))
  );
}

/** หัวข้อย่อยที่ซ้ำกัน — ถ้ามีเฉพาะเจาะจงแล้ว ไม่นับหัวข้อกว้างซ้ำ */
const TOPIC_SUPERSEDES: Record<string, string[]> = {
  weed: ["weed_fail"],
};

function detectTopics(text: string): SurveyListTopic[] {
  if (PROMOTER_HELP_TOPIC.keywords.test(text)) {
    const other = TOPICS.some((t) => t.keywords.test(text));
    if (!other) return [PROMOTER_HELP_TOPIC];
  }

  const found: SurveyListTopic[] = [];
  const seen = new Set<string>();

  for (const topic of TOPICS) {
    if (!topic.keywords.test(text) || seen.has(topic.id)) continue;

    const supersededBy = TOPIC_SUPERSEDES[topic.id];
    if (supersededBy?.some((id) => seen.has(id))) continue;

    found.push(topic);
    seen.add(topic.id);
  }

  return found;
}

/** ภายในหัวข้อเดียว = OR (มีเหตุผลข้อใดข้อหนึ่งก็นับ) | หลายหัวข้อ = AND (ต้องครบทุกหัวข้อ) */
function matchFarmerReasons(
  answers: Record<string, unknown>,
  topics: SurveyListTopic[],
): string[] | null {
  const combined: string[] = [];

  for (const topic of topics) {
    const topicReasons = topic.reasons(answers);
    if (topicReasons.length === 0) return null;
    combined.push(...topicReasons);
  }

  return combined;
}

async function fetchAllSnapshotRows(): Promise<SnapshotRow[]> {
  const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
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

const TOPIC_SHORT_LABELS: Record<string, string> = {
  weed_fail: "จัดการวัชพืชไม่ได้",
  grass: "หญ้ารก",
  water: "ขาดน้ำ/แหล่งน้ำ",
  weed: "วัชพืช",
  disease: "โรค",
  pest: "ศัตรูพืช",
  fertilizer: "ปุ๋ย",
  organic: "ปุ๋ยอินทรีย์",
  soil: "ดิน",
  planting: "ปลูกไม่ทัน",
};

function formatListAnswer(topics: SurveyListTopic[], total: number, matches: ListMatch[]): string {
  const multi = topics.length > 1;
  const topicLabels = topics.map((t) => TOPIC_SHORT_LABELS[t.id] ?? t.title).join(" และ ");

  const lines: string[] = multi
    ? [
        `ชาวไร่/แปลงที่มีครบทุกประเด็น (${topicLabels})`,
        "เกณฑ์: ต้องตรงทุกประเด็นพร้อมกัน (AND)",
        ...topics.map((t, i) => `  ${i + 1}. ${TOPIC_SHORT_LABELS[t.id] ?? t.id}: ${t.criteria}`),
      ]
    : [topics[0].title, `เกณฑ์: ${topics[0].criteria}`];

  lines.push("", `จากแบบสำรวจ ${nf.format(total)} ราย — พบ ${nf.format(matches.length)} ราย`);

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

  const note = topics.find((t) => t.note)?.note;
  if (note) lines.push("", `หมายเหตุ: ${note}`);

  return lines.join("\n");
}

export function tryAnswerSurveyListFromRows(question: string, rows: SnapshotRow[]): string | null {
  const trimmed = question.trim();
  if (!trimmed || !isFarmerListQuestion(trimmed)) return null;

  const topics = detectTopics(trimmed);
  if (topics.length === 0) return null;

  const matches: ListMatch[] = [];

  for (const row of rows) {
    const answers =
      row.answers && typeof row.answers === "object" && !Array.isArray(row.answers)
        ? (row.answers as Record<string, unknown>)
        : {};
    const reasons = matchFarmerReasons(answers, topics);
    if (!reasons) continue;
    matches.push({
      name: farmerName(row),
      contract: row.contract_no,
      submitter: row.submitter_display_name,
      reasons,
    });
  }

  return formatListAnswer(topics, rows.length, matches);
}

export async function tryAnswerSurveyListQuestion(question: string): Promise<string | null> {
  const trimmed = question.trim();
  if (!trimmed || !isFarmerListQuestion(trimmed)) return null;
  const rows = await fetchAllSnapshotRows();
  return tryAnswerSurveyListFromRows(trimmed, rows);
}
