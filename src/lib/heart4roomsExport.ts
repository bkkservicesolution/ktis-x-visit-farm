import ExcelJS from "exceljs";

export type LabelMap = {
  questions: Record<string, string>;
  choices: Record<string, Record<string, string>>;
  multi: Record<string, Record<string, string>>;
};

export type Heart4ExportRow = {
  id: string;
  created_at: string;
  created_by_username: string | null;
  promoter_id: string | null;
  submitter_display_name: string;
  farmer_first_name: string;
  farmer_last_name: string;
  contract_no: string;
  answers: unknown;
  attachments: unknown;
};

export type Heart4RoomsExportProgress = {
  done: number;
  total: number;
};

/** Fixes labels where extract-heart4rooms-map.mjs merged keys incorrectly */
function patchLabelMap(map: LabelMap): LabelMap {
  const choices = { ...map.choices };
  choices.q3 = {
    a: "a. ทันเวลา หญ้าไม่รก เพราะจัดการด้วยวิธี (ตอบได้มากกว่า 1 ข้อ)",
    b: "b. ไม่ทันเวลา หญ้ารก",
  };
  choices.q4 = {
    a: "a. พบในแปลง",
    b: "b. ไม่พบในแปลง",
    c: "c. เคยพบของแปลงคนอื่น : โปรดระบุชื่อชาวไร่เจ้าของที่ทำ หรือตำแหน่งแปลงนั้น",
  };
  choices.q5 = {
    a: "a. มี : โปรดระบุ",
    b: "b. ไม่มี",
  };
  choices.q17 = {
    a: "a. ใช้",
    b: "b. ไม่ใช้",
  };
  choices.q15 = {
    a: "a. มี : โปรดระบุ",
    b: "b. ไม่มี",
  };
  choices.q18 = {
    a: "a. เคยใช้ แต่ปัจจุบันไม่ใช้",
    b: "b. ปัจจุบันใช้ และอนาคตก็จะใช้",
    c: "c. ทั้งอดีต ปัจจุบัน และอนาคต จะไม่ขอใช้",
  };
  choices.q26 = {
    a: "a. ทราบแล้ว",
    b: "b. ยังไม่ทราบ",
    c: "c. กังวล เพราะ …",
  };
  const questions = {
    ...map.questions,
    q29:
      "ในปีที่ผ่านมา ท่านมีความพึงพอใจ ในเรื่องสนับสนุนการ “นำอ้อยเข้าหีบ” อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา",
    q30:
      "ในปีที่ผ่านมา ท่านมีความพึงพอใจ ในเรื่องสนับสนุนการ “ปลูกอ้อย” อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา",
    q31:
      "ในปีที่ผ่านมา ท่านมีความพึงพอใจ ในเรื่องสนับสนุนการ “การบำรุงอ้อย” อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา",
    q32:
      "ในปีที่ผ่านมา ท่านมีความพึงพอใจ ในเรื่องสนับสนุนการ “การบริการอื่นๆ และเกี๊ยว” อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา",
    q33: "ท่านมีความพึงพอใจในภาพรวม ต่อ นักส่งเสริมที่ดูแล อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา",
  };
  return { ...map, questions, choices };
}

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function getObj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? (v as string[]).filter((x) => typeof x === "string") : [];
}

function renderMulti(key: string, answers: Record<string, unknown>, map: LabelMap): string {
  const labels = arr(answers[key])
    .map((code) => map.multi[key]?.[code] ?? code)
    .filter(Boolean);
  return labels.join("; ");
}

function choiceLabel(qKey: string, code: string, map: LabelMap): string {
  const c = code.trim();
  if (!c) return "";
  return map.choices[qKey]?.[c] ?? c;
}

