import { test as base } from "@playwright/test";
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { buildLocalReview } from "../src/git/localDiff";
import { createReviewServer, listen } from "../src/server/createServer";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.resolve(__dirname, "../dist/ui");

export interface ReviewServer {
  baseURL: string;
  token: string;
  repoDir: string;
}

async function git(cwd: string, args: string[]): Promise<void> {
  await execFileAsync("git", args, { cwd });
}

/** Branch `feat` vs `main` plus an uncommitted `dirty.ts` — same shape as createServer tests. */
async function createReviewRepo(root: string): Promise<void> {
  await git(root, ["init", "-b", "main"]);
  await git(root, ["config", "user.email", "e2e@example.com"]);
  await git(root, ["config", "user.name", "E2E"]);
  await writeFile(path.join(root, "readme.md"), "hello\n");
  await git(root, ["add", "readme.md"]);
  await git(root, ["commit", "-m", "initial"]);
  await git(root, ["checkout", "-b", "feat"]);
  await writeFile(path.join(root, "feat.ts"), "export const n = 1;\n");
  await git(root, ["add", "feat.ts"]);
  await git(root, ["commit", "-m", "add feat"]);
  await writeFile(path.join(root, "dirty.ts"), "export const d = 1;\n");
}

export const test = base.extend<{ reviewServer: ReviewServer }>({
  // eslint-disable-next-line no-empty-pattern
  reviewServer: async ({}, use) => {
    const stamp = `${Date.now()}-${randomBytes(4).toString("hex")}`;
    const repoDir = await mkdir(path.join(os.tmpdir(), `gr-e2e-repo-${stamp}`), {
      recursive: true,
    });
    const configDir = await mkdir(path.join(os.tmpdir(), `gr-e2e-cfg-${stamp}`), {
      recursive: true,
    });
    if (!repoDir || !configDir) throw new Error("Failed to create temp dirs.");

    const prevConfigDir = process.env.GUIDED_REVIEW_CONFIG_DIR;
    process.env.GUIDED_REVIEW_CONFIG_DIR = configDir;

    await createReviewRepo(repoDir);
    const snapshot = await buildLocalReview({ cwd: repoDir });
    const token = randomBytes(16).toString("hex");
    const server = createReviewServer({
      snapshot,
      settings: { provider: "anthropic", model: "claude-opus-4-8", apiKey: "" },
      token,
      staticDir: UI_DIR,
      detectAgents: async () => [],
      testConnection: async () => {},
      log: () => {},
    });
    const port = await listen(server);
    const baseURL = `http://127.0.0.1:${port}`;

    await use({ baseURL, token, repoDir });

    await new Promise<void>((resolve, reject) => {
      server.closeAllConnections();
      server.close((err) => (err ? reject(err) : resolve()));
    });
    if (prevConfigDir === undefined) delete process.env.GUIDED_REVIEW_CONFIG_DIR;
    else process.env.GUIDED_REVIEW_CONFIG_DIR = prevConfigDir;
    await rm(repoDir, { recursive: true, force: true });
    await rm(configDir, { recursive: true, force: true });
  },
});

export const expect = test.expect;

export function reviewUrl(server: ReviewServer, hash = ""): string {
  const suffix = hash ? (hash.startsWith("#") ? hash : `#${hash}`) : "";
  return `${server.baseURL}/?token=${server.token}${suffix}`;
}

export async function commitInRepo(repoDir: string, file: string, contents: string): Promise<void> {
  await writeFile(path.join(repoDir, file), contents);
  await git(repoDir, ["add", file]);
  await git(repoDir, ["commit", "-m", "e2e edit"]);
}
