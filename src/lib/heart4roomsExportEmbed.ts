/**
 * Embedding check-in photos in Excel requires fetching each URL (+ sharp).
 * On serverless Vercel that often exceeds the platform time limit (~1k+ rows).
 *
 * Override order: query embed_images → env HEART4ROOMS_EXPORT_EMBED_IMAGES →
 * default: false on VERCEL=1, true elsewhere.
 */
export function resolveHeart4RoomsEmbedImages(searchParams?: URLSearchParams): boolean {
  const q = searchParams?.get("embed_images")?.trim().toLowerCase();
  if (q === "1" || q === "true") return true;
  if (q === "0" || q === "false") return false;

  const e = process.env.HEART4ROOMS_EXPORT_EMBED_IMAGES?.trim().toLowerCase();
  if (e === "1" || e === "true") return true;
  if (e === "0" || e === "false") return false;

  return process.env.VERCEL !== "1";
}
