-- Heart4Rooms Admin AI RAG v1
-- Depends on: vector extension, heart4rooms_surveys (ingest decodes answers in the app → heart4rooms_ai_decoded_facts + chunks)
--
-- Run in Supabase SQL Editor after enabling pgvector:
--   Dashboard → Database → Extensions → enable "vector"

create extension if not exists vector;

create table if not exists public.heart4rooms_ai_chunks (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid references public.heart4rooms_surveys(id) on delete cascade,
  created_at timestamptz,
  section_key text,
  section_label text,
  question_key text not null,
  question_label text,
  field_key text,
  field_label text,
  text_kind text,
  choice_code text,
  choice_label text,
  chunk_kind text not null default 'open_text',
  chunk_index int not null default 0,
  content text not null,
  content_hash text not null,
  token_estimate int,
  embedding vector(768),
  embedded_at timestamptz,
  source_view text not null default 'heart4rooms_ai_open_text_v1',
  inserted_at timestamptz not null default now(),
  unique (content_hash)
);

create index if not exists heart4rooms_ai_chunks_survey_idx
  on public.heart4rooms_ai_chunks (survey_id);

create index if not exists heart4rooms_ai_chunks_question_idx
  on public.heart4rooms_ai_chunks (question_key, field_key);

create index if not exists heart4rooms_ai_chunks_kind_idx
  on public.heart4rooms_ai_chunks (chunk_kind);

create index if not exists heart4rooms_ai_chunks_embedding_hnsw_idx
  on public.heart4rooms_ai_chunks
  using hnsw (embedding vector_cosine_ops);

alter table public.heart4rooms_ai_chunks enable row level security;

create or replace function public.heart4rooms_ai_rag_truncate_v1()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate table public.heart4rooms_ai_chunks;
end;
$$;

create or replace function public.heart4rooms_ai_rag_chunk_count_v1()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint from public.heart4rooms_ai_chunks where embedding is not null;
$$;

create or replace function public.heart4rooms_ai_match_chunks_v1(
  query_embedding vector(768),
  match_count int default 8,
  filter_question_key text default null,
  filter_field_key text default null
)
returns table (
  id uuid,
  survey_id uuid,
  question_key text,
  field_key text,
  question_label text,
  field_label text,
  chunk_kind text,
  content text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.survey_id,
    c.question_key,
    c.field_key,
    c.question_label,
    c.field_label,
    c.chunk_kind,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.heart4rooms_ai_chunks c
  where c.embedding is not null
    and (filter_question_key is null or c.question_key = filter_question_key)
    and (filter_field_key is null or c.field_key = filter_field_key)
  order by c.embedding <=> query_embedding
  limit greatest(1, least(coalesce(match_count, 8), 20));
$$;

revoke all on table public.heart4rooms_ai_chunks from anon, authenticated;
revoke all on function public.heart4rooms_ai_rag_truncate_v1() from anon, authenticated;
revoke all on function public.heart4rooms_ai_rag_chunk_count_v1() from anon, authenticated;
revoke all on function public.heart4rooms_ai_match_chunks_v1(vector, int, text, text) from anon, authenticated;
