import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { getHeart4RoomsExportJob } from "@/lib/heart4roomsExportJobs";

export const runtime = "nodejs";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

/** One-shot JSON สำหรับ poll fallback เมื่อ SSE หลุด — เบา ไม่กิน connection ค้าง */
export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { jobId } = await ctx.params;
  const job = getHeart4RoomsExportJob(jobId);
  if (!job) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json(
    {
      ok: true,
      id: job.id,
      status: job.status,
      stage: job.stage ?? null,
      done: job.progress.done,
      total: job.progress.total,
      filename: job.filename ?? null,
      error: job.error ?? null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
