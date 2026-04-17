import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";

const BUCKET = "farm-plot-images";
const MAX_FILES = 5;
const MAX_BYTES = 8 * 1024 * 1024; // 8MB each

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

async function ensureBucket() {
  const sb = supabaseAdmin();
  const { data: buckets, error } = await sb.storage.listBuckets();
  if (error) throw new Error(error.message);
  if (buckets?.some((b) => b.name === BUCKET)) return;
  const { error: createError } = await sb.storage.createBucket(BUCKET, { public: true });
  if (createError) throw new Error(createError.message);
}

export async function POST(req: Request) {
  const role = await getRole();
  if (!role) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });

  const files = form.getAll("files").filter((v) => v instanceof File) as File[];
  if (files.length < 1 || files.length > MAX_FILES) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: `ใส่รูปได้ 1-${MAX_FILES} รูป` },
      { status: 400 },
    );
  }

  for (const f of files) {
    if (!f.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "BAD_REQUEST", message: "ไฟล์ต้องเป็นรูปภาพเท่านั้น" },
        { status: 400 },
      );
    }
    if (f.size > MAX_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: "BAD_REQUEST",
          message: `ไฟล์ใหญ่เกินไป (สูงสุด ${Math.floor(MAX_BYTES / 1024 / 1024)}MB ต่อรูป)`,
        },
        { status: 400 },
      );
    }
  }

  let sb: ReturnType<typeof supabaseAdmin>;
  try {
    await ensureBucket();
    sb = supabaseAdmin();
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        error: "STORAGE_NOT_READY",
        message: "ระบบอัปโหลดรูปยังตั้งค่าไม่ครบ กรุณาแจ้งผู้ดูแลให้ตรวจสอบ Supabase/Vercel env แล้วลองใหม่",
        detail,
      },
      { status: 500 },
    );
  }

  const uploaded: { path: string; publicUrl: string }[] = [];
  for (const f of files) {
    const ext = (f.name.split(".").pop() || "png").toLowerCase().slice(0, 8);
    const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : "png";
    const path = `forms/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${safeExt}`;

    const { error } = await sb.storage.from(BUCKET).upload(path, f, {
      upsert: false,
      contentType: f.type,
      cacheControl: "3600",
    });
    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "UPLOAD_FAILED",
          message: "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่",
          detail: error.message,
        },
        { status: 500 },
      );
    }

    const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
    uploaded.push({ path, publicUrl: data.publicUrl });
  }

  return NextResponse.json({ ok: true, bucket: BUCKET, files: uploaded });
}

