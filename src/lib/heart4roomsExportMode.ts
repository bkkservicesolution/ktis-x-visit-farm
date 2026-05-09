export type Heart4RoomsExportApiMode = "sync" | "job";

/**
 * Heart4Rooms export jobs use in-memory storage for SSE progress (same Node process).
 * On Vercel (and most multi-instance serverless hosts), POST /jobs and GET /events
 * often hit different instances → job lookup 404 → "เชื่อมต่อสถานะ export ไม่สำเร็จ".
 *
 * Default: `job` locally, `sync` when VERCEL=1 (no shared job store).
 * Override: HEART4ROOMS_EXPORT_MODE=sync|job
 */
export function getHeart4RoomsExportApiMode(): Heart4RoomsExportApiMode {
  const raw = process.env.HEART4ROOMS_EXPORT_MODE?.trim().toLowerCase();
  if (raw === "sync" || raw === "job") return raw;
  return process.env.VERCEL === "1" ? "sync" : "job";
}
