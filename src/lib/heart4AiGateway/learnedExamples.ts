import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getHeart4AiGatewayConfig } from "@/lib/heart4AiGateway/config";

export type LearnedExample = {
  id: string;
  question: string;
  answer: string;
  note?: string;
  createdAt: string;
};

type LearnedFile = {
  version: 1;
  examples: LearnedExample[];
};

async function readLearnedFile(): Promise<LearnedFile> {
  const cfg = getHeart4AiGatewayConfig();
  try {
    const raw = await readFile(cfg.learnedPath, "utf8");
    const parsed = JSON.parse(raw) as LearnedFile;
    if (parsed?.version === 1 && Array.isArray(parsed.examples)) return parsed;
  } catch {
    /* new file */
  }
  return { version: 1, examples: [] };
}

async function writeLearnedFile(data: LearnedFile): Promise<void> {
  const cfg = getHeart4AiGatewayConfig();
  await mkdir(path.dirname(cfg.learnedPath), { recursive: true });
  await writeFile(cfg.learnedPath, JSON.stringify(data, null, 2), "utf8");
}

export async function addLearnedExample(input: {
  question: string;
  answer: string;
  note?: string;
}): Promise<LearnedExample> {
  const cfg = getHeart4AiGatewayConfig();
  const file = await readLearnedFile();
  const entry: LearnedExample = {
    id: crypto.randomUUID(),
    question: input.question.trim(),
    answer: input.answer.trim(),
    note: input.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  file.examples.unshift(entry);
  file.examples = file.examples.slice(0, cfg.maxLearnedExamples);
  await writeLearnedFile(file);
  return entry;
}

export async function loadLearnedExamplesForPrompt(limit = 8): Promise<string> {
  const file = await readLearnedFile();
  if (file.examples.length === 0) return "";
  const lines = file.examples.slice(0, limit).map((ex, i) => {
    return [
      `[ตัวอย่างที่ผู้ใช้สอน ${i + 1}]`,
      `คำถาม: ${ex.question}`,
      `คำตอบที่ถูกต้อง: ${ex.answer}`,
      ex.note ? `หมายเหตุ: ${ex.note}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });
  return [
    "ตัวอย่างคำถาม-คำตอบที่ผู้ใช้สอนไว้ (ให้ยึดรูปแบบและความถูกต้องเมื่อคำถามคล้ายกัน):",
    "",
    ...lines,
  ].join("\n");
}

/** ตรวจว่าผู้ใช้กำลังสอนระบบในประโยคเดียว */
export function parseTeachingFromMessage(text: string): { question: string; answer: string } | null {
  const t = text.trim();
  const patterns = [
    /(?:จำไว้|บันทึกไว้|สอนไว้|คำตอบที่ถูก(?:คือ)?)\s*[:：]?\s*([\s\S]+?)\s*(?:คือ|ตอบว่า|ควรตอบ)\s*[:：]?\s*([\s\S]+)/u,
    /(?:ถ้าถาม|เมื่อถาม)\s*["“]?([\s\S]+?)["”]?\s*(?:ให้ตอบ|ตอบว่า)\s*[:：]?\s*([\s\S]+)/u,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1] && m?.[2]) {
      return { question: m[1].trim(), answer: m[2].trim() };
    }
  }
  return null;
}