/** ชื่อฟิลด์เสริมใน JSON ให้ตรงคำถามในแบบฟอร์ม (ไม่ใช้ชื่อฟิลด์ภาษาอังกฤษดิบๆ) */
const EXTRA_FIELD_TH: Record<string, string> = {
  cause: "สาเหตุเพราะ",
  detail: "รายละเอียด",
  worry: "กังวล เพราะ",
  fix: "ถ้าย้อนเวลาได้จะแก้ไขอย่างไร",
  other: "อื่นๆ",
  otherMethod: "วิธีอื่น",
  otherDrug: "ตัวยา",
  otherFarmer: "ระบุชื่อชาวไร่/ตำแหน่งแปลง",
  heat: "จัดการความร้อนของน้ำ",
  otherText: "อื่นๆ (ระบุ)",
  otherSoil: "วัสดุปรับปรุงดินอื่น",
};

const EXTRA_FIELD_BY_QUESTION: Record<string, string> = {
  "q19.detail": "สาเหตุเพราะ",
};

function extraFieldLabel(qKey: string, field: string): string {
  const key = `${qKey}.${field}`;
  if (EXTRA_FIELD_BY_QUESTION[key]) return EXTRA_FIELD_BY_QUESTION[key];
  return EXTRA_FIELD_TH[field] ?? field;
}

/** Radio / choice object + extra string fields — readable text */
function renderChoiceBlock(qKey: string, answers: Record<string, unknown>, map: LabelMap): string {
  const v = getObj(answers[qKey]);
  const choice = s(v.choice);
  const main = choice ? choiceLabel(qKey, choice, map) : "";
  const extras: string[] = [];
  const skip = new Set(["choice"]);
  for (const [k, val] of Object.entries(v)) {
    if (skip.has(k)) continue;
    const sv = s(val);
    if (sv) extras.push(`${extraFieldLabel(qKey, k)}: ${sv}`);
  }
  if (main && extras.length) return `${main} | ${extras.join(" | ")}`;
  if (main) return main;
  return extras.join(" | ");
}

function joinLines(...parts: string[]): string {
  return parts.map((p) => p.trim()).filter(Boolean).join("\n");
}

/** รวมคำตอบหลัก + checkbox ในข้อเดียว (ลดช่องว่างจากสาขาที่ไม่ได้เลือก) */
function formatQ3(answers: Record<string, unknown>, map: LabelMap): string {
  const m = renderMulti("q3_methods", answers, map);
  return joinLines(renderChoiceBlock("q3", answers, map), m ? `วิธีจัดการวัชพืช: ${m}` : "");
}

function formatQ6(answers: Record<string, unknown>, map: LabelMap): string {
  const m = renderMulti("q6_methods", answers, map);
  return joinLines(renderChoiceBlock("q6", answers, map), m ? `วิธีจัดการแส้ดำ: ${m}` : "");
}

function formatQ8(answers: Record<string, unknown>, map: LabelMap): string {
  const m = renderMulti("q8_methods", answers, map);
  return joinLines(renderChoiceBlock("q8", answers, map), m ? `วิธีจัดการหนอนกอ: ${m}` : "");
}

function formatQ10(answers: Record<string, unknown>, map: LabelMap): string {
  const m = renderMulti("q10_multi", answers, map);
  return joinLines(renderChoiceBlock("q10", answers, map), m ? `วิธีรักษาความชื้นในดิน: ${m}` : "");
}

