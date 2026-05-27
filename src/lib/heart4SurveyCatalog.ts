/**
 * Canonical Heart4Rooms survey question text + options.
 * Must stay in sync with heart4SurveySteps.tsx (source of truth in UI).
 */

export type Heart4Option = { code: string; label: string };

export type Heart4SubOptionGroup = {
  /** answers key e.g. q3_methods, q12_a */
  fieldKey: string;
  label: string;
  options: Heart4Option[];
};

export type Heart4QuestionDef = {
  key: string;
  number: number;
  sectionKey: string;
  sectionLabel: string;
  prompt: string;
  /** Top-level radio / visible choices on the form */
  options?: Heart4Option[];
  subGroups?: Heart4SubOptionGroup[];
  /** Free-text / numeric fields (not multiple choice) */
  fields?: string[];
  notes?: string;
};

export const HEART4_SECTION = {
  heart_intro: { key: "heart_intro", label: "หัวใจ 4 ห้อง — ทั่วไป" },
  room1: { key: "room1", label: "หัวใจห้องที่ 1" },
  room3: { key: "room3", label: "หัวใจห้องที่ 3" },
  room4: { key: "room4", label: "หัวใจห้องที่ 4" },
  fert_plus: { key: "fert_plus", label: 'หัวใจพลัส "ปุ๋ย"' },
  organic_plus: { key: "organic_plus", label: 'หัวใจพลัส "ปุ๋ยอินทรีย์"' },
  general: { key: "general", label: "ทั่วไป / แนวโน้ม" },
  satisfaction: { key: "satisfaction", label: "ความพึงพอใจและนักส่งเสริม" },
} as const;

/** Multi-choice code → Thai label (answers array fields). */
export const HEART4_MULTI_LABELS: Record<string, Record<string, string>> = {
  q3_methods: {
    i: "ใช้ยาคุม",
    ii: "ใช้ยาฆ่า",
    iii: "ใช้เครื่องมือเขตกรรม เช่น SRT6",
    iv: "ใช้คนดาย",
    v: "วิธีอื่น : ระบุ …",
  },
  q6_methods: {
    i: "เปลี่ยนพันธุ์ เป็นพันธุ์ตระกูลที่ไม่ใช่ ขอนแก่น, 111, 108",
    ii: "ใช้ยาป้องกันกำจัดแส้ดำถูกวิธี ฉีดตอนเช้า/เย็น, ฉีด 2 ครั้ง ห่างกัน 20 วัน, ไม่ใช้โดรนในการฉีด, เน้นฉีดกรอกยอดอ้อย, ฉีดได้เลย ไม่ต้องรอฝน",
    iii: "ขุดออก",
    iv: "ใช้ยาตัวอื่นที่ไม่ใช่ของทางโรงงานจัดหา โปรดระบุ ตัวยา : …",
    v: "วิธีอื่น : ระบุ …",
  },
  q8_methods: {
    i: "หมั่นสำรวจ และใช้ยาฉีดเมื่อพบการระบาดเกิน 10%",
    ii: "หมั่นสำรวจ และกำจัดด้วยแรงงาน",
    iii: "หมั่นสำรวจ และใช้ศัตรูธรรมชาติจัดการ เช่น แตนเบียน แมลงหางหนีบ",
    iv: "วิธีอื่น : ระบุ ….",
  },
  q10_multi: {
    i: "ไว้ใบ 100% เพื่อเก็บความชื้น ลดวัชพืช",
    ii: "ไว้ใบ 30% ตามแถวอ้อย เพื่อเก็บความชื้น ลดวัชพืช",
    iii: "ใช้ปุ๋ยอินทรีย์ หรือวัสดุปรับปรุงดิน เพื่อเพิ่มการอุ้มน้ำในดิน",
    iv: "วิธีอื่น : ระบุ …",
  },
  q12_a: {
    i: "ให้ช่วงเวลาใด ปริมาณเท่าไหร่ ก็ได้",
    ii: "ให้ในช่วงเวลา เช้า หรือกลางคืน เพื่อไม่ให้น้ำร้อนจนเกินไปสำหรับอ้อย",
    iii: "ให้น้ำมากกว่า 20 ชั่วโมงต่อครั้ง",
    iv: "ให้น้ำโดยทยอยแบ่งให้ ครั้งละ 8-10 ชั่วโมง ดูตามความชื้นของดิน",
  },
  q12_b: {
    i: "ให้ช่วงเวลาใด ปริมาณเท่าไหร่ ก็ได้",
    ii: "ให้น้ำได้เฉพาะช่วงเวลากลางวัน 8-12 ชม.",
  },
  q13_multi: {
    i: "บ่อบาดาล",
    ii: "สระเก็บน้ำ",
    iii: "วิธีอื่น : ระบุ …",
  },
  q16_multi: {
    a: "ปุ๋ยคุณภาพดี ใช้แล้วอ้อยงาม",
    b: "ปุ๋ยราคาถูก",
    c: "บริการส่งถึงบ้าน",
    d: "เกี๊ยวปุ๋ยไม่ต้องมีหลักทรัพย์ (สำหรับรายที่ไม่ได้เกี๊ยวปกติ หรือซื้อเงินสดเป็นประจำ)",
    e: "อื่นๆ : โปรดระบุ",
  },
  q24_uses: {
    i: "ปุ๋ยอินทรีย์ผง",
    ii: "ปุ๋ยอินทรีย์เม็ด",
    iii: "ปุ๋ยอินทรีย์จากที่อื่น ที่ไม่ใช่ของโรงงาน",
    iv: "วัสดุปรับปรุงดินอื่น เช่น ขี้ไก่ : โปรดระบุ",
    v: "ไม่ได้ใส่",
  },
  q24_how: {
    i: "ใส่รองพื้น",
    ii: "ใส่บำรุงได้ดี โดยไม่ต้องรอฝน",
    iii: "ใส่ช่วงฝนมา พร้อมปุ๋ย",
  },
  q24_rate: {
    i: "2 ตัน/ไร่",
    ii: "1 ตัน/ไร่",
    iii: "500 กก/ไร่",
    iv: "200 กก/ไร่",
    v: "ต่ำกว่า 200 กก/ไร่ (4 กระสอบ)",
  },
  q25_opts: {
    i: "ช่วยเก็บความชื้นในดิน อุ้มน้ำ ต้านทานภัยแล้ง",
    ii: "ช่วยเก็บและปลดปล่อยปุ๋ยที่อ้อยยังย่อยไม่ได้ให้อยู่ในรูปที่อ้อยกินได้",
    iii: "ช่วยลดการสะสมของสารเคมีที่ใช้ในไร่เป็นเวลานาน",
    iv: "ช่วยปรับสภาพดินให้ทนต่อความเป็นกรดด่างเบื้องต้น",
    v: "อื่นๆ : โปรดระบุ",
  },
  q27_multi: {
    a: "ปุ๋ย โปรดระบุ …",
    b: "ต้นทุนการจัดการ โปรดระบุ กิจกรรม …",
    c: "น้ำมัน : โปรดระบุ …",
  },
  q35_multi: {
    factor: "ปัจจัยการผลิต",
    budget: "วงเงิน",
    water: "สร้างแหล่งน้ำ",
    other: "อื่นๆ",
  },
  q36_multi: {
    a: "ไปเที่ยว",
    b: "ตั๋วส่วนลดปุ๋ยบำรุง",
    c: "ตั๋วส่วนลดค่ายา กำจัด วัชพืช โรค แมลง",
    d: "รางวัลแถม ปุ๋ยอินทรีย์ พัฒนาโครงสร้างดิน",
    e: "สนับสนุนงบสร้างแหล่งน้ำ",
    f: "สิทธิจองพันธุ์ใหม่ที่โรงงานพัฒนา ขยายก่อนใคร",
    g: "อื่นๆ : …",
  },
};

