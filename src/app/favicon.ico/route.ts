import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  // Browsers request /favicon.ico specifically
  const filePath = path.join(process.cwd(), "public", "brand", "favicon-32.png");
  const bytes = await readFile(filePath);
  return new Response(bytes, {
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}

