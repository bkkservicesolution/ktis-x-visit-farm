"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { H4Answers } from "@/app/surveys/heart4rooms/heart4roomsClient";

export type Heart4SurveyStepsProps = {
  step: number;
  answers: H4Answers;
  setField: (key: string, value: unknown) => void;
  mergeField: (key: string, partial: Record<string, unknown>) => void;
  toggleMulti: (key: string, code: string) => void;
};

function Lab({ children }: { children: ReactNode }) {
  return <div className="text-xs font-medium text-muted">{children}</div>;
}

function Text({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      placeholder={placeholder}
      className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
    />
  );
}

function Line({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
    />
  );
}

function RadioRow({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; label: string }[];
}) {
  return (
    <div className="mt-2 space-y-2">
      {options.map((o) => (
        <label key={o.v} className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
          <input type="radio" name={name} checked={value === o.v} onChange={() => onChange(o.v)} className="mt-1" />
          <span>{o.label}</span>
        </label>
      ))}
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1" />
      <span>{label}</span>
    </label>
  );
}

function qObj(answers: H4Answers, key: string): Record<string, unknown> {
  const v = answers[key];
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function qArr(answers: H4Answers, key: string): string[] {
  const v = answers[key];
  return Array.isArray(v) ? (v as string[]) : [];
}

function setChoice(
  mergeField: Heart4SurveyStepsProps["mergeField"],
  key: string,
  choice: "a" | "b" | "c",
) {
  mergeField(key, { choice });
}

function setChoiceBoth(
  mergeField: Heart4SurveyStepsProps["mergeField"],
  key: string,
  choice: "a" | "b" | "c",
) {
  // If user fills both sections, keep last touched as `choice`.
  // We still keep the detailed fields so data isn't lost.
  mergeField(key, { choice });
}


function Step1({ answers, mergeField }: Heart4SurveyStepsProps) {
  const v = qObj(answers, "q1");
  const choice = typeof v.choice === "string" ? v.choice : "";
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 1</div>
        <p className="mt-2 text-sm text-foreground">
          ท่านเคยได้ยิน “หัวใจ 4 ห้องของการทำอ้อย” ที่เป็นหัวใจสำคัญในการทำอ้อยผลผลิตสูงหรือไม่
        </p>
        <div className="mt-3 overflow-hidden rounded-2xl bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/heart4rooms/heart4rooms-diagram.png"
            alt="โครงสร้างระบบหัวใจ 4 ห้อง"
            className="block h-auto w-full scale-[1.01] object-contain"
          />
        </div>
        <RadioRow
          name="q1"
          value={choice}
          onChange={(c) => mergeField("q1", { choice: c })}
          options={[
            { v: "a", label: "a. เคย" },
            { v: "b", label: "b. ไม่เคย" },
          ]}
        />
      </section>
    </div>
  );
}

