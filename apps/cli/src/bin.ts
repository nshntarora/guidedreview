#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HELP, parseArgs } from "./args";
import { resolveSettings } from "./config";
import { GitError } from "./git/run";
import { buildLocalReview, reviewHasChanges } from "./git/localDiff";
import { createReviewServer, createServerShutdown, listen } from "./server/createServer";

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

  if (!reviewHasChanges(local)) {
    process.stdout.write(`Nothing to review against ${local.context.baseRef}.\n`);
    return;
  }

  const resolved = await resolveSettings({
    provider: args.provider,
    model: args.model,
    agent: args.agent,
  });

  const token = randomBytes(16).toString("hex");
  const staticDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "ui");
  const server = createReviewServer({
    snapshot: local,
    settings: resolved.settings,
    codingAgent: resolved.codingAgent,
    token,
    staticDir,
  });

  const port = await listen(server, args.port ?? 0);
  const url = `http://127.0.0.1:${port}/?token=${token}`;

  process.stdout.write(
    `Reviewing ${local.diff.files.length} file(s) on ${local.context.headRef} vs ${local.context.baseRef}.\n`,
  );
  process.stdout.write(`${url}\n`);
  process.stdout.write("Ctrl+C to stop.\n");
  const { settings, codingAgent } = resolved;
  process.stderr.write(
    `${settings.provider}/${settings.model}${codingAgent ? ` via ${codingAgent}` : ""}${settings.apiKey ? "" : "  no key"}\n`,
  );

  if (args.open) openBrowser(url);

  const shutdown = createServerShutdown(server);
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error: unknown) => {
  const message =
    error instanceof GitError || error instanceof Error ? error.message : "guided-review failed.";
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
