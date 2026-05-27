-- Read-only mirror of heart4rooms_surveys for reporting / AI ingestion.
-- Application still writes to public.heart4rooms_surveys; this view is SELECT-only.

create or replace view public.heart4rooms_surveys_readonly_v1 as
select
  id,
  created_at,
  created_by_user_id,
  created_by_username,
  promoter_id,
  submitter_display_name,
  submitter_manual,
  farmer_first_name,
  farmer_last_name,
  contract_no,
  answers,
  attachments
from public.heart4rooms_surveys;

comment on view public.heart4rooms_surveys_readonly_v1 is
  'Read-only projection of heart4rooms_surveys (no write path through this view).';
