"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

type ApiResponse =
  | { ok: true; id: string }
  | { ok: false; error: string; detail?: unknown; message?: unknown };

type Promoter = { id: string; full_name: string };
type PromotersResponse =
  | { ok: true; rows: Promoter[] }
  | { ok: false; error: string; detail?: unknown };

type UploadResponse =
  | { ok: true; bucket: string; files: { path: string; publicUrl: string }[] }
  | { ok: false; error: string; message?: string; detail?: unknown };

type CaneType = "new" | "ratoon";
type PlantingWindow = "before_31_jan" | "after_31_jan";
type Segmentation = "A" | "B" | "C" | "D";

type ReadinessChecklist = {
  water: boolean;
  weeds: boolean;
  smut: boolean;
  borer: boolean;
  fertilize: boolean;
};

type SupportRequests = { items: string[]; other: string };

type FormState = {
  promoter_id: string;
  farmer_first_name: string;
  farmer_last_name: string;
  contract_no: string;
  land_id: string;
  cane_type: CaneType | "";
  ratoon_no: string;
  area_rai: string;
  planting_window: PlantingWindow | "";
  target_yield_ton_per_rai: string;
  readiness_checklist: ReadinessChecklist;
  segmentation: Segmentation | "";
  obstacles: string[];
  support_requests: SupportRequests;
  reward_preferences: string[];
  promoter_notes: string;
  next_appointment: string;
};

const OBSTACLE_OPTIONS: { id: string; label: string }[] = [
  { id: "fertilizer_price", label: "ราคาปุ๋ย" },
  { id: "labor_cost", label: "ค่าแรง/ค่าพรวน" },
  { id: "irrigation_cost", label: "ต้นทุนการให้น้ำ" },
  { id: "chemical_cost", label: "ค่าสารเคมี" },
  { id: "next_year_cane_price", label: "ราคาอ้อยปีหน้า" },
];

const SUPPORT_OPTIONS: { id: string; label: string }[] = [
  { id: "increase_credit", label: "เพิ่มวงเงินบำรุงอ้อย" },
  { id: "water_source_support", label: "สนับสนุนการสร้างแหล่งน้ำ" },
  { id: "fuel_credit", label: "วงเงินน้ำมัน" },
];

const REWARD_OPTIONS: { id: string; label: string }[] = [
  { id: "trip", label: "ไปเที่ยว" },
  { id: "fertilizer_discount", label: "ส่วนลดปุ๋ย/ยา" },
  { id: "organic_fertilizer_bonus", label: "แถมปุ๋ยอินทรีย์" },
  { id: "new_seed_priority", label: "สิทธิจองพันธุ์ใหม่" },
  { id: "water_source_budget", label: "งบสร้างแหล่งน้ำ" },
];

