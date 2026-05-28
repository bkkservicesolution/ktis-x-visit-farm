-- Heart4Rooms surveys snapshot (stable source for RAG reindex)
-- Goal: freeze source data up to a cutoff timestamp so reindex is consistent,
-- even if public.heart4rooms_surveys keeps receiving new inserts.
--
-- Usage:
-- 1) Run this SQL once
-- 2) Call RPC to refresh snapshot to cutoff (e.g. yesterday 23:59:59)
--    select public.heart4rooms_surveys_snapshot_refresh_v1('2026-05-27T23:59:59+07');

create table if not exists public.heart4rooms_surveys_snapshot_v1 (
  id uuid primary key,
  created_at timestamptz,
  -- In some deployments promoter_id is stored as text (not uuid).
  promoter_id text,
  submitter_display_name text,
  farmer_first_name text,
  farmer_last_name text,
  contract_no text,
  answers jsonb,
  attachments jsonb,
  snapshot_cutoff timestamptz not null,
  snapshotted_at timestamptz not null default now()
);

-- If the table already exists with promoter_id uuid, convert it to text (safe).
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'heart4rooms_surveys_snapshot_v1'
      and column_name = 'promoter_id'
      and data_type = 'uuid'
  ) then
    alter table public.heart4rooms_surveys_snapshot_v1
      alter column promoter_id type text using promoter_id::text;
  end if;
end $$;

create index if not exists heart4rooms_surveys_snapshot_v1_created_at_idx
  on public.heart4rooms_surveys_snapshot_v1 (created_at);

create index if not exists heart4rooms_surveys_snapshot_v1_cutoff_idx
  on public.heart4rooms_surveys_snapshot_v1 (snapshot_cutoff);

alter table public.heart4rooms_surveys_snapshot_v1 enable row level security;

-- Replace snapshot fully to a cutoff (simple + deterministic).
create or replace function public.heart4rooms_surveys_snapshot_refresh_v1(cutoff timestamptz)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count bigint;
begin
  if cutoff is null then
    raise exception 'cutoff is required';
  end if;

  truncate table public.heart4rooms_surveys_snapshot_v1;

  insert into public.heart4rooms_surveys_snapshot_v1 (
    id,
    created_at,
    promoter_id,
    submitter_display_name,
    farmer_first_name,
    farmer_last_name,
    contract_no,
    answers,
    attachments,
    snapshot_cutoff
  )
  select
    s.id,
    s.created_at,
    s.promoter_id::text,
    s.submitter_display_name,
    s.farmer_first_name,
    s.farmer_last_name,
    s.contract_no,
    s.answers::jsonb,
    s.attachments::jsonb,
    cutoff
  from public.heart4rooms_surveys s
  where s.created_at <= cutoff
  order by s.created_at asc;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on table public.heart4rooms_surveys_snapshot_v1 from anon, authenticated;
revoke all on function public.heart4rooms_surveys_snapshot_refresh_v1(timestamptz) from anon, authenticated;

