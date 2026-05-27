/**
 * Decodes raw heart4rooms_surveys.answers (H4Answers shape) into Thai lines for RAG.
 * Question text + option labels come from heart4SurveyCatalog.ts (sync with heart4SurveySteps.tsx).
 */

import {
  getHeart4QuestionDef,
  heart4ChoiceLabel,
  heart4QuestionTitleTh,
  heart4SectionForQuestionKey,
  heart4SubChoiceLabel,
  HEART4_MULTI_LABELS,
  mapHeart4MultiLabels,
} from "@/lib/heart4SurveyCatalog";

export { heart4QuestionTitleTh };

export type Heart4SurveyRowForDecode = {
  id: string;
  created_at: string;
  farmer_first_name: string;
  farmer_last_name: string;
  contract_no: string;
  submitter_display_name: string;
  answers: Record<string, unknown>;
};

export type DecodedFactLine = {
  section_key: string;
  section_label: string;
  question_key: string;
  field_key: string | null;
  human_text: string;
};

const PROFILE_SECTION = { key: "profile", label: "ข้อมูลทั่วไป" } as const;

function sectionForQuestionKey(q: string): { key: string; label: string } {
  if (q === "meta" || q === "farmer_role" || q === "checkin") return PROFILE_SECTION;
  return heart4SectionForQuestionKey(q);
}

function questionHeader(qKey: string): string {
  const def = getHeart4QuestionDef(qKey);
  if (def) return `ข้อ ${def.number} — ${def.prompt}`;
  return heart4QuestionTitleTh(qKey);
}