export const HEART4_SURVEY_QUESTIONS: Heart4QuestionDef[] = [
  {
    key: "q1",
    number: 1,
    sectionKey: HEART4_SECTION.heart_intro.key,
    sectionLabel: HEART4_SECTION.heart_intro.label,
    prompt: "ท่านเคยได้ยิน “หัวใจ 4 ห้องของการทำอ้อย” ที่เป็นหัวใจสำคัญในการทำอ้อยผลผลิตสูงหรือไม่",
    options: [
      { code: "a", label: "a. เคย" },
      { code: "b", label: "b. ไม่เคย" },
    ],
  },
  {
    key: "q2",
    number: 2,
    sectionKey: HEART4_SECTION.room1.key,
    sectionLabel: HEART4_SECTION.room1.label,
    prompt:
      "ในปีที่ผ่านมา ท่านสามารถปลูกอ้อยได้ทันเวลาหรือไม่ ภายใน 31 ม.ค. เพราะเหตุใด (กรณีที่ปลูกไม่ทัน สาเหตุเป็นเพราะอะไร ถ้าย้อนเวลากลับไปได้จะแก้ไขอย่างไร)",
    options: [
      { code: "a", label: "a. ทันเวลา ภายใน 31 ม.ค." },
      { code: "b", label: "b. ไม่ทันเวลา" },
    ],
    fields: ["cause", "fix"],
  },
  {
    key: "q3",
    number: 3,
    sectionKey: HEART4_SECTION.room1.key,
    sectionLabel: HEART4_SECTION.room1.label,
    prompt: "ในปีนี้ ท่านสามารถจัดการวัชพืช ทุกแปลงได้ทันเวลา หญ้าไม่รกหรือไม่",
    options: [
      { code: "a", label: "a. ทันเวลา หญ้าไม่รก เพราะจัดการด้วยวิธี (ตอบได้มากกว่า 1 ข้อ)" },
      { code: "b", label: "b. ไม่ทันเวลา หญ้ารก" },
    ],
    subGroups: [{ fieldKey: "q3_methods", label: "วิธีจัดการ (เมื่อเลือก a)", options: mapMulti("q3_methods") }],
    fields: ["otherMethod", "cause", "fix"],
  },
  {
    key: "q4",
    number: 4,
    sectionKey: HEART4_SECTION.room1.key,
    sectionLabel: HEART4_SECTION.room1.label,
    prompt: "ท่านพบวัชพืชร้ายแรงในแปลงหรือไม่",
    options: [
      { code: "a", label: "a. พบในแปลง" },
      { code: "b", label: "b. ไม่พบในแปลง" },
      { code: "c", label: "c. เคยพบของแปลงคนอื่น : โปรดระบุชื่อชาวไร่เจ้าของที่ทำ หรือตำแหน่งแปลงนั้น" },
    ],
    fields: ["otherFarmer"],
  },
  {
    key: "q5",
    number: 5,
    sectionKey: HEART4_SECTION.room3.key,
    sectionLabel: HEART4_SECTION.room3.label,
    prompt:
      "หัวใจห้องที่ 3 “หญ้าไม่รก” : ท่านพบวัชพืชอะไรที่ต้องการทราบวิธีกำจัดที่ถูกต้องจากทีมวิชาการหรือไม่",
    options: [
      { code: "a", label: "a. มี : โปรดระบุ" },
      { code: "b", label: "b. ไม่มี" },
    ],
    fields: ["detail"],
  },
  {
    key: "q6",
    number: 6,
    sectionKey: HEART4_SECTION.room3.key,
    sectionLabel: HEART4_SECTION.room3.label,
    prompt:
      "หัวใจห้องที่ 3 “โรคไม่ลาม” : ในปีนี้ ท่านสามารถจัดการ โรคโดยเฉพาะ แส้ดำ ที่ระบาดในพื้นที่เราค่อนข้างมาก ได้หรือไม่",
    options: [
      { code: "a", label: "a. จัดการได้ โรคแส้ดำไม่ระบาด เพราะจัดการด้วยวิธี (ตอบได้มากกว่า 1 ข้อ)" },
      { code: "b", label: "b. ไม่สามารถจัดการได้" },
    ],
    subGroups: [{ fieldKey: "q6_methods", label: "วิธีจัดการ (เมื่อเลือก a)", options: mapMulti("q6_methods") }],
    fields: ["otherDrug", "otherMethod", "cause", "fix"],
  },
  {
    key: "q7",
    number: 7,
    sectionKey: HEART4_SECTION.room3.key,
    sectionLabel: HEART4_SECTION.room3.label,
    prompt: "หัวใจห้องที่ 3 “โรคไม่ลาม” : แปลงของท่านมีโรคอ้อยอื่นที่ต้องการความช่วยเหลือจากทีมวิชาการหรือไม่",
    options: [
      { code: "a", label: "a. มี : โปรดระบุ" },
      { code: "b", label: "b. ไม่มี" },
    ],
    fields: ["detail"],
  },
  {
    key: "q8",
    number: 8,
    sectionKey: HEART4_SECTION.room3.key,
    sectionLabel: HEART4_SECTION.room3.label,
    prompt:
      "หัวใจห้องที่ 3 “โรคไม่ลาม” (แมลงศัตรูพืช) : ในปีนี้ ท่านสามารถจัดการ แมลงศัตรู โดยเฉพาะ หนอนกอที่ระบาด ในพื้นที่ได้หรือไม่",
    options: [
      { code: "a", label: "a. จัดการได้ หนอนกอ ไม่กระทบกับอ้อย เพราะจัดการด้วยวิธี (ตอบได้มากกว่า 1 ข้อ)" },
      { code: "b", label: "b. ไม่สามารถจัดการได้" },
    ],
    subGroups: [{ fieldKey: "q8_methods", label: "วิธีจัดการ (เมื่อเลือก a)", options: mapMulti("q8_methods") }],
    fields: ["otherMethod", "cause", "fix"],
  },
  {
    key: "q9",
    number: 9,
    sectionKey: HEART4_SECTION.room3.key,
    sectionLabel: HEART4_SECTION.room3.label,
    prompt:
      "หัวใจห้องที่ 3 “โรคไม่ลาม” (แมลงศัตรูพืช) : แปลงของท่านมีแมลงศัตรูอ้อยอื่นที่ต้องการความช่วยเหลือจากทีมวิชาการหรือไม่",
    options: [
      { code: "a", label: "a. มี : โปรดระบุ" },
      { code: "b", label: "b. ไม่มี" },
    ],
    fields: ["detail"],
  },
  {
    key: "q10",
    number: 10,
    sectionKey: HEART4_SECTION.room4.key,
    sectionLabel: HEART4_SECTION.room4.label,
    prompt: "หัวใจห้องที่ 4 “น้ำเพียงพอ” : ในปีนี้ ท่านมีวิธีการรักษาความชื้นในดิน หลังตัด/หลังปลูกอย่างไร",
    options: [
      { code: "a", label: "a. มี ด้วยวิธีการนี้ (ตอบได้มากกว่า 1 ข้อ)" },
      { code: "b", label: "b. ยังไม่มีวิธีจัดการความชื้น" },
    ],
    subGroups: [{ fieldKey: "q10_multi", label: "วิธี (เมื่อเลือก a)", options: mapMulti("q10_multi") }],
    fields: ["other", "cause", "fix"],
  },
  {
    key: "q11",
    number: 11,
    sectionKey: HEART4_SECTION.room4.key,
    sectionLabel: HEART4_SECTION.room4.label,
    prompt: "หัวใจห้องที่ 4 “น้ำเพียงพอ” : ในปีนี้ ท่านมีแหล่งน้ำที่เพียงพอ สามารถให้ได้กี่ครั้ง",
    options: [
      { code: "a", label: "a. ไม่สามารถให้ได้เลย" },
      { code: "b", label: "b. 1 ครั้ง" },
      { code: "c", label: "c. 2 ครั้ง" },
      { code: "d", label: "d. 3 ครั้ง" },
      { code: "e", label: "e. ไม่จำกัด" },
    ],
    fields: ["cause"],
  },
  {
    key: "q12",
    number: 12,
    sectionKey: HEART4_SECTION.room4.key,
    sectionLabel: HEART4_SECTION.room4.label,
    prompt: "หัวใจห้องที่ 4 “น้ำเพียงพอ” : ท่านมีวิธีการให้น้ำอย่างไร (ตอบได้มากกว่า 1 ข้อ)",
    options: [
      { code: "a", label: "a. ต้นกำลังเป็นเครื่องสูบน้ำ (เชื้อเพลิงหรือไฟฟ้า)" },
      { code: "b", label: "b. ต้นกำลังเป็นโซล่าเซลล์" },
    ],
    subGroups: [
      { fieldKey: "q12_a", label: "รายละเอียดเมื่อเลือก a", options: mapMulti("q12_a") },
      { fieldKey: "q12_b", label: "รายละเอียดเมื่อเลือก b", options: mapMulti("q12_b") },
    ],
    fields: ["heat"],
  },
  {
    key: "q13",
    number: 13,
    sectionKey: HEART4_SECTION.room4.key,
    sectionLabel: HEART4_SECTION.room4.label,
    prompt: "หัวใจห้องที่ 4 “น้ำเพียงพอ” : ในปีนี้ ท่านมีความประสงค์อยากสร้างแหล่งน้ำเพิ่มหรือไม่",
    options: [
      { code: "a", label: "a. อยาก โดยเป็นรูปแบบดังนี้ (ตอบได้มากกว่า 1 ข้อ)" },
      { code: "b", label: "b. ไม่อยาก" },
    ],
    subGroups: [{ fieldKey: "q13_multi", label: "รูปแบบ (เมื่อเลือก a)", options: mapMulti("q13_multi") }],
    fields: ["other", "cause"],
  },
  {
    key: "q14",
    number: 14,
    sectionKey: HEART4_SECTION.room4.key,
    sectionLabel: HEART4_SECTION.room4.label,
    prompt: "หัวใจห้องที่ 4 “น้ำเพียงพอ” : ท่านทราบโมเดลการสร้างแหล่งน้ำที่ประสบความสำเร็จในการทำอ้อยหรือไม่",
    notes: "มี 3 หัวข้อย่อย a, b, c แต่ละหัวข้อมีตัวเลือกของตัวเอง",
    subGroups: [
      {
        fieldKey: "q14_a",
        label: "a. ปัญหาหลักเรื่องน้ำในไร่อ้อย",
        options: [
          { code: "i", label: "i. ไม่มีแหล่งน้ำสำรองเลย ต้องรอฝนอย่างเดียว (อ้อยชะงักการเติบโต)" },
          { code: "ii", label: "ii. มีสระหรือบ่อ แต่เก็บน้ำได้ไม่พอ บ่อตื้นเกินไป น้ำแห้งก่อนหมดหน้าแล้ง" },
          { code: "iii", label: "iii. มีแหล่งน้ำ แต่วิธีการให้น้ำทำให้เปลืองน้ำ น้ำเลยหมดไว" },
          { code: "iv", label: "iv. ไม่มีปัญหาเลย มีแหล่งน้ำและระบบน้ำเพียงพอตลอดปี" },
        ],
      },
      {
        fieldKey: "q14_b",
        label: "b. การจัดหาแหล่งน้ำที่เพียงพอ",
        options: [
          { code: "i", label: "i. มีสระขนาด 1 งาน ให้น้ำถึง 60 ไร่ จำนวน 4 ครั้ง" },
          { code: "ii", label: "ii. มีบ่อบาดาล 1 บ่อ ท่อหน้า 2 นิ้ว ให้น้ำอ้อยพื้นที่ 100 ไร่ จำนวน 4 ครั้ง" },
          { code: "iii", label: "iii. ต้องคิดจากปริมาณการใช้น้ำจากพื้นที่ปลูก แล้วกำหนดวิธีการจัดหาแหล่งน้ำ" },
        ],
      },
      {
        fieldKey: "q14_c",
        label: "c. ชาวไร่มีแหล่งน้ำเพียงพอหรือยัง",
        options: [
          { code: "i", label: "i. มีครบ สามารถให้ได้ทุกแปลง" },
          { code: "ii", label: "ii. ยังไม่ครบ" },
        ],
      },
    ],
    fields: ["detail"],
  },
  {
    key: "q15",
    number: 15,
    sectionKey: HEART4_SECTION.room4.key,
    sectionLabel: HEART4_SECTION.room4.label,
    prompt:
      "หัวใจห้องที่ 4 “น้ำเพียงพอ” : ท่านต้องการให้ทางทีมชลประทานเข้ามาให้คำแนะนำหรือช่วยเหลือในเรื่องน้ำอย่างไรบ้าง",
    options: [
      { code: "a", label: "a. มี : โปรดระบุ" },
      { code: "b", label: "b. ไม่มี" },
    ],
    fields: ["detail"],
  },
  {
    key: "q16",
    number: 16,
    sectionKey: HEART4_SECTION.fert_plus.key,
    sectionLabel: HEART4_SECTION.fert_plus.label,
    prompt:
      "ทางโรงงานกำลังจะเปิดโรงปุ๋ยเป็นของตัวเอง ท่านมีความคาดหวังกับโรงปุ๋ยที่จะสนับสนุนชาวไร่อ้อยอย่างไรบ้าง (ตอบได้มากกว่า 1 ข้อ)",
    subGroups: [{ fieldKey: "q16_multi", label: "ตัวเลือก (เลือกได้หลายข้อ)", options: mapMulti("q16_multi") }],
    fields: ["other"],
  },
  {
    key: "q17",
    number: 17,
    sectionKey: HEART4_SECTION.fert_plus.key,
    sectionLabel: HEART4_SECTION.fert_plus.label,
    prompt: "หากได้การสนับสนุนเป็นไปตามที่ท่านคาดหวังในข้อที่แล้ว ท่านจะใช้ปุ๋ยของโรงงานหรือไม่",
    options: [
      { code: "a", label: "a. ใช้" },
      { code: "b", label: "b. ไม่ใช้" },
    ],
    fields: ["cause"],
  },
  {
    key: "q18",
    number: 18,
    sectionKey: HEART4_SECTION.fert_plus.key,
    sectionLabel: HEART4_SECTION.fert_plus.label,
    prompt: "ปัจจุบันท่านใช้ปุ๋ยที่โรงงานส่งเสริมใช่หรือไม่",
    options: [
      { code: "a", label: "a. เคยใช้ แต่ปัจจุบันไม่ใช้" },
      { code: "b", label: "b. ปัจจุบันใช้ และอนาคตก็จะใช้" },
      { code: "c", label: "c. ทั้งอดีต ปัจจุบัน และอนาคต จะไม่ขอใช้" },
    ],
    fields: ["detail"],
  },
  {
    key: "q19",
    number: 19,
    sectionKey: HEART4_SECTION.fert_plus.key,
    sectionLabel: HEART4_SECTION.fert_plus.label,
    prompt: "หากได้การสนับสนุนเป็นไปตามที่ท่านคาดหวังตามข้อก่อนหน้า จะมีผลต่อการตัดสินใจปลูกอ้อยในปีหน้าหรือไม่",
    options: [
      { code: "a", label: "a. มี ปลูกเพิ่มขึ้น" },
      { code: "b", label: "b. ไม่มีผล" },
    ],
    fields: ["detail"],
  },
  {
    key: "q20",
    number: 20,
    sectionKey: HEART4_SECTION.fert_plus.key,
    sectionLabel: HEART4_SECTION.fert_plus.label,
    prompt: "โดยปกติ ท่านจะใส่ปุ๋ยในอ้อยใหม่ ด้วยสูตรอะไร และอัตราเท่าไหร่",
    fields: ["base_formula", "base_rate", "nourish_formula", "nourish_rate", "top_formula", "top_rate"],
  },
  {
    key: "q21",
    number: 21,
    sectionKey: HEART4_SECTION.fert_plus.key,
    sectionLabel: HEART4_SECTION.fert_plus.label,
    prompt:
      "หัวใจ พลัส “ปุ๋ย” เพิ่มผลผลิต : ในปีนี้ ท่านมีความสนใจวิธีการบำรุงใหม่ หรือได้ทำการผ่ากอ ใส่ปุ๋ย เพื่อให้อ้อยได้กินปุ๋ยโดยตรงหรือไม่",
    options: [
      { code: "a", label: "a. ทำไปแล้ว" },
      { code: "b", label: "b. ยังไม่ได้ทำ เพราะ …" },
      { code: "c", label: "c. สนใจอยากทำในปีหน้า" },
    ],
    fields: ["detail"],
  },
  {
    key: "q22",
    number: 22,
    sectionKey: HEART4_SECTION.fert_plus.key,
    sectionLabel: HEART4_SECTION.fert_plus.label,
    prompt: "โดยปกติ ท่านจะใส่ปุ๋ยในอ้อยตอ ด้วยสูตรอะไร และอัตราเท่าไหร่",
    fields: ["cut_formula", "cut_rate", "nourish_formula", "nourish_rate", "top_formula", "top_rate"],
  },
  {
    key: "q23",
    number: 23,
    sectionKey: HEART4_SECTION.fert_plus.key,
    sectionLabel: HEART4_SECTION.fert_plus.label,
    prompt:
      "หัวใจ พลัส “ปุ๋ย” เพิ่มผลผลิต : ในปีนี้ ท่านมีความประสงค์อยากได้ปุ๋ยเพิ่ม ในสูตรใด กี่กระสอบ (โรงงานจำกัด 2 สูตรหลัก 21-7-18 และ 16-8-8)",
    fields: ["qty_21718", "qty_1688", "other_formula", "other_qty"],
  },
  {
    key: "q24",
    number: 24,
    sectionKey: HEART4_SECTION.organic_plus.key,
    sectionLabel: HEART4_SECTION.organic_plus.label,
    prompt:
      "หัวใจ พลัส “ปุ๋ยอินทรีย์” ปรับโครงสร้างดิน เก็บความชื้น อ้อยกินปุ๋ยง่ายขึ้น : ท่านมีการใช้ปุ๋ยอินทรีย์ในการปรับปรุงโครงสร้างดินอย่างไรบ้าง",
    subGroups: [
      { fieldKey: "q24_uses", label: "a. ใส่อยู่แล้ว ด้วย", options: mapMulti("q24_uses") },
      { fieldKey: "q24_how", label: "b. วิธีการใส่", options: mapMulti("q24_how") },
      { fieldKey: "q24_rate", label: "c. อัตราที่ใส่", options: mapMulti("q24_rate") },
    ],
    fields: ["otherSoil", "factoryWant", "factoryForm", "factoryBags"],
    notes: "d. ต้องการใช้ปุ๋ยอินทรีย์ของโรงงาน: ต้องการ/ไม่ต้องการ, รูปแบบเม็ด/ผง, จำนวนกระสอบ",
  },
  {
    key: "q25",
    number: 25,
    sectionKey: HEART4_SECTION.organic_plus.key,
    sectionLabel: HEART4_SECTION.organic_plus.label,
    prompt: "หัวใจ พลัส “ปุ๋ยอินทรีย์” : ท่านทราบหรือไม่ว่า อินทรีย์ จะช่วยเพิ่มผลผลิตในระยะยาวได้อย่างไรบ้าง",
    subGroups: [{ fieldKey: "q25_opts", label: "ประโยชน์ที่ทราบ (เลือกได้หลายข้อ)", options: mapMulti("q25_opts") }],
    fields: ["otherText"],
  },
  {
    key: "q26",
    number: 26,
    sectionKey: HEART4_SECTION.general.key,
    sectionLabel: HEART4_SECTION.general.label,
    prompt: "ท่านทราบถึงราคาอ้อยในปีหน้า ที่มีแนวโน้มสูงขึ้นอย่างไรบ้าง",
    options: [
      { code: "a", label: "a. ทราบแล้ว" },
      { code: "b", label: "b. ยังไม่ทราบ" },
      { code: "c", label: "c. กังวล เพราะ …" },
    ],
    fields: ["worry"],
  },
  {
    key: "q27",
    number: 27,
    sectionKey: HEART4_SECTION.general.key,
    sectionLabel: HEART4_SECTION.general.label,
    prompt: "ท่านมีอุปสรรคใด ต่อการดูแลอ้อยตามหลัก หัวใจ 4 ห้อง เพื่ออ้อยผลผลิตสูง หรือไม่",
    subGroups: [{ fieldKey: "q27_multi", label: "อุปสรรค (เลือกได้หลายข้อ)", options: mapMulti("q27_multi") }],
    fields: ["fertilizer", "cost", "oil"],
  },
  {
    key: "q28",
    number: 28,
    sectionKey: HEART4_SECTION.general.key,
    sectionLabel: HEART4_SECTION.general.label,
    prompt: "กรณีถ้าไม่ได้ปลูกอ้อย ท่านมีความต้องการจะปลูกพืชใด",
    options: [
      { code: "a", label: "a. ข้าว" },
      { code: "b", label: "b. ข้าวโพด" },
      { code: "c", label: "c. มันสำปะหลัง" },
      { code: "d", label: "d. อื่นๆ : โปรดระบุ" },
      { code: "e", label: "e. ไม่มี" },
    ],
    fields: ["other"],
  },
  {
    key: "q29",
    number: 29,
    sectionKey: HEART4_SECTION.satisfaction.key,
    sectionLabel: HEART4_SECTION.satisfaction.label,
    prompt:
      "ในปีที่ผ่านมา ท่านมีความพึงพอใจ ในเรื่องสนับสนุนการ “นำอ้อยเข้าหีบ” อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา",
    fields: ["score", "good", "improve"],
    notes: "คะแนน 0-10, เรื่องที่ทำได้ดี, เรื่องที่ควรพัฒนา",
  },
  {
    key: "q30",
    number: 30,
    sectionKey: HEART4_SECTION.satisfaction.key,
    sectionLabel: HEART4_SECTION.satisfaction.label,
    prompt: "ในปีที่ผ่านมา ท่านมีความพึงพอใจ ในเรื่องสนับสนุนการ “ปลูกอ้อย” อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา",
    fields: ["score", "good", "improve"],
  },
  {
    key: "q31",
    number: 31,
    sectionKey: HEART4_SECTION.satisfaction.key,
    sectionLabel: HEART4_SECTION.satisfaction.label,
    prompt: "ในปีที่ผ่านมา ท่านมีความพึงพอใจ ในเรื่องสนับสนุนการ “การบำรุงอ้อย” อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา",
    fields: ["score", "good", "improve"],
  },
  {
    key: "q32",
    number: 32,
    sectionKey: HEART4_SECTION.satisfaction.key,
    sectionLabel: HEART4_SECTION.satisfaction.label,
    prompt:
      "ในปีที่ผ่านมา ท่านมีความพึงพอใจ ในเรื่องสนับสนุนการ “การบริการอื่นๆ และเกี๊ยว” อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา",
    fields: ["score", "good", "improve"],
  },
  {
    key: "q33",
    number: 33,
    sectionKey: HEART4_SECTION.satisfaction.key,
    sectionLabel: HEART4_SECTION.satisfaction.label,
    prompt: "ท่านมีความพึงพอใจในภาพรวม ต่อ นักส่งเสริมที่ดูแล อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา",
    fields: ["score", "good", "improve"],
  },
  {
    key: "q34",
    number: 34,
    sectionKey: HEART4_SECTION.satisfaction.key,
    sectionLabel: HEART4_SECTION.satisfaction.label,
    prompt: "ท่านทำตันต่อไร่ได้เท่าไหร่ในปีที่แล้ว และท่านมีเป้าหมายในปีหน้าเท่าไหร่",
    fields: ["tonsPast", "tonsTarget"],
  },
  {
    key: "q35",
    number: 35,
    sectionKey: HEART4_SECTION.satisfaction.key,
    sectionLabel: HEART4_SECTION.satisfaction.label,
    prompt: "ข้อ 35 — สนับสนุนเพื่อตันต่อไร่",
    subGroups: [{ fieldKey: "q35_multi", label: "ประเภทการสนับสนุน", options: mapMulti("q35_multi") }],
    fields: ["factor", "budget", "water", "other"],
  },
  {
    key: "q36",
    number: 36,
    sectionKey: HEART4_SECTION.satisfaction.key,
    sectionLabel: HEART4_SECTION.satisfaction.label,
    prompt:
      "หากท่านสามารถทำตันต่อไร่ได้ตามเป้าหมาย หรือเป็นชาวไร่มืออาชีพ ที่เป็นตัวอย่างการทำหัวใจ 4 ห้อง เพื่ออ้อยผลผลิตสูงได้แข็งแรง ท่านอยากได้อะไรเป็นรางวัล (เลือกได้ไม่เกิน 3 ข้อ)",
    subGroups: [{ fieldKey: "q36_multi", label: "รางวัลที่เลือกได้", options: mapMulti("q36_multi") }],
    fields: ["travel_place", "fert_formula", "chemical", "organic_qty", "water_type", "variety", "other"],
  },
  {
    key: "q37",
    number: 37,
    sectionKey: HEART4_SECTION.satisfaction.key,
    sectionLabel: HEART4_SECTION.satisfaction.label,
    prompt: "ข้อ 37 — อ้อยฝน",
    options: [
      { code: "a", label: "a. ต้องการปลูกอ้อยฝน เพื่อเป็นพันธุ์" },
      { code: "b", label: "b. ต้องการปลูกอ้อยฝน เพื่อเข้าหีบ" },
      { code: "c", label: "c. ไม่ต้องการ" },
    ],
    fields: ["detail"],
  },
  {
    key: "q38",
    number: 38,
    sectionKey: HEART4_SECTION.satisfaction.key,
    sectionLabel: HEART4_SECTION.satisfaction.label,
    prompt: "ข้อ 38 — เรื่องอื่นที่ต้องการสื่อสาร",
    options: [
      { code: "a", label: "a. มี โปรดระบุ" },
      { code: "b", label: "b. ไม่มี" },
    ],
    fields: ["detail"],
  },
];

