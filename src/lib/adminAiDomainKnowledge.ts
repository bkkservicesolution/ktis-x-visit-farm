/**
 * Static domain knowledge for Admin AI (KTIS, Smart Farmer, Heart 4 Rooms, harvest context).
 * Injected into every Gemini answer + embedded as RAG chunks on reindex (no Supabase schema change).
 */

export type DomainKnowledgeChunk = {
  question_key: string;
  title: string;
  content: string;
};

export const ADMIN_AI_KNOWLEDGE_UPDATED_LABEL = "31 มีนาคม 2569";

/** Short block always sent to Gemini (works even when RAG index is empty). */
export function getAdminAiDomainSystemPrompt(): string {
  return [
    "บทบาท: ผู้ช่วยเกษตรกร / Smart Farmer Assistant สำหรับแอดมินและนักส่งเสริม KTIS",
    "องค์กร: บริษัท เกษตรไทยอินเตอร์เนชันแนล ชูการ์ คอร์ปอเรชั่น จำกัด (มหาชน) หรือ KTIS",
    "หัวใจ 4 ห้อง: การเปรียบเสมือนหัวใจทั้ง 4 ด้านของการทำอ้อย ได้แก่ ดิน น้ำ ปุ๋ย และการดูแลวัชพืช",
    "แบบสำรวจ Heart4Rooms ในฐานข้อมูล: การประเมินแปลงโดยนักส่งเสริม สอดคล้องกับแนวคิดหัวใจ 4 ห้อง",
    "กระบวนการฝ่ายไร่ End-to-end: การวางแผน → จดแจ้ง → เตรียมพื้นที่ → ปลูก → ดูแล/บำรุง → สำรวจประเมินผล → วางแผนตัด → ลานขนถ่าย → รับอ้อยเข้าโรงงาน",
    "คำย่อ: K/KTIS = เกษตรไทยอินเตอร์เนชันแนลชูการ์ | T/TIS = น้ำตาลไทยเอกลักษณ์ | R/KTIS3 = รวมผลอุตสาหกรรมนครสวรรค์",
    "แนวทาง: ตอบภาษาไทย ชัดเจน เป็นกลาง เป็นมิตร ใช้ครับเมื่อเหมาะสม",
    "ข้อมูลตัวเลขจากแบบสำรวจชาวไร่: ใช้สรุปสถิติทั้งชุดในระบบ ห้ามแต่งตัวเลข",
    "ข้อมูลสรุปการเก็บเกี่ยวปี 2568-2569: ใช้จาก data/harvest-stats-2568-2569.json (นำเข้าจาก Excel) ไม่ใช่จากแบบสำรวจ Heart4Rooms",
    "ห้ามค้นหาข้อมูลภายนอกอินเทอร์เน็ต เว้นแต่ผู้ใช้ขอเปรียบเทียบหรือข้อมูลเพิ่มจากแหล่งอื่นโดยชัดเจน",
    `อ้างอิงชุดความรู้องค์กรอัปเดต ${ADMIN_AI_KNOWLEDGE_UPDATED_LABEL}`,
  ].join("\n");
}

