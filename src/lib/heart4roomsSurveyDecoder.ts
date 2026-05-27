/**
 * Decodes raw heart4rooms_surveys.answers (H4Answers shape) into Thai lines for RAG.
 * Mirrors labels from heart4SurveySteps.tsx — update both when survey copy changes.
 */

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

const SECTION = {
  profile: { key: "profile", label: "ข้อมูลทั่วไป" },
  heart_intro: { key: "heart_intro", label: "หัวใจ 4 ห้อง — ทั่วไป" },
  room1: { key: "room1", label: "หัวใจห้องที่ 1" },
  room2: { key: "room2", label: "หัวใจห้องที่ 2" },
  room3: { key: "room3", label: "หัวใจห้องที่ 3" },
  room4: { key: "room4", label: "หัวใจห้องที่ 4" },
  fert_plus: { key: "fert_plus", label: 'หัวใจพลัส "ปุ๋ย"' },
  organic_plus: { key: "organic_plus", label: 'หัวใจพลัส "ปุ๋ยอินทรีย์"' },
  enemies: { key: "enemies", label: "แบบสำรวจศัตรูหัวใจ" },
  satisfaction: { key: "satisfaction", label: "ความพึงพอใจและนักส่งเสริม" },
} as const;

function sectionForQuestionKey(q: string): (typeof SECTION)[keyof typeof SECTION] {
  if (q === "q1") return SECTION.heart_intro;
  if (["q2", "q3", "q4"].includes(q)) return SECTION.room1;
  if (["q5", "q6", "q7", "q8", "q9"].includes(q)) return SECTION.room2;
  if (["q10", "q11", "q12", "q13", "q14", "q15"].includes(q)) return SECTION.room3;
  if (["q16", "q17", "q18", "q19", "q20", "q21", "q22", "q23"].includes(q)) return SECTION.fert_plus;
  if (["q24", "q25", "q26", "q27", "q28"].includes(q)) return SECTION.organic_plus;
  if (["q29", "q30", "q31", "q32", "q33", "q34", "q35", "q36", "q37", "q38"].includes(q)) return SECTION.satisfaction;
  return SECTION.profile;
}

