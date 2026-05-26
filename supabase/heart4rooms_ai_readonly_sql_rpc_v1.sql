-- WARNING:
-- This function is intentionally narrow and should only be used behind
-- an admin-only backend route with SQL validation.
--
-- It executes read-only SQL against analytics views and returns rows as JSONB.
-- Defense in depth:
-- - rejects empty SQL
-- - rejects semicolons / multiple statements
-- - rejects obvious write/DDL keywords
-- - requires query text to reference one of the allowed analytics views
--
-- Route-side validation is still required.

create or replace function public.heart4rooms_ai_readonly_sql_v1(
  sql_text text,
  max_rows integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized text;
  safe_limit integer;
  wrapped_sql text;
  result jsonb;
begin
  normalized := lower(regexp_replace(coalesce(sql_text, ''), '\s+', ' ', 'g'));
  safe_limit := greatest(1, least(coalesce(max_rows, 100), 201));

  if btrim(coalesce(sql_text, '')) = '' then
    raise exception 'EMPTY_SQL';
  end if;

  if position(';' in sql_text) > 0 then
    raise exception 'MULTI_STATEMENT_NOT_ALLOWED';
  end if;

  if normalized !~ '^[[:space:]]*(select|with)([[:space:]]|$)' then
    raise exception 'SQL_NOT_READONLY';
  end if;

  if normalized ~ '\m(insert|update|delete|drop|alter|create|grant|revoke|truncate|refresh|call|execute|copy|vacuum|analyze|begin|commit|rollback)\M' then
    raise exception 'SQL_FORBIDDEN_KEYWORD';
  end if;

  if position('heart4rooms_ai_core_v2' in normalized) = 0
     and position('heart4rooms_ai_open_text_v1' in normalized) = 0 then
    raise exception 'SQL_MISSING_ALLOWED_RELATION';
  end if;

  wrapped_sql := format(
    'select coalesce(jsonb_agg(row_to_json(t)), ''[]''::jsonb) from (select * from (%s) as q limit %s) as t',
    sql_text,
    safe_limit
  );

  execute wrapped_sql into result;
  return coalesce(result, '[]'::jsonb);
end;
$$;

comment on function public.heart4rooms_ai_readonly_sql_v1(text, integer)
is 'Admin AI read-only SQL executor for Heart4Rooms analytics views.';
