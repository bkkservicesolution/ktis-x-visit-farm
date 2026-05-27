-- Stores human-readable decoded lines from heart4rooms_surveys.answers (for audit + RAG source text).
-- Populated by the app during POST /api/admin/ai/rag/reindex.

create table if not exists public.heart4rooms_ai_decoded_facts (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.heart4rooms_surveys(id) on delete cascade,
  created_at timestamptz,
  section_key text,
  section_label text,
  question_key text not null,
  field_key text,
  human_text text not null,
  inserted_at timestamptz not null default now()
);

create index if not exists heart4rooms_ai_decoded_facts_survey_idx
  on public.heart4rooms_ai_decoded_facts (survey_id);

create index if not exists heart4rooms_ai_decoded_facts_question_idx
  on public.heart4rooms_ai_decoded_facts (question_key);

alter table public.heart4rooms_ai_decoded_facts enable row level security;

-- Replace truncate helper used by reindex (drops vectors + decoded rows)
create or replace function public.heart4rooms_ai_rag_truncate_v1()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate table public.heart4rooms_ai_chunks;
  truncate table public.heart4rooms_ai_decoded_facts;
end;
$$;

comment on table public.heart4rooms_ai_decoded_facts is
  'Decoded survey answer lines for admin AI (Gemini RAG).';