const Q_TITLE: Record<string, string> = {
  q1: "ข้อ 1 — เคยได้ยิน “หัวใจ 4 ห้องของการทำอ้อย” หรือไม่",
  q2: "ข้อ 2 — ปลูกอ้อยทันเวลาภายใน 31 ม.ค. หรือไม่",
  q3: "ข้อ 3 — การจัดการโรคแส้ดำ",
  q4: "ข้อ 4 — การปลูกอ้อยร่วมกับเพื่อนบ้าน",
  q5: "ข้อ 5 — การเตรียมดินปลูก",
  q6: "ข้อ 6 — การจัดการโรคใบจุดสีเทา",
  q7: "ข้อ 7 — โรค/ปัญหาอ้อยที่พบ",
  q8: "ข้อ 8 — การจัดการแมลงศัตรูอ้อย",
  q9: "ข้อ 9 — การจัดการหนอนเจาะข้อ",
  q10: "ข้อ 10 — รักษาความชื้นในดินหลังตัด/หลังปลูก",
  q11: "ข้อ 11 — แหล่งน้ำเพียงพอ ให้ได้กี่ครั้ง",
  q12: "ข้อ 12 — วิธีการให้น้ำ",
  q13: "ข้อ 13 — แหล่งน้ำที่ใช้",
  q14: "ข้อ 14 — การให้น้ำหลังปลูก/หลังตัด",
  q15: "ข้อ 15 — การปรับปรุงดินก่อนปลูก",
  q16: "ข้อ 16 — ความคาดหวังต่อโรงปุ๋ยของโรงงาน",
  q17: "ข้อ 17 — จะใช้ปุ๋ยของโรงงานหรือไม่",
  q18: "ข้อ 18 — ใช้ปุ๋ยที่โรงงานส่งเสริมหรือไม่",
  q19: "ข้อ 19 — การใส่ปุ๋ยตามคำแนะ",
  q20: "ข้อ 20 — ปริมาณปุ๋ยฐาน/บำรุง/แต่งหน้า (ก่อนตัด)",
  q21: "ข้อ 21 — การใส่ปุ๋ยหลังตัด",
  q22: "ข้อ 22 — ปริมาณปุ๋ยหลังตัด (บำรุง/แต่งหน้า)",
  q23: "ข้อ 23 — ความประสงค์ปุ๋ยเพิ่ม (สูตร/จำนวนกระสอบ)",
  q24: "ข้อ 24 — ปุ๋ยอินทรีย์ปรับโครงสร้างดิน",
  q25: "ข้อ 25 — ประโยชน์ที่คาดหวังจากปุ๋ยอินทรีย์",
  q26: "ข้อ 26 — ทราบแนวโน้มราคาอ้อยปีหน้าหรือไม่",
  q27: "ข้อ 27 — อุปสรรคต่อการดูแลอ้อยตามหัวใจ 4 ห้อง",
  q28: "ข้อ 28 — พืชทดแทนหากไม่ปลูกอ้อย",
  q29: "ข้อ 29 — ความพึงพอใจการนำอ้อยเข้าหีบ",
  q30: "ข้อ 30 — ความพึงพอใจการสนับสนุนปลูกอ้อย",
  q31: "ข้อ 31 — ความพึงพอใจการบำรุงอ้อย",
  q32: "ข้อ 32 — ความพึงพอใจบริการอื่นและเกี๊ยว",
  q33: "ข้อ 33 — ความพึงพอใจนักส่งเสริมโดยรวม",
  q34: "ข้อ 34 — ตันต่อไร่ ปีที่แล้วและเป้าหมายปีหน้า",
  q35: "ข้อ 35 — สนับสนุนเพื่อตันต่อไร่",
  q36: "ข้อ 36 — รางวัลที่อยากได้",
  q37: "ข้อ 37",
  q38: "ข้อ 38",
};

export function heart4QuestionTitleTh(questionKey: string): string {
  return Q_TITLE[questionKey] ?? questionKey;
}