/** ข้อ 12: ตัวเลือกหลัก + q12_a หรือ q12_b + ความร้อน (โซล่า) ในคอลัมน์เดียว */
function formatQ12(answers: Record<string, unknown>, map: LabelMap): string {
  const q = getObj(answers.q12);
  const c = s(q.choice);
  const parts: string[] = [];
  if (c) parts.push(choiceLabel("q12", c, map));
  if (c === "a") {
    const m = renderMulti("q12_a", answers, map);
    if (m) parts.push(`วิธีให้น้ำ (ต้นกำลังเป็นเครื่องสูบน้ำ): ${m}`);
  } else if (c === "b") {
    const m = renderMulti("q12_b", answers, map);
    if (m) parts.push(`วิธีให้น้ำ (ต้นกำลังเป็นโซล่าเซลล์): ${m}`);
    const heat = s(q.heat);
    if (heat) parts.push(`จัดการความร้อนของน้ำ: ${heat}`);
  } else {
    const a = renderMulti("q12_a", answers, map);
    const b = renderMulti("q12_b", answers, map);
    if (a) parts.push(`วิธีให้น้ำ (เครื่องสูบ): ${a}`);
    if (b) parts.push(`วิธีให้น้ำ (โซล่า): ${b}`);
    const heat = s(q.heat);
    if (heat) parts.push(`จัดการความร้อนของน้ำ: ${heat}`);
  }
  return parts.join("\n");
}

function formatQ13(answers: Record<string, unknown>, map: LabelMap): string {
  const m = renderMulti("q13_multi", answers, map);
  return joinLines(
    renderChoiceBlock("q13", answers, map),
    m ? `รูปแบบแหล่งน้ำที่อยากสร้าง: ${m}` : "",
  );
}

function formatQ24Full(answers: Record<string, unknown>, map: LabelMap): string {
  const u = renderMulti("q24_uses", answers, map);
  const h = renderMulti("q24_how", answers, map);
  const r = renderMulti("q24_rate", answers, map);
  const other = s(getObj(answers.q24).otherSoil);
  return joinLines(
    u ? `(ก) การใช้ปุ๋ยอินทรีย์/วัสดุ: ${u}` : "",
    h ? `(ข) วิธีใส่: ${h}` : "",
    r ? `(ค) อัตรา: ${r}` : "",
    other ? `วัสดุปรับปรุงดินอื่น: ${other}` : "",
  );
}

function formatQ26Full(answers: Record<string, unknown>, map: LabelMap): string {
  const main = renderChoiceBlock("q26", answers, map);
  const worry = s(getObj(answers.q26).worry);
  return joinLines(main, worry ? `กังวล เพราะ: ${worry}` : "");
}

function formatQ34(answers: Record<string, unknown>): string {
  const q = getObj(answers.q34);
  return joinLines(
    s(q.tonsPast) ? `ตันต่อไร่ ปีที่แล้ว: ${s(q.tonsPast)}` : "",
    s(q.tonsTarget) ? `เป้าหมายตันต่อไร่ ปีหน้า: ${s(q.tonsTarget)}` : "",
  );
}

function formatCheckinMeta(answers: Record<string, unknown>): string {
  const c = getObj(answers.checkin);
  const lat = c.lat;
  const lng = c.lng;
  const latS = typeof lat === "number" ? String(lat) : s(lat);
  const lngS = typeof lng === "number" ? String(lng) : s(lng);
  const taken = typeof c.taken_at === "string" ? c.taken_at : "";
  return joinLines(
    latS ? `ละติจูด: ${latS}` : "",
    lngS ? `ลองจิจูด: ${lngS}` : "",
    taken ? `เวลาถ่ายรูป: ${taken}` : "",
  );
}

const Q14_A: Record<string, string> = {
  i: "i. ไม่มีแหล่งน้ำสำรองเลย ต้องรอฝนอย่างเดียว (อ้อยชะงักการเติบโต)",
  ii: "ii. มีสระหรือบ่อ แต่เก็บน้ำได้ไม่พอ บ่อตื้นเกินไป น้ำแห้งก่อนหมดหน้าแล้ง",
  iii: "iii. มีแหล่งน้ำ แต่วิธีการให้น้ำทำให้เปลืองน้ำ น้ำเลยหมดไว",
  iv: "iv. ไม่มีปัญหาเลย มีแหล่งน้ำและระบบน้ำเพียงพอตลอดปี",
};
const Q14_B: Record<string, string> = {
  i: "i. มีสระขนาด 1 งาน ให้น้ำถึง 60 ไร่ จำนวน 4 ครั้ง",
  ii: "ii. มีบ่อบาดาล 1 บ่อ ท่อหน้า 2 นิ้ว ให้น้ำอ้อยพื้นที่ 100 ไร่ จำนวน 4 ครั้ง",
  iii: "iii. ต้องคิดจากปริมาณการใช้น้ำจากพื้นที่ปลูก แล้วกำหนดวิธีการจัดหาแหล่งน้ำ",
};
const Q14_C: Record<string, string> = {
  i: "i. มีครบ สามารถให้ได้ทุกแปลง",
  ii: "ii. ยังไม่ครบ",
};

