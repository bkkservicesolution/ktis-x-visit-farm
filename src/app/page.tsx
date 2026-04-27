import { LoginForm } from "@/app/components/LoginForm";

export default function Home() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent px-4 py-12">

      {/* NOTE: scale 150% to fill screen per request */}
      <main className="relative mx-auto w-full max-w-5xl origin-center lg:scale-[1.15] lg:translate-x-[24px]">
        <div className="grid gap-10 lg:grid-cols-2 lg:place-items-center lg:gap-16">
          <section className="w-full max-w-md space-y-6">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo.png?v=2"
                alt="KTISX"
                className="h-16 w-16 rounded-2xl border border-border bg-white object-cover p-1 shadow-sm"
              />
              <div>
                <div className="text-sm font-medium tracking-wide text-muted">
                  โปรแกรมประเมินศักยภาพและสำรวจความคิดเห็น
                </div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  KTIS X SURVEYPRO
                </h1>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">เข้าสู่ระบบด้วยรหัสผ่าน</h2>

              <LoginForm />
            </div>
          </section>

          <section className="relative w-full max-w-md lg:block">
            <video
              className="mx-auto block h-[220px] w-auto -translate-x-[15px] translate-y-[20px] select-none bg-white object-contain lg:h-[360px] lg:translate-x-0 lg:translate-y-[10px]"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              aria-label="KTISX Mascot"
            >
              <source src="/mascotktisxanimate.mp4" type="video/mp4" />
            </video>
          </section>
        </div>
      </main>
    </div>
  );
}
