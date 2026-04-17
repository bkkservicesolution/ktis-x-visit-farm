import { PromotersClient } from "@/app/admin/promoters/promotersClient";

export default function AdminPromotersPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div>
          <div className="text-xs font-medium tracking-wide text-muted">Admin • จัดการข้อมูล</div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">รายชื่อนักส่งเสริม</h1>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <PromotersClient />
      </section>
    </div>
  );
}

