-- KTIS X VISIT FARM
-- Add fields for Onsite Visit Form (Step 1-5 wizard).

alter table public.onsite_visit_forms
  add column if not exists promoter_id text,
  add column if not exists land_id text,
  add column if not exists cane_type text,
  add column if not exists ratoon_no int,
  add column if not exists area_rai numeric,
  add column if not exists planting_window text,
  add column if not exists target_yield_ton_per_rai numeric,
  add column if not exists farm_images text[] not null default '{}',
  add column if not exists readiness_checklist jsonb not null default '{}'::jsonb,
  add column if not exists segmentation text,
  add column if not exists obstacles text[] not null default '{}',
  add column if not exists support_requests jsonb not null default '{}'::jsonb,
  add column if not exists reward_preferences text[] not null default '{}',
  add column if not exists promoter_notes text,
  add column if not exists next_appointment date;

-- Constraints (safe to add idempotently via DO blocks).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'onsite_visit_forms_cane_type_chk'
  ) then
    alter table public.onsite_visit_forms
      add constraint onsite_visit_forms_cane_type_chk
      check (cane_type is null or cane_type in ('new', 'ratoon'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'onsite_visit_forms_planting_window_chk'
  ) then
    alter table public.onsite_visit_forms
      add constraint onsite_visit_forms_planting_window_chk
      check (planting_window is null or planting_window in ('before_31_jan', 'after_31_jan'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'onsite_visit_forms_segmentation_chk'
  ) then
    alter table public.onsite_visit_forms
      add constraint onsite_visit_forms_segmentation_chk
      check (segmentation is null or segmentation in ('A', 'B', 'C', 'D'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'onsite_visit_forms_ratoon_no_chk'
  ) then
    alter table public.onsite_visit_forms
      add constraint onsite_visit_forms_ratoon_no_chk
      check (
        cane_type is distinct from 'ratoon'
        or (ratoon_no is not null and ratoon_no >= 1 and ratoon_no <= 20)
      );
  end if;
end $$;

create index if not exists onsite_visit_forms_promoter_id_idx
  on public.onsite_visit_forms (promoter_id);

create index if not exists onsite_visit_forms_land_id_idx
  on public.onsite_visit_forms (land_id);

create index if not exists onsite_visit_forms_segmentation_idx
  on public.onsite_visit_forms (segmentation);

