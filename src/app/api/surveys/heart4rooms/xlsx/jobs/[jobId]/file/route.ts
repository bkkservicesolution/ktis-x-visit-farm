import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { getHeart4RoomsExportJob, getHeart4RoomsExportJobBuffer } from "@/lib/heart4roomsExportJobs";

export const runtime = "nodejs";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { jobId } = await ctx.params;
  const job = getHeart4RoomsExportJob(jobId);
  if (!job) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  if (job.status === "cancelled") return NextResponse.json({ ok: false, error: "CANCELLED" }, { status: 410 });
  if (job.status !== "done") return NextResponse.json({ ok: false, error: "NOT_READY", status: job.status }, { status: 202 });

  // Production can route SSE and /file to different instances. When that happens,
  // the in-memory buffer may be missing and the on-disk file may still be in-flight.
  // Retry briefly to avoid flaky "download failed" even though the job is done.
  let out = getHeart4RoomsExportJobBuffer(jobId);
  if (!out) {
    for (let attempt = 0; attempt < 6 && !out; attempt += 1) {
      await sleep(150);
      out = getHeart4RoomsExportJobBuffer(jobId);
    }
  }
  if (!out) return NextResponse.json({ ok: false, error: "NOT_READY" }, { status: 202 });

  return new Response(new Uint8Array(out.buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${out.filename}"`,
      "cache-control": "no-store",
    },
  });
}