export function buildAdminAiDomainKnowledgeChunks(): DomainKnowledgeChunk[] {
  return [
    {
      question_key: "domain_smart_farmer",
      title: "Smart Farmer Assistant / Agent",
      content: [
        "[ความรู้องค์กร — Smart Farmer]",
        "Smart Farmer Assistant (Smart Farmer Agent) คือระบบผู้ช่วยนักส่งเสริมชาวไร่",
        "เป็นคลังความรู้ของ บริษัท เกษตรไทยอินเตอร์เนชันแนล ชูการ์ คอร์ปอเรชั่น จำกัด (มหาชน) หรือ KTIS",
        `ข้อมูลชุดนี้อัปเดต ${ADMIN_AI_KNOWLEDGE_UPDATED_LABEL}`,
      ].join("\n"),
    },
    {
      question_key: "domain_e2e_process",
      title: "กระบวนการทำอ้อยฝ่ายไร่ End-to-end",
      content: [
        "[ความรู้องค์กร — กระบวนการฝ่ายไร่]",
        "ลำดับขั้นตอนการทำอ้อยฝ่ายไร่แบบ End-to-end:",
        "1. การวางแผน",
        "2. การจดแจ้ง",
        "3. เตรียมพื้นที่",
        "4. การปลูก",
        "5. การดูแล/บำรุงรักษา",
        "6. สำรวจประเมินผลผลิต",
        "7. วางแผนการตัด",
        "8. ลานขนถ่าย",
        "9. รับอ้อยเข้าโรงงาน",
      ].join("\n"),
    },
    {
      question_key: "domain_heart4rooms",
      title: "หัวใจ 4 ห้อง และแบบสำรวจ Heart4Rooms",
      content: [
        "[ความรู้องค์กร — หัวใจ 4 ห้อง]",
        "หัวใจ 4 ห้อง คือการเปรียบเสมือนหัวใจทั้ง 4 ด้านของการทำอ้อย ประกอบด้วย:",
        "- ดิน",
        "- น้ำ",
        "- ปุ๋ย",
        "- การดูแลวัชพืช",
        "ข้อมูลหัวใจ 4 ห้องในระบบนี้ = ข้อมูลการประเมินแปลงโดยนักส่งเสริม (แบบสำรวจ Heart4Rooms)",
        "คำถามข้อ 1–38 ในแบบสำรวจสะท้อนการปฏิบัติและความต้องการของชาวไร่ในแต่ละด้าน",
        "รายชื่อชาวไร่ตามปัญหา (ถามว่า “มีชาวไร่คนไหนบ้างที่…”) ใช้เกณฑ์จากคำตอบในแบบ:",
        "- วัชพืช: ข้อ 3 (ไม่ทันเวลา หญ้ารก) และ/หรือ ข้อ 4 (พบวัชพืชร้ายแรงในแปลง)",
        "- หญ้ารก: ข้อ 3 (ไม่ทันเวลา หญ้ารก)",
        "- โรค: ข้อ 6 (ไม่สามารถจัดการโรคแส้ดำได้)",
        "- ศัตรูพืช: ข้อ 9 (มีแมลงศัตรูที่ต้องการความช่วยเหลือ)",
        "- ขาดน้ำ/ความชื้น: ข้อ 10 (ยังไม่มีวิธีจัดการความชื้นในดิน)",
      ].join("\n"),
    },
    {
      question_key: "domain_role_guidelines",
      title: "บทบาทและแนวทางการตอบ",
      content: [
        "[ความรู้องค์กร — บทบาทและแนวทาง]",
        "บทบาท: ผู้ช่วยเกษตรกรที่ให้ข้อมูลและคำแนะนำจากฐานความรู้ที่มี",
        "มุ่งเน้นข้อมูลการเก็บเกี่ยวอ้อย ประจำปี 2568-2569 (อัปเดต 31 มีนาคม 2569) เมื่อมีในฐานข้อมูล",
        "แนวทาง:",
        "- ใช้ข้อมูลในฐานที่ได้รับเป็นหลัก เน้นข้อมูลล่าสุดที่มีใน context",
        "- คำตอบชัดเจน เป็นกลาง เป็นมิตร",
        "- ห้ามค้นหาข้อมูลจากภายนอกเด็ดขาด เว้นแต่ผู้ใช้ร้องขอการเปรียบเทียบหรือข้อมูลเพิ่มเติมจากแหล่งอื่น",
        "ทักษะ: วิเคราะห์พื้นที่ อ้อยสะสม อ้อยสด อ้อยไฟไหม้ % อ้อยไฟไหม้ CCS จำนวนรถสะสม (เมื่อมีข้อมูลใน context)",
        "ขั้นตอน: รับคำถาม → วิเคราะห์จากฐานข้อมูล → ตอบ; กรณีเปรียบเทียบภายนอกให้ค้นหาแล้วตอบ (เฉพาะเมื่อผู้ใช้ขอ)",
        "ข้อจำกัด: แจ้งชัดเจนหากข้อมูลใน context ไม่เพียงพอ",
      ].join("\n"),
    },
    {
      question_key: "domain_company_codes",
      title: "คำย่อบริษัท",
      content: [
        "[ความรู้องค์กร — คำย่อ]",
        "K หรือ KTIS: บริษัท เกษตรไทยอินเตอร์เนชันแนล ชูการ์ คอร์ปอเรชั่น จำกัด (มหาชน)",
        "T หรือ TIS: บริษัท น้ำตาลไทยเอกลักษณ์ จำกัด",
        "R หรือ KTIS3: บริษัท รวมผลอุตสาหกรรมนครสวรรค์ จำกัด หรือสาขาที่เกี่ยวข้อง",
      ].join("\n"),
    },
  ];
}

/** Deterministic answers for common domain-definition questions (no RAG). */
export function tryAnswerDomainKnowledgeQuestion(question: string): string | null {
  const q = question.trim();
  if (!q) return null;

  if (
    /หัวใจ\s*4\s*ห้อง.{0,20}(คือ|หมายถึง|อะไร)/u.test(q) ||
    /heart\s*4\s*rooms?/i.test(q)
  ) {
    const chunk = buildAdminAiDomainKnowledgeChunks().find((c) => c.question_key === "domain_heart4rooms");
    return chunk?.content ?? null;
  }

  if (/smart\s*farmer/i.test(q) || /ผู้ช่วยนักส่งเสริม/u.test(q)) {
    const chunk = buildAdminAiDomainKnowledgeChunks().find((c) => c.question_key === "domain_smart_farmer");
    return chunk?.content ?? null;
  }

  if (/กระบวนการ|ขั้นตอน.{0,30}(ไร่|ทำอ้อย|end.?to.?end)/iu.test(q)) {
    const chunk = buildAdminAiDomainKnowledgeChunks().find((c) => c.question_key === "domain_e2e_process");
    return chunk?.content ?? null;
  }

  if (/\b(KTIS|TIS|KTIS3)\b/i.test(q) && /(ย่อ|คือ|หมายถึง|คำย่อ)/u.test(q)) {
    const chunk = buildAdminAiDomainKnowledgeChunks().find((c) => c.question_key === "domain_company_codes");
    return chunk?.content ?? null;
  }

  return null;
}

export function verifyAdminAiDomainKnowledge(): { ok: true } | { ok: false; errors: string[] } {
  const chunks = buildAdminAiDomainKnowledgeChunks();
  const errors: string[] = [];
  if (chunks.length < 5) errors.push("expected at least 5 domain knowledge chunks");
  const heart = chunks.find((c) => c.question_key === "domain_heart4rooms");
  if (!heart?.content.includes("ดิน")) errors.push("heart4 domain chunk must mention ดิน");
  if (errors.length) return { ok: false, errors };
  return { ok: true };
}
