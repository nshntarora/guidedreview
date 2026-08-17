import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  annotateReview,
  type AnnotateReviewStreamEvent,
  type ProviderSettings,
} from "@guided-review/core";
import { publicSettings, patchConfigFile } from "../config";
import type { CodingAgentId } from "../codingAgents";
import {
  isDiffScopeId,
  rebuildLocalReview,
  type DiffScopeId,
  type DiffScopeOption,
  type LocalCommit,
  type LocalReviewSnapshot,
} from "../git/localDiff";
import { GitError } from "../git/run";

export type ServerLog = (message: string) => void;

function defaultLog(message: string): void {
  process.stderr.write(`${new Date().toISOString().slice(11, 23)}  ${message}\n`);
}

function formatThrown(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message;
  return String(error);
}

function describePlanEvent(event: AnnotateReviewStreamEvent): string | null {
  switch (event.type) {
    case "STATUS":
      return `plan  ${event.phase}`;
    case "UNIT":
      return `plan  unit ${event.unit.id} (${event.unit.files.length} file(s))`;
    case "DONE":
      return `plan  done ${event.plan.units.length} unit(s)`;
    case "ERROR": {
      const parts = [
        event.error.statusCode !== undefined ? String(event.error.statusCode) : null,
        event.error.code,
        event.error.message,
      ].filter((part): part is string => Boolean(part));
      return `plan  error ${parts.join(" ")}`;
    }
  }
}

export interface ReviewSessionPayload {
  context: LocalReviewSnapshot["context"];
  diff: LocalReviewSnapshot["diff"];
  sessionKey: string;
  settings: ReturnType<typeof publicSettings>;
  commits: LocalCommit[];
  scopes: DiffScopeOption[];
  selectedScope: DiffScopeId;
}

