import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_SESSION_BYTES = 32 * 1024 * 1024;
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 20;

import { validSession } from "./sessionSchema";
export { validSession } from "./sessionSchema";

function object(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export interface SavedReview {
  version: 1;
  key: string;
  diffHash: string;
  savedAt: number;
  data: unknown;
}

/** Per-store queues order writes and deletion; each write is an atomic replacement. */
export class SessionStore {
  readonly directory: string;
  private queues = new Map<string, Promise<unknown>>();
  constructor(gitDir: string) {
    this.directory = path.join(gitDir, "guided-review", "sessions");
  }
  private filename(key: string): string {
    return path.join(this.directory, `${createHash("sha256").update(key).digest("hex")}.json`);
  }
  private enqueue<T>(key: string, action: () => Promise<T>): Promise<T> {
    const next = (this.queues.get(key) ?? Promise.resolve()).catch(() => {}).then(action);
    this.queues.set(key, next);
    void next
      .finally(() => {
        if (this.queues.get(key) === next) this.queues.delete(key);
      })
      .catch(() => {});
    return next;
  }
  read(key: string): Promise<SavedReview | null> {
    return this.enqueue(key, async () => {
      try {
        const file = this.filename(key);
        if ((await stat(file)).size > MAX_SESSION_BYTES) return null;
        const v: unknown = JSON.parse(await readFile(file, "utf8"));
        if (
          !object(v) ||
          v.version !== 1 ||
          v.key !== key ||
          typeof v.diffHash !== "string" ||
          !/^[a-f0-9]{64}$/.test(v.diffHash) ||
          typeof v.savedAt !== "number" ||
          !Number.isFinite(v.savedAt) ||
          Date.now() - Number(v.savedAt) > MAX_AGE ||
          !validSession(v.data)
        )
          return null;
        return v as unknown as SavedReview;
      } catch (error) {
        if (error instanceof SyntaxError || (error as NodeJS.ErrnoException).code === "ENOENT")
          return null;
        throw error;
      }
    });
  }
  write(key: string, diffHash: string, data: unknown): Promise<void> {
    if (!validSession(data)) return Promise.reject(new Error("Invalid review session."));
    const serialized = JSON.stringify({ version: 1, key, diffHash, savedAt: Date.now(), data });
    if (Buffer.byteLength(serialized) > MAX_SESSION_BYTES)
      return Promise.reject(new Error("Review session is too large."));
    return this.enqueue(key, async () => {
      await mkdir(this.directory, { recursive: true, mode: 0o700 });
      const temp = `${this.filename(key)}.${randomUUID()}.tmp`;
      try {
        await writeFile(temp, serialized, { mode: 0o600, flag: "wx" });
        await rename(temp, this.filename(key));
      } finally {
        await rm(temp, { force: true }).catch(() => {});
      }
      await this.prune().catch(() => {});
    });
  }
  delete(key: string): Promise<void> {
    return this.enqueue(key, () => rm(this.filename(key), { force: true }));
  }
  private async prune(): Promise<void> {
    const files = await Promise.all(
      (await readdir(this.directory))
        .filter((name) => /^[a-f0-9]{64}\.json$/.test(name))
        .map(async (name) => {
          const file = path.join(this.directory, name);
          return { file, time: (await stat(file)).mtimeMs };
        }),
    );
    files.sort((a, b) => b.time - a.time);
    await Promise.all(
      files
        .filter((f, i) => i >= MAX_SESSIONS || Date.now() - f.time > MAX_AGE)
        .map((f) => rm(f.file, { force: true })),
    );
  }
}