function qObj(answers: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = answers[key];
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function qArr(answers: Record<string, unknown>, key: string): string[] {
  const v = answers[key];
  return Array.isArray(v) ? (v as string[]) : [];
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function farmerRoleLabel(code: string): string {
  const m: Record<string, string> = {
    owner: "เจ้าของไร่",
    tenant: "ผู้เช่าไร่",
    contractor: "ผู้รับจ้างทำไร่",
    other: "อื่นๆ",
  };
  return m[code] ?? code;
}

function pushFact(
  out: DecodedFactLine[],
  section: { key: string; label: string },
  question_key: string,
  field_key: string | null,
  human_text: string,
) {
  const t = human_text.trim();
  if (!t) return;
  out.push({
    section_key: section.key,
    section_label: section.label,
    question_key,
    field_key,
    human_text: t,
  });
}

function decodeProfile(row: Heart4SurveyRowForDecode, answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = PROFILE_SECTION;
  const name = `${row.farmer_first_name} ${row.farmer_last_name}`.trim();
  pushFact(
    out,
    sec,
    "meta",
    null,
    [
      `แบบสำรวจหัวใจ 4 ห้อง`,
      `รหัสแบบสำรวจ (survey_id): ${row.id}`,
      `วันที่กรอก: ${row.created_at}`,
      `ชาวไร่: ${name}`,
      `สัญญา: ${row.contract_no}`,
      `ผู้กรอก: ${row.submitter_display_name}`,
    ].join("\n"),
  );

  const role = str(answers.farmer_role);
  if (role) {
    const other = str(answers.farmer_role_other);
    pushFact(
      out,
      sec,
      "farmer_role",
      null,
      `บทบาทในพื้นที่: ${farmerRoleLabel(role)}${other ? ` — ระบุเพิ่ม: ${other}` : ""}`,
    );
  }

  const checkin = qObj(answers, "checkin");
  const photo = str(checkin.photo_url);
  const taken = str(checkin.taken_at);
  const lat = checkin.lat;
  const lng = checkin.lng;
  if (photo || taken) {
    const geo =
      typeof lat === "number" && typeof lng === "number"
        ? `ตำแหน่ง: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
        : "";
    pushFact(
      out,
      sec,
      "checkin",
      null,
      [`เช็คอินถ่ายรูปในพื้นที่`, photo ? `รูป: ${photo}` : "", taken ? `เวลา: ${taken}` : "", geo]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return out;
}

function decodeQ10(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q10");
  const def = getHeart4QuestionDef("q10");
  const q10 = qObj(answers, "q10");
  const choice = str(q10.choice);
  const multi = mapHeart4MultiLabels("q10_multi", qArr(answers, "q10_multi"));
  const lines: string[] = [questionHeader("q10")];
  if (choice === "a") {
    lines.push(`คำตอบหลัก: ${heart4ChoiceLabel(def, "a")}`);
    if (multi) lines.push(`วิธีที่เลือก: ${multi}`);
    const other = str(q10.other);
    if (other) lines.push(`ระบุวิธีอื่น: ${other}`);
  } else if (choice === "b") {
    lines.push(`คำตอบหลัก: ${heart4ChoiceLabel(def, "b")}`);
    const cause = str(q10.cause);
    const fix = str(q10.fix);
    if (cause) lines.push(`สาเหตุ: ${cause}`);
    if (fix) lines.push(`ถ้าย้อนเวลาได้จะแก้อย่างไร: ${fix}`);
  } else if (choice) {
    lines.push(`คำตอบหลัก: ${heart4ChoiceLabel(def, choice)}`);
  }
  pushFact(out, sec, "q10", null, lines.join("\n"));
  return out;
}

function decodeQ12(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q12");
  const def = getHeart4QuestionDef("q12");
  const q12 = qObj(answers, "q12");
  const choice = str(q12.choice);
  const lines = [questionHeader("q12")];
  if (choice === "a") {
    lines.push(`วิธีให้น้ำ: ${heart4ChoiceLabel(def, "a")}`);
    const multi = mapHeart4MultiLabels("q12_a", qArr(answers, "q12_a"));
    if (multi) lines.push(`รายละเอียด: ${multi}`);
  } else if (choice === "b") {
    lines.push(`วิธีให้น้ำ: ${heart4ChoiceLabel(def, "b")}`);
    const multi = mapHeart4MultiLabels("q12_b", qArr(answers, "q12_b"));
    if (multi) lines.push(`รายละเอียด: ${multi}`);
    const heat = str(q12.heat);
    if (heat) lines.push(`ความร้อนจากแผงโซล่า/หมายเหตุ: ${heat}`);
  } else if (choice) {
    lines.push(`คำตอบหลัก: ${heart4ChoiceLabel(def, choice)}`);
  }
  pushFact(out, sec, "q12", null, lines.join("\n"));
  return out;
}

function decodeQ13(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q13");
  const def = getHeart4QuestionDef("q13");
  const q13 = qObj(answers, "q13");
  const choice = str(q13.choice);
  const lines = [questionHeader("q13")];
  if (choice === "a") {
    lines.push(`คำตอบหลัก: ${heart4ChoiceLabel(def, "a")}`);
    const multi = mapHeart4MultiLabels("q13_multi", qArr(answers, "q13_multi"));
    if (multi) lines.push(`รูปแบบที่อยากสร้าง: ${multi}`);
    const other = str(q13.other);
    if (other) lines.push(`ระบุวิธีอื่น: ${other}`);
  } else if (choice === "b") {
    lines.push(`คำตอบหลัก: ${heart4ChoiceLabel(def, "b")}`);
    const cause = str(q13.cause);
    if (cause) lines.push(`เหตุผล: ${cause}`);
  } else if (choice) {
    lines.push(`คำตอบหลัก: ${heart4ChoiceLabel(def, choice)}`);
  }
  pushFact(out, sec, "q13", null, lines.join("\n"));
  return out;
}

function decodeQ14(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q14");
  const def = getHeart4QuestionDef("q14");
  const q14 = qObj(answers, "q14");
  const lines = [questionHeader("q14")];
  const a = str(q14.a);
  const b = str(q14.b);
  const c = str(q14.c);
  const detail = str(q14.detail);
  if (a) lines.push(`a. ปัญหาหลักเรื่องน้ำ: ${heart4SubChoiceLabel(def, "q14_a", a)}`);
  if (b) lines.push(`b. การจัดหาแหล่งน้ำ: ${heart4SubChoiceLabel(def, "q14_b", b)}`);
  if (c) lines.push(`c. ชาวไร่มีแหล่งน้ำเพียงพอ: ${heart4SubChoiceLabel(def, "q14_c", c)}`);
  if (detail) lines.push(`แปลงที่ยังไม่มีแหล่งน้ำ (เมื่อ c = ii): ${detail}`);
  if (lines.length <= 1) return out;
  pushFact(out, sec, "q14", null, lines.join("\n"));
  return out;
}

function decodeQ24(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q24");
  const q24 = qObj(answers, "q24");
  const uses = qArr(answers, "q24_uses");
  const lines = [questionHeader("q24")];
  if (uses.length) lines.push(`การใช้ปุ๋ยอินทรีย์/วัสดุ: ${mapHeart4MultiLabels("q24_uses", uses)}`);
  if (uses.length && !uses.includes("v")) {
    lines.push(`วิธีการใส่: ${mapHeart4MultiLabels("q24_how", qArr(answers, "q24_how"))}`);
    lines.push(`อัตราที่ใส่: ${mapHeart4MultiLabels("q24_rate", qArr(answers, "q24_rate"))}`);
  }
  const otherSoil = str(q24.otherSoil);
  if (otherSoil) lines.push(`ระบุวัสดุปรับดินอื่น: ${otherSoil}`);
  const fw = str(q24.factoryWant);
  if (fw === "1") {
    lines.push("ต้องการใช้ปุ๋ยอินทรีย์ของโรงงาน");
    const form = str(q24.factoryForm);
    lines.push(`รูปแบบ: ${form === "i" ? "เม็ด" : form === "ii" ? "ผง" : form}`);
    const bags = str(q24.factoryBags);
    if (bags) lines.push(`จำนวนกระสอบ: ${bags}`);
  } else if (fw === "2") {
    lines.push("ไม่ต้องการใช้ปุ๋ยอินทรีย์ของโรงงาน");
  }
  if (lines.length <= 1) return out;
  pushFact(out, sec, "q24", null, lines.join("\n"));
  return out;
}

function decodeQ16(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q16");
  const multi = mapHeart4MultiLabels("q16_multi", qArr(answers, "q16_multi"));
  const other = str(qObj(answers, "q16").other);
  if (!multi && !other) return out;
  const lines = [questionHeader("q16")];
  if (multi) lines.push(`ความคาดหวังที่เลือก: ${multi}`);
  if (other) lines.push(`อื่นๆ (ระบุ): ${other}`);
  pushFact(out, sec, "q16", null, lines.join("\n"));
  return out;
}

function decodeQ25(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q25");
  const opts = mapHeart4MultiLabels("q25_opts", qArr(answers, "q25_opts"));
  const otherText = str(qObj(answers, "q25").otherText);
  if (!opts && !otherText) return out;
  const lines = [questionHeader("q25")];
  if (opts) lines.push(`ประโยชน์ที่ทราบ/เลือก: ${opts}`);
  if (otherText) lines.push(`อื่นๆ (ระบุ): ${otherText}`);
  pushFact(out, sec, "q25", null, lines.join("\n"));
  return out;
}

function decodeQ27(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q27");
  const q27 = qObj(answers, "q27");
  const multi = qArr(answers, "q27_multi");
  if (multi.length === 0) return out;
  const labels = HEART4_MULTI_LABELS.q27_multi;
  const lines = [questionHeader("q27")];
  for (const code of multi) {
    if (code === "a") lines.push(`- ${labels?.a ?? "ปุ๋ย"}: ${str(q27.fertilizer) || "(ไม่ระบุรายละเอียด)"}`);
    if (code === "b") lines.push(`- ${labels?.b ?? "ต้นทุน"}: ${str(q27.cost) || "(ไม่ระบุ)"}`);
    if (code === "c") lines.push(`- ${labels?.c ?? "น้ำมัน"}: ${str(q27.oil) || "(ไม่ระบุ)"}`);
  }
  pushFact(out, sec, "q27", null, lines.join("\n"));
  return out;
}

function decodeQ35(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q35");
  const v35 = qObj(answers, "q35");
  const multi = qArr(answers, "q35_multi");
  if (multi.length === 0) return out;
  const labels = HEART4_MULTI_LABELS.q35_multi;
  const lines = [questionHeader("q35")];
  for (const code of multi) {
    const label = labels?.[code] ?? code;
    if (code === "factor") lines.push(`- ${label}: ${str(v35.factor)}`);
    else if (code === "budget") lines.push(`- ${label}: ${str(v35.budget)}`);
    else if (code === "water") lines.push(`- ${label}: ${str(v35.water)}`);
    else if (code === "other") lines.push(`- ${label}: ${str(v35.other)}`);
    else lines.push(`- ${label}`);
  }
  pushFact(out, sec, "q35", null, lines.join("\n"));
  return out;
}

function decodeQ36(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q36");
  const v36 = qObj(answers, "q36");
  const multi = qArr(answers, "q36_multi");
  const legacy = str(v36.choice);
  const codes = multi.length > 0 ? multi : legacy && /^[a-g]$/.test(legacy) ? [legacy] : [];
  if (codes.length === 0) return out;
  const labels = HEART4_MULTI_LABELS.q36_multi;
  const lines = [questionHeader("q36")];
  for (const code of codes) {
    const head = labels?.[code] ?? `รางวัล ${code}`;
    if (code === "a") lines.push(`- ${head}: ${str(v36.travel_place)}`);
    else if (code === "b") lines.push(`- ${head}: ${str(v36.fert_formula)}`);
    else if (code === "c") lines.push(`- ${head}: ${str(v36.chemical)}`);
    else if (code === "d") lines.push(`- ${head}: ${str(v36.organic_qty)}`);
    else if (code === "e") lines.push(`- ${head}: ${str(v36.water_type)}`);
    else if (code === "f") lines.push(`- ${head}: ${str(v36.variety)}`);
    else if (code === "g") lines.push(`- ${head}: ${str(v36.other)}`);
    else lines.push(`- ${head}`);
  }
  pushFact(out, sec, "q36", null, lines.join("\n"));
  return out;
}

/** Generic q object: choice + text fields + optional *_methods arrays */
function decodeGenericQuestion(qKey: string, answers: Record<string, unknown>): DecodedFactLine[] {
  if (["q10", "q12", "q13", "q14", "q16", "q24", "q25", "q27", "q35", "q36"].includes(qKey)) return [];

  const obj = qObj(answers, qKey);
  const methodsKey = `${qKey}_methods`;
  const methods = qArr(answers, methodsKey);
  if (Object.keys(obj).length === 0 && methods.length === 0) return [];

  const sec = sectionForQuestionKey(qKey);
  const def = getHeart4QuestionDef(qKey);
  const lines: string[] = [questionHeader(qKey)];

  if (methods.length) lines.push(`วิธีที่เลือก: ${mapHeart4MultiLabels(methodsKey, methods)}`);

  const choice = str(obj.choice);
  if (choice) lines.push(`คำตอบหลัก: ${heart4ChoiceLabel(def, choice)}`);

  const skip = new Set(["choice"]);
  for (const [k, val] of Object.entries(obj)) {
    if (skip.has(k)) continue;
    if (val === undefined || val === null || val === "") continue;
    if (typeof val === "string" && val.trim()) lines.push(`${k}: ${val.trim()}`);
    else if (typeof val === "number") lines.push(`${k}: ${val}`);
  }

  const out: DecodedFactLine[] = [];
  pushFact(out, sec, qKey, null, lines.join("\n"));
  return out;
}

function decodeSatisfactionBlock(n: number, answers: Record<string, unknown>): DecodedFactLine[] {
  const qKey = `q${n}`;
  const obj = qObj(answers, qKey);
  if (!str(obj.score) && !str(obj.good) && !str(obj.improve)) return [];
  const sec = sectionForQuestionKey(qKey);
  const lines = [
    questionHeader(qKey),
    `คะแนน (0-10): ${str(obj.score) || "-"}`,
    `เรื่องที่ทำได้ดี: ${str(obj.good) || "-"}`,
    `เรื่องที่ควรพัฒนา: ${str(obj.improve) || "-"}`,
  ];
  const out: DecodedFactLine[] = [];
  pushFact(out, sec, qKey, null, lines.join("\n"));
  return out;
}

/**
 * Expands one survey row into human-readable fact lines (Thai) for RAG + heart4rooms_ai_decoded_facts.
 */
export function decodeHeart4SurveyForAdminAi(row: Heart4SurveyRowForDecode): DecodedFactLine[] {
  const answers = row.answers && typeof row.answers === "object" && !Array.isArray(row.answers) ? row.answers : {};
  const out: DecodedFactLine[] = [];

  out.push(...decodeProfile(row, answers));
  out.push(...decodeQ10(answers));
  out.push(...decodeQ12(answers));
  out.push(...decodeQ13(answers));
  out.push(...decodeQ14(answers));
  out.push(...decodeQ16(answers));
  out.push(...decodeQ24(answers));
  out.push(...decodeQ25(answers));
  out.push(...decodeQ27(answers));
  out.push(...decodeQ35(answers));
  out.push(...decodeQ36(answers));

  const qOrder = [
    "q1",
    "q2",
    "q3",
    "q4",
    "q5",
    "q6",
    "q7",
    "q8",
    "q9",
    "q11",
    "q15",
    "q17",
    "q18",
    "q19",
    "q20",
    "q21",
    "q22",
    "q23",
    "q26",
    "q28",
    "q37",
    "q38",
  ];
  for (const q of qOrder) out.push(...decodeGenericQuestion(q, answers));

  for (const n of [29, 30, 31, 32, 33]) out.push(...decodeSatisfactionBlock(n, answers));

  const q34 = qObj(answers, "q34");
  if (str(q34.tonsPast) || str(q34.tonsTarget)) {
    pushFact(
      out,
      sectionForQuestionKey("q34"),
      "q34",
      null,
      [
        questionHeader("q34"),
        `ตันต่อไร่ปีที่แล้ว: ${str(q34.tonsPast) || "-"}`,
        `เป้าหมายปีหน้า: ${str(q34.tonsTarget) || "-"}`,
      ].join("\n"),
    );
  }

  return out;
}