const MULTI: Record<string, Record<string, string>> = {
  q3_methods: {
    i: "ใช้ยาคุม",
    ii: "ใช้ยาฆ่า",
    iii: "ใช้สารจุลินทรีย์/สารสกัดจุลินทรีย์",
    iv: "ใช้คนดาย",
    v: "วิธีอื่น (ระบุในข้อความ)",
  },
  q6_methods: {
    i: "ใช้ยาตามคำแนะ",
    ii: "ใช้ยาตามความเหมาะสมของแปลง",
    iii: "ขุดออก",
    iv: "ใช้ศัตรูธรรมชาติ",
    v: "วิธีอื่น (ระบุในข้อความ)",
  },
  q8_methods: {
    i: "หมั่นสำรวจ และใช้ยาฉีดเมื่อพบการระบาดเกิน 10%",
    ii: "หมั่นสำรวจ และกำจัดด้วยแรงงาน",
    iii: "หมั่นสำรวจ และใช้ศัตรูธรรมชาติจัดการ เช่น แตนเบียน แมลงหางหนีบ",
    iv: "วิธีอื่น (ระบุในข้อความ)",
  },
  q10_multi: {
    i: "ไว้ใบ 100% เพื่อเก็บความชื้น ลดวัชพืช",
    ii: "ไว้ใบ 30% ตามแถวอ้อย เพื่อเก็บความชื้น ลดวัชพืช",
    iii: "ใช้ปุ๋ยอินทรีย์หรือวัสดุปรับปรุงดิน เพื่อเพิ่มการอุ้มน้ำในดิน",
    iv: "วิธีอื่น (ระบุในข้อความ)",
  },
  q12_a: {
    i: "ให้ช่วงเวลาใด ปริมาณเท่าไหร่ ก็ได้",
    ii: "ให้ในช่วงเวลา เช้า หรือกลางคืน เพื่อไม่ให้น้ำร้อนจนเกินไปสำหรับอ้อย",
    iii: "ให้น้ำมากกว่า 20 ชั่วโมงต่อครั้ง",
    iv: "ให้น้ำโดยทยอยแบ่งให้ ครั้งละ 8-10 ชั่วโมง ดูตามความชื้นของดิน",
  },
  q12_b: {
    i: "ให้ช่วงเวลาใด ปริมาณเท่าไหร่ ก็ได้",
    ii: "ให้น้ำได้เฉพาะช่วงเวลากลางวัน 8-12 ชม.",
  },
  q13_multi: {
    i: "บ่อบาดาล",
    ii: "สระเก็บน้ำ",
    iii: "วิธีอื่น (ระบุในข้อความ)",
  },
  q16_multi: {
    a: "ปุ๋ยคุณภาพดี ใช้แล้วอ้อยงาม",
    b: "ปุ๋ยราคาถูก",
    c: "บริการส่งถึงบ้าน",
    d: "เกี๊ยวปุ๋ยไม่ต้องมีหลักทรัพย์ (สำหรับรายที่ไม่ได้เกี๊ยวปกติ หรือซื้อเงินสดเป็นประจำ)",
    e: "อื่นๆ (ระบุในข้อความ)",
  },
  q24_uses: {
    i: "ปุ๋ยอินทรีย์ผง",
    ii: "ปุ๋ยอินทรีย์เม็ด",
    iii: "ปุ๋ยอินทรีย์จากที่อื่น ที่ไม่ใช่ของโรงงาน",
    iv: "วัสดุปรับปรุงดินอื่น เช่น ขี้ไก่ (ระบุในข้อความ)",
    v: "ไม่ได้ใส่",
  },
  q24_how: {
    i: "ใส่รองพื้น",
    ii: "ใส่บำรุงได้ดี โดยไม่ต้องรอฝน",
    iii: "ใส่ช่วงฝนมา พร้อมปุ๋ย",
  },
  q24_rate: {
    i: "2 ตัน/ไร่",
    ii: "1 ตัน/ไร่",
    iii: "500 กก./ไร่",
    iv: "200 กก./ไร่",
    v: "ต่ำกว่า 200 กก./ไร่ (4 กระสอบ)",
  },
  q25_opts: {
    i: "ช่วยเก็บความชื้นในดิน อุ้มน้ำ ต้านทานภัยแล้ง",
    ii: "ช่วยเก็บและปลดปล่อยปุ๋ยที่อ้อยยังย่อยไม่ได้ให้อยู่ในรูปที่อ้อยกินได้",
    iii: "ช่วยลดการสะสมของสารเคมีที่ใช้ในไร่เป็นเวลานาน",
    iv: "ช่วยปรับสภาพดินให้ทนต่อความเป็นกรดด่างเบื้องต้น",
    v: "อื่นๆ (ระบุในข้อความ)",
  },
  q35_multi: {
    factor: "ปัจจัยการผลิต (ระบุรายละเอียด)",
    budget: "วงเงิน (ระบุรายละเอียด)",
    water: "สร้างแหล่งน้ำ (ระบุรายละเอียด)",
    other: "อื่นๆ (ระบุรายละเอียด)",
  },
  q36_multi: {
    a: "ไปเที่ยว (ระบุสถานที่ในข้อความ)",
    b: "ตั๋วส่วนลดปุ๋ยบำรุง (ระบุสูตร)",
    c: "ตั๋วส่วนลดค่ายา กำจัด วัชพืช โรค แมลง (ระบุยา)",
    d: "ตั๋วส่วนลดปุ๋ยอินทรีย์ (ระบุจำนวน)",
    e: "ตั๋วส่วนลดค่าน้ำมัน (ระบุประเภท)",
    f: "ตั๋วส่วนลดค่าพันธุ์อ้อย (ระบุพันธุ์)",
    g: "อื่นๆ (ระบุ)",
  },
};

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

