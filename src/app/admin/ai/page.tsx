import Link from "next/link";
import { AdminAiChatPanel } from "@/app/admin/ai/AdminAiChatPanel";

export default function AdminAiPage() {
  return (
    <div className="space-y-4">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-medium tracking-wide text-muted">Admin • AI Assistant</div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">AI ผู้ช่วยข้อมูลหัวใจ 4 ห้อง</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              ถามคำถามจากข้อมูลจริงของแบบสอบถามได้โดยตรง ระบบจะเลือกข้อมูลที่เกี่ยวข้องจากฐานข้อมูลแล้วสรุปกลับมาในรูปแบบแชท
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/heart4rooms"
              className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
            >
              กลับไปข้อมูลหัวใจ 4 ห้อง
            </Link>
          </div>
        </div>
      </header>

      <AdminAiChatPanel />
    </div>
  );
}
