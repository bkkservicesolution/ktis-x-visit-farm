-- Add promoter_id to onsite_visit_forms for better reporting.
alter table public.onsite_visit_forms
  add column if not exists promoter_id text;

-- Backfill promoter_id from existing promoter_name if stored as "#### - Full Name"
update public.onsite_visit_forms
set promoter_id = left(promoter_name, 4)
where promoter_id is null
  and promoter_name ~ '^[0-9]{4}';

-- Optional: make it required later when all rows have promoter_id.
-- Safer approach:
-- 1) Run this file to add/backfill column.
-- 2) Verify no nulls remain:
--    select count(*) from public.onsite_visit_forms where promoter_id is null;
-- 3) Then enforce NOT NULL:
--    alter table public.onsite_visit_forms alter column promoter_id set not null;

create index if not exists onsite_visit_forms_promoter_id_idx
  on public.onsite_visit_forms (promoter_id);

