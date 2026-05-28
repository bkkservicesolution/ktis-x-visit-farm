import { cookies } from "next/headers";
import { KTISX_ROLE_COOKIE, KTISX_USER_ID_COOKIE, type KtisxRole } from "@/lib/authConstants";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** บัญชีเดียวที่จัดการ Snapshot / Reindex / Aggregates ของ AI ได้ */
export const ADMIN_AI_RAG_OPERATOR_USERNAME = "ktisxadmin";

async function getRole(): Promise<KtisxRole | null> {
  const v = (await cookies()).get(KTISX_ROLE_COOKIE)?.value;
  if (v === "user" || v === "admin") return v;
  return null;
}

async function getSessionUsername(): Promise<string | null> {
  const userId = (await cookies()).get(KTISX_USER_ID_COOKIE)?.value?.trim() ?? "";
  if (!userId) return null;

  const { data, error } = await supabaseAdmin()
    .from("ktisx_users")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  const username = typeof data.username === "string" ? data.username.trim() : "";
  return username || null;
}

export async function canAccessAdminAiRag(): Promise<boolean> {
  const role = await getRole();
  if (role !== "admin") return false;

  const username = await getSessionUsername();
  return username === ADMIN_AI_RAG_OPERATOR_USERNAME;
}
