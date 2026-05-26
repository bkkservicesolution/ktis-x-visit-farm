import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  clampMaxRows,
  coerceRpcRowObjects,
  toTabularRows,
  validateReadonlySql,
} from "@/lib/adminAiSqlTool";

type RowObject = Record<string, unknown>;

export type AdminAiReadonlySqlSuccess = {
  ok: true;
  status: 200;
  columns: string[];
  rows: unknown[][];
  rowObjects: RowObject[];
  row_count: number;
  truncated: boolean;
  duration_ms: number;
  normalized_sql: string;
  relations: string[];
};

export type AdminAiReadonlySqlError = {
  ok: false;
  status: 400 | 500;
  error: string;
  message: string;
  detail?: string;
};

export type AdminAiReadonlySqlResult = AdminAiReadonlySqlSuccess | AdminAiReadonlySqlError;

export async function executeAdminReadonlySql(sql: string, maxRowsInput: unknown, fallbackMaxRows = 100): Promise<AdminAiReadonlySqlResult> {
  const maxRows = clampMaxRows(maxRowsInput, fallbackMaxRows);
  const validation = validateReadonlySql(sql);
  if (!validation.ok) {
    return {
      ok: false,
      status: 400,
      error: validation.error,
      message: validation.message,
    };
  }

  const startedAt = Date.now();
  const rpcLimit = Math.min(maxRows + 1, 201);
  const { data, error } = await supabaseAdmin().rpc("heart4rooms_ai_readonly_sql_v1", {
    sql_text: sql,
    max_rows: rpcLimit,
  });
  const durationMs = Date.now() - startedAt;

  if (error) {
    const detail = error.message ?? "rpc failed";
    const missingFn =
      detail.includes("heart4rooms_ai_readonly_sql_v1") &&
      (detail.includes("does not exist") || detail.includes("Could not find the function") || detail.includes("schema cache"));
    const missingCoreView =
      detail.includes("heart4rooms_ai_core_v2") && detail.includes("does not exist");
    const missingOpenTextView =
      detail.includes("heart4rooms_ai_open_text_v1") && detail.includes("does not exist");
    const missingColumn = detail.includes("column") && detail.includes("does not exist");
    const sqlExecError =
      detail.includes("SQL_") ||
      detail.includes("syntax error") ||
      detail.includes("relation") ||
      detail.includes("column");

    return {
      ok: false,
      status: missingColumn || sqlExecError ? 400 : 500,
      error: missingFn
        ? "DB_SCHEMA_MISMATCH"
        : missingCoreView || missingOpenTextView
          ? "DB_VIEW_MISSING"
          : missingColumn
            ? "SQL_COLUMN_NOT_FOUND"
            : sqlExecError
              ? "SQL_EXECUTION_ERROR"
              : "DB_ERROR",
      message: missingFn
        ? "ยังไม่ได้สร้าง RPC function ใน Supabase กรุณารันไฟล์ supabase/heart4rooms_ai_readonly_sql_rpc_v1.sql ก่อน"
        : missingCoreView
          ? "ยังไม่ได้สร้าง view public.heart4rooms_ai_core_v2 ใน Supabase"
          : missingOpenTextView
            ? "ยังไม่ได้สร้าง view public.heart4rooms_ai_open_text_v1 ใน Supabase"
            : missingColumn
              ? "SQL อ้างคอลัมน์ที่ไม่มีอยู่จริงใน view ที่อนุญาต"
              : sqlExecError
                ? "รัน SQL ไม่สำเร็จ กรุณาตรวจ query อีกครั้ง"
                : "รัน SQL ไม่สำเร็จ",
      detail,
    };
  }

  const rowObjects = coerceRpcRowObjects(data);
  const truncated = rowObjects.length > maxRows;
  const effectiveRowObjects = truncated ? rowObjects.slice(0, maxRows) : rowObjects;
  const { columns, rows } = toTabularRows(effectiveRowObjects, maxRows);

  return {
    ok: true,
    status: 200,
    columns,
    rows,
    rowObjects: effectiveRowObjects,
    row_count: effectiveRowObjects.length,
    truncated,
    duration_ms: durationMs,
    normalized_sql: validation.normalizedSql,
    relations: validation.relations,
  };
}
