-- KTIS X VISIT FARM
-- Onsite Visit Form schema (latest)

create extension if not exists pgcrypto;

create table if not exists public.onsite_visit_forms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  promoter_id text,
  promoter_name text not null,
  farmer_first_name text not null,
  farmer_last_name text not null,
  contract_no text not null,

  -- Step 1: General info & goals
  land_id text,
  cane_type text,
  ratoon_no int,
  area_rai numeric,
  planting_window text,
  target_yield_ton_per_rai numeric,
  farm_images text[] not null default '{}',

  -- Step 2: Readiness checklist
  readiness_checklist jsonb not null default '{}'::jsonb,

  -- Step 3: Segmentation
  segmentation text,

  -- Step 4: Insight & support
  obstacles text[] not null default '{}',
  support_requests jsonb not null default '{}'::jsonb,
  reward_preferences text[] not null default '{}',

  -- Step 5: Action plan
  promoter_notes text,
  next_appointment date,

  constraint onsite_visit_forms_cane_type_chk
    check (cane_type is null or cane_type in ('new', 'ratoon')),
  constraint onsite_visit_forms_planting_window_chk
    check (planting_window is null or planting_window in ('before_31_jan', 'after_31_jan')),
  constraint onsite_visit_forms_segmentation_chk
    check (segmentation is null or segmentation in ('A', 'B', 'C', 'D')),
  constraint onsite_visit_forms_ratoon_no_chk
    check (
      cane_type is distinct from 'ratoon'
      or (ratoon_no is not null and ratoon_no >= 1 and ratoon_no <= 20)
    )
);

create index if not exists onsite_visit_forms_created_at_idx
  on public.onsite_visit_forms (created_at desc);

create index if not exists onsite_visit_forms_contract_no_idx
  on public.onsite_visit_forms (contract_no);

create index if not exists onsite_visit_forms_promoter_id_idx
  on public.onsite_visit_forms (promoter_id);

create index if not exists onsite_visit_forms_land_id_idx
  on public.onsite_visit_forms (land_id);

create index if not exists onsite_visit_forms_segmentation_idx
  on public.onsite_visit_forms (segmentation);

