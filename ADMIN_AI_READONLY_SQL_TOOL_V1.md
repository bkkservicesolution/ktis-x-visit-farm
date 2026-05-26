# Admin AI Read-only SQL Tool v1

Purpose:

- Let the admin AI answer exact data questions from Supabase.
- Keep the model constrained to safe, read-only analytics.
- Make the backend deterministic and easy to debug.

## Scope

This tool is for:

- count / sum / avg / min / max
- filter by date / promoter / answer choice
- group by question answers
- inspecting open-text rows for summarization prep

This tool is **not** for:

- insert / update / delete
- DDL
- unrestricted access to all tables
- arbitrary schema exploration

## Recommended Endpoint

`POST /api/admin/ai/tools/run-readonly-sql`

Only admin users can call this route.

## Initial Whitelist

For v1, allow querying only these views:

- `public.heart4rooms_ai_core_v2`
- `public.heart4rooms_ai_open_text_v1`

Optional later:

- `information_schema.columns` for schema-help route only, not from this generic tool

## Request Body

```json
{
  "sql": "select q1_choice_label, count(*) as total from public.heart4rooms_ai_core_v2 group by q1_choice_label order by total desc",
  "max_rows": 200
}
```

## Response Body

```json
{
  "ok": true,
  "columns": ["q1_choice_label", "total"],
  "rows": [
    ["เคย", 120],
    ["ไม่เคย", 45]
  ],
  "row_count": 2,
  "truncated": false,
  "duration_ms": 38
}
```

Error example:

```json
{
  "ok": false,
  "error": "SQL_NOT_ALLOWED",
  "message": "Only read-only SELECT queries against whitelisted views are allowed."
}
```

## Validation Rules

The backend should reject the query unless all rules pass.

### 1. Must be admin

- Verify current user role from your existing auth cookie/session
- Reject with `403` if not admin

### 2. Must be one statement only

Reject if:

- contains `;`
- contains multiple statements

Reason:

- simplifies safety checks

### 3. Must be read-only

Allow only SQL starting with:

- `select`
- `with` followed by a final `select`

Reject if it contains these keywords anywhere after normalization:

- `insert`
- `update`
- `delete`
- `drop`
- `alter`
- `create`
- `grant`
- `revoke`
- `truncate`
- `refresh`
- `call`
- `execute`
- `copy`
- `vacuum`
- `analyze`
- `begin`
- `commit`
- `rollback`

### 4. Must target whitelisted relations only

For v1, reject unless every referenced relation is in:

- `public.heart4rooms_ai_core_v2`
- `public.heart4rooms_ai_open_text_v1`

Practical approach:

- lowercase and normalize whitespace
- regex-scan `from` / `join`
- extract table/view names
- ensure all are in whitelist

This is not a perfect SQL parser, but good enough for v1 if combined with the strict whitelist.

### 5. Limit output rows

- default `max_rows = 100`
- clamp to `1..200`
- wrap the query as:

```sql
select *
from (
  <user_sql>
) as q
limit <max_rows + 1>
```

Then:

- if returned rows > `max_rows`
  - trim to `max_rows`
  - set `truncated = true`

### 6. Timeout

Set a short timeout.

Recommended:

- `statement_timeout = 5000ms`

### 7. Log everything

Log:

- admin user id / username
- prompt
- SQL
- duration
- row_count
- truncated
- success / error

## Recommended Companion Route

Create a second route just for schema help:

`GET /api/admin/ai/tools/schema-help`

This route should return a hand-written summary such as:

- available views
- important columns
- sample questions

This is better than letting the model inspect the schema by itself.

## How the AI Should Use This Tool

The model should not receive direct DB credentials.

Instead, your orchestration layer asks the model to produce structured JSON like:

```json
{
  "action": "tool_call",
  "tool": "run_readonly_sql",
  "arguments": {
    "sql": "select count(*) as never_heard_count from public.heart4rooms_ai_core_v2 where q1_choice = 'b'",
    "max_rows": 50
  }
}
```

Then the backend:

1. validates the tool name
2. validates SQL
3. executes SQL
4. sends the result back to the model for explanation

## Example Queries

Count people who never heard of Heart 4 Rooms:

```sql
select count(*) as never_heard_count
from public.heart4rooms_ai_core_v2
where q1_choice = 'b';
```

Top diseases farmers reported:

```sql
select text_value, count(*) as total
from public.heart4rooms_ai_open_text_v1
where question_key = 'q7'
group by text_value
order by total desc
limit 20;
```

Top insect issues farmers reported:

```sql
select text_value, count(*) as total
from public.heart4rooms_ai_open_text_v1
where question_key = 'q9'
group by text_value
order by total desc
limit 20;
```

Concerns about next year's cane price:

```sql
select text_value, count(*) as total
from public.heart4rooms_ai_open_text_v1
where question_key = 'q26'
  and field_key = 'worry'
group by text_value
order by total desc
limit 20;
```

## Recommended Implementation Order

1. Create `heart4rooms_ai_core_v2`
2. Create `heart4rooms_ai_open_text_v1`
3. Build this tool route without LLM first
4. Test with manual SQL payloads from Postman or internal admin page
5. Add LLM tool-calling after the route is proven stable

## v1 Non-goals

Do not add these yet:

- arbitrary SQL over all tables
- joins to raw tables
- memory
- auto-correction of invalid SQL
- autonomous retries with edited SQL

If the SQL is invalid, return a clean error and let the orchestration layer ask the model to try again.
