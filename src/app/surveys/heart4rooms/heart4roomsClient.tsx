"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Heart4SurveySteps } from "@/app/surveys/heart4rooms/heart4SurveySteps";

export type H4Answers = Record<string, unknown>;

type FarmerOption = { value: string };

type MeResponse =
  | {
      ok: true;
      role: "user" | "admin";
      userId: string;
      username: string;
      promoter_id: string | null;
      promoter_full_name: string | null;
    }
  | { ok: false; error: string };

const TAB_TITLES = [
  "Part 1 แบบประเมินหัวใจ 4 ห้อง — ข้อมูลทั่วไป",
  "Part 1 แบบประเมินหัวใจ 4 ห้อง — หัวใจห้องที่ 1",
  "Part 1 แบบประเมินหัวใจ 4 ห้อง — หัวใจห้องที่ 2",
  "Part 1 แบบประเมินหัวใจ 4 ห้อง — หัวใจห้องที่ 3",
  "Part 1 แบบประเมินหัวใจ 4 ห้อง — หัวใจห้องที่ 4",
  'Part 1 แบบประเมินหัวใจ 4 ห้อง — หัวใจพลัส "ปุ๋ย" เพิ่มผลผลิต',
  "Part 1 แบบประเมินหัวใจ 4 ห้อง — หัวใจ พลัส “ปุ๋ยอินทรีย์”",
  "Part 2 แบบสำรวจศัตรูหัวใจ",
  "Part 3 ประเมินความพึงพอใจ และ นักส่งเสริม",
] as const;

