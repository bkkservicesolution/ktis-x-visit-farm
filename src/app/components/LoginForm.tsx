"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type LoginResponse =
  | { ok: true; id: string; role: "user" | "admin" }
  | { ok: false; error: "INVALID_CREDENTIALS" | "BAD_REQUEST" | "DB_ERROR"; detail?: unknown };

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errorLabel = useMemo(() => {
    if (!error) return null;
    if (error === "INVALID_CREDENTIALS") return "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
    return "เกิดข้อผิดพลาด กรุณาลองใหม่";
  }, [error]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const fd = new FormData(e.currentTarget);
      const username = String(fd.get("username") ?? "");
      const password = String(fd.get("password") ?? "");

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const json = (await res.json().catch(() => null)) as LoginResponse | null;

      if (!res.ok || !json || json.ok !== true) {
        setError(json && "error" in json ? json.error : "UNKNOWN");
        return;
      }

      router.push("/home");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4">
      <input
        type="text"
        name="username"
        placeholder="ชื่อผู้ใช้"
        autoComplete="username"
        required
        disabled={pending}
        className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-foreground shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
      />
      <input
        type="password"
        name="password"
        placeholder="รหัสผ่าน"
        autoComplete="current-password"
        required
        disabled={pending}
        className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-foreground shadow-sm outline-none ring-0 placeholder:text-zinc-400 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
      />

      <button
        type="submit"
        disabled={pending}
        className="group relative mx-auto flex cursor-pointer items-center justify-center bg-transparent p-0 shadow-none transition focus:outline-none focus:ring-4 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
        aria-busy={pending}
      >
        <span className="relative block w-[240px]" style={{ clipPath: "inset(0 round 9999px)" }}>
          <span className="relative block w-full" style={{ aspectRatio: "830 / 301" }}>
          <Image
            src="/assets/login-button-transparent.png"
            alt={pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
            fill
            sizes="240px"
            priority
            className="select-none object-contain object-center"
          />
          </span>
        </span>

        {pending ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center bg-black/15 backdrop-blur-[1px]"
            style={{ clipPath: "inset(0 round 9999px)" }}
          >
            <span className="inline-flex items-center gap-2 rounded-2xl bg-black/55 px-3 py-2 text-xs font-semibold text-white ring-1 ring-white/20">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              กำลังเข้าสู่ระบบ...
            </span>
          </span>
        ) : null}
      </button>

      {errorLabel ? (
        <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">
          {errorLabel}
        </div>
      ) : null}
    </form>
  );
}

