"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";

type UserRole = "user" | "admin";

type UserRow = {
  id: string;
  created_at: string;
  username: string;
  role: UserRole;
  full_name: string | null;
  promoter_id: string | null;
};

type UsersResponse =
  | { ok: true; rows: UserRow[]; count: number }
  | { ok: false; error: string; detail?: unknown; message?: unknown };

type OkResponse =
  | { ok: true; id?: string }
  | { ok: false; error: string; detail?: unknown; message?: unknown };

type UserDetailResponse =
  | { ok: true; row: UserRow & { password: string } }
  | { ok: false; error: string; detail?: unknown; message?: unknown };

function getErrorMessage(json: OkResponse | null, fallback: string): string {
  if (!json || json.ok === true) return fallback;
  if (typeof json.message === "string") return json.message;
  if (typeof json.detail === "string") return json.detail;
  return fallback;
}

function roleLabel(role: UserRole): string {
  return role === "admin" ? "admin" : "user";
}

type ModalState =
  | { type: "none" }
  | { type: "create"; draft: CreateDraft }
  | { type: "edit"; row: UserRow; draft: EditDraft }
  | { type: "confirm_delete"; row: UserRow }
  | { type: "success"; title: string; text: string };

type CreateDraft = {
  username: string;
  password: string;
  role: UserRole;
  full_name: string;
  promoter_id: string;
};

type EditDraft = {
  username: string;
  password: string; // optional (blank => no change)
  role: UserRole;
  full_name: string;
  promoter_id: string;
};

