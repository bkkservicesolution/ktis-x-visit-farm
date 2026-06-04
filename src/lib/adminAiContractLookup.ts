/**
 * Lookup farmer / check-in coordinates by contract number (Heart4Rooms snapshot).
 */
const CHECKIN_SECTION_TITLE = "เช็คอิน — พิกัดและเวลาถ่ายรูป";

type SurveyRow = {
  id: string;
  created_at: string;
  contract_no: string;
  farmer_first_name: string;
  farmer_last_name: string;
  submitter_display_name: string;
  promoter_id: string | null;
  answers: unknown;
  attachments: unknown;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();
}

function parseNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function extractContractNoFromQuestion(text: string): string | null {
  const explicit = text.match(/(?:เลขที่สัญญา|เลขสัญญา|สัญญา(?:เลข)?)\s*[:#]?\s*([0-9][0-9\s-]{3,}[0-9])/u);
  if (explicit?.[1]) return explicit[1].replace(/[\s-]/g, "");

  const digits = text.match(/\b([0-9]{5,12})\b/);
  if (digits?.[1]) return digits[1];

  return null;
}

export function isContractLookupQuestion(text: string): boolean {
  const hasContractSignal =
    /ขอพิกัด|(?:พิกัด|ตำแหน่ง|พิกัดแปลง|check[\s-]?in|เช็คอิน)/iu.test(text) ||
    /(?:เลขที่สัญญา|เลขสัญญา|สัญญา)/u.test(text) ||
    /(?:ข้อมูล|รายละเอียด).*(?:สัญญา|แปลง)/u.test(text);

  return hasContractSignal && /\d{4,}/.test(text);
}

function contractCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  const set = new Set<string>();
  if (trimmed) set.add(trimmed);
  if (digits) {
    set.add(digits);
    set.add(digits.padStart(6, "0"));
    const noLead = digits.replace(/^0+/, "");
    if (noLead) set.add(noLead);
  }
  return [...set];
}

function getAttachmentsObj(attachments: unknown): Record<string, unknown> {
  if (!attachments || typeof attachments !== "object" || Array.isArray(attachments)) return {};
  return attachments as Record<string, unknown>;
}

function resolveCheckinPhotoUrl(row: SurveyRow): string {
  const fromAtt = str(getAttachmentsObj(row.attachments).checkin_photo);
  if (fromAtt) return fromAtt;

  if (!row.answers || typeof row.answers !== "object" || Array.isArray(row.answers)) return "";
  const checkin = (row.answers as Record<string, unknown>).checkin;
  if (!checkin || typeof checkin !== "object" || Array.isArray(checkin)) return "";
  return str((checkin as Record<string, unknown>).photo_url);
}

function parseCheckin(answers: unknown): {
  lat: number | null;
  lng: number | null;
  takenAt: string | null;
} {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return { lat: null, lng: null, takenAt: null };
  }
  const checkin = (answers as Record<string, unknown>).checkin;
  if (!checkin || typeof checkin !== "object" || Array.isArray(checkin)) {
    return { lat: null, lng: null, takenAt: null };
  }
  const c = checkin as Record<string, unknown>;
  return {
    lat: parseNum(c.lat),
    lng: parseNum(c.lng),
    takenAt: str(c.taken_at) || null,
  };
}

/** รูปแบบเดียวกับคอลัมน์ Excel `เช็คอิน — พิกัดและเวลาถ่ายรูป` */
function formatCheckinMetaLines(lat: number | null, lng: number | null, takenAt: string | null): string[] {
  const latS = lat != null ? String(lat) : "";
  const lngS = lng != null ? String(lng) : "";
  const taken = takenAt ? formatCheckinTime(takenAt) : "";

  const lines = [
    latS ? `ละติจูด: ${latS}` : "",
    lngS ? `ลองจิจูด: ${lngS}` : "",
    taken ? `เวลาถ่ายรูป: ${taken}` : "",
  ].filter(Boolean);

  if (lines.length === 0) {
    return ["(ไม่มีพิกัดหรือเวลาถ่ายรูปในแบบสำรวจนี้)"];
  }

  return lines;
}

function formatCheckinTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" });
}

async function queryByContract(contractRaw: string): Promise<SurveyRow[]> {
  const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
  const candidates = contractCandidates(contractRaw);

  for (const contractNo of candidates) {
    const { data, error } = await supabaseAdmin()
      .from("heart4rooms_surveys_snapshot_v1")
      .select(
        "id,created_at,contract_no,farmer_first_name,farmer_last_name,submitter_display_name,promoter_id,answers,attachments",
      )
      .eq("contract_no", contractNo)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw new Error(error.message);
    if (data?.length) return data as SurveyRow[];
  }

  const digits = contractRaw.replace(/\D/g, "");
  if (digits) {
    const { data, error } = await supabaseAdmin()
      .from("heart4rooms_surveys_snapshot_v1")
      .select(
        "id,created_at,contract_no,farmer_first_name,farmer_last_name,submitter_display_name,promoter_id,answers,attachments",
      )
      .ilike("contract_no", `%${digits}%`)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw new Error(error.message);
    if (data?.length) return data as SurveyRow[];
  }

  return [];
}

function formatSurveyDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Bangkok" });
}

function findRowsByContract(rows: SurveyRow[], contractRaw: string): SurveyRow[] {
  const candidates = contractCandidates(contractRaw);
  for (const contractNo of candidates) {
    const hits = rows
      .filter((r) => r.contract_no === contractNo)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5);
    if (hits.length) return hits;
  }
  const digits = contractRaw.replace(/\D/g, "");
  if (digits) {
    return rows
      .filter((r) => r.contract_no.includes(digits))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5);
  }
  return [];
}

export function tryAnswerContractLookupFromRows(question: string, rows: SurveyRow[]): string | null {
  if (!isContractLookupQuestion(question)) return null;

  const contractQuery = extractContractNoFromQuestion(question);
  if (!contractQuery) return null;

  const matched = findRowsByContract(rows, contractQuery);
  if (matched.length === 0) {
    return [
      `ไม่พบแบบสำรวจสำหรับเลขสัญญา "${contractQuery}"`,
      "ลองตรวจเลขสัญญาอีกครั้ง หรืออัปเดตไฟล์ Export JSON บนเครื่อง AI",
    ].join("\n");
  }

  const row = matched[0];
  const name = `${row.farmer_first_name} ${row.farmer_last_name}`.trim() || "—";
  const { lat, lng, takenAt } = parseCheckin(row.answers);
  const photoUrl = resolveCheckinPhotoUrl(row);

  const lines: string[] = [
    `เลขสัญญา: ${row.contract_no}`,
    `ชื่อเกษตรกร: ${name}`,
    `ผู้กรอกแบบ: ${row.submitter_display_name || "—"}`,
    row.promoter_id ? `รหัสนักส่งเสริม: ${row.promoter_id}` : null,
    `วันที่บันทึกแบบสำรวจ: ${formatSurveyDateTime(row.created_at)}`,
    "",
    CHECKIN_SECTION_TITLE,
    ...formatCheckinMetaLines(lat, lng, takenAt),
  ].filter((x): x is string => Boolean(x));

  if (lat != null && lng != null) {
    lines.push("", `เปิดแผนที่: https://www.google.com/maps?q=${lat},${lng}`);
  }

  if (photoUrl) {
    lines.push("", `ถ่ายรูปเช็คอินหน้างาน (ลิงก์สำรอง): ${photoUrl}`);
  }

  if (matched.length > 1) {
    lines.push("", `หมายเหตุ: พบ ${matched.length} แบบที่ตรงเลขสัญญา — แสดงรายการล่าสุด`);
  }

  return lines.join("\n");
}

export async function tryAnswerContractLookup(question: string): Promise<string | null> {
  if (!isContractLookupQuestion(question)) return null;

  const contractQuery = extractContractNoFromQuestion(question);
  if (!contractQuery) return null;

  const rows = await queryByContract(contractQuery);
  if (rows.length === 0) {
    return [
      `ไม่พบแบบสำรวจใน Snapshot สำหรับเลขสัญญา "${contractQuery}"`,
      "ลองตรวจเลขสัญญาอีกครั้ง หรืออัปเดต Snapshot ที่หน้าจัดการ RAG Index หากเพิ่งบันทึกแบบใหม่",
    ].join("\n");
  }

  const row = rows[0];
  const name = `${row.farmer_first_name} ${row.farmer_last_name}`.trim() || "—";
  const { lat, lng, takenAt } = parseCheckin(row.answers);
  const photoUrl = resolveCheckinPhotoUrl(row);

  const lines: string[] = [
    `เลขสัญญา: ${row.contract_no}`,
    `ชื่อเกษตรกร: ${name}`,
    `ผู้กรอกแบบ: ${row.submitter_display_name || "—"}`,
    row.promoter_id ? `รหัสนักส่งเสริม: ${row.promoter_id}` : null,
    `วันที่บันทึกแบบสำรวจ: ${formatSurveyDateTime(row.created_at)}`,
    "",
    CHECKIN_SECTION_TITLE,
    ...formatCheckinMetaLines(lat, lng, takenAt),
  ].filter((x): x is string => Boolean(x));

  if (lat != null && lng != null) {
    lines.push("", `เปิดแผนที่: https://www.google.com/maps?q=${lat},${lng}`);
  }

  if (photoUrl) {
    lines.push("", `ถ่ายรูปเช็คอินหน้างาน (ลิงก์สำรอง): ${photoUrl}`);
  }

  if (rows.length > 1) {
    lines.push("", `หมายเหตุ: พบ ${rows.length} แบบที่ตรงเลขสัญญา — แสดงรายการล่าสุด`);
  }

  return lines.join("\n");
}
