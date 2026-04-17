import { getEnv } from "@/lib/env";
import { sha256Hex } from "@/lib/crypto";
import { KTISX_ROLE_COOKIE, type KtisxRole } from "@/lib/authConstants";

export { KTISX_ROLE_COOKIE };
export type { KtisxRole };

export async function roleFromAccessCode(code: string): Promise<KtisxRole | null> {
  const normalized = code.trim();
  if (!normalized) return null;

  const env = getEnv();
  const hashed = await sha256Hex(normalized);

  if (hashed === env.KTISX_ADMIN_CODE_HASH) return "admin";
  if (hashed === env.KTISX_FORM_CODE_HASH) return "user";
  return null;
}