function formatQ14(answers: Record<string, unknown>): string {
  const q = getObj(answers.q14);
  const parts: string[] = [];
  const av = s(q.a);
  const bv = s(q.b);
  const cv = s(q.c);
  if (av) parts.push(`(a) ${Q14_A[av] ?? av}`);
  if (bv) parts.push(`(b) ${Q14_B[bv] ?? bv}`);
  if (cv) parts.push(`(c) ${Q14_C[cv] ?? cv}`);
  const detail = s(q.detail);
  if (detail) parts.push(`รายละเอียดแปลง: ${detail}`);
  return parts.join(" ; ");
}

function formatQ16(answers: Record<string, unknown>, map: LabelMap): string {
  const multi = renderMulti("q16_multi", answers, map);
  const q = getObj(answers.q16);
  const other = s(q.other);
  return [multi, other ? `อื่นๆ: ${other}` : ""].filter(Boolean).join(" | ");
}

function formatQ20(answers: Record<string, unknown>): string {
  const q = getObj(answers.q20);
  const pairs: [string, string][] = [
    ["รองพื้น สูตร", s(q.base_formula)],
    ["รองพื้น อัตรา", s(q.base_rate)],
    ["บำรุง สูตร", s(q.nourish_formula)],
    ["บำรุง อัตรา", s(q.nourish_rate)],
    ["แต่งหน้า สูตร", s(q.top_formula)],
    ["แต่งหน้า อัตรา", s(q.top_rate)],
  ];
  return pairs
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");
}

function formatQ22(answers: Record<string, unknown>): string {
  const q = getObj(answers.q22);
  const pairs: [string, string][] = [
    ["บำรุงหลังตัดทันที สูตร", s(q.cut_formula)],
    ["บำรุงหลังตัดทันที อัตรา", s(q.cut_rate)],
    ["บำรุง สูตร", s(q.nourish_formula)],
    ["บำรุง อัตรา", s(q.nourish_rate)],
    ["แต่งหน้า สูตร", s(q.top_formula)],
    ["แต่งหน้า อัตรา", s(q.top_rate)],
  ];
  return pairs
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" | ");
}

function formatQ23(answers: Record<string, unknown>): string {
  const q = getObj(answers.q23);
  const parts = [
    s(q.qty_21718) ? `สูตร 21-7-18: ${s(q.qty_21718)} กระสอบ` : "",
    s(q.qty_1688) ? `สูตร 16-8-8: ${s(q.qty_1688)} กระสอบ` : "",
    s(q.other_formula) || s(q.other_qty)
      ? `อื่นๆ: ${s(q.other_formula)} ${s(q.other_qty) ? `จำนวน ${s(q.other_qty)} กระสอบ` : ""}`.trim()
      : "",
  ];
  return parts.filter(Boolean).join(" | ");
}

function formatQ25(answers: Record<string, unknown>, map: LabelMap): string {
  const opts = renderMulti("q25_opts", answers, map);
  const q = getObj(answers.q25);
  const other = s(q.otherText);
  return [opts, other ? `อื่นๆ: ${other}` : ""].filter(Boolean).join(" | ");
}

