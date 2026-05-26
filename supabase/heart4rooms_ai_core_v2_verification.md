# `heart4rooms_ai_core_v2` Verification Notes

Static verification performed against:

- `src/app/surveys/heart4rooms/heart4SurveySteps.tsx`
- `src/app/surveys/heart4rooms/heart4roomsClient.tsx`
- `src/lib/heart4roomsExport.ts`

## What Was Verified

The SQL view includes normalized fields for all answer groups currently written by the survey UI:

- Farmer meta:
  - `farmer_role`
  - `farmer_role_other`

- Questions:
  - `q1`
  - `q2`
  - `q3` + `q3_methods`
  - `q4`
  - `q5`
  - `q6` + `q6_methods`
  - `q7`
  - `q8` + `q8_methods`
  - `q9`
  - `q10` + `q10_multi`
  - `q11`
  - `q12` + `q12_a` + `q12_b`
  - `q13` + `q13_multi`
  - `q14.a` / `q14.b` / `q14.c` / `q14.detail`
  - `q15`
  - `q16` + `q16_multi`
  - `q17`
  - `q18`
  - `q19`
  - `q20`
  - `q21`
  - `q22`
  - `q23`
  - `q24` + `q24_uses` + `q24_how` + `q24_rate`
  - `q25` + `q25_opts`
  - `q26`
  - `q27` + `q27_multi`
  - `q28`
  - `q29`
  - `q30`
  - `q31`
  - `q32`
  - `q33`
  - `q34`
  - `q35` + `q35_multi`
  - `q36` + `q36_multi`
  - `q37`
  - `q38`

- Check-in block:
  - `checkin.photo_url`
  - `checkin.taken_at`
  - `checkin.lat`
  - `checkin.lng`
  - `checkin.accuracy`
  - `attachments.checkin_photo`

## Legacy Handling Verified

- `q24.factoryForm`:
  - current source: `q24.factoryForm`
  - legacy fallback: `q24_factory_forms`
  - effective field in SQL: `q24_factory_form_effective`

- `q36` selections:
  - current source: `q36_multi`
  - legacy fallback: `q36.choice`
  - effective field in SQL: `q36_selected_json`

## Fidelity Notes

- The view keeps both raw `answers` and raw `attachments`.
- This means no answer payload is discarded even if a future UI field is added later.
- Array fields are normalized safely as JSON arrays and fall back to `[]` if malformed or absent.

## Important Limitation

This verification was done by inspecting the codebase and matching the SQL mapping to the fields actually written/read by the app.

It does **not** prove that the SQL has been executed successfully in your Supabase instance yet. After pasting the SQL into Supabase, you should still run a few smoke checks such as:

```sql
select * from public.heart4rooms_ai_core_v2 order by created_at desc limit 3;
```

```sql
select q1_choice, q1_choice_label, count(*)
from public.heart4rooms_ai_core_v2
group by 1, 2
order by 3 desc;
```

```sql
select q36_selected_source, q36_selected_json
from public.heart4rooms_ai_core_v2
where q36_selected_source is not null
limit 10;
```
