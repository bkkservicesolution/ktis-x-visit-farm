import { Heart4RoomsViewClient } from "@/app/admin/heart4rooms/[id]/heart4RoomsViewClient";
import Link from "next/link";

export default async function AdminHeart4RoomsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="text-xs font-medium tracking-wide text-muted">
              Admin • แบบฟอร์มประเมินหัวใจ 4 ห้อง
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              รายละเอียดแบบสอบถาม
            </h1>
            <div className="mt-1 truncate text-xs text-muted">{id}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/heart4rooms"
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
            >
              ← กลับไปรายการ
            </Link>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <Heart4RoomsViewClient id={id} />
      </section>
    </div>
  );
}
