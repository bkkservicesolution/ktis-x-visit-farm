-- Add image attachments (1-5) to onsite_visit_forms
alter table public.onsite_visit_forms
  add column if not exists farm_images text[] not null default '{}';

