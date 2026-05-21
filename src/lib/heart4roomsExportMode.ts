export type Heart4RoomsExportApiMode = "sync" | "job";

/**
 * Heart4Rooms export jobs use in-memory storage for SSE progress (same Node process).
 * On Vercel, PM2 cluster, or any multi-instance host, POST /jobs and GET /events
 * often hit different instances → job lookup 404.
 *
 * Default: `job` in development, `sync` in production (single request/response).
 * Override: HEART4ROOMS_EXPORT_MODE=sync|job
 */
export function getHeart4RoomsExportApiMode(): Heart4RoomsExportApiMode {
  const raw = process.env.HEART4ROOMS_EXPORT_MODE?.trim().toLowerCase();
  if (raw === "sync" || raw === "job") return raw;
  if (process.env.NODE_ENV === "production" || process.env.VERCEL === "1") return "sync";
  return "job";
}