export function UsersClient() {
  const [q, setQ] = useState("");
  const [pending, setPending] = useState(false);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: "none" });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const parts = [
        r.id,
        r.username,
        r.full_name ?? "",
        r.created_at,
      ].join(" ").toLowerCase();
      return parts.includes(s);
    });
  }, [q, rows]);

  async function load() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/users?q=${encodeURIComponent(q.trim())}&limit=200`, { method: "GET" });
      const json = (await res.json().catch(() => null)) as UsersResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        setError("โหลดรายชื่อบัญชีไม่สำเร็จ");
        return;
      }
      setRows(json.rows);
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // We intentionally do not auto-reload on q changes to reduce server calls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(draft: CreateDraft) {
    const username = draft.username.trim();
    const password = draft.password;
    const full_name = draft.full_name.trim();
    const promoter_id = draft.promoter_id.trim();
    const role = draft.role;

    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          role,
          full_name,
          promoter_id: promoter_id || null,
        }),
      });
      const json = (await res.json().catch(() => null)) as OkResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        setError(getErrorMessage(json, "สร้างบัญชีไม่สำเร็จ"));
        return;
      }
      await load();
      setModal({
        type: "success",
        title: "สร้างบัญชีสำเร็จ",
        text: `สร้างบัญชี "${username}" เสร็จสิ้น`,
      });
    } finally {
      setPending(false);
    }
  }

  async function onUpdate(id: string, patch: { username?: string; password?: string; role?: UserRole; full_name?: string; promoter_id?: string | null }) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = (await res.json().catch(() => null)) as OkResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        setError(getErrorMessage(json, "แก้ไขไม่สำเร็จ"));
        return;
      }
      await load();
      setModal({
        type: "success",
        title: "แก้ไขบัญชีสำเร็จ",
        text: "แก้ไขข้อมูลบัญชีเสร็จสิ้น",
      });
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string, username: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as OkResponse | null;
      if (!res.ok || !json || json.ok !== true) {
        setError(getErrorMessage(json, "ลบไม่สำเร็จ"));
        return;
      }
      await load();
      setModal({
        type: "success",
        title: "ลบบัญชีสำเร็จ",
        text: `ลบบัญชี "${username}" สำเร็จ`,
      });
    } finally {
      setPending(false);
    }
  }

  const canCreate =
    modal.type === "create"
      ? Boolean(
          modal.draft.username.trim() &&
            modal.draft.password &&
            modal.draft.full_name.trim() &&
            (modal.draft.role === "user" || modal.draft.role === "admin"),
        )
      : false;

  const canEdit =
    modal.type === "edit"
      ? Boolean(
          modal.draft.username.trim() &&
            modal.draft.password &&
            modal.draft.full_name.trim() &&
            (modal.draft.role === "user" || modal.draft.role === "admin"),
        )
      : false;

  function setCreateDraft(patch: Partial<CreateDraft>) {
    setModal((cur) => {
      if (cur.type !== "create") return cur;
      return { ...cur, draft: { ...cur.draft, ...patch } };
    });
  }

  function setEditDraft(patch: Partial<EditDraft>) {
    setModal((cur) => {
      if (cur.type !== "edit") return cur;
      return { ...cur, draft: { ...cur.draft, ...patch } };
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted">ทั้งหมด {rows.length.toLocaleString("th-TH")} บัญชี</div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา: username/ชื่อ"
            className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15 sm:w-[420px]"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void load()}
              disabled={pending}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60 sm:w-auto"
            >
              ค้นหา/รีเฟรช
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                setModal({
                  type: "create",
                  draft: { username: "", password: "", role: "user", full_name: "", promoter_id: "" },
                })
              }
              className="inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-60 sm:w-auto"
            >
              สร้างบัญชี
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-accent">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        {/* Mobile cards */}
        <div className="divide-y divide-border sm:hidden">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted">{pending ? "กำลังโหลด..." : "ไม่พบข้อมูล"}</div>
          ) : (
            filtered.map((r) => (
              <div key={r.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{r.username}</div>
                    <div className="mt-1 break-words text-sm text-muted">{r.full_name ?? "-"}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={async () => {
                      setPending(true);
                      setError(null);
                      try {
                        const res = await fetch(`/api/users/${encodeURIComponent(r.id)}`, { method: "GET" });
                        const json = (await res.json().catch(() => null)) as UserDetailResponse | null;
                        if (!res.ok || !json || json.ok !== true) {
                          setError("โหลดรายละเอียดบัญชีไม่สำเร็จ");
                          return;
                        }
                        setModal({
                          type: "edit",
                          row: r,
                          draft: {
                            username: json.row.username,
                            password: json.row.password,
                            role: json.row.role,
                            full_name: json.row.full_name ?? "",
                            promoter_id: json.row.promoter_id ?? "",
                          },
                        });
                      } finally {
                        setPending(false);
                      }
                    }}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setModal({ type: "confirm_delete", row: r })}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                  >
                    ลบ
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-[720px] w-full border-collapse bg-background text-left text-sm">
            <thead className="bg-foreground/[0.04]">
              <tr className="text-foreground">
                <th className="px-4 py-3 font-semibold">บัญชีผู้ใช้</th>
                <th className="px-4 py-3 font-semibold">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={2}>
                    {pending ? "กำลังโหลด..." : "ไม่พบข้อมูล"}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-4">
                      <div className="font-semibold text-foreground">{r.username}</div>
                      <div className="mt-1 text-sm text-muted">{r.full_name ?? "-"}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={async () => {
                            setPending(true);
                            setError(null);
                            try {
                              const res = await fetch(`/api/users/${encodeURIComponent(r.id)}`, { method: "GET" });
                              const json = (await res.json().catch(() => null)) as UserDetailResponse | null;
                              if (!res.ok || !json || json.ok !== true) {
                                setError("โหลดรายละเอียดบัญชีไม่สำเร็จ");
                                return;
                              }
                              setModal({
                                type: "edit",
                                row: r,
                                draft: {
                                  username: json.row.username,
                                  password: json.row.password,
                                  role: json.row.role,
                                  full_name: json.row.full_name ?? "",
                                  promoter_id: json.row.promoter_id ?? "",
                                },
                              });
                            } finally {
                              setPending(false);
                            }
                          }}
                          className="rounded-2xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => setModal({ type: "confirm_delete", row: r })}
                          className="rounded-2xl bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                        >
                          ลบ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.type !== "none"
        ? typeof document !== "undefined"
          ? createPortal(
              <Modal
                pending={pending}
                state={modal}
                onClose={() => setModal({ type: "none" })}
                onCreate={async (draft) => {
                  if (!draft.username.trim() || !draft.password || !draft.full_name.trim()) {
                    setError("กรุณากรอกข้อมูลให้ครบก่อนสร้างบัญชี (ยกเว้น promoter ID)");
                    return;
                  }
                  await onCreate(draft);
                }}
                onEdit={async (row, draft) => {
                  if (!draft.username.trim() || !draft.full_name.trim()) {
                    setError("กรุณากรอก username และชื่อ-นามสกุล ให้ครบ");
                    return;
                  }
                  if (!draft.password) {
                    setError("กรุณากรอกรหัสผ่าน (ห้ามเว้นว่าง)");
                    return;
                  }
                  const patch: {
                    username?: string;
                    password?: string;
                    role?: UserRole;
                    full_name?: string;
                    promoter_id?: string | null;
                  } = {
                    username: draft.username.trim(),
                    full_name: draft.full_name.trim(),
                    role: draft.role,
                    promoter_id: draft.promoter_id.trim() ? draft.promoter_id.trim() : null,
                  };
                  patch.password = draft.password;
                  await onUpdate(row.id, patch);
                }}
                onConfirmDelete={async (row) => {
                  await onDelete(row.id, row.username);
                }}
                canCreate={canCreate}
                canEdit={canEdit}
                onChangeCreateDraft={setCreateDraft}
                onChangeEditDraft={setEditDraft}
              />,
              document.body,
            )
          : null
        : null}
    </div>
  );
}

function Modal({
  state,
  onClose,
  onCreate,
  onEdit,
  onConfirmDelete,
  pending,
  canCreate,
  canEdit,
  onChangeCreateDraft,
  onChangeEditDraft,
}: {
  state: ModalState;
  onClose: () => void;
  onCreate: (draft: CreateDraft) => Promise<void>;
  onEdit: (row: UserRow, draft: EditDraft) => Promise<void>;
  onConfirmDelete: (row: UserRow) => Promise<void>;
  pending: boolean;
  canCreate: boolean;
  canEdit: boolean;
  onChangeCreateDraft: (patch: Partial<CreateDraft>) => void;
  onChangeEditDraft: (patch: Partial<EditDraft>) => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const title =
    state.type === "create"
      ? "สร้างบัญชีผู้ใช้"
      : state.type === "edit"
        ? `แก้ไขบัญชี "${state.row.username}"`
        : state.type === "confirm_delete"
          ? `ยืนยันการลบบัญชี "${state.row.username}"`
          : state.type === "success"
            ? state.title
            : "";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-card shadow-[0_24px_70px_rgba(0,0,0,0.38)] max-h-[85vh]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-accent/15 blur-2xl" />
        </div>

        <div className="relative flex max-h-[85vh] flex-col p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold tracking-wide text-muted">KTIS X SURVEYPRO</div>
              <div className="mt-1 text-lg font-semibold tracking-tight text-foreground">{title}</div>
            </div>
          </div>

          <div className="mt-5 min-h-0 flex-1 overflow-auto">
            {state.type === "success" ? (
              <div className="rounded-3xl border border-border bg-background p-4">
                <div className="text-sm font-semibold text-foreground">{state.title}</div>
                <div className="mt-2 whitespace-pre-line text-sm text-muted">{state.text}</div>
              </div>
            ) : null}

            {state.type === "confirm_delete" ? (
              <div className="rounded-3xl border border-border bg-background p-4">
                <div className="text-sm font-semibold text-foreground">
                  ต้องการลบบัญชี “{state.row.username}” ใช่หรือไม่
                </div>
                <div className="mt-2 text-sm text-muted">
                  รายการนี้จะถูกลบออกจากระบบ และไม่สามารถกู้คืนได้
                </div>
              </div>
            ) : null}

            {state.type === "create" ? (
              <div className="space-y-3">
                <div className="rounded-3xl border border-border bg-background p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <div className="text-xs font-medium text-muted">
                        Username <span className="text-accent">*</span>
                      </div>
                      <input
                        value={state.draft.username}
                        onChange={(e) => onChangeCreateDraft({ username: e.target.value })}
                        className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                        placeholder="เช่น ktis.x"
                        autoComplete="off"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs font-medium text-muted">
                        Password <span className="text-accent">*</span>
                      </div>
                      <input
                        value={state.draft.password}
                        onChange={(e) => onChangeCreateDraft({ password: e.target.value })}
                        className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                        placeholder="กำหนดรหัสผ่าน"
                        autoComplete="new-password"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <div className="text-xs font-medium text-muted">
                        Full Name <span className="text-accent">*</span>
                      </div>
                      <input
                        value={state.draft.full_name}
                        onChange={(e) => onChangeCreateDraft({ full_name: e.target.value })}
                        className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                        placeholder="เช่น นายสมชาย ใจดี"
                        autoComplete="off"
                      />
                    </label>
                    <label className="block">
                      <div className="text-xs font-medium text-muted">
                        Role <span className="text-accent">*</span>
                      </div>
                      <select
                        value={state.draft.role}
                        onChange={(e) =>
                          onChangeCreateDraft({ role: e.target.value === "admin" ? "admin" : "user" })
                        }
                        className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </label>
                    <label className="block">
                      <div className="text-xs font-medium text-muted">Promoter ID</div>
                      <input
                        value={state.draft.promoter_id}
                        onChange={(e) => onChangeCreateDraft({ promoter_id: e.target.value })}
                        className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                        placeholder="(ไม่บังคับ)"
                        autoComplete="off"
                      />
                    </label>
                  </div>
                  <div className="mt-2 text-xs text-muted">ช่องที่มี * ต้องกรอก</div>
                </div>
              </div>
            ) : null}

            {state.type === "edit" ? (
              <div className="rounded-3xl border border-border bg-background p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <div className="text-xs font-medium text-muted">Username *</div>
                    <input
                      value={state.draft.username}
                      onChange={(e) => onChangeEditDraft({ username: e.target.value })}
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                      autoComplete="off"
                      disabled={pending}
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs font-medium text-muted">Role *</div>
                    <select
                      value={state.draft.role}
                      onChange={(e) => onChangeEditDraft({ role: e.target.value === "admin" ? "admin" : "user" })}
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                      disabled={pending}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>
                  <label className="block sm:col-span-2">
                    <div className="text-xs font-medium text-muted">ชื่อ-นามสกุล (full_name) *</div>
                    <input
                      value={state.draft.full_name}
                      onChange={(e) => onChangeEditDraft({ full_name: e.target.value })}
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                      autoComplete="off"
                      disabled={pending}
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs font-medium text-muted">Promoter ID</div>
                    <input
                      value={state.draft.promoter_id}
                      onChange={(e) => onChangeEditDraft({ promoter_id: e.target.value })}
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                      placeholder="(ไม่บังคับ)"
                      autoComplete="off"
                      disabled={pending}
                    />
                  </label>
                  <label className="block">
                    <div className="text-xs font-medium text-muted">รหัสผ่าน *</div>
                    <input
                      value={state.draft.password}
                      onChange={(e) => onChangeEditDraft({ password: e.target.value })}
                      className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-foreground shadow-sm outline-none focus:border-accent focus:ring-4 focus:ring-accent/15"
                      autoComplete="new-password"
                      disabled={pending}
                    />
                  </label>
                </div>
                <div className="mt-2 text-xs text-muted">ช่องที่มี * ต้องกรอก</div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            {state.type === "success" ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90"
              >
                ปิด
              </button>
            ) : state.type === "confirm_delete" ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={onClose}
                  className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void onConfirmDelete(state.row)}
                  className="rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? "กำลังลบ..." : "ยืนยันลบ"}
                </button>
              </>
            ) : state.type === "create" ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={onClose}
                  className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={pending || !canCreate}
                  onClick={() => void onCreate(state.draft)}
                  className="rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-60"
                >
                  {pending ? "กำลังสร้าง..." : "สร้างบัญชี"}
                </button>
              </>
            ) : state.type === "edit" ? (
              <>
                <button
                  type="button"
                  disabled={pending}
                  onClick={onClose}
                  className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={pending || !canEdit}
                  onClick={() => void onEdit(state.row, state.draft)}
                  className="rounded-2xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-sm transition hover:bg-foreground/90 disabled:opacity-60"
                >
                  {pending ? "กำลังบันทึก..." : "ยืนยันแก้ไข"}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

