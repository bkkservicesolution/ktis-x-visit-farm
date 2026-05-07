import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { getHeart4RoomsExportJob, markHeart4RoomsExportJobCancelled } from "@/lib/heart4roomsExportJobs";

export const runtime = "nodejs";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export async function POST(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { jobId } = await ctx.params;
  const job = getHeart4RoomsExportJob(jobId);
  if (!job) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  markHeart4RoomsExportJobCancelled(jobId);
  return NextResponse.json({ ok: true });
}

