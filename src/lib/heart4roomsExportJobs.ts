import crypto from "node:crypto";

export type Heart4RoomsExportJobStatus = "pending" | "running" | "done" | "cancelled" | "error";

export type Heart4RoomsExportJobProgress = {
  done: number;
  total: number;
};

export type Heart4RoomsExportJobSnapshot = {
  id: string;
  status: Heart4RoomsExportJobStatus;
  progress: Heart4RoomsExportJobProgress;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  filename?: string;
  error?: string;
};

type Heart4RoomsExportJobInternal = Heart4RoomsExportJobSnapshot & {
  buffer?: Buffer;
};

const JOB_TTL_MS = 15 * 60 * 1000;
const MAX_JOBS = 20;

function store(): Map<string, Heart4RoomsExportJobInternal> {
  const g = globalThis as unknown as {
    __ktisx_h4_export_jobs__?: Map<string, Heart4RoomsExportJobInternal>;
  };
  if (!g.__ktisx_h4_export_jobs__) g.__ktisx_h4_export_jobs__ = new Map();
  return g.__ktisx_h4_export_jobs__;
}

export function cleanupHeart4RoomsExportJobs(now = Date.now()) {
  const s = store();
  for (const [id, job] of s.entries()) {
    if (job.expiresAt <= now) s.delete(id);
  }
  if (s.size <= MAX_JOBS) return;
  const byOldest = Array.from(s.entries()).sort((a, b) => a[1].updatedAt - b[1].updatedAt);
  while (s.size > MAX_JOBS && byOldest.length) {
    const [id] = byOldest.shift()!;
    s.delete(id);
  }
}

function snapshot(job: Heart4RoomsExportJobInternal): Heart4RoomsExportJobSnapshot {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    expiresAt: job.expiresAt,
    filename: job.filename,
    error: job.error,
  };
}

/** In-memory only (no `.tmp`/disk). Survives for one long-lived Node process (e.g. local `next dev`). */
export function createHeart4RoomsExportJob(): Heart4RoomsExportJobSnapshot {
  cleanupHeart4RoomsExportJobs();
  const id = crypto.randomUUID();
  const now = Date.now();
  const job: Heart4RoomsExportJobInternal = {
    id,
    status: "pending",
    progress: { done: 0, total: 0 },
    createdAt: now,
    updatedAt: now,
    expiresAt: now + JOB_TTL_MS,
  };
  store().set(id, job);
  return snapshot(job);
}

export function getHeart4RoomsExportJob(id: string): Heart4RoomsExportJobSnapshot | null {
  cleanupHeart4RoomsExportJobs();
  const job = store().get(id);
  return job ? snapshot(job) : null;
}

export function getHeart4RoomsExportJobBuffer(id: string): { filename: string; buffer: Buffer } | null {
  cleanupHeart4RoomsExportJobs();
  const job = store().get(id);
  if (job?.status === "done" && job.buffer && job.filename) {
    return { filename: job.filename, buffer: job.buffer };
  }
  return null;
}

export function markHeart4RoomsExportJobRunning(id: string, total: number) {
  const job = store().get(id);
  if (!job) return;
  const now = Date.now();
  job.status = "running";
  job.progress = { done: 0, total: Math.max(0, total) };
  job.updatedAt = now;
  job.expiresAt = now + JOB_TTL_MS;
}

export function updateHeart4RoomsExportJobProgress(id: string, done: number, total?: number) {
  const job = store().get(id);
  if (!job) return;
  const now = Date.now();
  const t = typeof total === "number" ? total : job.progress.total;
  const d = Math.max(0, Math.min(done, Math.max(0, t)));
  job.progress = { done: d, total: Math.max(0, t) };
  job.updatedAt = now;
  job.expiresAt = now + JOB_TTL_MS;
}

export function markHeart4RoomsExportJobDone(id: string, filename: string, buffer: Buffer) {
  const job = store().get(id);
  if (!job) return;
  if (job.status === "cancelled") return;
  const now = Date.now();
  job.status = "done";
  job.filename = filename;
  job.buffer = buffer;
  job.updatedAt = now;
  job.expiresAt = now + JOB_TTL_MS;
  job.error = undefined;
}

export function markHeart4RoomsExportJobError(id: string, error: string) {
  const job = store().get(id);
  if (!job) return;
  if (job.status === "cancelled") return;
  const now = Date.now();
  job.status = "error";
  job.error = error;
  job.updatedAt = now;
  job.expiresAt = now + JOB_TTL_MS;
}

export function markHeart4RoomsExportJobCancelled(id: string) {
  const job = store().get(id);
  if (!job) return;
  const now = Date.now();
  job.status = "cancelled";
  job.error = undefined;
  job.buffer = undefined;
  job.filename = undefined;
  job.updatedAt = now;
  job.expiresAt = now + JOB_TTL_MS;
}

export function isHeart4RoomsExportJobCancelled(id: string): boolean {
  const job = store().get(id);
  return job?.status === "cancelled";
}
