import type { Heart4ExportRow } from "@/lib/heart4roomsExport";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const EXPORT_COLUMNS =
  "id,created_at,created_by_username,promoter_id,submitter_display_name,farmer_first_name,farmer_last_name,contract_no,answers,attachments";

/** ขนาดช่วงต่อคำขอ — หยุดเมื่อได้ 0 แถว (รองรับทั้ง max-rows = 1000 และค่าอื่นที่เซิร์ฟเวอร์ตัดให้เล็กลง) */
const RANGE_PAGE = 1000;

export type Heart4RoomsExportFetchFilters = {
  ids: string[];
  promoter_id: string;
  from: string;
  to: string;
  q: string;
};

/** ดึงข้อมูลครบทุกแถวที่ตรงตัวกรอง (ไม่โดนฝั่งจำกัด ~1000 แถวต่อคำขอเดียว) */
export async function fetchAllHeart4RoomsSurveysForExport(
  filters: Heart4RoomsExportFetchFilters,
): Promise<{ rows: Heart4ExportRow[]; error: string | null }> {
  const rows: Heart4ExportRow[] = [];
  let offset = 0;

  for (;;) {
    let query = supabaseAdmin()
      .from("heart4rooms_surveys")
      .select(EXPORT_COLUMNS)
      .order("created_at", { ascending: false });

    if (filters.ids.length > 0) query = query.in("id", filters.ids);
    if (filters.promoter_id) query = query.eq("promoter_id", filters.promoter_id);
    if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) {
      query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
    }
    if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) {
      query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
    }
    if (filters.q) {
      query = query.or(
        [
          `contract_no.ilike.%${filters.q}%`,
          `farmer_first_name.ilike.%${filters.q}%`,
          `farmer_last_name.ilike.%${filters.q}%`,
          `submitter_display_name.ilike.%${filters.q}%`,
        ].join(","),
      );
    }

    const { data, error } = await query.range(offset, offset + RANGE_PAGE - 1);
    if (error) return { rows: [], error: error.message };
    const chunk = (data ?? []) as Heart4ExportRow[];
    if (chunk.length === 0) break;
    rows.push(...chunk);
    offset += chunk.length;
  }

  return { rows, error: null };
}
