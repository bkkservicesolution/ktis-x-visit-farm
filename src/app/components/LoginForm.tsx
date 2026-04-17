"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type LoginResponse =
  | { ok: true; role: "user" | "admin" }
  | { ok: false; error: "INVALID_CODE" };

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorLabel = useMemo(() => {
    if (!error) return null;
    if (error === "INVALID_CODE") return "รหัสไม่ถูกต้อง";
    return "เกิดข้อผิดพลาด กรุณาลองใหม่";
  }, [error]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const fd = new FormData(e.currentTarget);
      const code = String(fd.get("code") ?? "");

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const json = (await res.json().catch(() => null)) as LoginResponse | null;

      if (!res.ok || !json || json.ok !== true) {
        setError(json && "error" in json ? json.error : "UNKNOWN");
        return;
      }

      if (json.role === "admin") router.push("/admin/dashboard");
      else router.push("/form");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4">
      <input
        type="password"
        name="code"
        placeholder="ใส่รหัสเพื่อเข้าใช้งาน"
        autoComplete="current-password"
        required
        disabled={pending}
        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-foreground shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
      />

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 focus:outline-none focus:ring-4 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </button>

      {errorLabel ? (
        <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">
          {errorLabel}
        </div>
      ) : null}
    </form>
  );
}