function formatQ27(answers: Record<string, unknown>, map: LabelMap): string {
  const multi = renderMulti("q27_multi", answers, map);
  const q = getObj(answers.q27);
  const bits = [multi];
  if (s(q.fertilizer)) bits.push(`ปุ๋ย: ${s(q.fertilizer)}`);
  if (s(q.cost)) bits.push(`ต้นทุน: ${s(q.cost)}`);
  if (s(q.oil)) bits.push(`น้ำมัน: ${s(q.oil)}`);
  return bits.filter(Boolean).join(" | ");
}

function formatSatisfaction(n: number, answers: Record<string, unknown>): string {
  const q = getObj(answers[`q${n}`]);
  const score = s(q.score);
  const good = s(q.good);
  const improve = s(q.improve);
  const parts = [
    score ? `คะแนนความพึงพอใจ (เต็ม 10): ${score}` : "",
    good ? `เรื่องที่ทำได้ดี: ${good}` : "",
    improve ? `เรื่องที่ควรพัฒนา: ${improve}` : "",
  ];
  return parts.filter(Boolean).join("\n");
}

function formatQ35(answers: Record<string, unknown>, map: LabelMap): string {
  const qm = renderMulti("q35_multi", answers, map);
  const q = getObj(answers.q35);
  const bits = [qm];
  if (s(q.factor)) bits.push(`ปัจจัยการผลิต: ${s(q.factor)}`);
  if (s(q.budget)) bits.push(`วงเงิน: ${s(q.budget)}`);
  if (s(q.water)) bits.push(`แหล่งน้ำ: ${s(q.water)}`);
  if (s(q.other)) bits.push(`อื่นๆ: ${s(q.other)}`);
  return bits.filter(Boolean).join(" | ");
}

function q36SelectedCodes(answers: Record<string, unknown>): string[] {
  const multi = arr(answers.q36_multi);
  const q = getObj(answers.q36);
  const leg = s(q.choice);
  const ok = new Set(["a", "b", "c", "d", "e", "f", "g"]);
  if (multi.length > 0) return multi.filter((c) => ok.has(c));
  if (leg && ok.has(leg)) return [leg];
  return [];
}

function formatQ36(answers: Record<string, unknown>, map: LabelMap): string {
  const q = getObj(answers.q36);
  const codes = q36SelectedCodes(answers);
  const parts: string[] = [];
  for (const c of codes) {
    const main = choiceLabel("q36", c, map);
    const bits: string[] = [];
    if (c === "a" && s(q.travel_place)) bits.push(`สถานที่: ${s(q.travel_place)}`);
    if (c === "b" && s(q.fert_formula)) bits.push(`สูตรปุ๋ย: ${s(q.fert_formula)}`);
    if (c === "c" && s(q.chemical)) bits.push(`ยา: ${s(q.chemical)}`);
    if (c === "d" && s(q.organic_qty)) bits.push(`ปุ๋ยอินทรีย์: ${s(q.organic_qty)}`);
    if (c === "e" && s(q.water_type)) bits.push(`แหล่งน้ำ: ${s(q.water_type)}`);
    if (c === "f" && s(q.variety)) bits.push(`พันธุ์: ${s(q.variety)}`);
    if (c === "g" && s(q.other)) bits.push(`อื่นๆ: ${s(q.other)}`);
    parts.push(bits.length ? `${main} (${bits.join(", ")})` : main);
  }
  return parts.join(" | ");
}

function farmerRoleLabel(answers: Record<string, unknown>): string {
  const role = s(answers.farmer_role);
  const other = s(answers.farmer_role_other);
  if (role === "owner") return "เจ้าของไร่";
  if (role === "worker") return "ลูกไร่";
  if (role === "other") return other ? `อื่นๆ: ${other}` : "อื่นๆ";
  return "";
}