function mapMulti(fieldKey: string): Heart4Option[] {
  const m = HEART4_MULTI_LABELS[fieldKey];
  if (!m) return [];
  return Object.entries(m).map(([code, label]) => ({ code, label }));
}

const QUESTION_BY_KEY = new Map(HEART4_SURVEY_QUESTIONS.map((q) => [q.key, q]));
const QUESTION_BY_NUMBER = new Map(HEART4_SURVEY_QUESTIONS.map((q) => [q.number, q]));

export function getHeart4QuestionDef(keyOrNumber: string | number): Heart4QuestionDef | null {
  if (typeof keyOrNumber === "number") return QUESTION_BY_NUMBER.get(keyOrNumber) ?? null;
  const k = keyOrNumber.startsWith("q") ? keyOrNumber : `q${keyOrNumber}`;
  return QUESTION_BY_KEY.get(k) ?? null;
}

export function heart4QuestionTitleTh(questionKey: string): string {
  const def = getHeart4QuestionDef(questionKey);
  if (!def) return questionKey;
  return `ข้อ ${def.number} — ${def.prompt.length > 120 ? `${def.prompt.slice(0, 117)}…` : def.prompt}`;
}

export function heart4SectionForQuestionKey(q: string): { key: string; label: string } {
  const def = getHeart4QuestionDef(q);
  if (def) return { key: def.sectionKey, label: def.sectionLabel };
  return { key: "profile", label: "ข้อมูลทั่วไป" };
}

