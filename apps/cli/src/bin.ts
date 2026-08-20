#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HELP, parseArgs } from "./args";
import { resolveSettings } from "./config";
import { GitError } from "./git/run";
import { buildLocalReview, reviewHasChanges } from "./git/localDiff";
import { createCliDisplay } from "./display";
import { createLogger, labeled } from "./log";
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

  const display = createCliDisplay(process.stderr);
  const logger = createLogger();
  const cli = labeled(logger, "cli");
  const staticDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "ui");
  const { settings, codingAgent } = resolved;
  const server = createReviewServer({
    snapshot: local,
    settings,
    codingAgent,
    staticDir,
    logger,
    onStatus: (patch) => display.setStatus(patch),
  });

  let port: number;
  try {
    port = await listen(server, args.port);
  } catch (error) {
    display.close();
    throw error;
  }
  const url = `http://127.0.0.1:${port}/`;
  display.setStatus({
    url,
    files: local.diff.files.length,
    scope: local.selectedScope,
    headRef: local.context.headRef,
    baseRef: local.context.baseRef,
    provider: settings.provider,
    model: settings.model,
    agent: codingAgent ?? null,
    hasKey: Boolean(settings.apiKey),
    lastPullAt: new Date(),
    diffFresh: "up to date",
  });

  if (args.open) openBrowser(url);

  const shutdown = createServerShutdown(server);
  const onStop = () => {
    cli.info("shutting down");
    display.close();
    shutdown();
  };
  process.on("SIGINT", onStop);
  process.on("SIGTERM", onStop);
}

main().catch((error: unknown) => {
  const logger = createLogger();
  const message =
    error instanceof GitError || error instanceof Error ? error.message : "guided-review failed.";
  labeled(logger, "cli").error(message);
  process.exit(1);
});
