import Link from "next/link";
import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { Heart4RoomsHistoryClient } from "@/app/surveys/heart4rooms/history/Heart4RoomsHistoryClient";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export default async function Heart4RoomsHistoryPage() {
  const role = await getRole();

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent px-4 py-8">
      <main className="relative mx-auto w-full max-w-3xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.png?v=2"
              alt="KTISX"
              className="h-16 w-16 rounded-2xl border border-border bg-card object-cover p-1 shadow-sm"
            />
            <div>
              <div className="text-sm font-medium tracking-wide text-muted">แบบฟอร์มประเมินหัวใจ 4 ห้อง</div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">ประวัติการตอบของฉัน</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/surveys/heart4rooms"
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
            >
              กลับไปทำแบบสำรวจ
            </Link>
            <Link
              href="/home"
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
            >
              กลับหน้าเลือกแบบฟอร์ม
            </Link>
            {role === "admin" ? (
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center justify-center rounded-2xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
              >
                Admin
              </Link>
            ) : null}
          </div>
        </header>

        <Heart4RoomsHistoryClient />
      </main>
    </div>
  );
}

