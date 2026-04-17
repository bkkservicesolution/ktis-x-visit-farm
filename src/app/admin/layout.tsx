import Link from "next/link";
import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { AdminMobileNav } from "@/app/admin/AdminMobileNav";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const role = await getRole();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl gap-6 px-4 py-8">
        <div className="w-full lg:hidden">
          <AdminMobileNav role={role} />
          <main className="min-w-0">{children}</main>
        </div>

        <aside className="sticky top-8 hidden h-[calc(100vh-4rem)] w-72 shrink-0 flex-col rounded-3xl border border-border bg-card p-5 shadow-sm lg:flex">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.png?v=2"
              alt="KTISX"
              className="h-12 w-12 rounded-2xl border border-border bg-background object-cover p-1 shadow-sm"
            />
            <div>
              <div className="text-xs font-medium tracking-wide text-muted">KTIS X</div>
              <div className="text-sm font-semibold text-foreground">VISIT FARM</div>
            </div>
          </div>

          <nav className="mt-6 space-y-2 text-sm">
            <Link
              href="/form"
              className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground transition hover:bg-foreground/5"
            >
              กรอกฟอร์ม
              <span className="text-xs text-muted">/form</span>
            </Link>

            <Link
              href="/admin/dashboard"
              className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground transition hover:bg-foreground/5"
            >
              ดูข้อมูล
              <span className="text-xs text-muted">Admin</span>
            </Link>

            <Link
              href="/admin/promoters"
              className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 font-semibold text-foreground transition hover:bg-foreground/5"
            >
              รายชื่อนักส่งเสริม
              <span className="text-xs text-muted">Promoters</span>
            </Link>
          </nav>

          <div className="mt-auto space-y-3">
            <div className="rounded-2xl border border-border bg-background px-4 py-3 text-xs text-muted">
              สิทธิ์:{" "}
              <span className={role === "admin" ? "font-semibold text-foreground" : "font-semibold text-accent"}>
                {role ?? "—"}
              </span>
            </div>

            <form action="/api/logout" method="post">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>
        </aside>

        <main className="hidden min-w-0 flex-1 lg:block">{children}</main>
      </div>
    </div>
  );
}