function mapMulti(multiKey: string, codes: string[]): string {
  const m = MULTI[multiKey];
  if (!m || codes.length === 0) return "";
  return codes.map((c) => m[c] ?? `รหัส ${c}`).join("；");
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
  section: (typeof SECTION)[keyof typeof SECTION],
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
  const sec = SECTION.profile;
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
    pushFact(out, sec, "farmer_role", null, `บทบาทในพื้นที่: ${farmerRoleLabel(role)}${other ? ` — ระบุเพิ่ม: ${other}` : ""}`);
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
    pushFact(out, sec, "checkin", null, [`เช็คอินถ่ายรูปในพื้นที่`, photo ? `รูป: ${photo}` : "", taken ? `เวลา: ${taken}` : "", geo].filter(Boolean).join("\n"));
  }

  return out;
}

function decodeQ10(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q10");
  const q10 = qObj(answers, "q10");
  const choice = str(q10.choice);
  const multi = mapMulti("q10_multi", qArr(answers, "q10_multi"));
  const lines: string[] = [Q_TITLE.q10];
  if (choice === "a") {
    lines.push("คำตอบหลัก: มีวิธีรักษาความชื้น");
    if (multi) lines.push(`วิธีที่เลือก: ${multi}`);
    const other = str(q10.other);
    if (other) lines.push(`ระบุวิธีอื่น: ${other}`);
  } else if (choice === "b") {
    lines.push("คำตอบหลัก: ยังไม่มีวิธีจัดการความชื้น");
    const cause = str(q10.cause);
    const fix = str(q10.fix);
    if (cause) lines.push(`สาเหตุ: ${cause}`);
    if (fix) lines.push(`ถ้าย้อนเวลาได้จะแก้อย่างไร: ${fix}`);
  } else if (choice) {
    lines.push(`คำตอบหลัก (รหัส): ${choice}`);
  }
  pushFact(out, sec, "q10", null, lines.join("\n"));
  return out;
}

function decodeQ12(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q12");
  const q12 = qObj(answers, "q12");
  const choice = str(q12.choice);
  const lines = [Q_TITLE.q12];
  if (choice === "a") {
    lines.push("เลือกกลุ่ม: ให้น้ำหลังปลูก");
    lines.push(`รายการ: ${mapMulti("q12_a", qArr(answers, "q12_a"))}`);
  } else if (choice === "b") {
    lines.push("เลือกกลุ่ม: ให้น้ำหลังตัด");
    lines.push(`รายการ: ${mapMulti("q12_b", qArr(answers, "q12_b"))}`);
    const heat = str(q12.heat);
    if (heat) lines.push(`อุณหภูมิน้ำ/หมายเหตุ: ${heat}`);
  } else if (choice) lines.push(`รหัสกลุ่ม: ${choice}`);
  pushFact(out, sec, "q12", null, lines.join("\n"));
  return out;
}

function decodeQ13(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q13");
  const q13 = qObj(answers, "q13");
  const choice = str(q13.choice);
  const lines = [Q_TITLE.q13];
  if (choice === "a") {
    lines.push("มีแหล่งน้ำ");
    lines.push(`แหล่งน้ำที่ใช้: ${mapMulti("q13_multi", qArr(answers, "q13_multi"))}`);
    const other = str(q13.other);
    if (other) lines.push(`ระบุวิธีอื่น: ${other}`);
  } else if (choice === "b") {
    lines.push("ไม่มีแหล่งน้ำ");
    const cause = str(q13.cause);
    if (cause) lines.push(`สาเหตุ: ${cause}`);
  }
  pushFact(out, sec, "q13", null, lines.join("\n"));
  return out;
}

function decodeQ14(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q14");
  const q14 = qObj(answers, "q14");
  const lines = [Q_TITLE.q14];
  const a = str(q14.a);
  const b = str(q14.b);
  const c = str(q14.c);
  const detail = str(q14.detail);
  if (a) lines.push(`หลังปลูก: ${a === "a" ? "ให้ทันที" : a === "b" ? "ไม่ให้ทันที" : a}`);
  if (b) lines.push(`หลังตัด: ${b === "a" ? "ให้ทันที" : b === "b" ? "ไม่ให้ทันที" : b}`);
  if (c) lines.push(`หลังตัด (ช่วง): ${c}`);
  if (detail) lines.push(`รายละเอียด: ${detail}`);
  pushFact(out, sec, "q14", null, lines.join("\n"));
  return out;
}

