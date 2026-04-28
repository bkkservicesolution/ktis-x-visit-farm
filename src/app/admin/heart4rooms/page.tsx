import { Heart4RoomsAdminClient } from "@/app/admin/heart4rooms/heart4roomsAdminClient";
import { Heart4RoomsHeaderActions } from "@/app/admin/heart4rooms/Heart4RoomsHeaderActions";

export default function AdminHeart4RoomsPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-medium tracking-wide text-muted">Admin • แบบฟอร์มประเมินหัวใจ 4 ห้อง</div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">รายการแบบสอบถามหัวใจ 4 ห้อง</h1>
          </div>

          <Heart4RoomsHeaderActions />
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <Heart4RoomsAdminClient />
      </section>
    </div>
  );
}

