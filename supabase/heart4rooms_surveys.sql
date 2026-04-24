-- KTIS X VISIT FARM
-- Heart 4 Rooms survey responses (no FK to legacy tables; copy-only metadata)

create extension if not exists pgcrypto;

create table if not exists public.heart4rooms_surveys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  created_by_user_id text not null,
  created_by_username text,

  promoter_id text,
  submitter_display_name text not null,
  submitter_manual boolean not null default false,

  farmer_first_name text not null,
  farmer_last_name text not null,
  contract_no text not null,

  answers jsonb not null default '{}'::jsonb,
  attachments jsonb not null default '{}'::jsonb
);

create index if not exists heart4rooms_surveys_created_at_idx
  on public.heart4rooms_surveys (created_at desc);

create index if not exists heart4rooms_surveys_contract_no_idx
  on public.heart4rooms_surveys (contract_no);

create index if not exists heart4rooms_surveys_created_by_user_id_idx
  on public.heart4rooms_surveys (created_by_user_id);
