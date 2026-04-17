import Link from "next/link";
import { AdminDashboardClient } from "@/app/admin/dashboard/dashboardClient";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-medium tracking-wide text-muted">
              Admin • จัดการข้อมูล
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              รายการแบบฟอร์ม Onsite Visit
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/form"
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
            >
              ไปหน้ากรอกฟอร์ม
            </Link>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <AdminDashboardClient />
      </section>
    </div>
  );
}