function getAttachments(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

export function getCheckinPhotoUrl(row: Heart4ExportRow): string {
  const att = getAttachments(row.attachments);
  const fromAtt = att.checkin_photo;
  if (typeof fromAtt === "string" && fromAtt.trim()) return fromAtt.trim();
  const answers = getObj(row.answers);
  const checkin = getObj(answers.checkin);
  const u = checkin.photo_url;
  return typeof u === "string" ? u.trim() : "";
}

export type ExportColumn = {
  header: string;
  width: number;
  text: (row: Heart4ExportRow, map: LabelMap) => string;
};

/** Same order as admin preview: meta → role → หน้า1…9 ตาม Heart4SurveySteps + เช็คอินรูปท้ายสุด */
export function buildExportColumns(map: LabelMap): ExportColumn[] {
  const qTitle = (key: string, short: string) =>
    map.questions[key] ? `${short}. ${map.questions[key]}` : short;

  const cols: ExportColumn[] = [
    { header: "วันเวลาบันทึก", width: 22, text: (r) => formatTs(r.created_at) },
    { header: "ผู้บันทึก (username)", width: 18, text: (r) => r.created_by_username ?? "" },
    { header: "promoter_id", width: 14, text: (r) => r.promoter_id ?? "" },
    { header: "ชื่อผู้กรอกแบบฟอร์ม", width: 22, text: (r) => r.submitter_display_name },
    { header: "ชื่อเกษตรกร", width: 16, text: (r) => r.farmer_first_name },
    { header: "นามสกุลเกษตรกร", width: 16, text: (r) => r.farmer_last_name },
    { header: "เลขที่สัญญา", width: 14, text: (r) => r.contract_no },
    { header: "มีสถานะเป็น", width: 16, text: (r) => farmerRoleLabel(getObj(r.answers)) },
    {
      header: "ระบุสถานะอื่น (ถ้ามี)",
      width: 24,
      text: (r) => s(getObj(r.answers).farmer_role_other),
    },
    { header: qTitle("q1", "ข้อ 1"), width: 52, text: (r, m) => renderChoiceBlock("q1", getObj(r.answers), m) },
    { header: qTitle("q2", "ข้อ 2"), width: 52, text: (r, m) => renderChoiceBlock("q2", getObj(r.answers), m) },
    { header: qTitle("q3", "ข้อ 3"), width: 56, text: (r, m) => formatQ3(getObj(r.answers), m) },
    { header: qTitle("q4", "ข้อ 4"), width: 40, text: (r, m) => renderChoiceBlock("q4", getObj(r.answers), m) },
    { header: qTitle("q5", "ข้อ 5"), width: 40, text: (r, m) => renderChoiceBlock("q5", getObj(r.answers), m) },
    { header: qTitle("q6", "ข้อ 6"), width: 56, text: (r, m) => formatQ6(getObj(r.answers), m) },
    { header: qTitle("q7", "ข้อ 7"), width: 40, text: (r, m) => renderChoiceBlock("q7", getObj(r.answers), m) },
    { header: qTitle("q8", "ข้อ 8"), width: 56, text: (r, m) => formatQ8(getObj(r.answers), m) },
    { header: qTitle("q9", "ข้อ 9"), width: 40, text: (r, m) => renderChoiceBlock("q9", getObj(r.answers), m) },
    { header: qTitle("q10", "ข้อ 10"), width: 56, text: (r, m) => formatQ10(getObj(r.answers), m) },
    { header: qTitle("q11", "ข้อ 11"), width: 36, text: (r, m) => renderChoiceBlock("q11", getObj(r.answers), m) },
    { header: qTitle("q12", "ข้อ 12"), width: 60, text: (r, m) => formatQ12(getObj(r.answers), m) },
    { header: qTitle("q13", "ข้อ 13"), width: 56, text: (r, m) => formatQ13(getObj(r.answers), m) },
    { header: qTitle("q14", "ข้อ 14"), width: 56, text: (r) => formatQ14(getObj(r.answers)) },
    { header: qTitle("q15", "ข้อ 15"), width: 40, text: (r, m) => renderChoiceBlock("q15", getObj(r.answers), m) },
    {
      header: "ข้อ 16 — ความคาดหวังโรงปุ๋ย (เลือกได้หลายข้อ)",
      width: 48,
      text: (r, m) => formatQ16(getObj(r.answers), m),
    },
    { header: qTitle("q17", "ข้อ 17"), width: 36, text: (r, m) => renderChoiceBlock("q17", getObj(r.answers), m) },
    { header: qTitle("q18", "ข้อ 18"), width: 44, text: (r, m) => renderChoiceBlock("q18", getObj(r.answers), m) },
    { header: qTitle("q19", "ข้อ 19"), width: 40, text: (r, m) => renderChoiceBlock("q19", getObj(r.answers), m) },
    { header: qTitle("q20", "ข้อ 20"), width: 52, text: (r) => formatQ20(getObj(r.answers)) },
    { header: qTitle("q21", "ข้อ 21"), width: 40, text: (r, m) => renderChoiceBlock("q21", getObj(r.answers), m) },
    { header: qTitle("q22", "ข้อ 22"), width: 52, text: (r) => formatQ22(getObj(r.answers)) },
    { header: qTitle("q23", "ข้อ 23"), width: 48, text: (r) => formatQ23(getObj(r.answers)) },
    { header: qTitle("q24", "ข้อ 24"), width: 56, text: (r, m) => formatQ24Full(getObj(r.answers), m) },
    { header: qTitle("q25", "ข้อ 25"), width: 48, text: (r, m) => formatQ25(getObj(r.answers), m) },
    { header: qTitle("q26", "ข้อ 26"), width: 52, text: (r, m) => formatQ26Full(getObj(r.answers), m) },
    { header: qTitle("q27", "ข้อ 27"), width: 52, text: (r, m) => formatQ27(getObj(r.answers), m) },
    { header: qTitle("q28", "ข้อ 28"), width: 40, text: (r, m) => renderChoiceBlock("q28", getObj(r.answers), m) },
    {
      header: `ข้อ 29 — ${map.questions.q29 ?? "ความพึงพอใจ"}`,
      width: 56,
      text: (r) => formatSatisfaction(29, getObj(r.answers)),
    },
    {
      header: `ข้อ 30 — ${map.questions.q30 ?? "ความพึงพอใจ"}`,
      width: 56,
      text: (r) => formatSatisfaction(30, getObj(r.answers)),
    },
    {
      header: `ข้อ 31 — ${map.questions.q31 ?? "ความพึงพอใจ"}`,
      width: 56,
      text: (r) => formatSatisfaction(31, getObj(r.answers)),
    },
    {
      header: `ข้อ 32 — ${map.questions.q32 ?? "ความพึงพอใจ"}`,
      width: 56,
      text: (r) => formatSatisfaction(32, getObj(r.answers)),
    },
    {
      header: `ข้อ 33 — ${map.questions.q33 ?? "ความพึงพอใจ"}`,
      width: 56,
      text: (r) => formatSatisfaction(33, getObj(r.answers)),
    },
    { header: qTitle("q34", "ข้อ 34"), width: 36, text: (r) => formatQ34(getObj(r.answers)) },
    { header: "ข้อ 35 — สนับสนุนเพื่อตันต่อไร่", width: 52, text: (r, m) => formatQ35(getObj(r.answers), m) },
    { header: qTitle("q36", "ข้อ 36"), width: 56, text: (r, m) => formatQ36(getObj(r.answers), m) },
    { header: qTitle("q37", "ข้อ 37"), width: 44, text: (r, m) => renderChoiceBlock("q37", getObj(r.answers), m) },
    { header: qTitle("q38", "ข้อ 38"), width: 40, text: (r, m) => renderChoiceBlock("q38", getObj(r.answers), m) },
    {
      header: "เช็คอิน — พิกัดและเวลาถ่ายรูป",
      width: 36,
      text: (r) => formatCheckinMeta(getObj(r.answers)),
    },
    {
      header: "ถ่ายรูปเช็คอินหน้างาน (ลิงก์สำรอง)",
      width: 52,
      text: (r) => getCheckinPhotoUrl(r),
    },
  ];

  return cols;
}

function formatTs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
}