export interface CreateReviewServerOptions {
  snapshot: LocalReviewSnapshot;
  settings: ProviderSettings;
  codingAgent?: CodingAgentId | null;
  token: string;
  staticDir?: string;
  onSettings?: (settings: ProviderSettings) => void;
  log?: ServerLog;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(payload);
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function contentTypeFor(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

function sessionPayload(
  snapshot: LocalReviewSnapshot,
  settings: ReturnType<typeof publicSettings>,
): ReviewSessionPayload {
  return {
    context: snapshot.context,
    diff: snapshot.diff,
    sessionKey: snapshot.sessionKey,
    settings,
    commits: snapshot.commits,
    scopes: snapshot.scopes,
    selectedScope: snapshot.selectedScope,
  };
}

export function createReviewServer(options: CreateReviewServerOptions) {
  let settings = options.settings;
  let codingAgent = options.codingAgent ?? null;
  let snapshot = options.snapshot;
  const log = options.log ?? defaultLog;

  function authorized(req: IncomingMessage, url: URL): boolean {
    const header = req.headers.authorization;
    if (header === `Bearer ${options.token}`) return true;
    return url.searchParams.get("token") === options.token;
  }

  const server = createHttpServer(async (req, res) => {
    try {
      const host = req.headers.host ?? "127.0.0.1";
      const url = new URL(req.url ?? "/", `http://${host}`);

      if (url.pathname.startsWith("/api/") && !authorized(req, url)) {
        log(`${req.method} ${url.pathname}  401 unauthorized`);
        sendJson(res, 401, { error: "Unauthorized. Open the URL printed by the CLI." });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/session") {
        const published = publicSettings(settings, codingAgent);
        log(
          `GET /api/session  ${snapshot.diff.files.length} file(s)  ${snapshot.selectedScope}  ${published.provider}/${published.model}  key=${published.hasKey ? "yes" : "no"}${published.codingAgent ? `  agent=${published.codingAgent}` : ""}`,
        );
        sendJson(res, 200, sessionPayload(snapshot, published));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/settings") {
        sendJson(res, 200, publicSettings(settings, codingAgent));
        return;
      }

      if (req.method === "PUT" && url.pathname === "/api/settings") {
        const body = JSON.parse(await readBody(req)) as Partial<ProviderSettings>;
        const nextKey =
          body.apiKey !== undefined && body.apiKey !== "" ? body.apiKey : settings.apiKey;
        settings = {
          provider: body.provider ?? settings.provider,
          model: body.model ?? settings.model,
          apiKey: nextKey,
        };
        if (body.apiKey) codingAgent = null;
        await patchConfigFile({
          provider: settings.provider,
          model: settings.model,
          apiKey: settings.apiKey,
        });
        options.onSettings?.(settings);
        const published = publicSettings(settings, codingAgent);
        log(
          `PUT /api/settings  ${published.provider}/${published.model}  key=${published.hasKey ? "yes" : "no"}`,
        );
        sendJson(res, 200, published);
        return;
      }

      if (req.method === "PUT" && url.pathname === "/api/diff") {
        const body = JSON.parse(await readBody(req)) as { scope?: string };
        const scope = body.scope;
        if (!scope || !isDiffScopeId(scope)) {
          sendJson(res, 400, { error: "Unknown diff scope." });
          return;
        }
        try {
          const next = await rebuildLocalReview(snapshot.repo, scope);
          if (next.empty) {
            sendJson(res, 400, { error: "That scope has no changes." });
            return;
          }
          snapshot = next;
          const published = publicSettings(settings, codingAgent);
          log(`PUT /api/diff  ${scope}  ${next.diff.files.length} file(s)`);
          sendJson(res, 200, sessionPayload(next, published));
        } catch (error) {
          const message = error instanceof GitError ? error.message : "Could not load that diff.";
          sendJson(res, 400, { error: message });
        }
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/plan") {
        res.writeHead(200, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
          "x-accel-buffering": "no",
        });
        res.flushHeaders();
        res.socket?.setNoDelay(true);
        // Comment frame so EventSource leaves CONNECTING before the first provider call.
        res.write(":\n\n");
        const abort = new AbortController();
        let planFinished = false;
        req.on("close", () => {
          abort.abort();
          if (!planFinished) log("plan  client closed");
        });

        if (!settings.apiKey) {
          log("plan  no API key");
          res.write(
            `data: ${JSON.stringify({
              type: "ERROR",
              error: { message: "No API key configured.", code: "no_api_key" },
            })}\n\n`,
          );
          planFinished = true;
          res.end();
          return;
        }

        log(
          `GET /api/plan  ${settings.provider}/${settings.model}  ${snapshot.selectedScope}  ${snapshot.diff.files.length} file(s)`,
        );

        for await (const event of annotateReview({
          diff: snapshot.diff,
          context: snapshot.context,
          settings,
          signal: abort.signal,
        })) {
          if (abort.signal.aborted) return;
          const line = describePlanEvent(event);
          if (line) log(line);
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
        planFinished = true;
        res.end();
        return;
      }

      if (req.method !== "GET") {
        sendJson(res, 405, { error: "Method not allowed." });
        return;
      }

      const staticDir =
        options.staticDir ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "ui");
      const requested = url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = path.normalize(path.join(staticDir, requested));
      if (!filePath.startsWith(path.normalize(staticDir))) {
        sendJson(res, 404, { error: "Not found." });
        return;
      }

      try {
        const info = await stat(filePath);
        if (!info.isFile()) throw new Error("not a file");
        res.writeHead(200, { "content-type": contentTypeFor(filePath) });
        createReadStream(filePath).pipe(res);
      } catch {
        const fallback = path.join(staticDir, "index.html");
        try {
          await stat(fallback);
          res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
          createReadStream(fallback).pipe(res);
        } catch {
          log("UI not built. Run npm run build -w @guided-review/cli.");
          sendJson(res, 404, { error: "UI not built. Run npm run build -w @guided-review/cli." });
        }
      }
    } catch (error) {
      log(`server error  ${formatThrown(error)}`);
      const message = error instanceof Error ? error.message : "Server error.";
      if (!res.headersSent) sendJson(res, 500, { error: message });
      else res.end();
    }
  });

  return server;
}

export function listen(server: ReturnType<typeof createReviewServer>, port = 0): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to bind 127.0.0.1."));
        return;
      }
      resolve(address.port);
    });
  });
}

/**
 * Idempotent Ctrl+C / SIGTERM handler. `server.close(cb)` adds a `close` listener
 * per call; while SSE plans hold connections open, repeated signals would trip
 * MaxListenersExceededWarning. First signal closes the server and drops sockets;
 * a second signal forces exit.
 */
export function createServerShutdown(
  server: ReturnType<typeof createReviewServer>,
  exit: (code: number) => void = (code) => process.exit(code),
): () => void {
  let shuttingDown = false;
  return () => {
    if (shuttingDown) {
      exit(1);
      return;
    }
    shuttingDown = true;
    server.close(() => exit(0));
    server.closeAllConnections();
  };
}