function Step2({ answers, mergeField }: Heart4SurveyStepsProps) {
  const v = qObj(answers, "q2");
  const choice = typeof v.choice === "string" ? v.choice : "";
  const cause = typeof v.cause === "string" ? v.cause : "";
  const fix = typeof v.fix === "string" ? v.fix : "";
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 2</div>
        <p className="mt-2 text-sm text-foreground">
          ในปีที่ผ่านมา ท่านสามารถปลูกอ้อยได้ทันเวลาหรือไม่ ภายใน 31 ม.ค. เพราะเหตุใด (กรณีที่ปลูกไม่ทัน สาเหตุเป็นเพราะอะไร ถ้าย้อนเวลากลับไปได้จะแก้ไขอย่างไร)
        </p>
        <div className="mt-3 space-y-4">
          <RadioRow
            name="q2"
            value={choice}
            onChange={(c) => mergeField("q2", { ...v, choice: c })}
            options={[
              { v: "a", label: "a. ทันเวลา ภายใน 31 ม.ค." },
              { v: "b", label: "b. ไม่ทันเวลา" },
            ]}
          />

          {choice === "b" ? (
            <div className="space-y-3 pl-6">
              <div>
                <Lab>i. สาเหตุเพราะ …</Lab>
                <Text value={cause} onChange={(t) => mergeField("q2", { ...v, cause: t })} />
              </div>
              <div>
                <Lab>ii. ถ้าย้อนเวลาได้จะแก้ไขอย่างไร …</Lab>
                <Text value={fix} onChange={(t) => mergeField("q2", { ...v, fix: t })} />
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Step3({ answers, mergeField, toggleMulti }: Heart4SurveyStepsProps) {
  const q3 = qObj(answers, "q3");
  const q3Choice = typeof q3.choice === "string" ? q3.choice : "";
  const methods = qArr(answers, "q3_methods");
  const otherMethod = typeof q3.otherMethod === "string" ? q3.otherMethod : "";
  const cause = typeof q3.cause === "string" ? q3.cause : "";
  const fix = typeof q3.fix === "string" ? q3.fix : "";

  const q4 = qObj(answers, "q4");
  const q4Choice = typeof q4.choice === "string" ? q4.choice : "";
  const q4Other = typeof q4.otherFarmer === "string" ? q4.otherFarmer : "";

  const has = (c: string) => methods.includes(c);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 3</div>
        <p className="mt-2 text-sm text-foreground">
          ในปีนี้ ท่านสามารถจัดการวัชพืช ทุกแปลงได้ทันเวลา หญ้าไม่รกหรือไม่
        </p>
        <div className="mt-4 space-y-4">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q3"
                checked={q3Choice === "a"}
                onChange={() => mergeField("q3", { ...q3, choice: "a" })}
                className="mt-1"
              />
              <span>a. ทันเวลา หญ้าไม่รก เพราะจัดการด้วยวิธี (ตอบได้มากกว่า 1 ข้อ)</span>
            </div>
            {q3Choice === "a" ? (
              <div className="mt-3 space-y-2 pl-6">
                <CheckRow checked={has("i")} onChange={() => toggleMulti("q3_methods", "i")} label="i. ใช้ยาคุม" />
                <CheckRow checked={has("ii")} onChange={() => toggleMulti("q3_methods", "ii")} label="ii. ใช้ยาฆ่า" />
                <CheckRow
                  checked={has("iii")}
                  onChange={() => toggleMulti("q3_methods", "iii")}
                  label="iii. ใช้เครื่องมือเขตกรรม เช่น SRT6"
                />
                <CheckRow checked={has("iv")} onChange={() => toggleMulti("q3_methods", "iv")} label="iv. ใช้คนดาย" />
                <div className="space-y-2">
                  <CheckRow checked={has("v")} onChange={() => toggleMulti("q3_methods", "v")} label="v. วิธีอื่น : ระบุ …" />
                  {has("v") ? (
                    <Line value={otherMethod} onChange={(t) => mergeField("q3", { ...q3, otherMethod: t })} placeholder="ระบุวิธีอื่น" />
                  ) : null}
                </div>
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q3"
                checked={q3Choice === "b"}
                onChange={() => mergeField("q3", { ...q3, choice: "b" })}
                className="mt-1"
              />
              <span>b. ไม่ทันเวลา หญ้ารก</span>
            </div>
            {q3Choice === "b" ? (
              <div className="mt-3 space-y-3 pl-6">
                <div>
                  <Lab>i. สาเหตุเพราะ …</Lab>
                  <Text value={cause} onChange={(t) => mergeField("q3", { ...q3, cause: t })} />
                </div>
                <div>
                  <Lab>ii. ถ้าย้อนเวลาได้จะแก้ไขอย่างไร …</Lab>
                  <Text value={fix} onChange={(t) => mergeField("q3", { ...q3, fix: t })} />
                </div>
              </div>
            ) : null}
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 4</div>
        <p className="mt-2 text-sm text-foreground">ท่านพบวัชพืชร้ายแรงในแปลงหรือไม่</p>
        <RadioRow
          name="q4"
          value={q4Choice}
          onChange={(c) => mergeField("q4", { ...q4, choice: c })}
          options={[
            { v: "a", label: "a. พบในแปลง" },
            { v: "b", label: "b. ไม่พบในแปลง" },
            { v: "c", label: "c. เคยพบของแปลงคนอื่น : โปรดระบุชื่อชาวไร่เจ้าของที่ทำ หรือตำแหน่งแปลงนั้น" },
          ]}
        />
        {q4Choice === "c" ? (
          <div className="mt-3">
            <Lab>ระบุ</Lab>
            <Text value={q4Other} onChange={(t) => mergeField("q4", { ...q4, otherFarmer: t })} />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Step4({ answers, mergeField, toggleMulti }: Heart4SurveyStepsProps) {
  const q5 = qObj(answers, "q5");
  const q5Choice = typeof q5.choice === "string" ? q5.choice : "";
  const q5Detail = typeof q5.detail === "string" ? q5.detail : "";

  const q6 = qObj(answers, "q6");
  const q6Choice = typeof q6.choice === "string" ? q6.choice : "";
  const q6Cause = typeof q6.cause === "string" ? q6.cause : "";
  const q6Fix = typeof q6.fix === "string" ? q6.fix : "";
  const q6Methods = qArr(answers, "q6_methods");
  const has6 = (c: string) => q6Methods.includes(c);
  const q6OtherDrug = typeof q6.otherDrug === "string" ? q6.otherDrug : "";
  const q6OtherMethod = typeof q6.otherMethod === "string" ? q6.otherMethod : "";

  const q7 = qObj(answers, "q7");
  const q7Choice = typeof q7.choice === "string" ? q7.choice : "";
  const q7Detail = typeof q7.detail === "string" ? q7.detail : "";

  const q8 = qObj(answers, "q8");
  const q8Choice = typeof q8.choice === "string" ? q8.choice : "";
  const q8Cause = typeof q8.cause === "string" ? q8.cause : "";
  const q8Fix = typeof q8.fix === "string" ? q8.fix : "";
  const q8Methods = qArr(answers, "q8_methods");
  const has8 = (c: string) => q8Methods.includes(c);
  const q8OtherMethod = typeof q8.otherMethod === "string" ? q8.otherMethod : "";

  const q9 = qObj(answers, "q9");
  const q9Choice = typeof q9.choice === "string" ? q9.choice : "";
  const q9Detail = typeof q9.detail === "string" ? q9.detail : "";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 5</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจห้องที่ 3 “หญ้าไม่รก” : ท่านพบวัชพืชอะไรที่ต้องการทราบวิธีกำจัดที่ถูกต้องจากทีมวิชาการหรือไม่
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q5"
                checked={q5Choice === "a"}
                onChange={() => mergeField("q5", { ...q5, choice: "a" })}
                className="mt-1"
              />
              <span>a. มี : โปรดระบุ</span>
            </div>
            {q5Choice === "a" ? (
              <div className="mt-2 pl-6">
                <Lab>โปรดระบุ</Lab>
                <Text value={q5Detail} onChange={(t) => mergeField("q5", { ...q5, choice: "a", detail: t })} />
              </div>
            ) : null}
          </label>
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q5"
                checked={q5Choice === "b"}
                onChange={() => mergeField("q5", { ...q5, choice: "b" })}
                className="mt-1"
              />
              <span>b. ไม่มี</span>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 6</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจห้องที่ 3 “โรคไม่ลาม” : ในปีนี้ ท่านสามารถจัดการ โรคโดยเฉพาะ แส้ดำ ที่ระบาดในพื้นที่เราค่อนข้างมาก ได้หรือไม่
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q6"
                checked={q6Choice === "a"}
                onChange={() => mergeField("q6", { ...q6, choice: "a" })}
                className="mt-1"
              />
              <span>a. จัดการได้ โรคแส้ดำไม่ระบาด เพราะจัดการด้วยวิธี (ตอบได้มากกว่า 1 ข้อ)</span>
            </div>
            {q6Choice === "a" ? (
              <div className="mt-3 space-y-2 pl-6">
                <CheckRow
                  checked={has6("i")}
                  onChange={() => toggleMulti("q6_methods", "i")}
                  label="i. เปลี่ยนพันธุ์ เป็นพันธุ์ตระกูลที่ไม่ใช่ ขอนแก่น, 111, 108"
                />
                <CheckRow
                  checked={has6("ii")}
                  onChange={() => toggleMulti("q6_methods", "ii")}
                  label="ii. ใช้ยาป้องกันกำจัดแส้ดำถูกวิธี ฉีดตอนเช้า/เย็น, ฉีด 2 ครั้ง ห่างกัน 20 วัน, ไม่ใช้โดรนในการฉีด, เน้นฉีดกรอกยอดอ้อย, ฉีดได้เลย ไม่ต้องรอฝน"
                />
                <CheckRow checked={has6("iii")} onChange={() => toggleMulti("q6_methods", "iii")} label="iii. ขุดออก" />
                <div className="space-y-2">
                  <CheckRow
                    checked={has6("iv")}
                    onChange={() => toggleMulti("q6_methods", "iv")}
                    label="iv. ใช้ยาตัวอื่นที่ไม่ใช่ของทางโรงงานจัดหา โปรดระบุ ตัวยา : …"
                  />
                  {has6("iv") ? (
                    <Line value={q6OtherDrug} onChange={(t) => mergeField("q6", { ...q6, otherDrug: t })} placeholder="ระบุตัวยา" />
                  ) : null}
                </div>
                <div className="space-y-2">
                  <CheckRow checked={has6("v")} onChange={() => toggleMulti("q6_methods", "v")} label="v. วิธีอื่น : ระบุ …" />
                  {has6("v") ? (
                    <Line value={q6OtherMethod} onChange={(t) => mergeField("q6", { ...q6, otherMethod: t })} placeholder="ระบุวิธีอื่น" />
                  ) : null}
                </div>
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q6"
                checked={q6Choice === "b"}
                onChange={() => mergeField("q6", { ...q6, choice: "b" })}
                className="mt-1"
              />
              <span>b. ไม่สามารถจัดการได้</span>
            </div>
            {q6Choice === "b" ? (
              <div className="mt-3 space-y-3 pl-6">
                <div>
                  <Lab>i. สาเหตุเพราะ …</Lab>
                  <Text value={q6Cause} onChange={(t) => mergeField("q6", { ...q6, cause: t })} />
                </div>
                <div>
                  <Lab>ii. ถ้าย้อนเวลาได้ จะแก้ไขอย่างไร …</Lab>
                  <Text value={q6Fix} onChange={(t) => mergeField("q6", { ...q6, fix: t })} />
                </div>
              </div>
            ) : null}
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 7</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจห้องที่ 3 “โรคไม่ลาม” : แปลงของท่านมีโรคอ้อยอื่นที่ต้องการความช่วยเหลือจากทีมวิชาการหรือไม่
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q7"
                checked={q7Choice === "a"}
                onChange={() => mergeField("q7", { ...q7, choice: "a" })}
                className="mt-1"
              />
              <span>a. มี : โปรดระบุ</span>
            </div>
            {q7Choice === "a" ? (
              <div className="mt-2 pl-6">
                <Lab>โปรดระบุ</Lab>
                <Text value={q7Detail} onChange={(t) => mergeField("q7", { ...q7, choice: "a", detail: t })} />
              </div>
            ) : null}
          </label>
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q7"
                checked={q7Choice === "b"}
                onChange={() => mergeField("q7", { ...q7, choice: "b" })}
                className="mt-1"
              />
              <span>b. ไม่มี</span>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 8</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจห้องที่ 3 “โรคไม่ลาม” (แมลงศัตรูพืช) : ในปีนี้ ท่านสามารถจัดการ แมลงศัตรู โดยเฉพาะ หนอนกอที่ระบาด ในพื้นที่ได้หรือไม่
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q8"
                checked={q8Choice === "a"}
                onChange={() => mergeField("q8", { ...q8, choice: "a" })}
                className="mt-1"
              />
              <span>a. จัดการได้ หนอนกอ ไม่กระทบกับอ้อย เพราะจัดการด้วยวิธี (ตอบได้มากกว่า 1 ข้อ)</span>
            </div>
            {q8Choice === "a" ? (
              <div className="mt-3 space-y-2 pl-6">
                <CheckRow checked={has8("i")} onChange={() => toggleMulti("q8_methods", "i")} label="i. หมั่นสำรวจ และใช้ยาฉีดเมื่อพบการระบาดเกิน 10%" />
                <CheckRow checked={has8("ii")} onChange={() => toggleMulti("q8_methods", "ii")} label="ii. หมั่นสำรวจ และกำจัดด้วยแรงงาน" />
                <CheckRow checked={has8("iii")} onChange={() => toggleMulti("q8_methods", "iii")} label="iii. หมั่นสำรวจ และใช้ศัตรูธรรมชาติจัดการ เช่น แตนเบียน แมลงหางหนีบ" />
                <div className="space-y-2">
                  <CheckRow checked={has8("iv")} onChange={() => toggleMulti("q8_methods", "iv")} label="iv. วิธีอื่น : ระบุ …." />
                  {has8("iv") ? (
                    <Line value={q8OtherMethod} onChange={(t) => mergeField("q8", { ...q8, otherMethod: t })} placeholder="ระบุวิธีอื่น" />
                  ) : null}
                </div>
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q8"
                checked={q8Choice === "b"}
                onChange={() => mergeField("q8", { ...q8, choice: "b" })}
                className="mt-1"
              />
              <span>b. ไม่สามารถจัดการได้</span>
            </div>
            {q8Choice === "b" ? (
              <div className="mt-3 space-y-3 pl-6">
                <div>
                  <Lab>i. สาเหตุเพราะ …</Lab>
                  <Text value={q8Cause} onChange={(t) => mergeField("q8", { ...q8, cause: t })} />
                </div>
                <div>
                  <Lab>ii. ถ้าย้อนเวลาได้ จะแก้ไขอย่างไร …</Lab>
                  <Text value={q8Fix} onChange={(t) => mergeField("q8", { ...q8, fix: t })} />
                </div>
              </div>
            ) : null}
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 9</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจห้องที่ 3 “โรคไม่ลาม” (แมลงศัตรูพืช) : แปลงของท่านมีแมลงศัตรูอ้อยอื่นที่ต้องการความช่วยเหลือจากทีมวิชาการหรือไม่
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q9"
                checked={q9Choice === "a"}
                onChange={() => mergeField("q9", { ...q9, choice: "a" })}
                className="mt-1"
              />
              <span>a. มี : โปรดระบุ</span>
            </div>
            {q9Choice === "a" ? (
              <div className="mt-2 pl-6">
                <Lab>โปรดระบุ</Lab>
                <Text value={q9Detail} onChange={(t) => mergeField("q9", { ...q9, choice: "a", detail: t })} />
              </div>
            ) : null}
          </label>
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q9"
                checked={q9Choice === "b"}
                onChange={() => mergeField("q9", { ...q9, choice: "b" })}
                className="mt-1"
              />
              <span>b. ไม่มี</span>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}

function Step5({ answers, mergeField, toggleMulti }: Heart4SurveyStepsProps) {
  const q10 = qObj(answers, "q10");
  const q10Choice = typeof q10.choice === "string" ? q10.choice : "";
  const q10m = qArr(answers, "q10_multi");
  const has10 = (c: string) => q10m.includes(c);
  const q10Other = typeof q10.other === "string" ? q10.other : "";
  const q10Cause = typeof q10.cause === "string" ? q10.cause : "";
  const q10Fix = typeof q10.fix === "string" ? q10.fix : "";

  const q11 = qObj(answers, "q11");
  const q11Choice = typeof q11.choice === "string" ? q11.choice : "";
  const q11Cause = typeof q11.cause === "string" ? q11.cause : "";

  const q12 = qObj(answers, "q12");
  const q12Choice = typeof q12.choice === "string" ? q12.choice : "";
  const q12a = qArr(answers, "q12_a");
  const q12b = qArr(answers, "q12_b");
  const has12a = (c: string) => q12a.includes(c);
  const has12b = (c: string) => q12b.includes(c);
  const q12Heat = typeof q12.heat === "string" ? q12.heat : "";

  const q13 = qObj(answers, "q13");
  const q13Choice = typeof q13.choice === "string" ? q13.choice : "";
  const q13m = qArr(answers, "q13_multi");
  const has13 = (c: string) => q13m.includes(c);
  const q13Other = typeof q13.other === "string" ? q13.other : "";
  const q13Cause = typeof q13.cause === "string" ? q13.cause : "";

  const q14 = qObj(answers, "q14");
  const q14a = typeof q14.a === "string" ? q14.a : "";
  const q14b = typeof q14.b === "string" ? q14.b : "";
  const q14c = typeof q14.c === "string" ? q14.c : "";
  const q14Detail = typeof q14.detail === "string" ? q14.detail : "";

  const q15 = qObj(answers, "q15");
  const q15Choice = typeof q15.choice === "string" ? q15.choice : "";
  const q15Detail = typeof q15.detail === "string" ? q15.detail : "";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 10</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจห้องที่ 4 “น้ำเพียงพอ” : ในปีนี้ ท่านมีวิธีการรักษาความชื้นในดิน หลังตัด/หลังปลูกอย่างไร
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q10"
                checked={q10Choice === "a"}
                onChange={() => mergeField("q10", { ...q10, choice: "a" })}
                className="mt-1"
              />
              <span>a. มี ด้วยวิธีการนี้ (ตอบได้มากกว่า 1 ข้อ)</span>
            </div>
            {q10Choice === "a" ? (
              <div className="mt-3 space-y-2 pl-6">
                <CheckRow checked={has10("i")} onChange={() => toggleMulti("q10_multi", "i")} label="i. ไว้ใบ 100% เพื่อเก็บความชื้น ลดวัชพืช" />
                <CheckRow checked={has10("ii")} onChange={() => toggleMulti("q10_multi", "ii")} label="ii. ไว้ใบ 30% ตามแถวอ้อย เพื่อเก็บความชื้น ลดวัชพืช" />
                <CheckRow checked={has10("iii")} onChange={() => toggleMulti("q10_multi", "iii")} label="iii. ใช้ปุ๋ยอินทรีย์ หรือวัสดุปรับปรุงดิน เพื่อเพิ่มการอุ้มน้ำในดิน" />
                <div className="space-y-2">
                  <CheckRow checked={has10("iv")} onChange={() => toggleMulti("q10_multi", "iv")} label="iv. วิธีอื่น : ระบุ …" />
                  {has10("iv") ? (
                    <Text value={q10Other} onChange={(t) => mergeField("q10", { ...q10, other: t })} />
                  ) : null}
                </div>
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q10"
                checked={q10Choice === "b"}
                onChange={() => mergeField("q10", { ...q10, choice: "b" })}
                className="mt-1"
              />
              <span>b. ยังไม่มีวิธีจัดการความชื้น</span>
            </div>
            {q10Choice === "b" ? (
              <div className="mt-3 space-y-3 pl-6">
                <div>
                  <Lab>i. สาเหตุเพราะ …</Lab>
                  <Text value={q10Cause} onChange={(t) => mergeField("q10", { ...q10, cause: t })} />
                </div>
                <div>
                  <Lab>ii. ถ้าย้อนเวลาได้ จะแก้ไขอย่างไร …</Lab>
                  <Text value={q10Fix} onChange={(t) => mergeField("q10", { ...q10, fix: t })} />
                </div>
              </div>
            ) : null}
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 11</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจห้องที่ 4 “น้ำเพียงพอ” : ในปีนี้ ท่านมีแหล่งน้ำที่เพียงพอ สามารถให้ได้กี่ครั้ง
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q11"
                checked={q11Choice === "a"}
                onChange={() => mergeField("q11", { ...q11, choice: "a" })}
                className="mt-1"
              />
              <span>a. ไม่สามารถให้ได้เลย</span>
            </div>
            {q11Choice === "a" ? (
              <div className="mt-2 pl-6">
                <Lab>i. สาเหตุเพราะ …</Lab>
                <Text value={q11Cause} onChange={(t) => mergeField("q11", { ...q11, cause: t })} />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q11"
                checked={q11Choice === "b"}
                onChange={() => mergeField("q11", { ...q11, choice: "b" })}
                className="mt-1"
              />
              <span>b. 1 ครั้ง</span>
            </div>
          </label>
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q11"
                checked={q11Choice === "c"}
                onChange={() => mergeField("q11", { ...q11, choice: "c" })}
                className="mt-1"
              />
              <span>c. 2 ครั้ง</span>
            </div>
          </label>
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q11"
                checked={q11Choice === "d"}
                onChange={() => mergeField("q11", { ...q11, choice: "d" })}
                className="mt-1"
              />
              <span>d. 3 ครั้ง</span>
            </div>
          </label>
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q11"
                checked={q11Choice === "e"}
                onChange={() => mergeField("q11", { ...q11, choice: "e" })}
                className="mt-1"
              />
              <span>e. ไม่จำกัด</span>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 12</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจห้องที่ 4 “น้ำเพียงพอ” : ท่านมีวิธีการให้น้ำอย่างไร (ตอบได้มากกว่า 1 ข้อ)
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q12"
                checked={q12Choice === "a"}
                onChange={() => mergeField("q12", { ...q12, choice: "a" })}
                className="mt-1"
              />
              <span>a. ต้นกำลังเป็นเครื่องสูบน้ำ (เชื้อเพลิงหรือไฟฟ้า)</span>
            </div>
            {q12Choice === "a" ? (
              <div className="mt-3 space-y-2 pl-6">
                <CheckRow checked={has12a("i")} onChange={() => toggleMulti("q12_a", "i")} label="i. ให้ช่วงเวลาใด ปริมาณเท่าไหร่ ก็ได้" />
                <CheckRow checked={has12a("ii")} onChange={() => toggleMulti("q12_a", "ii")} label="ii. ให้ในช่วงเวลา เช้า หรือกลางคืน เพื่อไม่ให้น้ำร้อนจนเกินไปสำหรับอ้อย" />
                <CheckRow checked={has12a("iii")} onChange={() => toggleMulti("q12_a", "iii")} label="iii. ให้น้ำมากกว่า 20 ชั่วโมงต่อครั้ง" />
                <CheckRow checked={has12a("iv")} onChange={() => toggleMulti("q12_a", "iv")} label="iv. ให้น้ำโดยทยอยแบ่งให้ ครั้งละ 8-10 ชั่วโมง ดูตามความชื้นของดิน" />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q12"
                checked={q12Choice === "b"}
                onChange={() => mergeField("q12", { ...q12, choice: "b" })}
                className="mt-1"
              />
              <span>b. ต้นกำลังเป็นโซล่าเซลล์</span>
            </div>
            {q12Choice === "b" ? (
              <div className="mt-3 space-y-3 pl-6">
                <div className="space-y-2">
                  <CheckRow checked={has12b("i")} onChange={() => toggleMulti("q12_b", "i")} label="i. ให้ช่วงเวลาใด ปริมาณเท่าไหร่ ก็ได้" />
                  <CheckRow checked={has12b("ii")} onChange={() => toggleMulti("q12_b", "ii")} label="ii. ให้น้ำได้เฉพาะช่วงเวลากลางวัน 8-12 ชม." />
                </div>
                <div>
                  <Lab>จัดการกับความร้อนของน้ำอย่างไร ระบุ ............</Lab>
                  <Text value={q12Heat} onChange={(t) => mergeField("q12", { ...q12, heat: t })} />
                </div>
              </div>
            ) : null}
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 13</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจห้องที่ 4 “น้ำเพียงพอ” : ในปีนี้ ท่านมีความประสงค์อยากสร้างแหล่งน้ำเพิ่มหรือไม่
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q13"
                checked={q13Choice === "a"}
                onChange={() => mergeField("q13", { ...q13, choice: "a" })}
                className="mt-1"
              />
              <span>a. อยาก โดยเป็นรูปแบบดังนี้ (ตอบได้มากกว่า 1 ข้อ)</span>
            </div>
            {q13Choice === "a" ? (
              <div className="mt-3 space-y-2 pl-6">
                <CheckRow checked={has13("i")} onChange={() => toggleMulti("q13_multi", "i")} label="i. บ่อบาดาล" />
                <CheckRow checked={has13("ii")} onChange={() => toggleMulti("q13_multi", "ii")} label="ii. สระเก็บน้ำ" />
                <div className="space-y-2">
                  <CheckRow checked={has13("iii")} onChange={() => toggleMulti("q13_multi", "iii")} label="iii. วิธีอื่น : ระบุ …" />
                  {has13("iii") ? <Text value={q13Other} onChange={(t) => mergeField("q13", { ...q13, other: t })} /> : null}
                </div>
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q13"
                checked={q13Choice === "b"}
                onChange={() => mergeField("q13", { ...q13, choice: "b" })}
                className="mt-1"
              />
              <span>b. ไม่อยาก</span>
            </div>
            {q13Choice === "b" ? (
              <div className="mt-2 pl-6">
                <Lab>i. สาเหตุเพราะ …</Lab>
                <Text value={q13Cause} onChange={(t) => mergeField("q13", { ...q13, cause: t })} />
              </div>
            ) : null}
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 14</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจห้องที่ 4 “น้ำเพียงพอ” : ท่านทราบโมเดลการสร้างแหล่งน้ำที่ประสบความสำเร็จในการทำอ้อยหรือไม่
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Lab>a. ในปีที่ผ่านมา ช่วงหน้าแล้งหรือฝนทิ้งช่วง ปัญหาหลักเรื่องน้ำในไร่อ้อยคือข้อไหน</Lab>
            <RadioRow
              name="q14_a"
              value={q14a}
              onChange={(c) => mergeField("q14", { ...q14, a: c })}
              options={[
                { v: "i", label: "i. ไม่มีแหล่งน้ำสำรองเลย ต้องรอฝนอย่างเดียว (อ้อยชะงักการเติบโต)" },
                { v: "ii", label: "ii. มีสระหรือบ่อ แต่เก็บน้ำได้ไม่พอ บ่อตื้นเกินไป น้ำแห้งก่อนหมดหน้าแล้ง" },
                { v: "iii", label: "iii. มีแหล่งน้ำ แต่วิธีการให้น้ำทำให้เปลืองน้ำ น้ำเลยหมดไว" },
                { v: "iv", label: "iv. ไม่มีปัญหาเลย มีแหล่งน้ำและระบบน้ำเพียงพอตลอดปี" },
              ]}
            />
          </div>
          <div>
            <Lab>b. ในมุมมองของชาวไร่ การจัดหาแหล่งน้ำอย่างไรถึงเพียงพอในการให้น้ำ</Lab>
            <RadioRow
              name="q14_b"
              value={q14b}
              onChange={(c) => mergeField("q14", { ...q14, b: c })}
              options={[
                { v: "i", label: "i. มีสระขนาด 1 งาน ให้น้ำถึง 60 ไร่ จำนวน 4 ครั้ง" },
                { v: "ii", label: "ii. มีบ่อบาดาล 1 บ่อ ท่อหน้า 2 นิ้ว ให้น้ำอ้อยพื้นที่ 100 ไร่ จำนวน 4 ครั้ง" },
                { v: "iii", label: "iii. ต้องคิดจากปริมาณการใช้น้ำจากพื้นที่ปลูก แล้วกำหนดวิธีการจัดหาแหล่งน้ำ" },
              ]}
            />
          </div>
          <div>
            <Lab>c. วันนี้ตัวชาวไร่เอง มีแหล่งน้ำเพียงพอสำหรับการให้น้ำอ้อยทุกแปลงของตนเองแล้วหรือยัง</Lab>
            <RadioRow
              name="q14_c"
              value={q14c}
              onChange={(c) => mergeField("q14", { ...q14, c })}
              options={[
                { v: "i", label: "i. มีครบ สามารถให้ได้ทุกแปลง" },
                { v: "ii", label: "ii. ยังไม่ครบ" },
              ]}
            />
          </div>
          {q14c === "ii" ? (
            <div>
              <Lab>
                แปลงที่ยังไม่มีแหล่งน้ำ ...... แปลง{" "}
                {"\n"}แปลงที่มีแหล่งน้ำแล้ว ..... แปลง
              </Lab>
              <Text value={q14Detail} onChange={(t) => mergeField("q14", { ...q14, detail: t })} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 15</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจห้องที่ 4 “น้ำเพียงพอ” : ท่านต้องการให้ทางทีมชลประทานเข้ามาให้คำแนะนำหรือช่วยเหลือในเรื่องน้ำอย่างไรบ้าง
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q15"
                checked={q15Choice === "a"}
                onChange={() => mergeField("q15", { ...q15, choice: "a" })}
                className="mt-1"
              />
              <span>a. มี : โปรดระบุ</span>
            </div>
            {q15Choice === "a" ? (
              <div className="mt-2 pl-6">
                <Lab>โปรดระบุ</Lab>
                <Text value={q15Detail} onChange={(t) => mergeField("q15", { ...q15, choice: "a", detail: t })} />
              </div>
            ) : null}
          </label>
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q15"
                checked={q15Choice === "b"}
                onChange={() => mergeField("q15", { ...q15, choice: "b" })}
                className="mt-1"
              />
              <span>b. ไม่มี</span>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}

function Step6({ answers, mergeField, toggleMulti }: Heart4SurveyStepsProps) {
  const q16 = qObj(answers, "q16");
  const q16m = qArr(answers, "q16_multi");
  const has16 = (c: string) => q16m.includes(c);
  const q16Other = typeof q16.other === "string" ? q16.other : "";

  const q17 = qObj(answers, "q17");
  const q17Choice = typeof q17.choice === "string" ? q17.choice : "";
  const q17Cause = typeof q17.cause === "string" ? q17.cause : "";

  const q18 = qObj(answers, "q18");
  const q18Choice = typeof q18.choice === "string" ? q18.choice : "";
  const q18Detail = typeof q18.detail === "string" ? q18.detail : "";

  const q19 = qObj(answers, "q19");
  const q19Choice = typeof q19.choice === "string" ? q19.choice : "";
  const q19Detail = typeof q19.detail === "string" ? q19.detail : "";

  const q20 = qObj(answers, "q20");
  const q21 = qObj(answers, "q21");
  const q22 = qObj(answers, "q22");
  const q23 = qObj(answers, "q23");

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 16</div>
        <p className="mt-2 text-sm text-foreground">
          ทางโรงงานกำลังจะเปิดโรงปุ๋ยเป็นของตัวเอง ท่านมีความคาดหวังกับโรงปุ๋ยที่จะสนับสนุนชาวไร่อ้อยอย่างไรบ้าง (ตอบได้มากกว่า 1 ข้อ)
        </p>
        <div className="mt-3 space-y-2">
          <CheckRow checked={has16("a")} onChange={() => toggleMulti("q16_multi", "a")} label="a. ปุ๋ยคุณภาพดี ใช้แล้วอ้อยงาม" />
          <CheckRow checked={has16("b")} onChange={() => toggleMulti("q16_multi", "b")} label="b. ปุ๋ยราคาถูก" />
          <CheckRow checked={has16("c")} onChange={() => toggleMulti("q16_multi", "c")} label="c. บริการส่งถึงบ้าน" />
          <CheckRow
            checked={has16("d")}
            onChange={() => toggleMulti("q16_multi", "d")}
            label="d. เกี๊ยวปุ๋ยไม่ต้องมีหลักทรัพย์ (สำหรับรายที่ไม่ได้เกี๊ยวปกติ หรือซื้อเงินสดเป็นประจำ)"
          />
          <div className="space-y-2">
            <CheckRow checked={has16("e")} onChange={() => toggleMulti("q16_multi", "e")} label="e. อื่นๆ : โปรดระบุ" />
            {has16("e") ? <Text value={q16Other} onChange={(t) => mergeField("q16", { ...q16, other: t })} /> : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 17</div>
        <p className="mt-2 text-sm text-foreground">
          หากได้การสนับสนุนเป็นไปตามที่ท่านคาดหวังในข้อที่แล้ว ท่านจะใช้ปุ๋ยของโรงงานหรือไม่
        </p>
        <RadioRow
          name="q17"
          value={q17Choice}
          onChange={(c) => mergeField("q17", { ...q17, choice: c })}
          options={[
            { v: "a", label: "a. ใช้" },
            { v: "b", label: "b. ไม่ใช้" },
          ]}
        />
        {q17Choice === "b" ? (
          <div className="mt-3">
            <Lab>i. สาเหตุเพราะ …</Lab>
            <Text value={q17Cause} onChange={(t) => mergeField("q17", { ...q17, choice: q17Choice, cause: t })} />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 18</div>
        <p className="mt-2 text-sm text-foreground">ปัจจุบันท่านใช้ปุ๋ยที่โรงงานส่งเสริมใช่หรือไม่</p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q18"
                checked={q18Choice === "a"}
                onChange={() => mergeField("q18", { ...q18, choice: "a" })}
                className="mt-1"
              />
              <span>a. เคยใช้ แต่ปัจจุบันไม่ใช้</span>
            </div>
            {q18Choice === "a" ? (
              <div className="mt-2 pl-6">
                <Lab>i. สาเหตุที่ไม่ใช้ เพราะ</Lab>
                <Text
                  value={q18Detail}
                  onChange={(t) => mergeField("q18", { ...q18, choice: "a", detail: t })}
                />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q18"
                checked={q18Choice === "b"}
                onChange={() => mergeField("q18", { ...q18, choice: "b" })}
                className="mt-1"
              />
              <span>b. ปัจจุบันใช้ และอนาคตก็จะใช้</span>
            </div>
            {q18Choice === "b" ? (
              <div className="mt-2 pl-6">
                <Lab>i. สาเหตุที่ยังใช้ต่อ เพราะ</Lab>
                <Text
                  value={q18Detail}
                  onChange={(t) => mergeField("q18", { ...q18, choice: "b", detail: t })}
                />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q18"
                checked={q18Choice === "c"}
                onChange={() => mergeField("q18", { ...q18, choice: "c" })}
                className="mt-1"
              />
              <span>c. ทั้งอดีต ปัจจุบัน และอนาคต จะไม่ขอใช้</span>
            </div>
            {q18Choice === "c" ? (
              <div className="mt-2 pl-6">
                <Lab>i. สาเหตุที่ไม่ใช้ เพราะ</Lab>
                <Text
                  value={q18Detail}
                  onChange={(t) => mergeField("q18", { ...q18, choice: "c", detail: t })}
                />
              </div>
            ) : null}
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 19</div>
        <p className="mt-2 text-sm text-foreground">
          หากได้การสนับสนุนเป็นไปตามที่ท่านคาดหวังตามข้อก่อนหน้า จะมีผลต่อการตัดสินใจปลูกอ้อยในปีหน้าหรือไม่
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q19"
                checked={q19Choice === "a"}
                onChange={() => mergeField("q19", { ...q19, choice: "a" })}
                className="mt-1"
              />
              <span>a. มี ปลูกเพิ่มขึ้น</span>
            </div>
            {q19Choice === "a" ? (
              <div className="mt-2 pl-6">
                <Lab>i. สาเหตุเพราะ …</Lab>
                <Text
                  value={q19Detail}
                  onChange={(t) => mergeField("q19", { ...q19, choice: "a", detail: t })}
                />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q19"
                checked={q19Choice === "b"}
                onChange={() => mergeField("q19", { ...q19, choice: "b" })}
                className="mt-1"
              />
              <span>b. ไม่มีผล</span>
            </div>
            {q19Choice === "b" ? (
              <div className="mt-2 pl-6">
                <Lab>i. สาเหตุเพราะ …</Lab>
                <Text
                  value={q19Detail}
                  onChange={(t) => mergeField("q19", { ...q19, choice: "b", detail: t })}
                />
              </div>
            ) : null}
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 20</div>
        <p className="mt-2 text-sm text-foreground">โดยปกติ ท่านจะใส่ปุ๋ยในอ้อยใหม่ ด้วยสูตรอะไร และอัตราเท่าไหร่</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Lab>รองพื้น: สูตร</Lab>
            <Line value={typeof q20.base_formula === "string" ? (q20.base_formula as string) : ""} onChange={(t) => mergeField("q20", { ...q20, base_formula: t })} placeholder="สูตร" />
          </div>
          <div>
            <Lab>รองพื้น: อัตรา (กก./ไร่)</Lab>
            <Line value={typeof q20.base_rate === "string" ? (q20.base_rate as string) : ""} onChange={(t) => mergeField("q20", { ...q20, base_rate: t })} placeholder="กก./ไร่" />
          </div>
          <div>
            <Lab>บำรุง: สูตร</Lab>
            <Line value={typeof q20.nourish_formula === "string" ? (q20.nourish_formula as string) : ""} onChange={(t) => mergeField("q20", { ...q20, nourish_formula: t })} placeholder="สูตร" />
          </div>
          <div>
            <Lab>บำรุง: อัตรา (กก./ไร่)</Lab>
            <Line value={typeof q20.nourish_rate === "string" ? (q20.nourish_rate as string) : ""} onChange={(t) => mergeField("q20", { ...q20, nourish_rate: t })} placeholder="กก./ไร่" />
          </div>
          <div>
            <Lab>แต่งหน้ารอบสุดท้าย: สูตร</Lab>
            <Line value={typeof q20.top_formula === "string" ? (q20.top_formula as string) : ""} onChange={(t) => mergeField("q20", { ...q20, top_formula: t })} placeholder="สูตร" />
          </div>
          <div>
            <Lab>แต่งหน้ารอบสุดท้าย: อัตรา (กก./ไร่)</Lab>
            <Line value={typeof q20.top_rate === "string" ? (q20.top_rate as string) : ""} onChange={(t) => mergeField("q20", { ...q20, top_rate: t })} placeholder="กก./ไร่" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 21</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจ พลัส “ปุ๋ย” เพิ่มผลผลิต : ในปีนี้ ท่านมีความสนใจวิธีการบำรุงใหม่ หรือได้ทำการผ่ากอ ใส่ปุ๋ย เพื่อให้อ้อยได้กินปุ๋ยโดยตรงหรือไม่
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q21"
                checked={q21.choice === "a"}
                onChange={() => mergeField("q21", { ...q21, choice: "a" })}
                className="mt-1"
              />
              <span>a. ทำไปแล้ว</span>
            </div>
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q21"
                checked={q21.choice === "b"}
                onChange={() => mergeField("q21", { ...q21, choice: "b" })}
                className="mt-1"
              />
              <span>b. ยังไม่ได้ทำ เพราะ …</span>
            </div>
            {q21.choice === "b" ? (
              <div className="mt-2 pl-6">
                <Lab>เพราะ …</Lab>
                <Text
                  value={typeof q21.detail === "string" ? (q21.detail as string) : ""}
                  onChange={(t) => mergeField("q21", { ...q21, choice: "b", detail: t })}
                />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q21"
                checked={q21.choice === "c"}
                onChange={() => mergeField("q21", { ...q21, choice: "c" })}
                className="mt-1"
              />
              <span>c. สนใจอยากทำในปีหน้า</span>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 22</div>
        <p className="mt-2 text-sm text-foreground">โดยปกติ ท่านจะใส่ปุ๋ยในอ้อยตอ ด้วยสูตรอะไร และอัตราเท่าไหร่</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Lab>บำรุงหลังตัดทันที: สูตร</Lab>
            <Line value={typeof q22.cut_formula === "string" ? (q22.cut_formula as string) : ""} onChange={(t) => mergeField("q22", { ...q22, cut_formula: t })} placeholder="สูตร" />
          </div>
          <div>
            <Lab>บำรุงหลังตัดทันที: อัตรา (กก./ไร่)</Lab>
            <Line value={typeof q22.cut_rate === "string" ? (q22.cut_rate as string) : ""} onChange={(t) => mergeField("q22", { ...q22, cut_rate: t })} placeholder="กก./ไร่" />
          </div>
          <div>
            <Lab>บำรุง: สูตร</Lab>
            <Line value={typeof q22.nourish_formula === "string" ? (q22.nourish_formula as string) : ""} onChange={(t) => mergeField("q22", { ...q22, nourish_formula: t })} placeholder="สูตร" />
          </div>
          <div>
            <Lab>บำรุง: อัตรา (กก./ไร่)</Lab>
            <Line value={typeof q22.nourish_rate === "string" ? (q22.nourish_rate as string) : ""} onChange={(t) => mergeField("q22", { ...q22, nourish_rate: t })} placeholder="กก./ไร่" />
          </div>
          <div>
            <Lab>แต่งหน้า: สูตร</Lab>
            <Line value={typeof q22.top_formula === "string" ? (q22.top_formula as string) : ""} onChange={(t) => mergeField("q22", { ...q22, top_formula: t })} placeholder="สูตร" />
          </div>
          <div>
            <Lab>แต่งหน้า: อัตรา (กก./ไร่)</Lab>
            <Line value={typeof q22.top_rate === "string" ? (q22.top_rate as string) : ""} onChange={(t) => mergeField("q22", { ...q22, top_rate: t })} placeholder="กก./ไร่" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 23</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจ พลัส “ปุ๋ย” เพิ่มผลผลิต : ในปีนี้ ท่านมีความประสงค์อยากได้ปุ๋ยเพิ่ม ในสูตรใด กี่กระสอบ
          เนื่องด้วยราคาแม่ปุ๋ยที่ขึ้นไปสูงมาก ทางโรงงานจึงมีความจำเป็นต้องจำกัดสูตรเพื่อจัดหาปุ๋ยที่ราคาถูกคุณภาพดี ให้กับชาวไร่มากที่สุด
          จึงออกมาเป็น 2 สูตรหลัก
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Lab>a. 21-7-18 จำนวน … กระสอบ</Lab>
            <Line value={typeof q23.qty_21718 === "string" ? (q23.qty_21718 as string) : ""} onChange={(t) => mergeField("q23", { ...q23, qty_21718: t })} placeholder="จำนวน" />
          </div>
          <div>
            <Lab>b. 16-8-8 จำนวน … กระสอบ</Lab>
            <Line value={typeof q23.qty_1688 === "string" ? (q23.qty_1688 as string) : ""} onChange={(t) => mergeField("q23", { ...q23, qty_1688: t })} placeholder="จำนวน" />
          </div>
          <div>
            <Lab>
              c. สูตรอื่นๆ โปรดระบุ (ขอให้ท่านช่วยพิจารณา 2 สูตรด้านบนก่อน แต่กรณีไม่สามารถใช้ 2 สูตรด้านบนได้ โปรดระบุสูตรที่ต้องการ)
            </Lab>
            <Line value={typeof q23.other_formula === "string" ? (q23.other_formula as string) : ""} onChange={(t) => mergeField("q23", { ...q23, other_formula: t })} placeholder="สูตร" />
          </div>
          <div>
            <Lab>จำนวน … กระสอบ</Lab>
            <Line value={typeof q23.other_qty === "string" ? (q23.other_qty as string) : ""} onChange={(t) => mergeField("q23", { ...q23, other_qty: t })} placeholder="จำนวน" />
          </div>
        </div>
      </section>
    </div>
  );
}

function Step7({ answers, mergeField, toggleMulti }: Heart4SurveyStepsProps) {
  const q24 = qObj(answers, "q24");
  const q24Uses = qArr(answers, "q24_uses"); // a.i-a.iv
  const q24How = qArr(answers, "q24_how"); // b.i-b.iii
  const q24Rate = qArr(answers, "q24_rate"); // c.i-c.v
  const has24Use = (c: string) => q24Uses.includes(c);
  const has24How = (c: string) => q24How.includes(c);
  const has24Rate = (c: string) => q24Rate.includes(c);
  const q24OtherSoil = typeof q24.otherSoil === "string" ? q24.otherSoil : "";

  const q25 = qObj(answers, "q25");
  const q25Opts = qArr(answers, "q25_opts");
  const has25 = (c: string) => q25Opts.includes(c);
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 24</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจ พลัส “ปุ๋ยอินทรีย์” ปรับโครงสร้างดิน เก็บความชื้น อ้อยกินปุ๋ยง่ายขึ้น : ท่านมีการใช้ปุ๋ยอินทรีย์ในการปรับปรุงโครงสร้างดินอย่างไรบ้าง
        </p>

        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm font-semibold text-foreground">a. ใส่อยู่แล้ว ด้วย</div>
            <div className="mt-3 space-y-2 pl-3">
              <CheckRow checked={has24Use("i")} onChange={() => toggleMulti("q24_uses", "i")} label="i. ปุ๋ยอินทรีย์ผง" />
              <CheckRow checked={has24Use("ii")} onChange={() => toggleMulti("q24_uses", "ii")} label="ii. ปุ๋ยอินทรีย์เม็ด" />
              <CheckRow checked={has24Use("iii")} onChange={() => toggleMulti("q24_uses", "iii")} label="iii. ปุ๋ยอินทรีย์จากที่อื่น ที่ไม่ใช่ของโรงงาน" />
              <div className="space-y-2">
                <CheckRow checked={has24Use("iv")} onChange={() => toggleMulti("q24_uses", "iv")} label="iv. วัสดุปรับปรุงดินอื่น เช่น ขี้ไก่ : โปรดระบุ" />
                {has24Use("iv") ? (
                  <Text value={q24OtherSoil} onChange={(t) => mergeField("q24", { ...q24, otherSoil: t })} />
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm font-semibold text-foreground">b. วิธีการใส่</div>
            <div className="mt-3 space-y-2 pl-3">
              <CheckRow checked={has24How("i")} onChange={() => toggleMulti("q24_how", "i")} label="i. ใส่รองพื้น" />
              <CheckRow checked={has24How("ii")} onChange={() => toggleMulti("q24_how", "ii")} label="ii. ใส่บำรุงได้ดี โดยไม่ต้องรอฝน" />
              <CheckRow checked={has24How("iii")} onChange={() => toggleMulti("q24_how", "iii")} label="iii. ใส่ช่วงฝนมา พร้อมปุ๋ย" />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-sm font-semibold text-foreground">c. ท่านใส่อินทรีย์ในอัตรา</div>
            <div className="mt-3 space-y-2 pl-3">
              <CheckRow checked={has24Rate("i")} onChange={() => toggleMulti("q24_rate", "i")} label="i. 2 ตัน/ไร่" />
              <CheckRow checked={has24Rate("ii")} onChange={() => toggleMulti("q24_rate", "ii")} label="ii. 1 ตัน/ไร่" />
              <CheckRow checked={has24Rate("iii")} onChange={() => toggleMulti("q24_rate", "iii")} label="iii. 500 กก/ไร่" />
              <CheckRow checked={has24Rate("iv")} onChange={() => toggleMulti("q24_rate", "iv")} label="iv. 200 กก/ไร่" />
              <CheckRow checked={has24Rate("v")} onChange={() => toggleMulti("q24_rate", "v")} label="v. ต่ำกว่า 200 กก/ไร่ (4 กระสอบ)" />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 25</div>
        <p className="mt-2 text-sm text-foreground">
          หัวใจ พลัส “ปุ๋ยอินทรีย์” : ท่านทราบหรือไม่ว่า อินทรีย์ จะช่วยเพิ่มผลผลิตในระยะยาวได้อย่างไรบ้าง
        </p>
        <div className="mt-2 space-y-2">
          <CheckRow checked={has25("i")} onChange={() => toggleMulti("q25_opts", "i")} label="i. ช่วยเก็บความชื้นในดิน อุ้มน้ำ ต้านทานภัยแล้ง" />
          <CheckRow checked={has25("ii")} onChange={() => toggleMulti("q25_opts", "ii")} label="ii. ช่วยเก็บและปลดปล่อยปุ๋ยที่อ้อยยังย่อยไม่ได้ให้อยู่ในรูปที่อ้อยกินได้" />
          <CheckRow checked={has25("iii")} onChange={() => toggleMulti("q25_opts", "iii")} label="iii. ช่วยลดการสะสมของสารเคมีที่ใช้ในไร่เป็นเวลานาน" />
          <CheckRow checked={has25("iv")} onChange={() => toggleMulti("q25_opts", "iv")} label="iv. ช่วยปรับสภาพดินให้ทนต่อความเป็นกรดด่างเบื้องต้น" />
          <CheckRow checked={has25("v")} onChange={() => toggleMulti("q25_opts", "v")} label="v. อื่นๆ : โปรดระบุ" />
        </div>
        {has25("v") ? (
          <div className="mt-3 pl-6">
            <Lab>อื่นๆ : โปรดระบุ</Lab>
            <Text
              value={typeof q25.otherText === "string" ? (q25.otherText as string) : ""}
              onChange={(t) => mergeField("q25", { ...q25, otherText: t })}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Step8({ answers, mergeField, toggleMulti }: Heart4SurveyStepsProps) {
  const q26 = qObj(answers, "q26");
  const q26Choice = typeof q26.choice === "string" ? q26.choice : "";
  const q26Worry = typeof q26.worry === "string" ? q26.worry : "";

  const q27 = qObj(answers, "q27");
  const q27m = qArr(answers, "q27_multi");
  const has27 = (c: string) => q27m.includes(c);
  const q27Fertilizer = typeof q27.fertilizer === "string" ? q27.fertilizer : "";
  const q27Cost = typeof q27.cost === "string" ? q27.cost : "";
  const q27Oil = typeof q27.oil === "string" ? q27.oil : "";

  const q28 = qObj(answers, "q28");
  const q28Choice = typeof q28.choice === "string" ? q28.choice : "";
  const q28Other = typeof q28.other === "string" ? q28.other : "";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 26</div>
        <p className="mt-2 text-sm text-foreground">
          ท่านทราบถึงราคาอ้อยในปีหน้า ที่มีแนวโน้มสูงขึ้นอย่างไรบ้าง
        </p>
        <RadioRow
          name="q26"
          value={q26Choice}
          onChange={(c) => mergeField("q26", { ...q26, choice: c })}
          options={[
            { v: "a", label: "a. ทราบแล้ว" },
            { v: "b", label: "b. ยังไม่ทราบ" },
            { v: "c", label: "c. กังวล เพราะ …" },
          ]}
        />
        {q26Choice === "c" ? (
          <div className="mt-3">
            <Lab>กังวล เพราะ …</Lab>
            <Text value={q26Worry} onChange={(t) => mergeField("q26", { ...q26, choice: q26Choice, worry: t })} />
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 27</div>
        <p className="mt-2 text-sm text-foreground">
          ท่านมีอุปสรรคใด ต่อการดูแลอ้อยตามหลัก หัวใจ 4 ห้อง เพื่ออ้อยผลผลิตสูง หรือไม่
        </p>
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            <CheckRow checked={has27("a")} onChange={() => toggleMulti("q27_multi", "a")} label="a. ปุ๋ย โปรดระบุ …" />
            {has27("a") ? (
              <div className="pl-6">
                <Text value={q27Fertilizer} onChange={(t) => mergeField("q27", { ...q27, fertilizer: t })} />
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <CheckRow checked={has27("b")} onChange={() => toggleMulti("q27_multi", "b")} label="b. ต้นทุนการจัดการ โปรดระบุ กิจกรรม …" />
            {has27("b") ? (
              <div className="pl-6">
                <Text value={q27Cost} onChange={(t) => mergeField("q27", { ...q27, cost: t })} />
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <CheckRow checked={has27("c")} onChange={() => toggleMulti("q27_multi", "c")} label="c. น้ำมัน : โปรดระบุ …" />
            {has27("c") ? (
              <div className="pl-6">
                <Text value={q27Oil} onChange={(t) => mergeField("q27", { ...q27, oil: t })} />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 28</div>
        <p className="mt-2 text-sm text-foreground">กรณีถ้าไม่ได้ปลูกอ้อย ท่านมีความต้องการจะปลูกพืชใด</p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q28"
                checked={q28Choice === "a"}
                onChange={() => mergeField("q28", { ...q28, choice: "a" })}
                className="mt-1"
              />
              <span>a. ข้าว</span>
            </div>
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q28"
                checked={q28Choice === "b"}
                onChange={() => mergeField("q28", { ...q28, choice: "b" })}
                className="mt-1"
              />
              <span>b. ข้าวโพด</span>
            </div>
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q28"
                checked={q28Choice === "c"}
                onChange={() => mergeField("q28", { ...q28, choice: "c" })}
                className="mt-1"
              />
              <span>c. มันสำปะหลัง</span>
            </div>
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q28"
                checked={q28Choice === "d"}
                onChange={() => mergeField("q28", { ...q28, choice: "d" })}
                className="mt-1"
              />
              <span>d. อื่นๆ : โปรดระบุ</span>
            </div>
            {q28Choice === "d" ? (
              <div className="mt-2 pl-6">
                <Lab>โปรดระบุ</Lab>
                <Text value={q28Other} onChange={(t) => mergeField("q28", { ...q28, choice: "d", other: t })} />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q28"
                checked={q28Choice === "e"}
                onChange={() => mergeField("q28", { ...q28, choice: "e" })}
                className="mt-1"
              />
              <span>e. ไม่มี</span>
            </div>
          </label>
        </div>
      </section>
    </div>
  );
}

function Step9({ answers, mergeField, toggleMulti }: Heart4SurveyStepsProps) {
  const qs = [29, 30, 31, 32, 33];
  const v34 = qObj(answers, "q34");
  const tonsPast = typeof v34.tonsPast === "string" ? v34.tonsPast : "";
  const tonsTarget = typeof v34.tonsTarget === "string" ? v34.tonsTarget : "";

  const q35m = qArr(answers, "q35_multi");
  const has35 = (c: string) => q35m.includes(c);
  const v35 = qObj(answers, "q35");
  const v36 = qObj(answers, "q36");
  const v37 = qObj(answers, "q37");
  const v38 = qObj(answers, "q38");

  type UploadResponse =
    | { ok: true; bucket: string; files: { path: string; publicUrl: string }[] }
    | { ok: false; error: string; message?: string; detail?: string };

  const checkin = qObj(answers, "checkin");
  const checkinUrl = typeof checkin.photo_url === "string" ? (checkin.photo_url as string) : "";
  const checkinTakenAt = typeof checkin.taken_at === "string" ? (checkin.taken_at as string) : "";

  const [camOpen, setCamOpen] = useState(false);
  const [camErr, setCamErr] = useState<string | null>(null);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    const s = streamRef.current;
    streamRef.current = null;
    if (s) for (const t of s.getTracks()) t.stop();
  }, []);

  useEffect(() => {
    if (!camOpen) return;
    let alive = true;
    async function start() {
      setCamErr(null);
      setUploadErr(null);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCamErr("อุปกรณ์นี้ไม่รองรับการเปิดกล้อง");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!alive) {
          for (const t of stream.getTracks()) t.stop();
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => null);
        }
      } catch (e) {
        const msg =
          e && typeof e === "object" && "name" in e && (e as { name?: unknown }).name === "NotAllowedError"
            ? "ไม่ได้รับอนุญาตให้ใช้กล้อง"
            : "เปิดกล้องไม่สำเร็จ";
        setCamErr(msg);
      }
    }
    void start();
    return () => {
      alive = false;
      stopCamera();
    };
  }, [camOpen, stopCamera]);

  const getLocation = useCallback(async () => {
    if (!navigator.geolocation) return null;
    return await new Promise<GeolocationPosition | null>((resolve) => {
      let done = false;
      const timer = window.setTimeout(() => {
        if (done) return;
        done = true;
        resolve(null);
      }, 8000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          resolve(pos);
        },
        () => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 },
      );
    });
  }, []);

  const captureAndUpload = useCallback(async () => {
    setUploadErr(null);
    setCamErr(null);
    setUploading(true);
    try {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (!v || !c) {
        setUploadErr("ไม่พบกล้อง/พื้นที่วาดภาพ");
        return;
      }

      const w = Math.max(1, v.videoWidth || 0);
      const h = Math.max(1, v.videoHeight || 0);
      if (w <= 1 || h <= 1) {
        setUploadErr("กล้องยังไม่พร้อม กรุณาลองใหม่");
        return;
      }

      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) {
        setUploadErr("ไม่สามารถวาดภาพได้");
        return;
      }

      ctx.drawImage(v, 0, 0, w, h);

      const pos = await getLocation();
      if (!pos?.coords || typeof pos.coords.latitude !== "number" || typeof pos.coords.longitude !== "number") {
        setUploadErr("ต้องอนุญาตให้เข้าถึงตำแหน่ง (GPS) ก่อน จึงจะถ่ายเช็คอินได้");
        return;
      }
      const takenAt = new Date();
      const lat = pos?.coords?.latitude ?? null;
      const lng = pos?.coords?.longitude ?? null;
      const acc = pos?.coords?.accuracy ?? null;

      // Stamp overlay (GPS + time) at bottom-left.
      const pad = Math.max(18, Math.round(Math.min(w, h) * 0.02));
      const fontSize = Math.max(18, Math.round(Math.min(w, h) * 0.035));
      ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
      ctx.textBaseline = "top";

      const lines = [
        `เวลา: ${takenAt.toLocaleString("th-TH")}`,
        `GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)}${acc ? ` (±${Math.round(acc)}m)` : ""}`,
      ];

      const lineH = Math.round(fontSize * 1.25);
      const boxH = pad + lines.length * lineH + pad;
      const boxW = Math.round(w * 0.92);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, h - boxH, boxW, boxH);
      ctx.fillStyle = "white";
      let y = h - boxH + pad;
      for (const line of lines) {
        ctx.fillText(line, pad, y);
        y += lineH;
      }

      const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) {
        setUploadErr("แปลงรูปไม่สำเร็จ");
        return;
      }

      const filename = `checkin-${takenAt.toISOString().replaceAll(":", "-")}.jpg`;
      const file = new File([blob], filename, { type: "image/jpeg" });

      const fd = new FormData();
      fd.append("files", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const json = (await res.json().catch(() => null)) as UploadResponse | null;
      if (!res.ok || !json || json.ok !== true || !Array.isArray(json.files) || !json.files[0]?.publicUrl) {
        const m =
          json && typeof json === "object" && "message" in json && typeof json.message === "string"
            ? json.message
            : "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่";
        setUploadErr(m);
        return;
      }

      mergeField("checkin", {
        photo_url: json.files[0].publicUrl,
        taken_at: takenAt.toISOString(),
        lat,
        lng,
        accuracy: acc,
      });
      setCamOpen(false);
    } finally {
      setUploading(false);
    }
  }, [getLocation, mergeField]);

  return (
    <div className="space-y-6">
      {qs.map((n) => {
        const v = qObj(answers, `q${n}`);
        const score = typeof v.score === "string" ? v.score : "";
        const good = typeof v.good === "string" ? v.good : "";
        const improve = typeof v.improve === "string" ? v.improve : "";
        const title =
          n === 29
            ? "ในปีที่ผ่านมา ท่านมีความพึงพอใจ ในเรื่องสนับสนุนการ “นำอ้อยเข้าหีบ” อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา"
            : n === 30
              ? "ในปีที่ผ่านมา ท่านมีความพึงพอใจ ในเรื่องสนับสนุนการ “ปลูกอ้อย” อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา"
              : n === 31
                ? "ในปีที่ผ่านมา ท่านมีความพึงพอใจ ในเรื่องสนับสนุนการ “การบำรุงอ้อย” อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา"
                : n === 32
                  ? "ในปีที่ผ่านมา ท่านมีความพึงพอใจ ในเรื่องสนับสนุนการ “การบริการอื่นๆ และเกี๊ยว” อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา"
                  : "ท่านมีความพึงพอใจในภาพรวม ต่อ นักส่งเสริมที่ดูแล อย่างไรและคิดว่ามีอะไรที่ควรพัฒนา";
        return (
          <section key={n} className="rounded-2xl border border-border bg-background p-4">
            <div className="text-sm font-semibold text-foreground">ข้อ {n}</div>
            <p className="mt-2 text-sm text-foreground">{title}</p>
            <div className="mt-3 space-y-3">
              <div>
                <Lab>คะแนนความพึงพอใจ (เต็ม 10)</Lab>
                <Line
                  value={score}
                  onChange={(t) => mergeField(`q${n}`, { ...v, score: t, good, improve })}
                  placeholder="0-10"
                />
              </div>
              <div>
                <Lab>เรื่องที่ทำได้ดี …</Lab>
                <Text value={good} onChange={(t) => mergeField(`q${n}`, { ...v, score, good: t, improve })} />
              </div>
              <div>
                <Lab>เรื่องที่ควรพัฒนา …</Lab>
                <Text value={improve} onChange={(t) => mergeField(`q${n}`, { ...v, score, good, improve: t })} />
              </div>
            </div>
          </section>
        );
      })}

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 34</div>
        <p className="mt-2 text-sm text-foreground">
          ท่านทำตันต่อไร่ได้เท่าไหร่ในปีที่แล้ว และท่านมีเป้าหมายในปีหน้าเท่าไหร่
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <Lab>a. ตันต่อไร่ ปีที่ผ่านมา (ตัน/ไร่)</Lab>
            <Line
              value={tonsPast}
              onChange={(t) => mergeField("q34", { ...v34, tonsPast: t, tonsTarget })}
              placeholder="ตัน/ไร่"
            />
          </div>
          <div>
            <Lab>b. เป้าหมายตันต่อไร่ในปีหน้า (ตัน/ไร่)</Lab>
            <Line
              value={tonsTarget}
              onChange={(t) => mergeField("q34", { ...v34, tonsPast, tonsTarget: t })}
              placeholder="ตัน/ไร่"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 35 — สนับสนุนเพื่อตันต่อไร่</div>
        <div className="mt-3 space-y-3">
          <div className="space-y-2">
            <CheckRow checked={has35("factor")} onChange={() => toggleMulti("q35_multi", "factor")} label="a. ปัจจัยการผลิต" />
            {has35("factor") ? (
              <div className="pl-6">
                <Lab>โปรดระบุ …</Lab>
                <Text
                  value={typeof v35.factor === "string" ? (v35.factor as string) : ""}
                  onChange={(t) => mergeField("q35", { ...v35, factor: t })}
                />
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <CheckRow checked={has35("budget")} onChange={() => toggleMulti("q35_multi", "budget")} label="b. วงเงิน" />
            {has35("budget") ? (
              <div className="pl-6">
                <Lab>โปรดระบุ …</Lab>
                <Text
                  value={typeof v35.budget === "string" ? (v35.budget as string) : ""}
                  onChange={(t) => mergeField("q35", { ...v35, budget: t })}
                />
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <CheckRow checked={has35("water")} onChange={() => toggleMulti("q35_multi", "water")} label="c. สร้างแหล่งน้ำ" />
            {has35("water") ? (
              <div className="pl-6">
                <Lab>โปรดระบุ …</Lab>
                <Text
                  value={typeof v35.water === "string" ? (v35.water as string) : ""}
                  onChange={(t) => mergeField("q35", { ...v35, water: t })}
                />
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <CheckRow checked={has35("other")} onChange={() => toggleMulti("q35_multi", "other")} label="d. อื่นๆ" />
            {has35("other") ? (
              <div className="pl-6">
                <Lab>โปรดระบุ …</Lab>
                <Text
                  value={typeof v35.other === "string" ? (v35.other as string) : ""}
                  onChange={(t) => mergeField("q35", { ...v35, other: t })}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 36 — รางวัลที่อยากได้</div>
        <p className="mt-2 text-sm text-foreground">
          หากท่านสามารถทำตันต่อไร่ได้ตามเป้าหมาย หรือเป็นชาวไร่มืออาชีพ ที่เป็นตัวอย่างการทำหัวใจ 4 ห้อง เพื่ออ้อยผลผลิตสูงได้แข็งแรง
          ท่านอยากได้อะไรเป็นรางวัล
        </p>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q36"
                checked={v36.choice === "a"}
                onChange={() => mergeField("q36", { ...v36, choice: "a" })}
                className="mt-1"
              />
              <span>a. ไปเที่ยว</span>
            </div>
            {v36.choice === "a" ? (
              <div className="mt-2 pl-6">
                <Lab>i. โปรดระบุ สถานที่</Lab>
                <Line
                  value={typeof v36.travel_place === "string" ? (v36.travel_place as string) : ""}
                  onChange={(t) => mergeField("q36", { ...v36, choice: "a", travel_place: t })}
                  placeholder="สถานที่"
                />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q36"
                checked={v36.choice === "b"}
                onChange={() => mergeField("q36", { ...v36, choice: "b" })}
                className="mt-1"
              />
              <span>b. ตั๋วส่วนลดปุ๋ยบำรุง</span>
            </div>
            {v36.choice === "b" ? (
              <div className="mt-2 pl-6">
                <Lab>i. โปรดระบุ สูตรที่ต้องการ</Lab>
                <Line
                  value={typeof v36.fert_formula === "string" ? (v36.fert_formula as string) : ""}
                  onChange={(t) => mergeField("q36", { ...v36, choice: "b", fert_formula: t })}
                  placeholder="สูตรที่ต้องการ"
                />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q36"
                checked={v36.choice === "c"}
                onChange={() => mergeField("q36", { ...v36, choice: "c" })}
                className="mt-1"
              />
              <span>c. ตั๋วส่วนลดค่ายา กำจัด วัชพืช โรค แมลง</span>
            </div>
            {v36.choice === "c" ? (
              <div className="mt-2 pl-6">
                <Lab>i. โปรดระบุ ยาที่ต้องการ</Lab>
                <Line
                  value={typeof v36.chemical === "string" ? (v36.chemical as string) : ""}
                  onChange={(t) => mergeField("q36", { ...v36, choice: "c", chemical: t })}
                  placeholder="ยาที่ต้องการ"
                />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q36"
                checked={v36.choice === "d"}
                onChange={() => mergeField("q36", { ...v36, choice: "d" })}
                className="mt-1"
              />
              <span>d. รางวัลแถม ปุ๋ยอินทรีย์ พัฒนาโครงสร้างดิน</span>
            </div>
            {v36.choice === "d" ? (
              <div className="mt-2 pl-6">
                <Lab>i. โปรดระบุ จำนวนที่ต้องการ</Lab>
                <Line
                  value={typeof v36.organic_qty === "string" ? (v36.organic_qty as string) : ""}
                  onChange={(t) => mergeField("q36", { ...v36, choice: "d", organic_qty: t })}
                  placeholder="จำนวนที่ต้องการ"
                />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q36"
                checked={v36.choice === "e"}
                onChange={() => mergeField("q36", { ...v36, choice: "e" })}
                className="mt-1"
              />
              <span>e. สนับสนุนงบสร้างแหล่งน้ำ</span>
            </div>
            {v36.choice === "e" ? (
              <div className="mt-2 pl-6">
                <Lab>i. โปรดระบุ ประเภทแหล่งน้ำที่ต้องการสร้าง</Lab>
                <Line
                  value={typeof v36.water_type === "string" ? (v36.water_type as string) : ""}
                  onChange={(t) => mergeField("q36", { ...v36, choice: "e", water_type: t })}
                  placeholder="ประเภทแหล่งน้ำ"
                />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q36"
                checked={v36.choice === "f"}
                onChange={() => mergeField("q36", { ...v36, choice: "f" })}
                className="mt-1"
              />
              <span>f. สิทธิจองพันธุ์ใหม่ที่โรงงานพัฒนา ขยายก่อนใคร</span>
            </div>
            {v36.choice === "f" ? (
              <div className="mt-2 pl-6">
                <Lab>i. โปรดระบุ พันธุ์ที่ต้องการ</Lab>
                <Line
                  value={typeof v36.variety === "string" ? (v36.variety as string) : ""}
                  onChange={(t) => mergeField("q36", { ...v36, choice: "f", variety: t })}
                  placeholder="พันธุ์ที่ต้องการ"
                />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q36"
                checked={v36.choice === "g"}
                onChange={() => mergeField("q36", { ...v36, choice: "g" })}
                className="mt-1"
              />
              <span>g. อื่นๆ : …</span>
            </div>
            {v36.choice === "g" ? (
              <div className="mt-2 pl-6">
                <Lab>โปรดระบุ</Lab>
                <Text
                  value={typeof v36.other === "string" ? (v36.other as string) : ""}
                  onChange={(t) => mergeField("q36", { ...v36, choice: "g", other: t })}
                />
              </div>
            ) : null}
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 37 — อ้อยฝน</div>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q37"
                checked={v37.choice === "a"}
                onChange={() => mergeField("q37", { ...v37, choice: "a" })}
                className="mt-1"
              />
              <span>a. ต้องการปลูกอ้อยฝน เพื่อเป็นพันธุ์</span>
            </div>
            {v37.choice === "a" ? (
              <div className="mt-2 pl-6">
                <Lab>ระบุจำนวนไร่</Lab>
                <Text
                  value={typeof v37.detail === "string" ? (v37.detail as string) : ""}
                  onChange={(t) => mergeField("q37", { ...v37, choice: "a", detail: t })}
                />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q37"
                checked={v37.choice === "b"}
                onChange={() => mergeField("q37", { ...v37, choice: "b" })}
                className="mt-1"
              />
              <span>b. ต้องการปลูกอ้อยฝน เพื่อเข้าหีบ</span>
            </div>
            {v37.choice === "b" ? (
              <div className="mt-2 pl-6">
                <Lab>ระบุจำนวนไร่</Lab>
                <Text
                  value={typeof v37.detail === "string" ? (v37.detail as string) : ""}
                  onChange={(t) => mergeField("q37", { ...v37, choice: "b", detail: t })}
                />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q37"
                checked={v37.choice === "c"}
                onChange={() => mergeField("q37", { ...v37, choice: "c" })}
                className="mt-1"
              />
              <span>c. ไม่ต้องการ</span>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ข้อ 38 — เรื่องอื่นที่ต้องการสื่อสาร</div>
        <div className="mt-3 space-y-3">
          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q38"
                checked={v38.choice === "a"}
                onChange={() => mergeField("q38", { ...v38, choice: "a" })}
                className="mt-1"
              />
              <span>a. มี โปรดระบุ</span>
            </div>
            {v38.choice === "a" ? (
              <div className="mt-2 pl-6">
                <Lab>โปรดระบุ</Lab>
                <Text
                  value={typeof v38.detail === "string" ? (v38.detail as string) : ""}
                  onChange={(t) => mergeField("q38", { ...v38, choice: "a", detail: t })}
                />
              </div>
            ) : null}
          </label>

          <label className="block">
            <div className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="q38"
                checked={v38.choice === "b"}
                onChange={() => mergeField("q38", { ...v38, choice: "b" })}
                className="mt-1"
              />
              <span>b. ไม่มี</span>
            </div>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-background p-4">
        <div className="text-sm font-semibold text-foreground">ถ่ายรูปเช็คอินหน้างาน</div>
        <p className="mt-2 text-sm text-foreground">
          บังคับถ่ายจากกล้องเท่านั้น และต้องอนุญาต GPS เพื่อประทับพิกัดและเวลา ลงบนรูป
        </p>

        {checkinUrl ? (
          <div className="mt-3 space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={checkinUrl}
              alt="รูปเช็คอินหน้างาน"
              className="w-full max-w-md rounded-2xl border border-border bg-card object-contain"
            />
            {checkinTakenAt ? <div className="text-xs text-muted">เวลาถ่าย: {new Date(checkinTakenAt).toLocaleString("th-TH")}</div> : null}
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {uploadErr ? <div className="text-sm text-accent">{uploadErr}</div> : null}
            <button
              type="button"
              onClick={() => setCamOpen(true)}
              className="rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-40"
              disabled={uploading}
            >
              {uploading ? "กำลังเตรียม…" : "เปิดกล้องถ่ายรูป"}
            </button>
          </div>
        )}

        {camOpen ? (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 space-y-3">
            {camErr ? <div className="text-sm text-accent">{camErr}</div> : null}
            <video ref={videoRef} playsInline muted className="w-full max-w-md rounded-2xl border border-border bg-black" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={captureAndUpload}
                disabled={uploading || !!camErr}
                className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
              >
                {uploading ? "กำลังอัปโหลด…" : "ถ่ายและอัปโหลด"}
              </button>
              <button
                type="button"
                onClick={() => setCamOpen(false)}
                className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function Heart4SurveySteps(props: Heart4SurveyStepsProps) {
  const { step } = props;
  if (step === 1) return <Step1 {...props} />;
  if (step === 2) return <Step2 {...props} />;
  if (step === 3) return <Step3 {...props} />;
  if (step === 4) return <Step4 {...props} />;
  if (step === 5) return <Step5 {...props} />;
  if (step === 6) return <Step6 {...props} />;
  if (step === 7) return <Step7 {...props} />;
  if (step === 8) return <Step8 {...props} />;
  if (step === 9) return <Step9 {...props} />;
  return null;
}
