"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type NavItem = { href: string; label: string; meta?: string };

export function AdminMobileNav({ role }: { role: string | null }) {
  const [open, setOpen] = useState(false);

  const items = useMemo<NavItem[]>(
    () => [
      { href: "/form", label: "กรอกฟอร์ม", meta: "/form" },
      { href: "/admin/dashboard", label: "ดูข้อมูล", meta: "Admin" },
      { href: "/admin/promoters", label: "รายชื่อนักส่งเสริม", meta: "Promoters" },
    ],
    [],
  );

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="lg:hidden">
      <div className="sticky top-0 z-40 -mx-4 mb-4 border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.png?v=2"
              alt="KTISX"
              className="h-10 w-10 rounded-2xl border border-border bg-card object-cover p-1 shadow-sm"
            />
            <div className="min-w-0">
              <div className="text-xs font-medium tracking-wide text-muted">KTIS X VISIT FARM</div>
              <div className="truncate text-xs text-muted">
                สิทธิ์:{" "}
                <span className={role === "admin" ? "font-semibold text-foreground" : "font-semibold text-accent"}>
                  {role ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
          >
            เมนู
          </button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[9999]">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/30"
          />

          <div className="absolute right-0 top-0 h-full w-[86vw] max-w-sm border-l border-border bg-background p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">เมนู</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
              >
                ปิด
              </button>
            </div>

            <nav className="mt-4 space-y-2 text-sm">
              {items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 font-semibold text-foreground transition hover:bg-foreground/5"
                >
                  {it.label}
                  {it.meta ? <span className="text-xs text-muted">{it.meta}</span> : null}
                </Link>
              ))}
            </nav>

            <div className="mt-6 space-y-3">
              <form action="/api/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90"
                >
                  ออกจากระบบ
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

