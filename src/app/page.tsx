import { LoginForm } from "@/app/components/LoginForm";

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-64 -right-40 h-[560px] w-[560px] rounded-full bg-foreground/10 blur-3xl" />
      </div>

      {/* NOTE: scale 150% to fill screen per request */}
      <main className="relative mx-auto w-full max-w-5xl origin-center scale-[1.5] translate-x-[40px]">
        <div className="grid gap-10 lg:grid-cols-2 lg:place-items-center lg:gap-16">
          <section className="w-full max-w-md space-y-6">
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
                  KTIS X VISIT FARM
                </h1>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">เข้าสู่ระบบด้วยรหัสผ่าน</h2>

              <LoginForm />
            </div>
          </section>

          <section className="relative hidden w-full max-w-md lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/mascot.png"
              alt="KTISX Mascot"
              className="mx-auto h-[440px] w-auto -translate-y-[30px] select-none object-contain drop-shadow-[0_24px_50px_rgba(0,0,0,0.25)]"
            />
          </section>
        </div>
      </main>
    </div>
  );
}
