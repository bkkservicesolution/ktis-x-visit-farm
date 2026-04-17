import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const filePath = path.join(process.cwd(), "public", "brand", "logo.png");
  const bytes = await readFile(filePath);
  return new Response(bytes, {
    headers: {
      // Browsers request /favicon.ico specifically; PNG is widely accepted.
      "content-type": "image/png",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}

