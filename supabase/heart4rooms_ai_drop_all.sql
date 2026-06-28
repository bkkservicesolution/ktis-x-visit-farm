-- Drop Heart4Rooms Admin AI objects (run once in Supabase SQL Editor after removing AI from the app).
-- Safe to re-run: uses IF EXISTS / CASCADE where applicable.

drop function if exists public.heart4rooms_ai_readonly_sql_v1(text);
drop function if exists public.heart4rooms_ai_match_chunks_v1(vector, int, text, text);
drop function if exists public.heart4rooms_ai_rag_chunk_count_v1();
drop function if exists public.heart4rooms_ai_rag_truncate_v1();
drop function if exists public.heart4rooms_surveys_snapshot_refresh_v1(timestamptz);

drop view if exists public.heart4rooms_ai_open_text_v1;
drop view if exists public.heart4rooms_ai_core_v2;

drop table if exists public.heart4rooms_ai_chunks cascade;
drop table if exists public.heart4rooms_ai_decoded_facts cascade;
drop table if exists public.heart4rooms_surveys_snapshot_v1 cascade;