function decodeQ24(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q24");
  const q24 = qObj(answers, "q24");
  const uses = qArr(answers, "q24_uses");
  const lines = [Q_TITLE.q24];
  if (uses.length) lines.push(`การใช้ปุ๋ยอินทรีย์/วัสดุ: ${mapMulti("q24_uses", uses)}`);
  if (!uses.includes("v") && uses.length) {
    lines.push(`วิธีการใส่: ${mapMulti("q24_how", qArr(answers, "q24_how"))}`);
    lines.push(`อัตราที่ใส่: ${mapMulti("q24_rate", qArr(answers, "q24_rate"))}`);
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
  pushFact(out, sec, "q24", null, lines.join("\n"));
  return out;
}

function decodeQ16(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q16");
  const multi = mapMulti("q16_multi", qArr(answers, "q16_multi"));
  const other = str(qObj(answers, "q16").other);
  if (!multi && !other) return out;
  const lines = [Q_TITLE.q16];
  if (multi) lines.push(`ความคาดหวังที่เลือก: ${multi}`);
  if (other) lines.push(`อื่นๆ (ระบุ): ${other}`);
  pushFact(out, sec, "q16", null, lines.join("\n"));
  return out;
}

function decodeQ25(answers: Record<string, unknown>): DecodedFactLine[] {
  const out: DecodedFactLine[] = [];
  const sec = sectionForQuestionKey("q25");
  const opts = mapMulti("q25_opts", qArr(answers, "q25_opts"));
  const otherText = str(qObj(answers, "q25").otherText);
  if (!opts && !otherText) return out;
  const lines = [Q_TITLE.q25];
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
  const lines = [Q_TITLE.q27];
  for (const code of multi) {
    if (code === "a") lines.push(`- ปุ๋ย: ${str(q27.fertilizer) || "(ไม่ระบุรายละเอียด)"}`);
    if (code === "b") lines.push(`- ต้นทุนการจัดการ: ${str(q27.cost) || "(ไม่ระบุ)"}`);
    if (code === "c") lines.push(`- น้ำมัน: ${str(q27.oil) || "(ไม่ระบุ)"}`);
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
  const lines = [Q_TITLE.q35];
  for (const code of multi) {
    const label = MULTI.q35_multi[code] ?? code;
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
  const lines = [Q_TITLE.q36];
  for (const code of codes) {
    const head = MULTI.q36_multi[code] ?? `รางวัล ${code}`;
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

/** Generic q object: choice a/b/c + common text fields */
function decodeGenericQuestion(qKey: string, answers: Record<string, unknown>): DecodedFactLine[] {
  if (["q10", "q12", "q13", "q14", "q16", "q24", "q25", "q27", "q35", "q36"].includes(qKey)) return [];
  const obj = qObj(answers, qKey);
  if (Object.keys(obj).length === 0 && !qArr(answers, `${qKey}_methods`).length) return [];

  const sec = sectionForQuestionKey(qKey);
  const title = Q_TITLE[qKey] ?? qKey;
  const lines: string[] = [title];

  const methodsKey = `${qKey}_methods`;
  const methods = qArr(answers, methodsKey);
  if (methods.length) lines.push(`${methodsKey}: ${mapMulti(methodsKey, methods)}`);

  const choice = str(obj.choice);
  if (choice) lines.push(`ตัวเลือกหลัก (รหัส): ${choice}`);

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
  const sec = SECTION.satisfaction;
  const title = Q_TITLE[qKey] ?? `ข้อ ${n}`;
  const lines = [
    title,
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
      SECTION.satisfaction,
      "q34",
      null,
      [
        Q_TITLE.q34,
        `ตันต่อไร่ปีที่แล้ว: ${str(q34.tonsPast) || "-"}`,
        `เป้าหมายปีหน้า: ${str(q34.tonsTarget) || "-"}`,
      ].join("\n"),
    );
  }

  return out;
}