export function heart4ChoiceLabel(def: Heart4QuestionDef | null, code: string): string {
  if (!def?.options?.length || !code) return code;
  return def.options.find((o) => o.code === code)?.label ?? code;
}

/** Resolve sub-option label; groupKey is answers field (e.g. q14 uses a/b/c → q14_a). */
export function heart4SubChoiceLabel(
  def: Heart4QuestionDef | null,
  groupFieldKey: string,
  code: string,
): string {
  if (!def?.subGroups?.length || !code) return code;
  const group = def.subGroups.find((g) => g.fieldKey === groupFieldKey);
  return group?.options.find((o) => o.code === code)?.label ?? code;
}

/** Human-readable schema block for RAG / admin meta answers. */
export function formatHeart4QuestionSchemaText(def: Heart4QuestionDef): string {
  const lines: string[] = [
    `[โครงสร้างแบบสอบถาม — ข้อ ${def.number}]`,
    `[${def.sectionLabel}]`,
    `คำถาม: ${def.prompt}`,
  ];
  if (def.options?.length) {
    lines.push(`ตัวเลือกหลัก (${def.options.length} ข้อ):`);
    for (const o of def.options) lines.push(`- ${o.label}`);
  }
  if (def.subGroups?.length) {
    for (const g of def.subGroups) {
      lines.push(`${g.label} (${g.options.length} ข้อ):`);
      for (const o of g.options) lines.push(`  - ${o.label}`);
    }
  }
  if (def.fields?.length) {
    lines.push(`ช่องกรอกข้อความ/ตัวเลข: ${def.fields.join(", ")}`);
  }
  if (def.notes) lines.push(`หมายเหตุ: ${def.notes}`);
  return lines.join("\n");
}