async function fetchImageBuffer(
  url: string,
): Promise<{ buffer: Buffer; extension: "jpeg" | "png" | "gif" } | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") ?? "").toLowerCase();
    const buf = Buffer.from(await res.arrayBuffer());
    if (ct.includes("png")) return { buffer: buf, extension: "png" };
    if (ct.includes("gif")) return { buffer: buf, extension: "gif" };
    return { buffer: buf, extension: "jpeg" };
  } catch {
    return null;
  }
}

export async function buildHeart4RoomsExcelBuffer(rows: Heart4ExportRow[], map: LabelMap): Promise<Buffer> {
  const patched = patchLabelMap(map);
  const columns = buildExportColumns(patched);
  const imageCol0 = columns.length;

  const wb = new ExcelJS.Workbook();
  wb.creator = "KTIS Visit Farm";
  const ws = wb.addWorksheet("หัวใจ 4 ห้อง", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    ...columns.map((c) => ({ header: c.header, width: Math.min(60, c.width) })),
    { header: "ถ่ายรูปเช็คอินหน้างาน (แทรกรูป)", width: 42 },
  ];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const excelRowIndex = i + 2;
    const cellTexts = columns.map((c) => c.text(row, patched));
    const url = getCheckinPhotoUrl(row);
    const rowCells = [...cellTexts, ""];
    const added = ws.addRow(rowCells);
    if (url) added.height = 156;

    if (url) {
      const img = await fetchImageBuffer(url);
      if (img) {
        const imageId = wb.addImage({
          // exceljs expects Node Buffer; TS 5 buffer typing differs from Response buffers
          buffer: img.buffer as unknown as ExcelJS.Buffer,
          extension: img.extension,
        });
        ws.addImage(imageId, {
          tl: { col: imageCol0, row: excelRowIndex - 1 },
          ext: { width: 280, height: 210 },
        });
      }
    }

    for (let c = 1; c <= rowCells.length; c += 1) {
      const cell = ws.getCell(excelRowIndex, c);
      cell.alignment = { vertical: "top", wrapText: true };
    }
  }

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", wrapText: true };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function buildHeart4RoomsExcelBufferWithProgress(
  rows: Heart4ExportRow[],
  map: LabelMap,
  onProgress?: (p: Heart4RoomsExportProgress) => void,
): Promise<Buffer> {
  const patched = patchLabelMap(map);
  const columns = buildExportColumns(patched);
  const imageCol0 = columns.length;

  const wb = new ExcelJS.Workbook();
  wb.creator = "KTIS Visit Farm";
  const ws = wb.addWorksheet("หัวใจ 4 ห้อง", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    ...columns.map((c) => ({ header: c.header, width: Math.min(60, c.width) })),
    { header: "ถ่ายรูปเช็คอินหน้างาน (แทรกรูป)", width: 42 },
  ];

  const total = rows.length;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const excelRowIndex = i + 2;
    const cellTexts = columns.map((c) => c.text(row, patched));
    const url = getCheckinPhotoUrl(row);
    const rowCells = [...cellTexts, ""];
    const added = ws.addRow(rowCells);
    if (url) added.height = 156;

    if (url) {
      const img = await fetchImageBuffer(url);
      if (img) {
        const imageId = wb.addImage({
          buffer: img.buffer as unknown as ExcelJS.Buffer,
          extension: img.extension,
        });
        ws.addImage(imageId, {
          tl: { col: imageCol0, row: excelRowIndex - 1 },
          ext: { width: 280, height: 210 },
        });
      }
    }

    for (let c = 1; c <= rowCells.length; c += 1) {
      const cell = ws.getCell(excelRowIndex, c);
      cell.alignment = { vertical: "top", wrapText: true };
    }

    onProgress?.({ done: i + 1, total });
  }

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", wrapText: true };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
