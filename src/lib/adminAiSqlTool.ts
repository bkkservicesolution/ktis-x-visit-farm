export const ADMIN_AI_ALLOWED_READONLY_RELATIONS = [
  "public.heart4rooms_ai_core_v2",
  "public.heart4rooms_ai_open_text_v1",
] as const;

const ALLOWED_RELATION_SET = new Set<string>([
  ...ADMIN_AI_ALLOWED_READONLY_RELATIONS,
  ...ADMIN_AI_ALLOWED_READONLY_RELATIONS.map((name) => name.replace(/^public\./, "")),
]);

const FORBIDDEN_SQL_KEYWORDS = [
  "insert",
  "update",
  "delete",
  "drop",
  "alter",
  "create",
  "grant",
  "revoke",
  "truncate",
  "refresh",
  "call",
  "execute",
  "copy",
  "vacuum",
  "analyze",
  "begin",
  "commit",
  "rollback",
] as const;

export type ReadonlySqlValidationResult =
  | {
      ok: true;
      normalizedSql: string;
      relations: string[];
      cteNames: string[];
    }
  | {
      ok: false;
      error:
        | "EMPTY_SQL"
        | "MULTI_STATEMENT_NOT_ALLOWED"
        | "SQL_NOT_READONLY"
        | "SQL_FORBIDDEN_KEYWORD"
        | "SQL_MISSING_ALLOWED_RELATION"
        | "SQL_RELATION_NOT_ALLOWED";
      message: string;
    };

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--[^\r\n]*/g, " ");
}

function normalizeSql(sql: string): string {
  return stripSqlComments(sql).replace(/\s+/g, " ").trim().toLowerCase();
}

