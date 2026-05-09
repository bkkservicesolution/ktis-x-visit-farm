import { NextResponse } from "next/server";
import { getHeart4RoomsExportApiMode } from "@/lib/heart4roomsExportMode";

/** Tells the admin UI whether to use job+SSE vs one-shot GET export (Vercel-safe). */
export async function GET() {
  return NextResponse.json({ mode: getHeart4RoomsExportApiMode() });
}
