-- Audited against:
-- - src/app/surveys/heart4rooms/heart4SurveySteps.tsx
-- - src/app/surveys/heart4rooms/heart4roomsClient.tsx
-- - src/lib/heart4roomsExport.ts
--
-- Purpose:
-- A normalized, read-friendly view for admin analytics / AI over Heart 4 Rooms surveys.
--
-- Notes:
-- - Keeps raw `answers` and `attachments` at the bottom for full-fidelity fallback.
-- - Includes legacy compatibility for:
--   * q24 factory form stored in `q24.factoryForm` or old `q24_factory_forms`
--   * q36 selections stored in `q36_multi` or older `q36.choice`
-- - Includes normalized fields for q29-q33 and checkin accuracy.

create or replace view public.heart4rooms_ai_core_v2 as
with src as (
  select
    s.*,
    coalesce(s.answers, '{}'::jsonb) as a,
    coalesce(s.attachments, '{}'::jsonb) as att
  from public.heart4rooms_surveys s
)
select
  id as survey_id,
  created_at,
  created_by_user_id,
  created_by_username,
  promoter_id,
  submitter_display_name,
  submitter_manual,
  farmer_first_name,
  farmer_last_name,
  concat_ws(
    ' ',
    nullif(trim(farmer_first_name), ''),
    nullif(trim(farmer_last_name), '')
  ) as farmer_full_name,
  contract_no,

  nullif(trim(a->>'farmer_role'), '') as farmer_role,
  nullif(trim(a->>'farmer_role_other'), '') as farmer_role_other,
  case nullif(trim(a->>'farmer_role'), '')
    when 'owner' then 'เจ้าของไร่'
    when 'worker' then 'ลูกไร่'
    when 'other' then coalesce(nullif(trim(a->>'farmer_role_other'), ''), 'อื่นๆ')
    else null
  end as farmer_role_label,

  nullif(trim(a->'q1'->>'choice'), '') as q1_choice,
  case nullif(trim(a->'q1'->>'choice'), '')
    when 'a' then 'เคย'
    when 'b' then 'ไม่เคย'
    else null
  end as q1_choice_label,

  nullif(trim(a->'q2'->>'choice'), '') as q2_choice,
  case nullif(trim(a->'q2'->>'choice'), '')
    when 'a' then 'ทันเวลา ภายใน 31 ม.ค.'
    when 'b' then 'ไม่ทันเวลา'
    else null
  end as q2_choice_label,
  nullif(trim(a->'q2'->>'cause'), '') as q2_cause,
  nullif(trim(a->'q2'->>'fix'), '') as q2_fix,

  nullif(trim(a->'q3'->>'choice'), '') as q3_choice,
  case nullif(trim(a->'q3'->>'choice'), '')
    when 'a' then 'ทันเวลา หญ้าไม่รก'
    when 'b' then 'ไม่ทันเวลา หญ้ารก'
    else null
  end as q3_choice_label,
  case
    when jsonb_typeof(a->'q3_methods') = 'array' then a->'q3_methods'
    else '[]'::jsonb
  end as q3_methods_json,
  nullif(trim(a->'q3'->>'otherMethod'), '') as q3_other_method,
  nullif(trim(a->'q3'->>'cause'), '') as q3_cause,
  nullif(trim(a->'q3'->>'fix'), '') as q3_fix,

  nullif(trim(a->'q4'->>'choice'), '') as q4_choice,
  case nullif(trim(a->'q4'->>'choice'), '')
    when 'a' then 'พบในแปลง'
    when 'b' then 'ไม่พบในแปลง'
    when 'c' then 'เคยพบของแปลงคนอื่น'
    else null
  end as q4_choice_label,
  nullif(trim(a->'q4'->>'otherFarmer'), '') as q4_other_farmer,

  nullif(trim(a->'q5'->>'choice'), '') as q5_choice,
  case nullif(trim(a->'q5'->>'choice'), '')
    when 'a' then 'มี'
    when 'b' then 'ไม่มี'
    else null
  end as q5_choice_label,
  nullif(trim(a->'q5'->>'detail'), '') as q5_detail,

  nullif(trim(a->'q6'->>'choice'), '') as q6_choice,
  case nullif(trim(a->'q6'->>'choice'), '')
    when 'a' then 'จัดการได้'
    when 'b' then 'ไม่สามารถจัดการได้'
    else null
  end as q6_choice_label,
  case
    when jsonb_typeof(a->'q6_methods') = 'array' then a->'q6_methods'
    else '[]'::jsonb
  end as q6_methods_json,
  nullif(trim(a->'q6'->>'otherDrug'), '') as q6_other_drug,
  nullif(trim(a->'q6'->>'otherMethod'), '') as q6_other_method,
  nullif(trim(a->'q6'->>'cause'), '') as q6_cause,
  nullif(trim(a->'q6'->>'fix'), '') as q6_fix,

  nullif(trim(a->'q7'->>'choice'), '') as q7_choice,
  case nullif(trim(a->'q7'->>'choice'), '')
    when 'a' then 'มี'
    when 'b' then 'ไม่มี'
    else null
  end as q7_choice_label,
  nullif(trim(a->'q7'->>'detail'), '') as q7_detail,

  nullif(trim(a->'q8'->>'choice'), '') as q8_choice,
  case nullif(trim(a->'q8'->>'choice'), '')
    when 'a' then 'จัดการได้'
    when 'b' then 'ไม่สามารถจัดการได้'
    else null
  end as q8_choice_label,
  case
    when jsonb_typeof(a->'q8_methods') = 'array' then a->'q8_methods'
    else '[]'::jsonb
  end as q8_methods_json,
  nullif(trim(a->'q8'->>'otherMethod'), '') as q8_other_method,
  nullif(trim(a->'q8'->>'cause'), '') as q8_cause,
  nullif(trim(a->'q8'->>'fix'), '') as q8_fix,

  nullif(trim(a->'q9'->>'choice'), '') as q9_choice,
  case nullif(trim(a->'q9'->>'choice'), '')
    when 'a' then 'มี'
    when 'b' then 'ไม่มี'
    else null
  end as q9_choice_label,
  nullif(trim(a->'q9'->>'detail'), '') as q9_detail,

  nullif(trim(a->'q10'->>'choice'), '') as q10_choice,
  case nullif(trim(a->'q10'->>'choice'), '')
    when 'a' then 'มีวิธีรักษาความชื้น'
    when 'b' then 'ยังไม่มีวิธีจัดการความชื้น'
    else null
  end as q10_choice_label,
  case
    when jsonb_typeof(a->'q10_multi') = 'array' then a->'q10_multi'
    else '[]'::jsonb
  end as q10_multi_json,
  nullif(trim(a->'q10'->>'other'), '') as q10_other,
  nullif(trim(a->'q10'->>'cause'), '') as q10_cause,
  nullif(trim(a->'q10'->>'fix'), '') as q10_fix,

  nullif(trim(a->'q11'->>'choice'), '') as q11_choice,
  case nullif(trim(a->'q11'->>'choice'), '')
    when 'a' then 'ไม่สามารถให้ได้เลย'
    when 'b' then '1 ครั้ง'
    when 'c' then '2 ครั้ง'
    when 'd' then '3 ครั้ง'
    when 'e' then 'ไม่จำกัด'
    else null
  end as q11_choice_label,
  nullif(trim(a->'q11'->>'cause'), '') as q11_cause,

  nullif(trim(a->'q12'->>'choice'), '') as q12_choice,
  case nullif(trim(a->'q12'->>'choice'), '')
    when 'a' then 'ต้นกำลังเป็นเครื่องสูบน้ำ'
    when 'b' then 'ต้นกำลังเป็นโซล่าเซลล์'
    else null
  end as q12_choice_label,
  case
    when jsonb_typeof(a->'q12_a') = 'array' then a->'q12_a'
    else '[]'::jsonb
  end as q12_a_json,
  case
    when jsonb_typeof(a->'q12_b') = 'array' then a->'q12_b'
    else '[]'::jsonb
  end as q12_b_json,
  nullif(trim(a->'q12'->>'heat'), '') as q12_heat,

  nullif(trim(a->'q13'->>'choice'), '') as q13_choice,
  case nullif(trim(a->'q13'->>'choice'), '')
    when 'a' then 'อยากสร้างแหล่งน้ำเพิ่ม'
    when 'b' then 'ไม่อยาก'
    else null
  end as q13_choice_label,
  case
    when jsonb_typeof(a->'q13_multi') = 'array' then a->'q13_multi'
    else '[]'::jsonb
  end as q13_multi_json,
  nullif(trim(a->'q13'->>'other'), '') as q13_other,
  nullif(trim(a->'q13'->>'cause'), '') as q13_cause,

  nullif(trim(a->'q14'->>'a'), '') as q14_a,
  case nullif(trim(a->'q14'->>'a'), '')
    when 'i' then 'ไม่มีแหล่งน้ำสำรองเลย ต้องรอฝนอย่างเดียว'
    when 'ii' then 'มีสระหรือบ่อ แต่เก็บน้ำได้ไม่พอ'
    when 'iii' then 'มีแหล่งน้ำ แต่วิธีการให้น้ำทำให้เปลืองน้ำ'
    when 'iv' then 'ไม่มีปัญหาเลย มีแหล่งน้ำและระบบน้ำเพียงพอตลอดปี'
    else null
  end as q14_a_label,
  nullif(trim(a->'q14'->>'b'), '') as q14_b,
  case nullif(trim(a->'q14'->>'b'), '')
    when 'i' then 'มีสระขนาด 1 งาน ให้น้ำถึง 60 ไร่ จำนวน 4 ครั้ง'
    when 'ii' then 'มีบ่อบาดาล 1 บ่อ ท่อหน้า 2 นิ้ว ให้น้ำอ้อยพื้นที่ 100 ไร่ จำนวน 4 ครั้ง'
    when 'iii' then 'ต้องคิดจากปริมาณการใช้น้ำจากพื้นที่ปลูก แล้วกำหนดวิธีการจัดหาแหล่งน้ำ'
    else null
  end as q14_b_label,
  nullif(trim(a->'q14'->>'c'), '') as q14_c,
  case nullif(trim(a->'q14'->>'c'), '')
    when 'i' then 'มีครบ สามารถให้ได้ทุกแปลง'
    when 'ii' then 'ยังไม่ครบ'
    else null
  end as q14_c_label,
  nullif(trim(a->'q14'->>'detail'), '') as q14_detail,

  nullif(trim(a->'q15'->>'choice'), '') as q15_choice,
  case nullif(trim(a->'q15'->>'choice'), '')
    when 'a' then 'มี'
    when 'b' then 'ไม่มี'
    else null
  end as q15_choice_label,
  nullif(trim(a->'q15'->>'detail'), '') as q15_detail,

  case
    when jsonb_typeof(a->'q16_multi') = 'array' then a->'q16_multi'
    else '[]'::jsonb
  end as q16_multi_json,
  nullif(trim(a->'q16'->>'other'), '') as q16_other,

  nullif(trim(a->'q17'->>'choice'), '') as q17_choice,
  case nullif(trim(a->'q17'->>'choice'), '')
    when 'a' then 'ใช้'
    when 'b' then 'ไม่ใช้'
    else null
  end as q17_choice_label,
  nullif(trim(a->'q17'->>'cause'), '') as q17_cause,

  nullif(trim(a->'q18'->>'choice'), '') as q18_choice,
  case nullif(trim(a->'q18'->>'choice'), '')
    when 'a' then 'เคยใช้ แต่ปัจจุบันไม่ใช้'
    when 'b' then 'ปัจจุบันใช้ และอนาคตก็จะใช้'
    when 'c' then 'ทั้งอดีต ปัจจุบัน และอนาคต จะไม่ขอใช้'
    else null
  end as q18_choice_label,
  nullif(trim(a->'q18'->>'detail'), '') as q18_detail,

  nullif(trim(a->'q19'->>'choice'), '') as q19_choice,
  case nullif(trim(a->'q19'->>'choice'), '')
    when 'a' then 'มีผล ปลูกเพิ่มขึ้น'
    when 'b' then 'ไม่มีผล'
    else null
  end as q19_choice_label,
  nullif(trim(a->'q19'->>'detail'), '') as q19_detail,

  nullif(trim(a->'q20'->>'base_formula'), '') as q20_base_formula,
  nullif(trim(a->'q20'->>'base_rate'), '') as q20_base_rate,
  nullif(trim(a->'q20'->>'nourish_formula'), '') as q20_nourish_formula,
  nullif(trim(a->'q20'->>'nourish_rate'), '') as q20_nourish_rate,
  nullif(trim(a->'q20'->>'top_formula'), '') as q20_top_formula,
  nullif(trim(a->'q20'->>'top_rate'), '') as q20_top_rate,

  nullif(trim(a->'q21'->>'choice'), '') as q21_choice,
  case nullif(trim(a->'q21'->>'choice'), '')
    when 'a' then 'ทำไปแล้ว'
    when 'b' then 'ยังไม่ได้ทำ'
    when 'c' then 'สนใจอยากทำในปีหน้า'
    else null
  end as q21_choice_label,
  nullif(trim(a->'q21'->>'detail'), '') as q21_detail,

  nullif(trim(a->'q22'->>'cut_formula'), '') as q22_cut_formula,
  nullif(trim(a->'q22'->>'cut_rate'), '') as q22_cut_rate,
  nullif(trim(a->'q22'->>'nourish_formula'), '') as q22_nourish_formula,
  nullif(trim(a->'q22'->>'nourish_rate'), '') as q22_nourish_rate,
  nullif(trim(a->'q22'->>'top_formula'), '') as q22_top_formula,
  nullif(trim(a->'q22'->>'top_rate'), '') as q22_top_rate,

  nullif(trim(a->'q23'->>'qty_21718'), '') as q23_qty_21718,
  nullif(trim(a->'q23'->>'qty_1688'), '') as q23_qty_1688,
  nullif(trim(a->'q23'->>'other_formula'), '') as q23_other_formula,
  nullif(trim(a->'q23'->>'other_qty'), '') as q23_other_qty,

  case
    when jsonb_typeof(a->'q24_uses') = 'array' then a->'q24_uses'
    else '[]'::jsonb
  end as q24_uses_json,
  case
    when jsonb_typeof(a->'q24_how') = 'array' then a->'q24_how'
    else '[]'::jsonb
  end as q24_how_json,
  case
    when jsonb_typeof(a->'q24_rate') = 'array' then a->'q24_rate'
    else '[]'::jsonb
  end as q24_rate_json,
  nullif(trim(a->'q24'->>'otherSoil'), '') as q24_other_soil,
  nullif(trim(a->'q24'->>'factoryWant'), '') as q24_factory_want,
  case nullif(trim(a->'q24'->>'factoryWant'), '')
    when '1' then 'ต้องการ'
    when '2' then 'ไม่ต้องการ'
    else null
  end as q24_factory_want_label,
  case
    when jsonb_typeof(a->'q24_factory_forms') = 'array' then a->'q24_factory_forms'
    else '[]'::jsonb
  end as q24_factory_forms_legacy_json,
  nullif(trim(a->'q24'->>'factoryForm'), '') as q24_factory_form_raw,
  coalesce(
    nullif(trim(a->'q24'->>'factoryForm'), ''),
    case
      when jsonb_typeof(a->'q24_factory_forms') = 'array' and (a->'q24_factory_forms') ? 'i' then 'i'
      when jsonb_typeof(a->'q24_factory_forms') = 'array' and (a->'q24_factory_forms') ? 'ii' then 'ii'
      else null
    end
  ) as q24_factory_form_effective,
  case
    when coalesce(
      nullif(trim(a->'q24'->>'factoryForm'), ''),
      case
        when jsonb_typeof(a->'q24_factory_forms') = 'array' and (a->'q24_factory_forms') ? 'i' then 'i'
        when jsonb_typeof(a->'q24_factory_forms') = 'array' and (a->'q24_factory_forms') ? 'ii' then 'ii'
        else null
      end
    ) = 'i' then 'เม็ด'
    when coalesce(
      nullif(trim(a->'q24'->>'factoryForm'), ''),
      case
        when jsonb_typeof(a->'q24_factory_forms') = 'array' and (a->'q24_factory_forms') ? 'i' then 'i'
        when jsonb_typeof(a->'q24_factory_forms') = 'array' and (a->'q24_factory_forms') ? 'ii' then 'ii'
        else null
      end
    ) = 'ii' then 'ผง'
    else null
  end as q24_factory_form_label,
  case
    when nullif(trim(a->'q24'->>'factoryForm'), '') is not null then 'q24.factoryForm'
    when jsonb_typeof(a->'q24_factory_forms') = 'array' and (
      (a->'q24_factory_forms') ? 'i' or (a->'q24_factory_forms') ? 'ii'
    ) then 'q24_factory_forms (legacy)'
    else null
  end as q24_factory_form_source,
  nullif(trim(a->'q24'->>'factoryBags'), '') as q24_factory_bags,

  case
    when jsonb_typeof(a->'q25_opts') = 'array' then a->'q25_opts'
    else '[]'::jsonb
  end as q25_opts_json,
  nullif(trim(a->'q25'->>'otherText'), '') as q25_other_text,

  nullif(trim(a->'q26'->>'choice'), '') as q26_choice,
  case nullif(trim(a->'q26'->>'choice'), '')
    when 'a' then 'ทราบแล้ว'
    when 'b' then 'ยังไม่ทราบ'
    when 'c' then 'กังวล'
    else null
  end as q26_choice_label,
  nullif(trim(a->'q26'->>'worry'), '') as q26_worry,

  case
    when jsonb_typeof(a->'q27_multi') = 'array' then a->'q27_multi'
    else '[]'::jsonb
  end as q27_multi_json,
  nullif(trim(a->'q27'->>'fertilizer'), '') as q27_fertilizer,
  nullif(trim(a->'q27'->>'cost'), '') as q27_cost,
  nullif(trim(a->'q27'->>'oil'), '') as q27_oil,

  nullif(trim(a->'q28'->>'choice'), '') as q28_choice,
  case nullif(trim(a->'q28'->>'choice'), '')
    when 'a' then 'ข้าว'
    when 'b' then 'ข้าวโพด'
    when 'c' then 'มันสำปะหลัง'
    when 'd' then 'อื่นๆ'
    when 'e' then 'ไม่มี'
    else null
  end as q28_choice_label,
  nullif(trim(a->'q28'->>'other'), '') as q28_other,

  nullif(trim(a->'q29'->>'score'), '') as q29_score,
  case
    when coalesce(a->'q29'->>'score', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then (a->'q29'->>'score')::numeric
    else null
  end as q29_score_num,
  nullif(trim(a->'q29'->>'good'), '') as q29_good,
  nullif(trim(a->'q29'->>'improve'), '') as q29_improve,

  nullif(trim(a->'q30'->>'score'), '') as q30_score,
  case
    when coalesce(a->'q30'->>'score', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then (a->'q30'->>'score')::numeric
    else null
  end as q30_score_num,
  nullif(trim(a->'q30'->>'good'), '') as q30_good,
  nullif(trim(a->'q30'->>'improve'), '') as q30_improve,

  nullif(trim(a->'q31'->>'score'), '') as q31_score,
  case
    when coalesce(a->'q31'->>'score', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then (a->'q31'->>'score')::numeric
    else null
  end as q31_score_num,
  nullif(trim(a->'q31'->>'good'), '') as q31_good,
  nullif(trim(a->'q31'->>'improve'), '') as q31_improve,

  nullif(trim(a->'q32'->>'score'), '') as q32_score,
  case
    when coalesce(a->'q32'->>'score', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then (a->'q32'->>'score')::numeric
    else null
  end as q32_score_num,
  nullif(trim(a->'q32'->>'good'), '') as q32_good,
  nullif(trim(a->'q32'->>'improve'), '') as q32_improve,

  nullif(trim(a->'q33'->>'score'), '') as q33_score,
  case
    when coalesce(a->'q33'->>'score', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then (a->'q33'->>'score')::numeric
    else null
  end as q33_score_num,
  nullif(trim(a->'q33'->>'good'), '') as q33_good,
  nullif(trim(a->'q33'->>'improve'), '') as q33_improve,

  nullif(trim(a->'q34'->>'tonsPast'), '') as q34_tons_past,
  case
    when coalesce(a->'q34'->>'tonsPast', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then (a->'q34'->>'tonsPast')::numeric
    else null
  end as q34_tons_past_num,
  nullif(trim(a->'q34'->>'tonsTarget'), '') as q34_tons_target,
  case
    when coalesce(a->'q34'->>'tonsTarget', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then (a->'q34'->>'tonsTarget')::numeric
    else null
  end as q34_tons_target_num,

  case
    when jsonb_typeof(a->'q35_multi') = 'array' then a->'q35_multi'
    else '[]'::jsonb
  end as q35_multi_json,
  nullif(trim(a->'q35'->>'factor'), '') as q35_factor,
  nullif(trim(a->'q35'->>'budget'), '') as q35_budget,
  nullif(trim(a->'q35'->>'water'), '') as q35_water,
  nullif(trim(a->'q35'->>'other'), '') as q35_other,

  case
    when jsonb_typeof(a->'q36_multi') = 'array' then a->'q36_multi'
    else '[]'::jsonb
  end as q36_multi_json,
  nullif(trim(a->'q36'->>'choice'), '') as q36_choice_legacy,
  case
    when jsonb_typeof(a->'q36_multi') = 'array' and jsonb_array_length(a->'q36_multi') > 0 then a->'q36_multi'
    when nullif(trim(a->'q36'->>'choice'), '') in ('a', 'b', 'c', 'd', 'e', 'f', 'g')
      then jsonb_build_array(trim(a->'q36'->>'choice'))
    else '[]'::jsonb
  end as q36_selected_json,
  case
    when jsonb_typeof(a->'q36_multi') = 'array' and jsonb_array_length(a->'q36_multi') > 0 then 'q36_multi'
    when nullif(trim(a->'q36'->>'choice'), '') in ('a', 'b', 'c', 'd', 'e', 'f', 'g') then 'q36.choice (legacy)'
    else null
  end as q36_selected_source,
  nullif(trim(a->'q36'->>'travel_place'), '') as q36_travel_place,
  nullif(trim(a->'q36'->>'fert_formula'), '') as q36_fert_formula,
  nullif(trim(a->'q36'->>'chemical'), '') as q36_chemical,
  nullif(trim(a->'q36'->>'organic_qty'), '') as q36_organic_qty,
  nullif(trim(a->'q36'->>'water_type'), '') as q36_water_type,
  nullif(trim(a->'q36'->>'variety'), '') as q36_variety,
  nullif(trim(a->'q36'->>'other'), '') as q36_other,

  nullif(trim(a->'q37'->>'choice'), '') as q37_choice,
  case nullif(trim(a->'q37'->>'choice'), '')
    when 'a' then 'ต้องการปลูกอ้อยฝน เพื่อเป็นพันธุ์'
    when 'b' then 'ต้องการปลูกอ้อยฝน เพื่อเข้าหีบ'
    when 'c' then 'ไม่ต้องการ'
    else null
  end as q37_choice_label,
  nullif(trim(a->'q37'->>'detail'), '') as q37_detail,

  nullif(trim(a->'q38'->>'choice'), '') as q38_choice,
  case nullif(trim(a->'q38'->>'choice'), '')
    when 'a' then 'มี'
    when 'b' then 'ไม่มี'
    else null
  end as q38_choice_label,
  nullif(trim(a->'q38'->>'detail'), '') as q38_detail,

  nullif(trim(att->>'checkin_photo'), '') as attachment_checkin_photo_url,
  nullif(trim(a->'checkin'->>'photo_url'), '') as checkin_photo_url,
  coalesce(
    nullif(trim(att->>'checkin_photo'), ''),
    nullif(trim(a->'checkin'->>'photo_url'), '')
  ) as checkin_photo_url_effective,
  nullif(trim(a->'checkin'->>'taken_at'), '') as checkin_taken_at,
  case
    when coalesce(a->'checkin'->>'lat', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then (a->'checkin'->>'lat')::numeric
    else null
  end as checkin_lat,
  case
    when coalesce(a->'checkin'->>'lng', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then (a->'checkin'->>'lng')::numeric
    else null
  end as checkin_lng,
  case
    when coalesce(a->'checkin'->>'accuracy', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then (a->'checkin'->>'accuracy')::numeric
    else null
  end as checkin_accuracy,

  answers,
  attachments

from src;

-- Example verification queries:
-- select * from public.heart4rooms_ai_core_v2 order by created_at desc limit 5;
-- select q1_choice, q1_choice_label, count(*) from public.heart4rooms_ai_core_v2 group by 1, 2 order by 3 desc;
-- select q29_score_num, avg(q29_score_num) from public.heart4rooms_ai_core_v2 group by 1 order by 1;