function extractCteNames(normalizedSql: string): string[] {
  const names = new Set<string>();
  const re = /(?:^|\s|,)([a-z_][a-z0-9_]*)\s+as\s*\(/g;
  let match: RegExpExecArray | null = re.exec(normalizedSql);
  while (match) {
    const name = match[1]?.trim();
    if (name) names.add(name);
    match = re.exec(normalizedSql);
  }
  return [...names];
}

function extractReferencedRelations(normalizedSql: string): string[] {
  const relations = new Set<string>();
  const re = /\b(?:from|join)\s+([a-z_][a-z0-9_\.]*)/g;
  let match: RegExpExecArray | null = re.exec(normalizedSql);
  while (match) {
    const relation = match[1]?.trim();
    if (relation) relations.add(relation);
    match = re.exec(normalizedSql);
  }
  return [...relations];
}

export function clampMaxRows(value: unknown, fallback = 100): number {
  const raw = typeof value === "number" ? value : typeof value === "string" ? Number(value) : fallback;
  if (!Number.isFinite(raw)) return fallback;
  const n = Math.trunc(raw);
  return Math.max(1, Math.min(n, 200));
}

export function validateReadonlySql(sql: string): ReadonlySqlValidationResult {
  const trimmed = String(sql ?? "").trim();
  if (!trimmed) {
    return { ok: false, error: "EMPTY_SQL", message: "SQL must not be empty." };
  }
  if (trimmed.includes(";")) {
    return {
      ok: false,
      error: "MULTI_STATEMENT_NOT_ALLOWED",
      message: "Only a single statement is allowed. Remove semicolons.",
    };
  }

  const normalizedSql = normalizeSql(trimmed);
  if (!/^(select|with)\b/.test(normalizedSql)) {
    return {
      ok: false,
      error: "SQL_NOT_READONLY",
      message: "Only read-only SELECT/WITH queries are allowed.",
    };
  }

  const forbiddenPattern = new RegExp(`\\b(${FORBIDDEN_SQL_KEYWORDS.join("|")})\\b`, "i");
  if (forbiddenPattern.test(normalizedSql)) {
    return {
      ok: false,
      error: "SQL_FORBIDDEN_KEYWORD",
      message: "The query contains forbidden keywords for a read-only tool.",
    };
  }

  const cteNames = extractCteNames(normalizedSql);
  const cteNameSet = new Set(cteNames);
  const relations = extractReferencedRelations(normalizedSql);
  if (!relations.some((relation) => ALLOWED_RELATION_SET.has(relation))) {
    return {
      ok: false,
      error: "SQL_MISSING_ALLOWED_RELATION",
      message: "The query must read from an allowed analytics view.",
    };
  }

  for (const relation of relations) {
    if (ALLOWED_RELATION_SET.has(relation)) continue;
    if (cteNameSet.has(relation)) continue;
    return {
      ok: false,
      error: "SQL_RELATION_NOT_ALLOWED",
      message: `Relation "${relation}" is not in the allowlist.`,
    };
  }

  return { ok: true, normalizedSql, relations, cteNames };
}

type SchemaHelpView = {
  name: (typeof ADMIN_AI_ALLOWED_READONLY_RELATIONS)[number];
  purpose: string;
  important_columns: string[];
  sample_questions: string[];
};

export const HEART4_ADMIN_AI_SCHEMA_HELP: {
  version: string;
  domain: string;
  views: SchemaHelpView[];
  conventions: string[];
  example_questions: string[];
} = {
  version: "v1",
  domain: "heart4rooms",
  views: [
    {
      name: "public.heart4rooms_ai_core_v2",
      purpose: "Normalized survey answers for exact counts, filters, grouping, and trend questions.",
      important_columns: [
        "survey_id",
        "created_at",
        "promoter_id",
        "farmer_full_name",
        "contract_no",
        "q1_choice",
        "q1_choice_label",
        "q6_choice",
        "q6_choice_label",
        "q7_detail",
        "q9_detail",
        "q18_choice",
        "q18_choice_label",
        "q26_choice",
        "q26_choice_label",
        "q29_score_num",
        "q30_score_num",
        "q31_score_num",
        "q32_score_num",
        "q33_score_num",
        "q36_selected_json",
      ],
      sample_questions: [
        "มีคนไม่เคยได้ยินเรื่องหัวใจ 4 ห้องกี่คน",
        "ชาวไร่ที่ตอบว่าจัดการโรคแส้ดำไม่ได้มีกี่ราย",
        "ค่าเฉลี่ยความพึงพอใจข้อ 29 เป็นเท่าไร",
      ],
    },
    {
      name: "public.heart4rooms_ai_open_text_v1",
      purpose: "One row per open-text answer for searching recurring themes and summarization.",
      important_columns: [
        "survey_id",
        "created_at",
        "promoter_id",
        "question_key",
        "field_key",
        "text_kind",
        "choice_code",
        "choice_label",
        "text_value",
        "text_length",
      ],
      sample_questions: [
        "โรคอ้อยอื่นที่ชาวไร่เจอมีอะไรบ้าง",
        "สรุปความกังวลเรื่องราคาอ้อยปีหน้า",
        "มี pain points เรื่องต้นทุนอะไรบ้าง",
      ],
    },
  ],
  conventions: [
    "Use fully-qualified relation names when possible.",
    "Prefer exact analytics from heart4rooms_ai_core_v2 for counts and percentages.",
    "Use heart4rooms_ai_open_text_v1 for text summarization and recurring-topic discovery.",
    "Keep queries read-only and limit result sets.",
  ],
  example_questions: [
    "มีคนไม่เคยได้ยินเรื่องหัวใจ 4 ห้องกี่คน",
    "โรคอ้อยที่ชาวไร่ระบุในข้อ 7 มีอะไรบ้าง",
    "ข้อ 26 มีคนกังวลเรื่องราคาอ้อยกี่ราย",
    "สรุปเรื่องที่ควรพัฒนาในข้อ 33",
  ],
};

type RowObject = Record<string, unknown>;

export function coerceRpcRowObjects(data: unknown): RowObject[] {
  if (!Array.isArray(data)) return [];
  return data.filter((row): row is RowObject => !!row && typeof row === "object" && !Array.isArray(row));
}

export function toTabularRows(rowObjects: RowObject[], maxRows: number) {
  const effective = rowObjects.slice(0, maxRows);
  const columns = [...effective.reduce((set, row) => {
    for (const key of Object.keys(row)) set.add(key);
    return set;
  }, new Set<string>())];
  const rows = effective.map((row) => columns.map((column) => (column in row ? row[column] : null)));
  return { columns, rows };
}
