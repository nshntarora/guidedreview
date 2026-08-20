#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HELP, parseArgs } from "./args";
import { resolveSettings } from "./config";
import { GitError } from "./git/run";
import { buildLocalReview } from "./git/localDiff";
import { createReviewServer, listen } from "./server/createServer";

function openBrowser(url: string): void {
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  spawn(command, args, { stdio: "ignore", detached: true }).unref();
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${HELP}\n`);
    return;
  }

  const local = await buildLocalReview({
    cwd: path.resolve(args.cwd),
    base: args.base,
    staged: args.staged,
    includeUntracked: args.includeUntracked,
  });

  if (local.empty) {
    process.stdout.write(`Nothing to review against ${local.context.baseRef}.\n`);
    return;
  }

  const settings = await resolveSettings({
    provider: args.provider,
    model: args.model,
  });

  const token = randomBytes(16).toString("hex");
  const staticDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "ui");
  const server = createReviewServer({
    context: local.context,
    diff: local.diff,
    sessionKey: local.sessionKey,
    settings,
    token,
    staticDir,
  });

  const port = await listen(server, args.port ?? 0);
  const url = `http://127.0.0.1:${port}/?token=${token}`;

  process.stdout.write(
    `Reviewing ${local.diff.files.length} file(s) vs ${local.context.baseRef}.\n`,
  );
  process.stdout.write(`${url}\n`);
  process.stdout.write("Ctrl+C to stop.\n");

  if (args.open) openBrowser(url);

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  const message =
    error instanceof GitError || error instanceof Error ? error.message : "guided-review failed.";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
