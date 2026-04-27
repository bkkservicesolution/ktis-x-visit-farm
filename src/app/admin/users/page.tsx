import { UsersClient } from "@/app/admin/users/usersClient";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div>
          <div className="text-xs font-medium tracking-wide text-muted">Admin • จัดการบัญชี</div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">บัญชีผู้ใช้ในระบบ</h1>
        </div>
      </header>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <UsersClient />
      </section>
    </div>
  );
}

