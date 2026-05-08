import crypto from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

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

const EXPORT_DIR = path.join(process.cwd(), ".tmp", "exports", "heart4rooms");

async function ensureExportDir() {
  await mkdir(EXPORT_DIR, { recursive: true });
}

function jobJsonPath(id: string) {
  return path.join(EXPORT_DIR, `${id}.json`);
}

function jobXlsxPath(id: string) {
  return path.join(EXPORT_DIR, `${id}.xlsx`);
}

async function writeJsonAtomic(filePath: string, data: unknown) {
  await ensureExportDir();
  const payload = JSON.stringify(data);
  const tmp = `${filePath}.${crypto.randomUUID()}.tmp`;
  await writeFile(tmp, payload, "utf8");

  // On Windows, rename() fails if destination already exists (EPERM/EACCES).
  // Also, concurrent progress updates may try to overwrite the same file.
  // We implement "replace" semantics with a few retries.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await unlink(filePath).catch(() => {});
      await rename(tmp, filePath);
      return;
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      if (code !== "EPERM" && code !== "EACCES" && code !== "EBUSY") throw e;
      // brief backoff, then retry
      await new Promise((r) => setTimeout(r, 20 * (attempt + 1)));
    }
  }

  // If we still couldn't rename, just try writing directly (best-effort).
  await writeFile(filePath, payload, "utf8");
  await unlink(tmp).catch(() => {});
}

async function readJsonSafe<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// Serialize writes per file to avoid concurrent rename/unlink races.
function writeQueue(): Map<string, Promise<void>> {
  const g = globalThis as unknown as { __ktisx_h4_export_write_queue__?: Map<string, Promise<void>> };
  if (!g.__ktisx_h4_export_write_queue__) g.__ktisx_h4_export_write_queue__ = new Map();
  return g.__ktisx_h4_export_write_queue__;
}

function enqueueJsonWrite(filePath: string, data: unknown) {
  const q = writeQueue();
  const prev = q.get(filePath) ?? Promise.resolve();
  const next = prev
    .catch(() => {})
    .then(() => writeJsonAtomic(filePath, data))
    .finally(() => {
      if (q.get(filePath) === next) q.delete(filePath);
    });
  q.set(filePath, next);
}

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
  enqueueJsonWrite(jobJsonPath(id), snapshot(job));
  return snapshot(job);
}

export function getHeart4RoomsExportJob(id: string): Heart4RoomsExportJobSnapshot | null {
  cleanupHeart4RoomsExportJobs();
  const job = store().get(id);
  if (job) return snapshot(job);

  // Synchronous disk fallback so routes can reliably respond in one request.
  try {
    const p = jobJsonPath(id);
    if (!existsSync(p)) return null;
    const snap = JSON.parse(readFileSync(p, "utf8")) as Heart4RoomsExportJobSnapshot;
    store().set(id, { ...snap });
    return snap;
  } catch {
    return null;
  }
}

export function getHeart4RoomsExportJobBuffer(id: string): { filename: string; buffer: Buffer } | null {
  cleanupHeart4RoomsExportJobs();
  const job = store().get(id);
  if (job && job.status === "done" && job.buffer && job.filename) return { filename: job.filename, buffer: job.buffer };

  // Synchronous disk fallback: allow /file to succeed even if memory was lost.
  try {
    const metaPath = jobJsonPath(id);
    const xlsxPath = jobXlsxPath(id);
    if (!existsSync(metaPath) || !existsSync(xlsxPath)) return null;
    const snap = JSON.parse(readFileSync(metaPath, "utf8")) as Heart4RoomsExportJobSnapshot;
    if (snap.status !== "done" || !snap.filename) return null;
    const buf = readFileSync(xlsxPath);
    store().set(id, { ...snap, buffer: buf });
    return { filename: snap.filename, buffer: buf };
  } catch {
    return null;
  }
}

export function markHeart4RoomsExportJobRunning(id: string, total: number) {
  const job = store().get(id);
  if (!job) return;
  const now = Date.now();
  job.status = "running";
  job.progress = { done: 0, total: Math.max(0, total) };
  job.updatedAt = now;
  job.expiresAt = now + JOB_TTL_MS;
  enqueueJsonWrite(jobJsonPath(id), snapshot(job));
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
  enqueueJsonWrite(jobJsonPath(id), snapshot(job));
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
  void (async () => {
    await ensureExportDir();
    await writeFile(jobXlsxPath(id), buffer);
    enqueueJsonWrite(jobJsonPath(id), snapshot(job));
  })();
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
  enqueueJsonWrite(jobJsonPath(id), snapshot(job));
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
  void (async () => {
    enqueueJsonWrite(jobJsonPath(id), snapshot(job));
    await unlink(jobXlsxPath(id)).catch(() => {});
  })();
}

export function isHeart4RoomsExportJobCancelled(id: string): boolean {
  const job = store().get(id);
  return job?.status === "cancelled";
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

// Best-effort cleanup of expired persisted jobs.
void (async () => {
  try {
    await ensureExportDir();
    const files = await readdir(EXPORT_DIR);
    const now = Date.now();
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const p = path.join(EXPORT_DIR, f);
      const snap = await readJsonSafe<Heart4RoomsExportJobSnapshot>(p);
      if (!snap || snap.expiresAt > now) continue;
      await unlink(jobXlsxPath(snap.id)).catch(() => {});
      await unlink(jobJsonPath(snap.id)).catch(() => {});
    }
  } catch {
    // ignore
  }
})();