export function buildHeart4SurveySchemaChunks(): Array<{ question_key: string; content: string }> {
  return HEART4_SURVEY_QUESTIONS.map((def) => ({
    question_key: def.key,
    content: formatHeart4QuestionSchemaText(def),
  }));
}

export function mapHeart4MultiLabels(multiKey: string, codes: string[]): string {
  const m = HEART4_MULTI_LABELS[multiKey];
  if (!m || codes.length === 0) return "";
  return codes.map((c) => m[c] ?? `รหัส ${c}`).join("；");
}

/** Runtime checks — call from verify script / before reindex. */
export function verifyHeart4SurveyCatalog(): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const numbers = new Set<number>();
  for (const q of HEART4_SURVEY_QUESTIONS) {
    if (numbers.has(q.number)) errors.push(`duplicate question number ${q.number}`);
    numbers.add(q.number);
    if (q.key !== `q${q.number}`) errors.push(`key mismatch ${q.key} vs q${q.number}`);
    if (!q.prompt.trim()) errors.push(`${q.key} empty prompt`);
  }
  for (let n = 1; n <= 38; n++) {
    if (!numbers.has(n)) errors.push(`missing question q${n}`);
  }
  // Known regression guards
  const q5 = getHeart4QuestionDef(5);
  if (q5 && !q5.prompt.includes("หญ้าไม่รก")) errors.push("q5 prompt must mention หญ้าไม่รก");
  const q1 = getHeart4QuestionDef(1);
  if (q1?.options?.length !== 2) errors.push("q1 must have 2 options");
  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

