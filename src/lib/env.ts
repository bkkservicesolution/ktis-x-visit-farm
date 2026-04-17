function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

/**
 * Lazy env access:
 * - Avoid crashing during `next build` module evaluation.
 * - Throw only when a request actually needs the env values.
 */
export function getEnv() {
  return {
    SUPABASE_URL: required("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: required("SUPABASE_SERVICE_ROLE_KEY"),
    KTISX_FORM_CODE_HASH: required("KTISX_FORM_CODE_HASH"),
    KTISX_ADMIN_CODE_HASH: required("KTISX_ADMIN_CODE_HASH"),
  };
}