export function FormClient() {
  const promoterBtnRef = useRef<HTMLButtonElement | null>(null);
  const suppressOpenUntilRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [messageOpen, setMessageOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [promotersLoading, setPromotersLoading] = useState(true);
  const [promotersError, setPromotersError] = useState<string | null>(null);
  const [promoterOpen, setPromoterOpen] = useState(false);
  const [promoterPanelMounted, setPromoterPanelMounted] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [state, setState] = useState<FormState>(() => ({
    promoter_id: "",
    farmer_first_name: "",
    farmer_last_name: "",
    contract_no: "",
    land_id: "",
    cane_type: "",
    ratoon_no: "",
    area_rai: "",
    planting_window: "",
    target_yield_ton_per_rai: "",
    readiness_checklist: {
      water: false,
      weeds: false,
      smut: false,
      borer: false,
      fertilize: false,
    },
    segmentation: "",
    obstacles: [],
    support_requests: { items: [], other: "" },
    reward_preferences: [],
    promoter_notes: "",
    next_appointment: "",
  }));

  const filteredPromoters = promoters;

  const selectedPromoterLabel = useMemo(() => {
    const p = promoters.find((x) => x.id === state.promoter_id);
    if (!p) return "";
    return `${p.id} - ${p.full_name}`;
  }, [promoters, state.promoter_id]);

  function closePromoterDropdown() {
    suppressOpenUntilRef.current = Date.now() + 250;
    setPromoterOpen(false);
    promoterBtnRef.current?.blur();
    // Defensive: ensure it stays closed even if focus bounces.
    requestAnimationFrame(() => setPromoterOpen(false));
  }

  useEffect(() => {
    if (promoterOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPromoterPanelMounted(true);
      return;
    }
    const t = window.setTimeout(() => setPromoterPanelMounted(false), 160);
    return () => window.clearTimeout(t);
  }, [promoterOpen]);

  useEffect(() => {
    if (!message) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessageOpen(true);
  }, [message]);

  useEffect(() => {
    if (!messageOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMessageOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [messageOpen]);

  useEffect(() => {
    const urls = selectedFiles.map((f) => URL.createObjectURL(f));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewUrls(urls);
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [selectedFiles]);

  useEffect(() => {
    let alive = true;
    async function load() {
      setPromotersLoading(true);
      setPromotersError(null);
      try {
        const res = await fetch("/api/promoters", { method: "GET" });
        const json = (await res.json().catch(() => null)) as PromotersResponse | null;
        if (!res.ok || !json || json.ok !== true) {
          if (!alive) return;
          setPromotersError("โหลดรายชื่อไม่สำเร็จ");
          return;
        }
        if (!alive) return;
        setPromoters(json.rows);
      } finally {
        if (alive) setPromotersLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!promoterOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closePromoterDropdown();
      }
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // close if click outside the dropdown container
      const container = target.closest("[data-promoter-combobox]");
      if (!container) {
        closePromoterDropdown();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [promoterOpen]);

  function toggleMulti(current: string[], id: string): string[] {
    return current.includes(id) ? current.filter((x) => x !== id) : current.concat(id);
  }

  function canGoNext(currentStep: 1 | 2 | 3 | 4 | 5): { ok: boolean; message?: string } {
    if (currentStep === 1) {
      if (!state.promoter_id) return { ok: false, message: "กรุณาเลือกชื่อนักส่งเสริม" };
      if (!state.farmer_first_name.trim()) return { ok: false, message: "กรุณากรอกชื่อ (ชาวไร่)" };
      if (!state.farmer_last_name.trim()) return { ok: false, message: "กรุณากรอกนามสกุล (ชาวไร่)" };
      if (!state.contract_no.trim()) return { ok: false, message: "กรุณากรอกเลขที่สัญญา" };
      if (!state.land_id.trim()) return { ok: false, message: "กรุณากรอกไอดีแปลง (Land ID)" };
      if (!state.cane_type) return { ok: false, message: "กรุณาเลือกประเภทอ้อย" };
      if (state.cane_type === "ratoon") {
        const n = Number(state.ratoon_no);
        if (!Number.isFinite(n) || n < 1) return { ok: false, message: "กรุณากรอกตอที่ (ตัวเลข)" };
      }
      if (!state.area_rai.trim() || !Number.isFinite(Number(state.area_rai))) {
        return { ok: false, message: "กรุณากรอกพื้นที่ปลูก (ไร่) เป็นตัวเลข" };
      }
      if (!state.planting_window) return { ok: false, message: "กรุณาเลือกช่วงเวลาปลูก/ตัด" };
      if (!state.target_yield_ton_per_rai.trim() || !Number.isFinite(Number(state.target_yield_ton_per_rai))) {
        return { ok: false, message: "กรุณากรอกเป้าหมายผลผลิต (ตัน/ไร่) เป็นตัวเลข" };
      }
      return { ok: true };
    }
    if (currentStep === 3) {
      if (!state.segmentation) return { ok: false, message: "กรุณาเลือกกลุ่ม (A - D)" };
      return { ok: true };
    }
    if (currentStep === 5) {
      if (!state.next_appointment) return { ok: false, message: "กรุณาเลือกนัดหมายครั้งต่อไป" };
      return { ok: true };
    }
    return { ok: true };
  }

  function onNext() {
    const v = canGoNext(step);
    if (!v.ok) {
      setMessage({ type: "err", text: v.message ?? "กรุณากรอกข้อมูลให้ครบ" });
      return;
    }
    setStep((s) => (s < 5 ? ((s + 1) as 2 | 3 | 4 | 5) : s));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onBack() {
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setPending(true);

    try {
      const v = canGoNext(5);
      if (!v.ok) {
        setMessage({ type: "err", text: v.message ?? "กรุณากรอกข้อมูลให้ครบ" });
        return;
      }

      const promoter_full_name = promoters.find((p) => p.id === state.promoter_id)?.full_name ?? "";

      const payload = {
        promoter_id: state.promoter_id,
        promoter_name: promoter_full_name,
        farmer_first_name: state.farmer_first_name,
        farmer_last_name: state.farmer_last_name,
        contract_no: state.contract_no,
        land_id: state.land_id,
        cane_type: state.cane_type || null,
        ratoon_no: state.cane_type === "ratoon" ? Number(state.ratoon_no) : null,
        area_rai: state.area_rai ? Number(state.area_rai) : null,
        planting_window: state.planting_window || null,
        target_yield_ton_per_rai: state.target_yield_ton_per_rai ? Number(state.target_yield_ton_per_rai) : null,
        readiness_checklist: state.readiness_checklist,
        segmentation: state.segmentation || null,
        obstacles: state.obstacles,
        support_requests: state.support_requests,
        reward_preferences: state.reward_preferences,
        promoter_notes: state.promoter_notes,
        next_appointment: state.next_appointment,
        farm_images: [] as string[],
      };

      if (selectedFiles.length > 0) {
        const up = new FormData();
        for (const f of selectedFiles) up.append("files", f);
        const upRes = await fetch("/api/uploads", { method: "POST", body: up });
        const upJson = (await upRes.json().catch(() => null)) as UploadResponse | null;
        if (!upRes.ok || !upJson || upJson.ok !== true) {
          const m =
            upJson && typeof upJson === "object" && typeof (upJson as { message?: unknown }).message === "string"
              ? ((upJson as { message?: unknown }).message as string)
              : upJson && typeof upJson === "object" && typeof (upJson as { detail?: unknown }).detail === "string"
                ? ((upJson as { detail?: unknown }).detail as string)
                : "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่";
          setMessage({ type: "err", text: m });
          return;
        }
        payload.farm_images = upJson.files.map((x) => x.publicUrl);
      }

      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json().catch(() => null)) as ApiResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        const msg =
          json && typeof json === "object" && typeof (json as { message?: unknown }).message === "string"
            ? ((json as { message?: unknown }).message as string)
            : null;
        const detail =
          json && typeof json === "object" && typeof (json as { detail?: unknown }).detail === "string"
            ? ((json as { detail?: unknown }).detail as string)
            : null;

        // Fallback mapping for raw Supabase errors (avoid scary technical text for users)
        const friendly =
          msg ??
          (detail &&
          (detail.includes("schema cache") || detail.includes("Could not find") || detail.includes("does not exist"))
            ? "ระบบยังตั้งค่าฐานข้อมูลไม่ครบ กรุณาแจ้งผู้ดูแลให้รันไฟล์ SQL ใน Supabase แล้วลองใหม่"
            : null);

        setMessage({
          type: "err",
          text: friendly ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่",
        });
        return;
      }

      setSelectedFiles([]);
      setStep(1);
      setState({
        promoter_id: "",
        farmer_first_name: "",
        farmer_last_name: "",
        contract_no: "",
        land_id: "",
        cane_type: "",
        ratoon_no: "",
        area_rai: "",
        planting_window: "",
        target_yield_ton_per_rai: "",
        readiness_checklist: {
          water: false,
          weeds: false,
          smut: false,
          borer: false,
          fertilize: false,
        },
        segmentation: "",
        obstacles: [],
        support_requests: { items: [], other: "" },
        reward_preferences: [],
        promoter_notes: "",
        next_appointment: "",
      });
      setMessage({ type: "ok", text: "บันทึกข้อมูลเรียบร้อย" });
    } finally {
      setPending(false);
    }
  }

  const stepLabel = useMemo(() => {
    if (step === 1) return "ส่วนที่ 1: ข้อมูลทั่วไปและเป้าหมาย";
    if (step === 2) return "ส่วนที่ 2: Checklist ประเมินความพร้อม";
    if (step === 3) return "ส่วนที่ 3: การประเมินเพื่อจัดกลุ่ม";
    if (step === 4) return "ส่วนที่ 4: อุปสรรคและความต้องการสนับสนุน";
    return "ส่วนที่ 5: บันทึกของนักส่งเสริม (Action Plan)";
  }, [step]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">
        แบบฟอร์มประเมินศักยภาพไร่อ้อย (Onsite Visit Form)
      </h2>
      <p className="mt-1 text-xs text-muted">
        กรอกข้อมูลทีละส่วน แล้วกดถัดไปจนจบ (5/5) จากนั้นค่อยบันทึก
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="rounded-3xl border border-border bg-background p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-xs font-semibold tracking-wide text-muted">
                ขั้นตอน {step}/5
              </div>
              <div className="mt-1 text-sm font-semibold text-foreground">{stepLabel}</div>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <div
                  key={n}
                  className={`h-2.5 w-10 rounded-full ${n <= step ? "bg-foreground" : "bg-foreground/10"}`}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>
        </div>

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-foreground">ชื่อนักส่งเสริม</span>

              <div className="relative mt-2" data-promoter-combobox>
                <button
                  ref={promoterBtnRef}
                  type="button"
                  disabled={pending || promotersLoading}
                  onClick={() => {
                    if (Date.now() < suppressOpenUntilRef.current) return;
                    setPromoterOpen((v) => !v);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-background px-4 py-3 text-left text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                >
                  <span className={state.promoter_id ? "" : "text-zinc-400"}>
                    {promotersLoading
                      ? "กำลังโหลดรายชื่อ..."
                      : state.promoter_id
                        ? selectedPromoterLabel
                        : "เลือกชื่อนักส่งเสริม"}
                  </span>
                  <span className="ml-3 text-muted">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                      className={`transition-transform duration-150 ${promoterOpen ? "rotate-180" : "rotate-0"}`}
                    >
                      <path
                        d="M6 9L12 15L18 9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>

                {promoterPanelMounted ? (
                  <div
                    className={`absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-lg transition-all duration-150 ease-out origin-top ${
                      promoterOpen
                        ? "opacity-100 translate-y-0 scale-100"
                        : "pointer-events-none opacity-0 -translate-y-1 scale-[0.98]"
                    }`}
                  >
                    <div className="max-h-64 overflow-auto">
                      {filteredPromoters.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted">ไม่พบรายการ</div>
                      ) : (
                        filteredPromoters.map((p) => {
                          const active = p.id === state.promoter_id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={() => {
                                setState((cur) => ({ ...cur, promoter_id: p.id }));
                                closePromoterDropdown();
                              }}
                              className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-foreground/5 ${
                                active ? "bg-foreground/5 font-semibold text-foreground" : "text-foreground"
                              }`}
                            >
                              <span className="truncate">
                                {p.id} - {p.full_name}
                              </span>
                              {active ? <span className="text-xs text-accent">เลือกแล้ว</span> : null}
                            </button>
                          );
                        })
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border bg-background px-3 py-2">
                      <div className="text-xs text-muted">
                        ทั้งหมด {filteredPromoters.length.toLocaleString("th-TH")} รายการ
                      </div>
                      <button
                        type="button"
                        onPointerDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={() => closePromoterDropdown()}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-foreground/5"
                      >
                        ปิด
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              {promotersError ? <div className="mt-2 text-sm text-accent">{promotersError}</div> : null}
            </label>

            <label className="block">
              <span className="text-xs font-medium text-foreground">ชื่อ (ชาวไร่)</span>
              <input
                value={state.farmer_first_name}
                onChange={(e) => setState((cur) => ({ ...cur, farmer_first_name: e.target.value }))}
                required
                disabled={pending}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                placeholder="กรอกชื่อ"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-foreground">นามสกุล (ชาวไร่)</span>
              <input
                value={state.farmer_last_name}
                onChange={(e) => setState((cur) => ({ ...cur, farmer_last_name: e.target.value }))}
                required
                disabled={pending}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                placeholder="กรอกนามสกุล"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-foreground">เลขที่สัญญา</span>
              <input
                value={state.contract_no}
                onChange={(e) => setState((cur) => ({ ...cur, contract_no: e.target.value }))}
                required
                disabled={pending}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                placeholder="กรอกเลขที่สัญญา"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-foreground">ไอดีแปลง (Land ID)</span>
              <input
                value={state.land_id}
                onChange={(e) => setState((cur) => ({ ...cur, land_id: e.target.value }))}
                required
                disabled={pending}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                placeholder="กรอก Land ID"
              />
            </label>

            <div className="sm:col-span-2">
              <div className="text-xs font-medium text-foreground">ประเภทอ้อย</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm">
                  <input
                    type="radio"
                    name="cane_type"
                    value="new"
                    checked={state.cane_type === "new"}
                    onChange={() => setState((cur) => ({ ...cur, cane_type: "new", ratoon_no: "" }))}
                    disabled={pending}
                  />
                  อ้อยใหม่
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm">
                  <input
                    type="radio"
                    name="cane_type"
                    value="ratoon"
                    checked={state.cane_type === "ratoon"}
                    onChange={() => setState((cur) => ({ ...cur, cane_type: "ratoon" }))}
                    disabled={pending}
                  />
                  อ้อยตอ
                  <span className="ml-auto flex items-center gap-2 text-xs text-muted">
                    ตอที่
                    <input
                      inputMode="numeric"
                      value={state.ratoon_no}
                      onChange={(e) => setState((cur) => ({ ...cur, ratoon_no: e.target.value }))}
                      disabled={pending || state.cane_type !== "ratoon"}
                      className="w-20 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                      placeholder="เช่น 1"
                    />
                  </span>
                </label>
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-foreground">พื้นที่ปลูก (ไร่)</span>
              <input
                inputMode="decimal"
                value={state.area_rai}
                onChange={(e) => setState((cur) => ({ ...cur, area_rai: e.target.value }))}
                required
                disabled={pending}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                placeholder="เช่น 25"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-foreground">เป้าหมายผลผลิตในปีหน้า (ตัน/ไร่)</span>
              <input
                inputMode="decimal"
                value={state.target_yield_ton_per_rai}
                onChange={(e) => setState((cur) => ({ ...cur, target_yield_ton_per_rai: e.target.value }))}
                required
                disabled={pending}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                placeholder="เช่น 12"
              />
            </label>

            <div className="sm:col-span-2">
              <div className="text-xs font-medium text-foreground">ช่วงเวลาปลูก/ตัด</div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm">
                  <input
                    type="radio"
                    name="planting_window"
                    value="before_31_jan"
                    checked={state.planting_window === "before_31_jan"}
                    onChange={() => setState((cur) => ({ ...cur, planting_window: "before_31_jan" }))}
                    disabled={pending}
                  />
                  ก่อน 31 ม.ค.
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm">
                  <input
                    type="radio"
                    name="planting_window"
                    value="after_31_jan"
                    checked={state.planting_window === "after_31_jan"}
                    onChange={() => setState((cur) => ({ ...cur, planting_window: "after_31_jan" }))}
                    disabled={pending}
                  />
                  หลัง 31 ม.ค.
                </label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-foreground">แนบรูปแปลง</div>
                  <div className="mt-1 text-xs text-muted">แนบได้ 1–5 รูป (ไฟล์รูปภาพเท่านั้น)</div>
                </div>
                <div className="text-xs text-muted">
                  แนบแล้ว{" "}
                  <span className="font-semibold text-foreground">{selectedFiles.length}</span>/5
                </div>
              </div>

              <div className="mt-3 rounded-3xl border border-border bg-background p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={pending}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setSelectedFiles((cur) => cur.concat(files).slice(0, 5));
                    e.currentTarget.value = "";
                  }}
                  className="sr-only"
                />

                <div className="rounded-3xl border border-border bg-card p-4">
                  {selectedFiles.length > 0 ? (
                    <>
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                        {previewUrls.map((url, idx) => (
                          <div key={url} className="group relative">
                            <button
                              type="button"
                              className="block w-full"
                              onClick={() => setViewerUrl(url)}
                              aria-label="ดูรูป"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt={`แนบรูป ${idx + 1}`}
                                className="aspect-square w-full rounded-2xl border border-border object-cover shadow-sm transition group-hover:opacity-90"
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFiles((cur) => cur.filter((_, i) => i !== idx));
                              }}
                              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-accent/25"
                              aria-label="ลบรูป"
                            >
                              ×
                            </button>
                          </div>
                        ))}

                        {selectedFiles.length < 5 ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => fileInputRef.current?.click()}
                            className="flex aspect-square w-full items-center justify-center rounded-2xl border border-border bg-background text-foreground shadow-sm transition hover:bg-foreground/5 focus:outline-none focus:ring-4 focus:ring-accent/25 disabled:opacity-60"
                            aria-label="เพิ่มรูป"
                          >
                            <span className="text-2xl leading-none">+</span>
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-muted">คลิกที่รูปเพื่อขยายดู</div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center rounded-2xl bg-foreground px-3 py-2 text-xs font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-60"
                          >
                            เพิ่มรูป
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedFiles([])}
                            className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5"
                          >
                            ล้างรูปทั้งหมด
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                      <div className="text-sm font-semibold text-foreground">คลิกเพื่อเลือกไฟล์รูปภาพ</div>
                      <div className="text-xs text-muted">รองรับ JPG/PNG/WEBP • สูงสุด 5 รูป</div>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center justify-center rounded-2xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 focus:outline-none focus:ring-4 focus:ring-accent/25 disabled:opacity-60"
                      >
                        เลือกไฟล์
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-border bg-background p-4">
              <div className="text-sm font-semibold text-foreground">Checklist ประเมินความพร้อมพื้นที่และชาวไร่</div>
              <div className="mt-1 text-xs text-muted">เลือก “ผ่าน/ไม่ผ่าน” ให้ครบทุกหัวข้อ</div>
            </div>

            {(
              [
                {
                  key: "water" as const,
                  title: "แหล่งน้ำ",
                  desc: "มีน้ำเพียงพอ (ก่อน 31 ม.ค. ให้ได้ 2 ครั้ง / หลัง 31 ม.ค. ให้ได้ 3 ครั้ง)",
                },
                {
                  key: "weeds" as const,
                  title: "วัชพืช",
                  desc: "มีการจัดการวัชพืชช่วง 1–3 เดือนแรก และคุมซ้ำช่วง 4–6 เดือน",
                },
                {
                  key: "smut" as const,
                  title: "โรคแส้ดำ",
                  desc: "พบการระบาดไม่เกิน 10% ของพื้นที่แปลง",
                },
                {
                  key: "borer" as const,
                  title: "หนอนกอ",
                  desc: "พบการระบาดไม่เกิน 10% ของพื้นที่แปลง",
                },
                {
                  key: "fertilize" as const,
                  title: "การบำรุง",
                  desc: "ใส่ปุ๋ยครบตามสูตร/ช่วงเวลา (รวมปุ๋ยอินทรีย์และการผ่ากอถ้ามี)",
                },
              ] as const
            ).map((item) => {
              const value = state.readiness_checklist[item.key];
              return (
                <div key={item.key} className="rounded-3xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{item.title}</div>
                      <div className="mt-1 text-xs leading-5 text-muted">{item.desc}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          setState((cur) => ({
                            ...cur,
                            readiness_checklist: { ...cur.readiness_checklist, [item.key]: true },
                          }))
                        }
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition ${
                          value ? "bg-foreground text-background" : "border border-border bg-background text-foreground hover:bg-foreground/5"
                        }`}
                      >
                        ผ่าน
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          setState((cur) => ({
                            ...cur,
                            readiness_checklist: { ...cur.readiness_checklist, [item.key]: false },
                          }))
                        }
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm transition ${
                          !value ? "bg-accent text-white" : "border border-border bg-background text-foreground hover:bg-foreground/5"
                        }`}
                      >
                        ไม่ผ่าน
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <div className="rounded-3xl border border-border bg-background p-4">
              <div className="text-sm font-semibold text-foreground">การประเมินเพื่อจัดกลุ่ม (Segmentation)</div>
              <div className="mt-1 text-xs text-muted">เลือก 1 กลุ่ม A–D</div>
            </div>

            {(
              [
                {
                  id: "A" as const,
                  title: "กลุ่ม A: พร้อมคู่",
                  desc: "พื้นที่ดี + ชาวไร่เก่ง → Checklist ผ่านเกือบทั้งหมด มีศักยภาพสูง",
                },
                {
                  id: "B" as const,
                  title: "กลุ่ม B: พื้นที่พร้อม แต่ชาวไร่ขาดปัจจัย",
                  desc: "แหล่งน้ำดี ดินดี แต่ชาวไร่ขาดเงินทุน/แรงงานบำรุง",
                },
                {
                  id: "C" as const,
                  title: "กลุ่ม C: ชาวไร่พร้อม แต่พื้นที่ขาดปัจจัย",
                  desc: "ชาวไร่ขยัน/มีความรู้ แต่ขาดแหล่งน้ำหรือดินเสื่อมโทรม",
                },
                {
                  id: "D" as const,
                  title: "กลุ่ม D: ไม่พร้อมทั้งคู่",
                  desc: "ขาดทั้งแหล่งน้ำ และขาดความพร้อมในการจัดการ",
                },
              ] as const
            ).map((g) => (
              <label
                key={g.id}
                className={`block cursor-pointer rounded-3xl border border-border bg-card p-4 shadow-sm transition hover:bg-foreground/5 ${
                  state.segmentation === g.id ? "ring-4 ring-accent/15" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="segmentation"
                    value={g.id}
                    checked={state.segmentation === g.id}
                    onChange={() => setState((cur) => ({ ...cur, segmentation: g.id }))}
                    disabled={pending}
                    className="mt-1"
                  />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{g.title}</div>
                    <div className="mt-1 text-xs leading-5 text-muted">{g.desc}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-5">
            <div className="rounded-3xl border border-border bg-background p-4">
              <div className="text-sm font-semibold text-foreground">อุปสรรคและความต้องการสนับสนุน (Insight & Support)</div>
              <div className="mt-1 text-xs text-muted">เลือกได้มากกว่า 1 ข้อ</div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="text-sm font-semibold text-foreground">1) อุปสรรคที่กังวล</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {OBSTACLE_OPTIONS.map((o) => (
                  <label key={o.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm">
                    <input
                      type="checkbox"
                      checked={state.obstacles.includes(o.id)}
                      onChange={() => setState((cur) => ({ ...cur, obstacles: toggleMulti(cur.obstacles, o.id) }))}
                      disabled={pending}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="text-sm font-semibold text-foreground">2) สิ่งที่ต้องการให้โรงงาน Support</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {SUPPORT_OPTIONS.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm">
                    <input
                      type="checkbox"
                      checked={state.support_requests.items.includes(s.id)}
                      onChange={() =>
                        setState((cur) => ({
                          ...cur,
                          support_requests: { ...cur.support_requests, items: toggleMulti(cur.support_requests.items, s.id) },
                        }))
                      }
                      disabled={pending}
                    />
                    {s.label}
                  </label>
                ))}
              </div>

              <label className="mt-3 block">
                <span className="text-xs font-medium text-foreground">อื่นๆ</span>
                <input
                  value={state.support_requests.other}
                  onChange={(e) =>
                    setState((cur) => ({ ...cur, support_requests: { ...cur.support_requests, other: e.target.value } }))
                  }
                  disabled={pending}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                  placeholder="ระบุเพิ่มเติม (ถ้ามี)"
                />
              </label>
            </div>

            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="text-sm font-semibold text-foreground">3) รางวัลที่จูงใจ</div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {REWARD_OPTIONS.map((r) => (
                  <label key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm">
                    <input
                      type="checkbox"
                      checked={state.reward_preferences.includes(r.id)}
                      onChange={() =>
                        setState((cur) => ({ ...cur, reward_preferences: toggleMulti(cur.reward_preferences, r.id) }))
                      }
                      disabled={pending}
                    />
                    {r.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="grid gap-4">
            <label className="block">
              <span className="text-xs font-medium text-foreground">ข้อเสนอแนะเพิ่มเติม</span>
              <textarea
                value={state.promoter_notes}
                onChange={(e) => setState((cur) => ({ ...cur, promoter_notes: e.target.value }))}
                disabled={pending}
                rows={5}
                className="mt-2 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
                placeholder="พิมพ์บันทึก/ข้อเสนอแนะเพิ่มเติม"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-foreground">นัดหมายครั้งต่อไป</span>
              <input
                type="date"
                value={state.next_appointment}
                onChange={(e) => setState((cur) => ({ ...cur, next_appointment: e.target.value }))}
                required
                disabled={pending}
                className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60"
              />
            </label>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={pending || step === 1}
            className="inline-flex items-center justify-center rounded-2xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            ย้อนกลับ
          </button>

          {step < 5 ? (
            <button
              type="button"
              onClick={onNext}
              disabled={pending}
              className="inline-flex items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 focus:outline-none focus:ring-4 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ถัดไป
            </button>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 focus:outline-none focus:ring-4 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
          )}
        </div>
      </form>

      {viewerUrl
        ? typeof document !== "undefined"
          ? createPortal(
              <div
                className="fixed inset-0 z-[9998] flex items-center justify-center px-4"
                role="dialog"
                aria-modal="true"
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) setViewerUrl(null);
                }}
              >
                <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
                <div className="relative max-h-[90vh] max-w-[90vw]">
                  <button
                    type="button"
                    onClick={() => setViewerUrl(null)}
                    className="absolute -right-3 -top-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg transition hover:bg-foreground/90 focus:outline-none focus:ring-4 focus:ring-accent/25"
                    aria-label="ปิด"
                  >
                    ×
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={viewerUrl}
                    alt="ดูรูป"
                    className="max-h-[90vh] max-w-[90vw] rounded-2xl border border-border bg-background shadow-2xl"
                  />
                </div>
              </div>,
              document.body,
            )
          : null
        : null}

      {message && messageOpen ? (
        typeof document !== "undefined"
          ? createPortal(
              <div
                className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
                role="dialog"
                aria-modal="true"
                onPointerDown={(e) => {
                  if (e.target === e.currentTarget) setMessageOpen(false);
                }}
              >
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />

                <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_70px_rgba(0,0,0,0.38)]">
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-accent/15 blur-2xl" />
                  </div>

                  <div className="relative flex h-full flex-col p-6">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/brand/logo.png?v=2"
                        alt="KTISX"
                        className="h-12 w-12 rounded-2xl border border-border bg-background object-cover p-1 shadow-sm"
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold tracking-wide text-muted">
                          KTIS X VISIT FARM
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              message.type === "ok"
                                ? "bg-foreground text-background"
                                : "bg-accent text-white"
                            }`}
                          >
                            {message.type === "ok" ? "บันทึกสำเร็จ" : "บันทึกไม่สำเร็จ"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 flex flex-1 flex-col items-center justify-center text-center">
                      <div
                        className={`text-2xl font-semibold tracking-tight ${
                          message.type === "ok" ? "text-foreground" : "text-accent"
                        }`}
                      >
                        {message.type === "ok" ? "สำเร็จ" : "ไม่สำเร็จ"}
                      </div>
                      <div className="mt-3 max-w-[26ch] text-sm leading-6 text-foreground">
                        {message.text}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMessageOpen(false)}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 focus:outline-none focus:ring-4 focus:ring-accent/25"
                    >
                      ปิด
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null
      ) : null}
    </div>
  );
}

