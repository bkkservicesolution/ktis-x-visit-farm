import Link from "next/link";
import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export default async function HomeLandingPage() {
  const role = await getRole();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent px-4 py-12">

      <main className="relative mx-auto w-full max-w-6xl origin-center lg:scale-[1.15] lg:translate-x-[24px]">
        <header className="flex flex-row items-start justify-between gap-3 sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.png?v=2"
              alt="KTISX"
              className="h-12 w-12 shrink-0 rounded-2xl border border-border bg-card object-cover p-1 shadow-sm sm:h-16 sm:w-16"
            />
            <div className="min-w-0">
              <div className="text-xs font-medium tracking-wide text-muted sm:text-sm">KTIS X SURVEYPRO</div>
              <h1 className="text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-3xl sm:leading-tight">
                เลือกแบบฟอร์ม
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 flex-row flex-wrap items-center justify-end gap-2 sm:gap-3">
            {role === "admin" ? (
              <Link
                href="/admin/dashboard"
                className="text-xs font-semibold text-muted underline-offset-4 transition hover:text-foreground hover:underline sm:text-sm"
              >
                <span className="sm:hidden">Admin</span>
                <span className="hidden sm:inline">แดชบอร์ด Admin</span>
              </Link>
            ) : null}
            <form action="/api/logout" method="post" className="shrink-0">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-foreground px-3 py-2 text-xs font-semibold text-background shadow-sm transition hover:bg-foreground/90 sm:px-4 sm:py-2.5 sm:text-sm"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>
        </header>

        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-5 lg:mx-0">
            <Link
              href="/form"
              className="group relative isolate overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-foreground/[0.03] p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.12)] ring-1 ring-foreground/[0.04] transition duration-200 hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_28px_60px_-12px_rgba(0,0,0,0.18)] hover:ring-accent/20"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent/15 blur-2xl transition group-hover:bg-accent/25" />
              <div className="relative flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex rounded-full bg-foreground/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    Form
                  </span>
                  <h2 className="mt-3 text-lg font-semibold leading-snug text-foreground sm:text-xl">
                    แบบฟอร์มประเมินศักยภาพไร่อ้อย
                  </h2>
                  <p className="mt-1.5 text-sm text-muted">Onsite Visit Form</p>
                </div>
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-foreground text-sm font-bold text-background shadow-inner transition group-hover:scale-105"
                >
                  →
                </span>
              </div>
            </Link>

            <Link
              href="/surveys/heart4rooms"
              className="group relative isolate overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/[0.08] via-card to-card p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] ring-1 ring-accent/15 transition duration-200 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_28px_60px_-12px_rgba(220,38,38,0.12)] hover:ring-accent/30"
            >
              <div className="pointer-events-none absolute -left-6 bottom-0 h-28 w-28 rounded-full bg-accent/10 blur-2xl transition group-hover:bg-accent/20" />
              <div className="relative flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                    Survey
                  </span>
                  <h2 className="mt-3 text-lg font-semibold leading-snug text-foreground sm:text-xl">
                    แบบฟอร์มประเมินหัวใจ 4 ห้อง
                  </h2>
                  <p className="mt-1.5 text-sm text-muted">แบบสำรวจหัวใจ 4 ห้องของการทำอ้อย</p>
                </div>
                <span
                  aria-hidden
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-sm font-bold text-white shadow-md transition group-hover:scale-105"
                >
                  →
                </span>
              </div>
            </Link>
          </div>

          <aside className="relative flex w-full max-w-md justify-center lg:max-w-none lg:justify-end">
            <video
              className="mx-auto block h-[220px] w-auto -translate-x-[15px] translate-y-[20px] select-none bg-white object-contain lg:h-[360px] lg:translate-x-0 lg:translate-y-[10px]"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-label="KTISX Mascot"
            >
              <source src="/mascotktisxanimate.mp4" type="video/mp4" />
            </video>
          </aside>
        </div>
      </main>
    </div>
  );
}