export function Heart4RoomsClient() {
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err" | "warn"; title?: string; text: string } | null>(
    null,
  );
  const [messageOpen, setMessageOpen] = useState(false);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [meLoading, setMeLoading] = useState(true);

  const [submitterDisplayName, setSubmitterDisplayName] = useState("");

  const [farmerMode, setFarmerMode] = useState<"search" | "manual">("search");

  const [farmerFirst, setFarmerFirst] = useState("");
  const [farmerLast, setFarmerLast] = useState("");
  const [contractNo, setContractNo] = useState("");

  const [firstQuery, setFirstQuery] = useState("");
  const [firstOpen, setFirstOpen] = useState(false);
  const [firstLoading, setFirstLoading] = useState(false);
  const [firstOptions, setFirstOptions] = useState<FarmerOption[]>([]);

  const [lastQuery, setLastQuery] = useState("");
  const [lastOpen, setLastOpen] = useState(false);
  const [lastLoading, setLastLoading] = useState(false);
  const [lastOptions, setLastOptions] = useState<FarmerOption[]>([]);

  const [contractQuery, setContractQuery] = useState("");
  const [contractOpen, setContractOpen] = useState(false);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractOptions, setContractOptions] = useState<FarmerOption[]>([]);

  const [answers, setAnswers] = useState<H4Answers>({});

  const firstTimerRef = useRef<number | null>(null);
  const lastTimerRef = useRef<number | null>(null);
  const contractTimerRef = useRef<number | null>(null);
  const firstAbortRef = useRef<AbortController | null>(null);
  const lastAbortRef = useRef<AbortController | null>(null);
  const contractAbortRef = useRef<AbortController | null>(null);

  const firstWrapRef = useRef<HTMLDivElement | null>(null);
  const lastWrapRef = useRef<HTMLDivElement | null>(null);
  const contractWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!message) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessageOpen(true);
  }, [message]);

  useEffect(() => {
    if (!messageOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (message?.type === "ok") router.push("/home");
        else setMessageOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [messageOpen, message?.type, router]);

  useEffect(() => {
    // Scroll to top on tab change
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [tab]);

  useEffect(() => {
    if (!firstOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFirstOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [firstOpen]);

  useEffect(() => {
    if (!lastOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setLastOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lastOpen]);

  useEffect(() => {
    if (!contractOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setContractOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [contractOpen]);

  useEffect(() => {
    if (!firstOpen && !lastOpen && !contractOpen) return;

    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node | null;
      if (!t) return;

      const inFirst = !!firstWrapRef.current?.contains(t);
      const inLast = !!lastWrapRef.current?.contains(t);
      const inContract = !!contractWrapRef.current?.contains(t);
      if (inFirst || inLast || inContract) return;

      setFirstOpen(false);
      setLastOpen(false);
      setContractOpen(false);
    }

    window.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () => window.removeEventListener("pointerdown", onPointerDown, { capture: true } as AddEventListenerOptions);
  }, [contractOpen, firstOpen, lastOpen]);

  useEffect(() => {
    return () => {
      if (firstTimerRef.current) window.clearTimeout(firstTimerRef.current);
      if (lastTimerRef.current) window.clearTimeout(lastTimerRef.current);
      if (contractTimerRef.current) window.clearTimeout(contractTimerRef.current);
      firstAbortRef.current?.abort();
      lastAbortRef.current?.abort();
      contractAbortRef.current?.abort();
    };
  }, []);

  const scheduleFirstSearch = useCallback((qRaw: string) => {
    const q = qRaw.trim();
    if (firstTimerRef.current) window.clearTimeout(firstTimerRef.current);
    firstAbortRef.current?.abort();
    if (!q) return;

    setFirstLoading(true);
    firstTimerRef.current = window.setTimeout(async () => {
      const ac = new AbortController();
      firstAbortRef.current = ac;
      try {
        const res = await fetch(`/api/farmers?step=first&q=${encodeURIComponent(q)}&limit=20`, {
          method: "GET",
          signal: ac.signal,
        });
        const json = (await res.json().catch(() => null)) as
          | { ok: true; rows: FarmerOption[] }
          | { ok: false; error: string; detail?: string }
          | null;
        if (!res.ok || !json || json.ok !== true) {
          setFirstOptions([]);
          return;
        }
        setFirstOptions(Array.isArray(json.rows) ? json.rows : []);
      } catch (err) {
        if (err && typeof err === "object" && "name" in err && (err as { name?: unknown }).name === "AbortError") {
          return; // expected: user typed again / mode switched
        }
        setFirstOptions([]);
      } finally {
        setFirstLoading(false);
      }
    }, 180);
  }, []);

  const scheduleLastSearch = useCallback((qRaw: string, first: string) => {
    const q = qRaw.trim();
    if (lastTimerRef.current) window.clearTimeout(lastTimerRef.current);
    lastAbortRef.current?.abort();
    if (!first.trim()) return;

    setLastLoading(true);
    lastTimerRef.current = window.setTimeout(async () => {
      const ac = new AbortController();
      lastAbortRef.current = ac;
      try {
        const res = await fetch(
          `/api/farmers?step=last&first=${encodeURIComponent(first)}&q=${encodeURIComponent(q)}&limit=20`,
          { method: "GET", signal: ac.signal },
        );
        const json = (await res.json().catch(() => null)) as
          | { ok: true; rows: FarmerOption[] }
          | { ok: false; error: string; detail?: string }
          | null;
        if (!res.ok || !json || json.ok !== true) {
          setLastOptions([]);
          return;
        }
        setLastOptions(Array.isArray(json.rows) ? json.rows : []);
      } catch (err) {
        if (err && typeof err === "object" && "name" in err && (err as { name?: unknown }).name === "AbortError") {
          return;
        }
        setLastOptions([]);
      } finally {
        setLastLoading(false);
      }
    }, 180);
  }, []);

  const scheduleContractSearch = useCallback((qRaw: string, first: string, last: string) => {
    const q = qRaw.trim();
    if (contractTimerRef.current) window.clearTimeout(contractTimerRef.current);
    contractAbortRef.current?.abort();
    if (!first.trim() || !last.trim()) return;

    setContractLoading(true);
    contractTimerRef.current = window.setTimeout(async () => {
      const ac = new AbortController();
      contractAbortRef.current = ac;
      try {
        const res = await fetch(
          `/api/farmers?step=contract&first=${encodeURIComponent(first)}&last=${encodeURIComponent(last)}&q=${encodeURIComponent(q)}&limit=20`,
          { method: "GET", signal: ac.signal },
        );
        const json = (await res.json().catch(() => null)) as
          | { ok: true; rows: FarmerOption[] }
          | { ok: false; error: string; detail?: string }
          | null;
        if (!res.ok || !json || json.ok !== true) {
          setContractOptions([]);
          return;
        }
        setContractOptions(Array.isArray(json.rows) ? json.rows : []);
      } catch (err) {
        if (err && typeof err === "object" && "name" in err && (err as { name?: unknown }).name === "AbortError") {
          return;
        }
        setContractOptions([]);
      } finally {
        setContractLoading(false);
      }
    }, 180);
  }, []);

  const setField = useCallback((key: string, value: unknown) => {
    setAnswers((a) => ({ ...a, [key]: value }));
  }, []);

  const mergeField = useCallback((key: string, partial: Record<string, unknown>) => {
    setAnswers((a) => {
      const cur = (a[key] && typeof a[key] === "object" && !Array.isArray(a[key]) ? a[key] : {}) as Record<
        string,
        unknown
      >;
      return { ...a, [key]: { ...cur, ...partial } };
    });
  }, []);

  const toggleMulti = useCallback((key: string, code: string) => {
    setAnswers((a) => {
      const cur = Array.isArray(a[key]) ? ([...(a[key] as string[])] as string[]) : [];
      const i = cur.indexOf(code);
      if (i >= 0) cur.splice(i, 1);
      else cur.push(code);
      return { ...a, [key]: cur };
    });
  }, []);

  const switchToFarmerManual = useCallback(() => {
    setFarmerMode("manual");
    setFirstOpen(false);
    setLastOpen(false);
    setContractOpen(false);
    setFarmerFirst("");
    setFarmerLast("");
    setContractNo("");
    setFirstQuery("");
    setLastQuery("");
    setContractQuery("");
    setFirstOptions([]);
    setLastOptions([]);
    setContractOptions([]);
    setFirstLoading(false);
    setLastLoading(false);
    setContractLoading(false);
    firstAbortRef.current?.abort();
    lastAbortRef.current?.abort();
    contractAbortRef.current?.abort();
    if (firstTimerRef.current) window.clearTimeout(firstTimerRef.current);
    if (lastTimerRef.current) window.clearTimeout(lastTimerRef.current);
    if (contractTimerRef.current) window.clearTimeout(contractTimerRef.current);
  }, []);

  const switchToFarmerSearch = useCallback(() => {
    setFarmerMode("search");
    setFarmerFirst("");
    setFarmerLast("");
    setContractNo("");
    setFirstQuery("");
    setLastQuery("");
    setContractQuery("");
    setFirstOptions([]);
    setLastOptions([]);
    setContractOptions([]);
    setFirstLoading(false);
    setLastLoading(false);
    setContractLoading(false);
    firstAbortRef.current?.abort();
    lastAbortRef.current?.abort();
    contractAbortRef.current?.abort();
    if (firstTimerRef.current) window.clearTimeout(firstTimerRef.current);
    if (lastTimerRef.current) window.clearTimeout(lastTimerRef.current);
    if (contractTimerRef.current) window.clearTimeout(contractTimerRef.current);
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      setMeLoading(true);
      try {
        const res = await fetch("/api/me", { method: "GET" });
        const json = (await res.json().catch(() => null)) as MeResponse | null;
        if (!alive) return;
        if (!res.ok || !json || json.ok !== true) {
          setMe({ ok: false, error: "ME_FAILED" });
          return;
        }
        setMe(json);
        if (json.promoter_full_name) setSubmitterDisplayName(json.promoter_full_name);
      } finally {
        if (alive) setMeLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const getMissingForStep = useCallback(
    (stepNo: number): string[] => {
      const missing: string[] = [];
      const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
      const nonEmpty = (v: unknown) => s(v).length > 0;
      const obj = (k: string) => {
        const v = answers[k];
        return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
      };
      const arr = (k: string) => (Array.isArray(answers[k]) ? (answers[k] as string[]) : []);

      if (stepNo === 0) {
        if (!nonEmpty(submitterDisplayName)) missing.push("ผู้กรอกข้อมูล: ชื่อ - นามสกุล ผู้กรอกข้อมูล");
        if (!nonEmpty(farmerFirst)) missing.push("ชาวไร่: ชื่อ");
        if (!nonEmpty(farmerLast)) missing.push("ชาวไร่: นามสกุล");
        if (!nonEmpty(contractNo)) missing.push("ชาวไร่: เลขที่สัญญา");
        return missing;
      }

      if (stepNo === 1) {
        const q1 = obj("q1");
        if (!nonEmpty(q1.choice)) missing.push("ข้อ 1: เลือกคำตอบ");
        return missing;
      }

      // Step 2 => Q2
      if (stepNo === 2) {
      const q2 = obj("q2");
      const choice = s(q2.choice);
        if (!choice) missing.push("ข้อ 2: เลือกคำตอบ");
        if (choice === "b") {
          if (!nonEmpty(q2.cause)) missing.push("ข้อ 2 (b): สาเหตุเพราะ…");
          if (!nonEmpty(q2.fix)) missing.push("ข้อ 2 (b): ถ้าย้อนเวลาได้จะแก้ไขอย่างไร…");
        }
        return missing;
      }

      // Step 3 => Q3-Q4
      if (stepNo === 3) {
      const q3 = obj("q3");
      const c3 = s(q3.choice);
        if (!c3) missing.push("ข้อ 3: เลือกคำตอบ");
      if (c3 === "a") {
        const m = arr("q3_methods");
          if (m.length === 0) missing.push("ข้อ 3 (a): เลือกวิธีการจัดการวัชพืชอย่างน้อย 1 ข้อ");
          if (m.includes("v") && !nonEmpty(q3.otherMethod)) missing.push("ข้อ 3 (a.v): ระบุวิธีอื่น");
      }
      if (c3 === "b") {
          if (!nonEmpty(q3.cause)) missing.push("ข้อ 3 (b): สาเหตุเพราะ…");
          if (!nonEmpty(q3.fix)) missing.push("ข้อ 3 (b): ถ้าย้อนเวลาได้จะแก้ไขอย่างไร…");
      }

      const q4 = obj("q4");
      const c4 = s(q4.choice);
        if (!c4) missing.push("ข้อ 4: เลือกคำตอบ");
        if (c4 === "c" && !nonEmpty(q4.otherFarmer)) missing.push("ข้อ 4 (c): ระบุชื่อชาวไร่/ตำแหน่งแปลง");
        return missing;
      }

      // Step 4 => Q5-Q9
      if (stepNo === 4) {
      const q5 = obj("q5");
      const c5 = s(q5.choice);
        if (!c5) missing.push("ข้อ 5: เลือกคำตอบ");
        if (c5 === "a" && !nonEmpty(q5.detail)) missing.push("ข้อ 5 (a): โปรดระบุ");

      const q6 = obj("q6");
      const c6 = s(q6.choice);
        if (!c6) missing.push("ข้อ 6: เลือกคำตอบ");
      if (c6 === "a") {
        const m = arr("q6_methods");
          if (m.length === 0) missing.push("ข้อ 6 (a): เลือกวิธีการจัดการอย่างน้อย 1 ข้อ");
          if (m.includes("iv") && !nonEmpty(q6.otherDrug)) missing.push("ข้อ 6 (a.iv): ระบุตัวยา");
          if (m.includes("v") && !nonEmpty(q6.otherMethod)) missing.push("ข้อ 6 (a.v): ระบุวิธีอื่น");
      }
      if (c6 === "b") {
          if (!nonEmpty(q6.cause)) missing.push("ข้อ 6 (b): สาเหตุเพราะ…");
          if (!nonEmpty(q6.fix)) missing.push("ข้อ 6 (b): ถ้าย้อนเวลาได้จะแก้ไขอย่างไร…");
      }

      const q7 = obj("q7");
      const c7 = s(q7.choice);
        if (!c7) missing.push("ข้อ 7: เลือกคำตอบ");
        if (c7 === "a" && !nonEmpty(q7.detail)) missing.push("ข้อ 7 (a): โปรดระบุ");

      const q8 = obj("q8");
      const c8 = s(q8.choice);
        if (!c8) missing.push("ข้อ 8: เลือกคำตอบ");
      if (c8 === "a") {
        const m = arr("q8_methods");
          if (m.length === 0) missing.push("ข้อ 8 (a): เลือกวิธีการจัดการอย่างน้อย 1 ข้อ");
          if (m.includes("iv") && !nonEmpty(q8.otherMethod)) missing.push("ข้อ 8 (a.iv): ระบุวิธีอื่น");
      }
      if (c8 === "b") {
          if (!nonEmpty(q8.cause)) missing.push("ข้อ 8 (b): สาเหตุเพราะ…");
          if (!nonEmpty(q8.fix)) missing.push("ข้อ 8 (b): ถ้าย้อนเวลาได้จะแก้ไขอย่างไร…");
      }

      const q9 = obj("q9");
      const c9 = s(q9.choice);
        if (!c9) missing.push("ข้อ 9: เลือกคำตอบ");
        if (c9 === "a" && !nonEmpty(q9.detail)) missing.push("ข้อ 9 (a): โปรดระบุ");

        return missing;
      }

      // Step 5 => Q10-Q15
      if (stepNo === 5) {
        const q10 = obj("q10");
        const c10 = s(q10.choice);
        if (!c10) missing.push("ข้อ 10: เลือกคำตอบ");
        if (c10 === "a") {
          const m = arr("q10_multi");
          if (m.length === 0) missing.push("ข้อ 10 (a): เลือกวิธีอย่างน้อย 1 ข้อ");
          if (m.includes("iv") && !nonEmpty(q10.other)) missing.push("ข้อ 10 (a.iv): ระบุวิธีอื่น");
        }
        if (c10 === "b") {
          if (!nonEmpty(q10.cause)) missing.push("ข้อ 10 (b): สาเหตุเพราะ…");
          if (!nonEmpty(q10.fix)) missing.push("ข้อ 10 (b): ถ้าย้อนเวลาได้จะแก้ไขอย่างไร…");
        }

        const q11 = obj("q11");
        const c11 = s(q11.choice);
        if (!c11) missing.push("ข้อ 11: เลือกคำตอบ");
        if (c11 === "a" && !nonEmpty(q11.cause)) missing.push("ข้อ 11 (a): สาเหตุเพราะ…");

        const q12 = obj("q12");
        const c12 = s(q12.choice);
        if (!c12) missing.push("ข้อ 12: เลือกคำตอบ");
        if (c12 === "a") {
          const m = arr("q12_a");
          if (m.length === 0) missing.push("ข้อ 12 (a): เลือกอย่างน้อย 1 ข้อ");
        }
        if (c12 === "b") {
          const m = arr("q12_b");
          if (m.length === 0) missing.push("ข้อ 12 (b): เลือกอย่างน้อย 1 ข้อ");
          if (!nonEmpty(q12.heat)) missing.push("ข้อ 12 (b): ระบุการจัดการความร้อนของน้ำ");
        }

        const q13 = obj("q13");
        const c13 = s(q13.choice);
        if (!c13) missing.push("ข้อ 13: เลือกคำตอบ");
        if (c13 === "a") {
          const m = arr("q13_multi");
          if (m.length === 0) missing.push("ข้อ 13 (a): เลือกรูปแบบอย่างน้อย 1 ข้อ");
          if (m.includes("iii") && !nonEmpty(q13.other)) missing.push("ข้อ 13 (a.iii): ระบุวิธีอื่น");
        }
        if (c13 === "b") {
          if (!nonEmpty(q13.cause)) missing.push("ข้อ 13 (b): สาเหตุเพราะ…");
        }

        const q14 = obj("q14");
        const q14a = s(q14.a);
        const q14b = s(q14.b);
        const q14c = s(q14.c);
        if (!q14a) missing.push("ข้อ 14 (a): เลือกคำตอบ");
        if (!q14b) missing.push("ข้อ 14 (b): เลือกคำตอบ");
        if (!q14c) missing.push("ข้อ 14 (c): เลือกคำตอบ");
        if (q14c === "ii" && !nonEmpty(q14.detail)) missing.push("ข้อ 14 (c.ii): ระบุรายละเอียดเพิ่มเติม");

        const q15 = obj("q15");
        const c15 = s(q15.choice);
        if (!c15) missing.push("ข้อ 15: เลือกคำตอบ");
        if (c15 === "a" && !nonEmpty(q15.detail)) missing.push("ข้อ 15 (a): โปรดระบุ");

        return missing;
      }

      // Step 6 => Q16-Q23
      if (stepNo === 6) {
        const q16 = obj("q16");
        const q16m = arr("q16_multi");
        if (q16m.length === 0) missing.push("ข้อ 16: เลือกอย่างน้อย 1 ข้อ");
        if (q16m.includes("e") && !nonEmpty(q16.other)) missing.push("ข้อ 16 (e): โปรดระบุ");

        const q17 = obj("q17");
        const c17 = s(q17.choice);
        if (!c17) missing.push("ข้อ 17: เลือกคำตอบ");
        if (c17 === "b" && !nonEmpty(q17.cause)) missing.push("ข้อ 17 (b): ระบุสาเหตุ");

        const q18 = obj("q18");
        const c18 = s(q18.choice);
        if (!c18) missing.push("ข้อ 18: เลือกคำตอบ");
        if (c18 && !nonEmpty(q18.detail)) missing.push(`ข้อ 18 (${c18}): สาเหตุ / รายละเอียด`);

        const q19 = obj("q19");
        const c19 = s(q19.choice);
        if (!c19) missing.push("ข้อ 19: เลือกคำตอบ");
        if (c19 && !nonEmpty(q19.detail)) missing.push(`ข้อ 19 (${c19}): สาเหตุ / รายละเอียด`);

        const q20 = obj("q20");
        if (!nonEmpty(q20.base_formula)) missing.push("ข้อ 20: รองพื้น สูตร");
        if (!nonEmpty(q20.base_rate)) missing.push("ข้อ 20: รองพื้น อัตรา");
        if (!nonEmpty(q20.nourish_formula)) missing.push("ข้อ 20: บำรุง สูตร");
        if (!nonEmpty(q20.nourish_rate)) missing.push("ข้อ 20: บำรุง อัตรา");
        if (!nonEmpty(q20.top_formula)) missing.push("ข้อ 20: แต่งหน้ารอบสุดท้าย สูตร");
        if (!nonEmpty(q20.top_rate)) missing.push("ข้อ 20: แต่งหน้ารอบสุดท้าย อัตรา");

        const q21 = obj("q21");
        const c21 = s(q21.choice);
        if (!c21) missing.push("ข้อ 21: เลือกคำตอบ");
        if (c21 === "b" && !nonEmpty(q21.detail)) missing.push("ข้อ 21 (b): เพราะ…");

        const q22 = obj("q22");
        if (!nonEmpty(q22.cut_formula)) missing.push("ข้อ 22: บำรุงหลังตัดทันที สูตร");
        if (!nonEmpty(q22.cut_rate)) missing.push("ข้อ 22: บำรุงหลังตัดทันที อัตรา");
        if (!nonEmpty(q22.nourish_formula)) missing.push("ข้อ 22: บำรุง สูตร");
        if (!nonEmpty(q22.nourish_rate)) missing.push("ข้อ 22: บำรุง อัตรา");
        if (!nonEmpty(q22.top_formula)) missing.push("ข้อ 22: แต่งหน้า สูตร");
        if (!nonEmpty(q22.top_rate)) missing.push("ข้อ 22: แต่งหน้า อัตรา");

        const q23 = obj("q23");
        if (!nonEmpty(q23.qty_21718)) missing.push("ข้อ 23 (a): จำนวน (กระสอบ)");
        if (!nonEmpty(q23.qty_1688)) missing.push("ข้อ 23 (b): จำนวน (กระสอบ)");
        if (!nonEmpty(q23.other_formula)) missing.push("ข้อ 23 (c): ระบุสูตร");
        if (!nonEmpty(q23.other_qty)) missing.push("ข้อ 23 (c): จำนวน (กระสอบ)");

        return missing;
      }

      // Step 7 => Q24-Q25
      if (stepNo === 7) {
        const q24 = obj("q24");
        const u = arr("q24_uses");
        const h = arr("q24_how");
        const r = arr("q24_rate");
        if (u.length === 0) missing.push("ข้อ 24 (a): เลือกอย่างน้อย 1 ข้อ");
        if (h.length === 0) missing.push("ข้อ 24 (b): เลือกอย่างน้อย 1 ข้อ");
        if (r.length === 0) missing.push("ข้อ 24 (c): เลือกอย่างน้อย 1 ข้อ");
        if (u.includes("iv") && !nonEmpty(q24.otherSoil)) missing.push("ข้อ 24 (a.iv): โปรดระบุ");

        const q25 = obj("q25");
        const o = arr("q25_opts");
        if (o.length === 0) missing.push("ข้อ 25: เลือกอย่างน้อย 1 ข้อ");
        if (o.includes("v") && !nonEmpty(q25.otherText)) missing.push("ข้อ 25 (v): อื่นๆ : โปรดระบุ");
        return missing;
      }

      // Step 8 => Q26-Q28
      if (stepNo === 8) {
        const q26 = obj("q26");
        const c26 = s(q26.choice);
        if (!c26) missing.push("ข้อ 26: เลือกคำตอบ");
        if (c26 === "c" && !nonEmpty(q26.worry)) missing.push("ข้อ 26 (c): กังวล เพราะ…");

        const q27 = obj("q27");
        const q27m = arr("q27_multi");
        if (q27m.length === 0) missing.push("ข้อ 27: เลือกอย่างน้อย 1 ข้อ");
        if (q27m.includes("a") && !nonEmpty(q27.fertilizer)) missing.push("ข้อ 27 (a): โปรดระบุ");
        if (q27m.includes("b") && !nonEmpty(q27.cost)) missing.push("ข้อ 27 (b): โปรดระบุ");
        if (q27m.includes("c") && !nonEmpty(q27.oil)) missing.push("ข้อ 27 (c): โปรดระบุ");

        const q28 = obj("q28");
        const c28 = s(q28.choice);
        if (!c28) missing.push("ข้อ 28: เลือกคำตอบ");
        if (c28 === "d" && !nonEmpty(q28.other)) missing.push("ข้อ 28 (d): โปรดระบุ");

        return missing;
      }

      // Step 9 => Q29-Q38
      if (stepNo === 9) {
        for (const n of [29, 30, 31, 32, 33]) {
          const v = obj(`q${n}`);
          if (!nonEmpty(v.score)) missing.push(`ข้อ ${n}: คะแนนความพึงพอใจ`);
          if (!nonEmpty(v.good)) missing.push(`ข้อ ${n}: เรื่องที่ทำได้ดี`);
          if (!nonEmpty(v.improve)) missing.push(`ข้อ ${n}: เรื่องที่ควรพัฒนา`);
        }

        const q34 = obj("q34");
        if (!nonEmpty(q34.tonsPast)) missing.push("ข้อ 34 (a): ตันต่อไร่ ปีที่ผ่านมา");
        if (!nonEmpty(q34.tonsTarget)) missing.push("ข้อ 34 (b): เป้าหมายตันต่อไร่ในปีหน้า");

        const q35 = obj("q35");
        const q35m = arr("q35_multi");
        if (q35m.length === 0) missing.push("ข้อ 35: เลือกอย่างน้อย 1 ข้อ");
        if (q35m.includes("factor") && !nonEmpty(q35.factor)) missing.push("ข้อ 35 (a): โปรดระบุ");
        if (q35m.includes("budget") && !nonEmpty(q35.budget)) missing.push("ข้อ 35 (b): โปรดระบุ");
        if (q35m.includes("water") && !nonEmpty(q35.water)) missing.push("ข้อ 35 (c): โปรดระบุ");
        if (q35m.includes("other") && !nonEmpty(q35.other)) missing.push("ข้อ 35 (d): โปรดระบุ");

        const q36 = obj("q36");
        const c36 = s(q36.choice);
        if (!c36) missing.push("ข้อ 36: เลือกคำตอบ");
        if (c36 === "a" && !nonEmpty(q36.travel_place)) missing.push("ข้อ 36 (a): สถานที่");
        if (c36 === "b" && !nonEmpty(q36.fert_formula)) missing.push("ข้อ 36 (b): สูตรที่ต้องการ");
        if (c36 === "c" && !nonEmpty(q36.chemical)) missing.push("ข้อ 36 (c): ยาที่ต้องการ");
        if (c36 === "d" && !nonEmpty(q36.organic_qty)) missing.push("ข้อ 36 (d): จำนวนที่ต้องการ");
        if (c36 === "e" && !nonEmpty(q36.water_type)) missing.push("ข้อ 36 (e): ประเภทแหล่งน้ำ");
        if (c36 === "f" && !nonEmpty(q36.variety)) missing.push("ข้อ 36 (f): พันธุ์ที่ต้องการ");
        if (c36 === "g" && !nonEmpty(q36.other)) missing.push("ข้อ 36 (g): โปรดระบุ");

        const q37 = obj("q37");
        const c37 = s(q37.choice);
        if (!c37) missing.push("ข้อ 37: เลือกคำตอบ");
        if ((c37 === "a" || c37 === "b") && !nonEmpty(q37.detail)) missing.push(`ข้อ 37 (${c37}): ระบุจำนวนไร่`);

        const q38 = obj("q38");
        const c38 = s(q38.choice);
        if (!c38) missing.push("ข้อ 38: เลือกคำตอบ");
        if (c38 === "a" && !nonEmpty(q38.detail)) missing.push("ข้อ 38 (a): โปรดระบุ");

        return missing;
      }

      return missing;
    },
    [answers, contractNo, farmerFirst, farmerLast, submitterDisplayName],
  );

  async function onSubmit() {
    setMessage(null);
    setPending(true);
    try {
      const promoterId =
        me && me.ok === true ? (me.promoter_id && me.promoter_id.trim() ? me.promoter_id.trim() : null) : null;
      const res = await fetch("/api/surveys/heart4rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          submitter_display_name: submitterDisplayName.trim(),
          submitter_manual: false,
          promoter_id: promoterId,
          farmer_first_name: farmerFirst.trim(),
          farmer_last_name: farmerLast.trim(),
          contract_no: contractNo.trim(),
          answers,
          attachments: {},
        }),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; id?: string; error?: string } | null;
      if (!res.ok || !json || json.ok !== true) {
        setMessage({
          type: "err",
          text: json?.error ? `บันทึกไม่สำเร็จ: ${json.error}` : "บันทึกไม่สำเร็จ",
        });
        return;
      }
      const farmerLabel = `${farmerFirst.trim()} ${farmerLast.trim()}`.trim();
      setMessage({
        type: "ok",
        title: "บันทึกข้อมูลสำเร็จ",
        text: `แบบสอบถามของ : ${farmerLabel}`,
      });
    } finally {
      setPending(false);
    }
  }

  const closeMessage = useCallback(() => {
    if (message?.type === "ok") {
      router.push("/home");
      return;
    }
    setMessageOpen(false);
  }, [message?.type, router]);

  const showMissingPopup = useCallback((title: string, lines: string[]) => {
    setMessage({
      type: "warn",
      title,
      text: `ยังไม่ระบุข้อมูลดังนี้ :\n${lines.map((x) => `- ${x}`).join("\n")}`,
    });
  }, []);

  const getMissingForTab = useCallback(
    (tabNo: number): string[] => {
      if (tabNo === 0) return [...getMissingForStep(0), ...getMissingForStep(1)];
      const stepNo = tabNo + 1; // tab1->step2 ... tab8->step9
      return getMissingForStep(stepNo);
    },
    [getMissingForStep],
  );

  const completedTabs = useMemo(() => {
    let n = 0;
    for (let i = 0; i < TAB_TITLES.length; i += 1) {
      if (getMissingForTab(i).length === 0) n += 1;
    }
    return n;
  }, [getMissingForTab]);

  const onNext = useCallback(() => {
    const miss = getMissingForTab(tab);
    if (miss.length > 0) {
      showMissingPopup("ไม่สามารถไปหน้าถัดไปได้", miss);
      return;
    }
    setTab((t) => Math.min(TAB_TITLES.length - 1, t + 1));
  }, [getMissingForTab, showMissingPopup, tab]);

  const onSubmitClick = useCallback(() => {
    if (pending) return;

    const parts: string[] = [];
    for (let sNo = 0; sNo <= 9; sNo += 1) {
      const miss = getMissingForStep(sNo);
      if (miss.length > 0) {
        parts.push(`หน้าที่ ${sNo + 1}\n${miss.map((x) => `- ${x}`).join("\n")}`);
      }
    }
    if (parts.length > 0) {
      setMessage({
        type: "warn",
        title: "ไม่สามารถส่งแบบประเมินได้",
        text: `กรุณากรอกข้อมูลให้ครบก่อนส่งแบบประเมิน:\n\n${parts.join("\n\n")}`,
      });
      return;
    }

    void onSubmit();
  }, [getMissingForStep, onSubmit, pending]);

  return (
    <div className="space-y-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <div className="text-sm text-muted">
          หน้าที่ {tab + 1}/{TAB_TITLES.length}: <span className="font-semibold text-foreground">{TAB_TITLES[tab]}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-foreground/10">
          <div
            className="h-2 rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${Math.round((completedTabs / TAB_TITLES.length) * 100)}%` }}
          />
        </div>
        <div className="text-xs text-muted">
          ความคืบหน้า: {completedTabs}/{TAB_TITLES.length}
        </div>
      </div>

      {tab === 0 ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-background p-4">
            <h2 className="text-sm font-semibold text-foreground">ผู้กรอกข้อมูล</h2>
            {meLoading ? (
              <p className="mt-2 text-sm text-muted">กำลังโหลด…</p>
            ) : me && me.ok === false ? (
              <p className="mt-2 text-sm text-accent">โหลดข้อมูลไม่สำเร็จ (ยังกรอกชื่อผู้กรอกได้)</p>
            ) : null}
            <label className="mt-4 block text-xs font-medium text-muted">ชื่อ - นามสกุล ผู้กรอกข้อมูล</label>
            <input
              value={submitterDisplayName}
              onChange={(e) => setSubmitterDisplayName(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
              placeholder="กรอก ชื่อ - นามสกุล ผู้กรอกข้อมูล"
            />
          </section>

          <section className="rounded-2xl border border-border bg-background p-4">
            <h2 className="text-sm font-semibold text-foreground">ชาวไร่</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {farmerMode === "search" ? (
                <button
                  type="button"
                  onClick={switchToFarmerManual}
                  className="rounded-2xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
                >
                  ไม่มีรายชื่อ / กรอกข้อมูลเอง
                </button>
              ) : (
                <button
                  type="button"
                  onClick={switchToFarmerSearch}
                  className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    aria-hidden="true"
                    className="shrink-0 opacity-80"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {/* U-turn left */}
                    <path d="M9 14l-4-4 4-4" />
                    <path d="M5 10h9a5 5 0 0 1 5 5v5" />
                  </svg>
                  กลับไปค้นหาในระบบ
                </button>
              )}
            </div>
            <div className="mt-4">
              {farmerMode === "manual" ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-medium text-muted">ชื่อ</label>
                    <input
                      value={farmerFirst}
                      onChange={(e) => setFarmerFirst(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                      placeholder="กรอกชื่อ"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted">นามสกุล</label>
                    <input
                      value={farmerLast}
                      onChange={(e) => setFarmerLast(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                      placeholder="กรอกนามสกุล"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted">เลขที่สัญญา</label>
                    <input
                      value={contractNo}
                      onChange={(e) => setContractNo(e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                      placeholder="กรอกเลขสัญญา"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="relative" ref={firstWrapRef}>
                    <label className="text-xs font-medium text-muted">ชื่อ (พิมพ์ค้นหา)</label>
                    <input
                      value={firstQuery}
                      onChange={(e) => {
                        const next = e.target.value;
                        setFirstQuery(next);
                        if (!next.trim()) {
                          setFirstOptions([]);
                          setFirstLoading(false);
                          firstAbortRef.current?.abort();
                          if (firstTimerRef.current) window.clearTimeout(firstTimerRef.current);
                        }
                        setFirstOpen(true);
                        setLastOpen(false);
                        setContractOpen(false);
                        scheduleFirstSearch(next);
                      }}
                      onFocus={() => {
                        setFirstOpen(true);
                        setLastOpen(false);
                        setContractOpen(false);
                      }}
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-3 pr-10 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                      placeholder="พิมพ์ชื่อ"
                    />
                    <div className="pointer-events-none absolute right-3 top-[34px] text-xs text-muted">
                      {firstLoading ? "…" : ""}
                    </div>
                    {firstOpen ? (
                      <div
                        className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-background shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
                        onPointerDown={(e) => e.preventDefault()}
                      >
                        {firstOptions.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted">
                            <div>{firstQuery.trim() ? "ไม่พบข้อมูล" : "พิมพ์เพื่อค้นหา"}</div>
                          </div>
                        ) : (
                          <div className="max-h-72 overflow-auto">
                            {firstOptions.map((o) => (
                              <button
                                key={o.value}
                                type="button"
                                className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-foreground/5 focus:bg-foreground/5 focus:outline-none"
                                onClick={() => {
                                  setFarmerFirst(o.value);
                                  setFarmerLast("");
                                  setContractNo("");
                                  setLastQuery("");
                                  setContractQuery("");
                                  setLastOptions([]);
                                  setContractOptions([]);
                                  setLastLoading(false);
                                  setContractLoading(false);
                                  setFirstQuery(o.value);
                                  setFirstOpen(false);
                                }}
                              >
                                {o.value}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="relative" ref={lastWrapRef}>
                    <label className="text-xs font-medium text-muted">นามสกุล (หลังเลือกชื่อ)</label>
                    <input
                      value={lastQuery}
                      disabled={!farmerFirst}
                      onChange={(e) => {
                        const next = e.target.value;
                        setLastQuery(next);
                        setLastOpen(true);
                        setFirstOpen(false);
                        setContractOpen(false);
                        scheduleLastSearch(next, farmerFirst);
                      }}
                      onFocus={() => {
                        if (farmerFirst) {
                          setLastOpen(true);
                          setFirstOpen(false);
                          setContractOpen(false);
                          scheduleLastSearch(lastQuery, farmerFirst);
                        }
                      }}
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-3 pr-10 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-50"
                      placeholder={farmerFirst ? "พิมพ์นามสกุล" : "เลือกชื่อก่อน"}
                    />
                    <div className="pointer-events-none absolute right-3 top-[34px] text-xs text-muted">
                      {lastLoading ? "…" : ""}
                    </div>
                    {lastOpen && farmerFirst ? (
                      <div
                        className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-background shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
                        onPointerDown={(e) => e.preventDefault()}
                      >
                        {lastOptions.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted">{lastLoading ? "กำลังโหลด…" : "ไม่พบข้อมูล"}</div>
                        ) : (
                          <div className="max-h-72 overflow-auto">
                            {lastOptions.map((o) => (
                              <button
                                key={o.value}
                                type="button"
                                className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-foreground/5 focus:bg-foreground/5 focus:outline-none"
                                onClick={() => {
                                  setFarmerLast(o.value);
                                  setContractNo("");
                                  setContractQuery("");
                                  setContractOptions([]);
                                  setContractLoading(false);
                                  setLastQuery(o.value);
                                  setLastOpen(false);
                                }}
                              >
                                {o.value}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="relative" ref={contractWrapRef}>
                    <label className="text-xs font-medium text-muted">เลขที่สัญญา (หลังเลือกนามสกุล)</label>
                    <input
                      value={contractQuery}
                      disabled={!farmerFirst || !farmerLast}
                      onChange={(e) => {
                        const next = e.target.value;
                        setContractQuery(next);
                        setContractOpen(true);
                        setFirstOpen(false);
                        setLastOpen(false);
                        scheduleContractSearch(next, farmerFirst, farmerLast);
                      }}
                      onFocus={() => {
                        if (farmerFirst && farmerLast) {
                          setContractOpen(true);
                          setFirstOpen(false);
                          setLastOpen(false);
                          scheduleContractSearch(contractQuery, farmerFirst, farmerLast);
                        }
                      }}
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-3 pr-10 text-sm text-foreground outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-50"
                      placeholder={farmerFirst && farmerLast ? "พิมพ์เลขสัญญา" : "เลือกนามสกุลก่อน"}
                    />
                    <div className="pointer-events-none absolute right-3 top-[34px] text-xs text-muted">
                      {contractLoading ? "…" : ""}
                    </div>
                    {contractOpen && farmerFirst && farmerLast ? (
                      <div
                        className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-background shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
                        onPointerDown={(e) => e.preventDefault()}
                      >
                        {contractOptions.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted">{contractLoading ? "กำลังโหลด…" : "ไม่พบข้อมูล"}</div>
                        ) : (
                          <div className="max-h-72 overflow-auto">
                            {contractOptions.map((o) => (
                              <button
                                key={o.value}
                                type="button"
                                className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-foreground/5 focus:bg-foreground/5 focus:outline-none"
                                onClick={() => {
                                  setContractNo(o.value);
                                  setContractQuery(o.value);
                                  setContractOpen(false);
                                }}
                              >
                                {o.value}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </section>

          <Heart4SurveySteps step={1} answers={answers} setField={setField} mergeField={mergeField} toggleMulti={toggleMulti} />
        </div>
      ) : (
        <Heart4SurveySteps
          step={tab + 1}
          answers={answers}
          setField={setField}
          mergeField={mergeField}
          toggleMulti={toggleMulti}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={tab === 0}
          onClick={() => setTab((t) => Math.max(0, t - 1))}
          className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-40"
        >
          ย้อนกลับ
        </button>
        {tab < TAB_TITLES.length - 1 ? (
          <button
            type="button"
            onClick={onNext}
            className="rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-40"
          >
            ถัดไป
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={onSubmitClick}
            className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-40"
          >
            {pending ? "กำลังบันทึก…" : "ส่งแบบสำรวจ"}
          </button>
        )}
      </div>

      {message && messageOpen
        ? typeof document !== "undefined"
          ? createPortal(
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
                role="dialog"
                aria-modal="true"
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) closeMessage();
                }}
              >
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />

                <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_70px_rgba(0,0,0,0.38)] max-h-[80vh]">
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-accent/15 blur-2xl" />
                  </div>

                  <div className="relative flex h-full flex-col p-6">
                    <div className="flex items-center gap-3 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/brand/logo.png?v=2"
                        alt="KTISX"
                        className="h-12 w-12 rounded-2xl border border-border bg-background object-cover p-1 shadow-sm"
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold tracking-wide text-muted">KTIS X VISIT FARM</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              message.type === "ok"
                                ? "bg-foreground text-background"
                                : "bg-accent text-white"
                            }`}
                          >
                            {message.type === "ok"
                              ? "บันทึกสำเร็จ"
                              : message.type === "warn"
                                ? "กรอกข้อมูลไม่ครบ"
                                : "บันทึกไม่สำเร็จ"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex min-h-0 flex-1 flex-col items-center text-center overflow-hidden">
                      <div
                        className={`text-2xl font-semibold tracking-tight ${
                          message.type === "ok" ? "text-foreground" : "text-accent"
                        }`}
                      >
                        {message.type === "ok" ? "สำเร็จ" : "ไม่สำเร็จ"}
                      </div>
                      {message.title ? (
                        <div className="mt-2 text-sm font-semibold text-foreground">{message.title}</div>
                      ) : null}
                      {(() => {
                        const lines = String(message.text ?? "").split("\n");
                        const head = lines[0] ?? "";
                        const rest = lines.slice(1).join("\n").trim();
                        return (
                          <div className="mt-3 w-full min-h-0 text-sm leading-6 text-foreground">
                            <div className="whitespace-pre-line">{head}</div>
                            {rest ? (
                              <div className="mt-2 max-h-48 overflow-auto rounded-2xl border border-border bg-background/70 p-3 text-left text-sm leading-6">
                                <div className="whitespace-pre-line">{rest}</div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </div>

                    <button
                      type="button"
                      onClick={closeMessage}
                      className="mt-4 inline-flex w-full shrink-0 items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 focus:outline-none focus:ring-4 focus:ring-accent/25"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null
        : null}
    </div>
  );
}
