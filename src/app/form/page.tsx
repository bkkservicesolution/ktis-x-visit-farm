import Link from "next/link";
import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { FormClient } from "@/app/form/formClient";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export default async function FormPage() {
  const role = await getRole();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent px-4 py-12">

      {/* match home page overall scale/feel (zoomed out) */}
      <main className="relative mx-auto w-full max-w-6xl origin-center lg:translate-x-[24px]">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.png?v=2"
              alt="KTISX"
              className="h-16 w-16 rounded-2xl border border-border bg-card object-cover p-1 shadow-sm"
            />
            <div>
              <div className="text-sm font-medium tracking-wide text-muted">
                แบบฟอร์มประเมินศักยภาพไร่อ้อย (Onsite Visit Form)
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                KTIS X SURVEYPRO
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                ไปหน้าดูข้อมูล (Admin)
              </Link>
            ) : null}

            <form action="/api/logout" method="post">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>
        </header>

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-24">
          <section className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-sm lg:justify-self-start">
            <FormClient />
          </section>

          <aside className="relative w-full max-w-xl lg:block lg:justify-self-end">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/mascot-v2.png"
              alt="KTISX Mascot"
              className="mx-auto h-[280px] w-auto select-none object-contain drop-shadow-[0_24px_50px_rgba(0,0,0,0.25)] lg:h-[660px] lg:-translate-y-[30px]"
            />
          </aside>
        </div>
      </main>
    </div>
  );
}

