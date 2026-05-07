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

function sseLine(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const role = await getRole();
  if (role !== "admin") return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const { jobId } = await ctx.params;
  const initial = getHeart4RoomsExportJob(jobId);
  if (!initial) return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });

  let lastJson = "";
  let interval: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = () => {
        const job = getHeart4RoomsExportJob(jobId);
        if (!job) {
          controller.enqueue(sseLine("event: error\ndata: {\"error\":\"NOT_FOUND\"}\n\n"));
          if (interval) clearInterval(interval);
          interval = null;
          controller.close();
          return;
        }

        const payload = JSON.stringify({
          id: job.id,
          status: job.status,
          done: job.progress.done,
          total: job.progress.total,
          filename: job.filename ?? null,
          error: job.error ?? null,
        });

        if (payload !== lastJson) {
          lastJson = payload;
          controller.enqueue(sseLine(`event: progress\ndata: ${payload}\n\n`));
        } else {
          controller.enqueue(sseLine(": keep-alive\n\n"));
        }

        if (job.status === "done" || job.status === "cancelled" || job.status === "error") {
          if (interval) clearInterval(interval);
          interval = null;
          controller.close();
        }
      };

      push();
      interval = setInterval(push, 400);
    },
    cancel() {
      if (interval) clearInterval(interval);
      interval = null;
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}

