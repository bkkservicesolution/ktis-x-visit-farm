-- Depends on: public.heart4rooms_ai_core_v2
--
-- Purpose:
-- Unpivot free-text / open-text answers into row form so AI can:
-- - search recurring themes
-- - summarize pain points
-- - group by question / section / text_kind
--
-- Design notes:
-- - Built on top of heart4rooms_ai_core_v2 to avoid duplicating answer mapping logic.
-- - Only includes fields that are semantically useful for text analysis / summarization.
-- - Structured numeric / rate / formula fields remain in heart4rooms_ai_core_v2.

create or replace view public.heart4rooms_ai_open_text_v1 as
with base as (
  select *
  from public.heart4rooms_ai_core_v2
),
open_rows as (
  select
    b.survey_id,
    b.created_at,
    b.created_by_user_id,
    b.created_by_username,
    b.promoter_id,
    b.submitter_display_name,
    b.farmer_first_name,
    b.farmer_last_name,
    b.farmer_full_name,
    b.contract_no,
    x.section_key,
    x.section_label,
    x.question_key,
    x.question_label,
    x.field_key,
    x.field_label,
    x.text_kind,
    x.choice_code,
    x.choice_label,
    x.text_value
  from base b
  cross join lateral (
    values
      (
        'room_1',
        'หัวใจห้องที่ 1',
        'q2',
        'ข้อ 2',
        'cause',
        'สาเหตุเพราะ',
        'cause',
        b.q2_choice,
        b.q2_choice_label,
        b.q2_cause
      ),
      (
        'room_1',
        'หัวใจห้องที่ 1',
        'q2',
        'ข้อ 2',
        'fix',
        'ถ้าย้อนเวลาได้จะแก้ไขอย่างไร',
        'fix',
        b.q2_choice,
        b.q2_choice_label,
        b.q2_fix
      ),

      (
        'room_2',
        'หัวใจห้องที่ 2',
        'q3',
        'ข้อ 3',
        'other_method',
        'วิธีอื่น',
        'other',
        b.q3_choice,
        b.q3_choice_label,
        b.q3_other_method
      ),
      (
        'room_2',
        'หัวใจห้องที่ 2',
        'q3',
        'ข้อ 3',
        'cause',
        'สาเหตุเพราะ',
        'cause',
        b.q3_choice,
        b.q3_choice_label,
        b.q3_cause
      ),
      (
        'room_2',
        'หัวใจห้องที่ 2',
        'q3',
        'ข้อ 3',
        'fix',
        'ถ้าย้อนเวลาได้จะแก้ไขอย่างไร',
        'fix',
        b.q3_choice,
        b.q3_choice_label,
        b.q3_fix
      ),
      (
        'room_2',
        'หัวใจห้องที่ 2',
        'q4',
        'ข้อ 4',
        'other_farmer',
        'ชื่อชาวไร่/ตำแหน่งแปลง',
        'detail',
        b.q4_choice,
        b.q4_choice_label,
        b.q4_other_farmer
      ),

      (
        'room_3',
        'หัวใจห้องที่ 3',
        'q5',
        'ข้อ 5',
        'detail',
        'โปรดระบุ',
        'detail',
        b.q5_choice,
        b.q5_choice_label,
        b.q5_detail
      ),
      (
        'room_3',
        'หัวใจห้องที่ 3',
        'q6',
        'ข้อ 6',
        'other_drug',
        'ตัวยา',
        'other',
        b.q6_choice,
        b.q6_choice_label,
        b.q6_other_drug
      ),
      (
        'room_3',
        'หัวใจห้องที่ 3',
        'q6',
        'ข้อ 6',
        'other_method',
        'วิธีอื่น',
        'other',
        b.q6_choice,
        b.q6_choice_label,
        b.q6_other_method
      ),
      (
        'room_3',
        'หัวใจห้องที่ 3',
        'q6',
        'ข้อ 6',
        'cause',
        'สาเหตุเพราะ',
        'cause',
        b.q6_choice,
        b.q6_choice_label,
        b.q6_cause
      ),
      (
        'room_3',
        'หัวใจห้องที่ 3',
        'q6',
        'ข้อ 6',
        'fix',
        'ถ้าย้อนเวลาได้จะแก้ไขอย่างไร',
        'fix',
        b.q6_choice,
        b.q6_choice_label,
        b.q6_fix
      ),
      (
        'room_3',
        'หัวใจห้องที่ 3',
        'q7',
        'ข้อ 7',
        'detail',
        'โปรดระบุ',
        'detail',
        b.q7_choice,
        b.q7_choice_label,
        b.q7_detail
      ),
      (
        'room_3',
        'หัวใจห้องที่ 3',
        'q8',
        'ข้อ 8',
        'other_method',
        'วิธีอื่น',
        'other',
        b.q8_choice,
        b.q8_choice_label,
        b.q8_other_method
      ),
      (
        'room_3',
        'หัวใจห้องที่ 3',
        'q8',
        'ข้อ 8',
        'cause',
        'สาเหตุเพราะ',
        'cause',
        b.q8_choice,
        b.q8_choice_label,
        b.q8_cause
      ),
      (
        'room_3',
        'หัวใจห้องที่ 3',
        'q8',
        'ข้อ 8',
        'fix',
        'ถ้าย้อนเวลาได้จะแก้ไขอย่างไร',
        'fix',
        b.q8_choice,
        b.q8_choice_label,
        b.q8_fix
      ),
      (
        'room_3',
        'หัวใจห้องที่ 3',
        'q9',
        'ข้อ 9',
        'detail',
        'โปรดระบุ',
        'detail',
        b.q9_choice,
        b.q9_choice_label,
        b.q9_detail
      ),

      (
        'room_4',
        'หัวใจห้องที่ 4',
        'q10',
        'ข้อ 10',
        'other',
        'วิธีอื่น',
        'other',
        b.q10_choice,
        b.q10_choice_label,
        b.q10_other
      ),
      (
        'room_4',
        'หัวใจห้องที่ 4',
        'q10',
        'ข้อ 10',
        'cause',
        'สาเหตุเพราะ',
        'cause',
        b.q10_choice,
        b.q10_choice_label,
        b.q10_cause
      ),
      (
        'room_4',
        'หัวใจห้องที่ 4',
        'q10',
        'ข้อ 10',
        'fix',
        'ถ้าย้อนเวลาได้จะแก้ไขอย่างไร',
        'fix',
        b.q10_choice,
        b.q10_choice_label,
        b.q10_fix
      ),
      (
        'room_4',
        'หัวใจห้องที่ 4',
        'q11',
        'ข้อ 11',
        'cause',
        'สาเหตุเพราะ',
        'cause',
        b.q11_choice,
        b.q11_choice_label,
        b.q11_cause
      ),
      (
        'room_4',
        'หัวใจห้องที่ 4',
        'q12',
        'ข้อ 12',
        'heat',
        'จัดการความร้อนของน้ำ',
        'detail',
        b.q12_choice,
        b.q12_choice_label,
        b.q12_heat
      ),
      (
        'room_4',
        'หัวใจห้องที่ 4',
        'q13',
        'ข้อ 13',
        'other',
        'วิธีอื่น',
        'other',
        b.q13_choice,
        b.q13_choice_label,
        b.q13_other
      ),
      (
        'room_4',
        'หัวใจห้องที่ 4',
        'q13',
        'ข้อ 13',
        'cause',
        'สาเหตุเพราะ',
        'cause',
        b.q13_choice,
        b.q13_choice_label,
        b.q13_cause
      ),
      (
        'room_4',
        'หัวใจห้องที่ 4',
        'q14',
        'ข้อ 14',
        'detail',
        'รายละเอียดแปลง',
        'detail',
        b.q14_c,
        b.q14_c_label,
        b.q14_detail
      ),
      (
        'room_4',
        'หัวใจห้องที่ 4',
        'q15',
        'ข้อ 15',
        'detail',
        'โปรดระบุ',
        'detail',
        b.q15_choice,
        b.q15_choice_label,
        b.q15_detail
      ),

      (
        'plus_fertilizer',
        'หัวใจพลัส ปุ๋ย',
        'q16',
        'ข้อ 16',
        'other',
        'อื่นๆ',
        'other',
        null,
        null,
        b.q16_other
      ),
      (
        'plus_fertilizer',
        'หัวใจพลัส ปุ๋ย',
        'q17',
        'ข้อ 17',
        'cause',
        'สาเหตุเพราะ',
        'cause',
        b.q17_choice,
        b.q17_choice_label,
        b.q17_cause
      ),
      (
        'plus_fertilizer',
        'หัวใจพลัส ปุ๋ย',
        'q18',
        'ข้อ 18',
        'detail',
        'สาเหตุ / รายละเอียด',
        'reason',
        b.q18_choice,
        b.q18_choice_label,
        b.q18_detail
      ),
      (
        'plus_fertilizer',
        'หัวใจพลัส ปุ๋ย',
        'q19',
        'ข้อ 19',
        'detail',
        'สาเหตุเพราะ',
        'reason',
        b.q19_choice,
        b.q19_choice_label,
        b.q19_detail
      ),
      (
        'plus_fertilizer',
        'หัวใจพลัส ปุ๋ย',
        'q21',
        'ข้อ 21',
        'detail',
        'เพราะ',
        'reason',
        b.q21_choice,
        b.q21_choice_label,
        b.q21_detail
      ),

      (
        'plus_organic',
        'หัวใจพลัส ปุ๋ยอินทรีย์',
        'q24',
        'ข้อ 24',
        'other_soil',
        'วัสดุปรับปรุงดินอื่น',
        'other',
        b.q24_factory_want,
        b.q24_factory_want_label,
        b.q24_other_soil
      ),
      (
        'plus_organic',
        'หัวใจพลัส ปุ๋ยอินทรีย์',
        'q25',
        'ข้อ 25',
        'other_text',
        'อื่นๆ',
        'other',
        null,
        null,
        b.q25_other_text
      ),

      (
        'survey_part_2',
        'แบบสำรวจศัตรูหัวใจ',
        'q26',
        'ข้อ 26',
        'worry',
        'กังวล เพราะ',
        'concern',
        b.q26_choice,
        b.q26_choice_label,
        b.q26_worry
      ),
      (
        'survey_part_2',
        'แบบสำรวจศัตรูหัวใจ',
        'q27',
        'ข้อ 27',
        'fertilizer',
        'ปุ๋ย',
        'obstacle',
        null,
        null,
        b.q27_fertilizer
      ),
      (
        'survey_part_2',
        'แบบสำรวจศัตรูหัวใจ',
        'q27',
        'ข้อ 27',
        'cost',
        'ต้นทุนการจัดการ',
        'obstacle',
        null,
        null,
        b.q27_cost
      ),
      (
        'survey_part_2',
        'แบบสำรวจศัตรูหัวใจ',
        'q27',
        'ข้อ 27',
        'oil',
        'น้ำมัน',
        'obstacle',
        null,
        null,
        b.q27_oil
      ),
      (
        'survey_part_2',
        'แบบสำรวจศัตรูหัวใจ',
        'q28',
        'ข้อ 28',
        'other',
        'อื่นๆ',
        'other',
        b.q28_choice,
        b.q28_choice_label,
        b.q28_other
      ),

      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q29',
        'ข้อ 29',
        'good',
        'เรื่องที่ทำได้ดี',
        'positive_feedback',
        null,
        null,
        b.q29_good
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q29',
        'ข้อ 29',
        'improve',
        'เรื่องที่ควรพัฒนา',
        'improvement',
        null,
        null,
        b.q29_improve
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q30',
        'ข้อ 30',
        'good',
        'เรื่องที่ทำได้ดี',
        'positive_feedback',
        null,
        null,
        b.q30_good
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q30',
        'ข้อ 30',
        'improve',
        'เรื่องที่ควรพัฒนา',
        'improvement',
        null,
        null,
        b.q30_improve
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q31',
        'ข้อ 31',
        'good',
        'เรื่องที่ทำได้ดี',
        'positive_feedback',
        null,
        null,
        b.q31_good
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q31',
        'ข้อ 31',
        'improve',
        'เรื่องที่ควรพัฒนา',
        'improvement',
        null,
        null,
        b.q31_improve
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q32',
        'ข้อ 32',
        'good',
        'เรื่องที่ทำได้ดี',
        'positive_feedback',
        null,
        null,
        b.q32_good
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q32',
        'ข้อ 32',
        'improve',
        'เรื่องที่ควรพัฒนา',
        'improvement',
        null,
        null,
        b.q32_improve
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q33',
        'ข้อ 33',
        'good',
        'เรื่องที่ทำได้ดี',
        'positive_feedback',
        null,
        null,
        b.q33_good
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q33',
        'ข้อ 33',
        'improve',
        'เรื่องที่ควรพัฒนา',
        'improvement',
        null,
        null,
        b.q33_improve
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q35',
        'ข้อ 35',
        'factor',
        'ปัจจัยการผลิต',
        'request',
        null,
        null,
        b.q35_factor
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q35',
        'ข้อ 35',
        'budget',
        'วงเงิน',
        'request',
        null,
        null,
        b.q35_budget
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q35',
        'ข้อ 35',
        'water',
        'สร้างแหล่งน้ำ',
        'request',
        null,
        null,
        b.q35_water
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q35',
        'ข้อ 35',
        'other',
        'อื่นๆ',
        'other',
        null,
        null,
        b.q35_other
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q36',
        'ข้อ 36',
        'travel_place',
        'สถานที่',
        'reward_detail',
        null,
        null,
        b.q36_travel_place
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q36',
        'ข้อ 36',
        'fert_formula',
        'สูตรที่ต้องการ',
        'reward_detail',
        null,
        null,
        b.q36_fert_formula
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q36',
        'ข้อ 36',
        'chemical',
        'ยาที่ต้องการ',
        'reward_detail',
        null,
        null,
        b.q36_chemical
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q36',
        'ข้อ 36',
        'organic_qty',
        'จำนวนที่ต้องการ',
        'reward_detail',
        null,
        null,
        b.q36_organic_qty
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q36',
        'ข้อ 36',
        'water_type',
        'ประเภทแหล่งน้ำ',
        'reward_detail',
        null,
        null,
        b.q36_water_type
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q36',
        'ข้อ 36',
        'variety',
        'พันธุ์ที่ต้องการ',
        'reward_detail',
        null,
        null,
        b.q36_variety
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q36',
        'ข้อ 36',
        'other',
        'อื่นๆ',
        'other',
        null,
        null,
        b.q36_other
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q37',
        'ข้อ 37',
        'detail',
        'ระบุจำนวนไร่',
        'detail',
        b.q37_choice,
        b.q37_choice_label,
        b.q37_detail
      ),
      (
        'survey_part_3',
        'ความพึงพอใจและแผนปีหน้า',
        'q38',
        'ข้อ 38',
        'detail',
        'โปรดระบุ',
        'detail',
        b.q38_choice,
        b.q38_choice_label,
        b.q38_detail
      )
  ) as x(
    section_key,
    section_label,
    question_key,
    question_label,
    field_key,
    field_label,
    text_kind,
    choice_code,
    choice_label,
    text_value
  )
)
select
  survey_id,
  created_at,
  created_by_user_id,
  created_by_username,
  promoter_id,
  submitter_display_name,
  farmer_first_name,
  farmer_last_name,
  farmer_full_name,
  contract_no,
  section_key,
  section_label,
  question_key,
  question_label,
  field_key,
  field_label,
  text_kind,
  choice_code,
  choice_label,
  btrim(text_value) as text_value,
  char_length(btrim(text_value)) as text_length
from open_rows
where text_value is not null
  and btrim(text_value) <> '';

-- Example checks:
-- select * from public.heart4rooms_ai_open_text_v1 order by created_at desc limit 20;
-- select question_key, field_key, count(*) from public.heart4rooms_ai_open_text_v1 group by 1, 2 order by 3 desc;
-- select text_value, count(*) from public.heart4rooms_ai_open_text_v1 where question_key = 'q7' group by 1 order by 2 desc limit 20;
