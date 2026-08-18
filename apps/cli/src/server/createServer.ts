import { createServer as createHttpServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import {
  annotateReview,
  describeErrorMessage,
  getProviderClient,
  type AnnotateReviewStreamEvent,
  type ProviderSettings,
} from "@guided-review/core";
import {
  applyDetectedAgent,
  applyProviderSettings,
  publicAgents,
  publicSettings,
  patchConfigFile,
  type PublicCliSettings,
} from "../config";
import {
  createDefaultAgentIo,
  detectAll,
  isCodingAgentId,
  type CodingAgentId,
  type DetectedAgent,
} from "../codingAgents";
import {
  currentDiffHash,
  hashDiff,
  isDiffScopeId,
  rebuildLocalReview,
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
  diffHash: string;
  settings: ReturnType<typeof publicSettings>;
  commits: LocalCommit[];
  scopes: DiffScopeOption[];
  selectedScope: LocalReviewSnapshot["selectedScope"];
}

export interface CreateReviewServerOptions {
  snapshot: LocalReviewSnapshot;
  settings: ProviderSettings;
  codingAgent?: CodingAgentId | null;
  token: string;
  staticDir?: string;
  log?: ServerLog;
  detectAgents?: () => Promise<DetectedAgent[]>;
  testConnection?: (settings: ProviderSettings) => Promise<void>;
}

interface SettingsBody {
  provider?: ProviderSettings["provider"];
  model?: string;
  apiKey?: string;
  codingAgent?: CodingAgentId | null;
}

type RequestWithRaw = Request & { rawBody?: Buffer };

function sendJson(res: Response, status: number, body: unknown): void {
  res.status(status).set("cache-control", "no-store").json(body);
}

function readJsonBody(req: Request): { ok: true; value: unknown } | { ok: false } {
  const raw = (req as RequestWithRaw).rawBody;
  if (!raw || !raw.toString("utf8").trim()) return { ok: false };
  return { ok: true, value: req.body as unknown };
}

function sessionPayload(
  snapshot: LocalReviewSnapshot,
  settings: ReturnType<typeof publicSettings>,
): ReviewSessionPayload {
  return {
    context: snapshot.context,
    diff: snapshot.diff,
    sessionKey: snapshot.sessionKey,
    diffHash: hashDiff(snapshot.raw),
    settings,
    commits: snapshot.commits,
    scopes: snapshot.scopes,
    selectedScope: snapshot.selectedScope,
  };
}

function parseSettingsBody(value: unknown): SettingsBody | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const body: SettingsBody = {};
  if (typeof raw.provider === "string") {
    body.provider = raw.provider as ProviderSettings["provider"];
  }
  if (typeof raw.model === "string") body.model = raw.model;
  if (typeof raw.apiKey === "string") body.apiKey = raw.apiKey;
  if (raw.codingAgent === null) body.codingAgent = null;
  else if (typeof raw.codingAgent === "string") {
    if (!isCodingAgentId(raw.codingAgent)) return null;
    body.codingAgent = raw.codingAgent;
  }
  return body;
}

export function createReviewServer(options: CreateReviewServerOptions) {
  let settings = options.settings;
  let codingAgent = options.codingAgent ?? null;
  let snapshot = options.snapshot;
  const log = options.log ?? defaultLog;
  const detectAgents = options.detectAgents ?? (() => detectAll(createDefaultAgentIo()));
  const testConnection =
    options.testConnection ??
    ((next: ProviderSettings) => getProviderClient(next.provider).testConnection(next));
  const staticDir =
    options.staticDir ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "ui");

  async function applySettingsBody(
    body: SettingsBody,
  ): Promise<{ ok: true; published: PublicCliSettings } | { ok: false; error: string }> {
    const hasNewKey = typeof body.apiKey === "string" && body.apiKey.length > 0;
    if (body.codingAgent && !hasNewKey) {
      const detected = await detectAgents();
      const agent = detected.find((item) => item.id === body.codingAgent);
      if (!agent) return { ok: false, error: "That coding agent is not installed." };
      try {
        const applied = applyDetectedAgent(agent, body.model);
        settings = applied.settings;
        codingAgent = applied.codingAgent;
        await patchConfigFile(applied.persist);
      } catch (error) {
        return {
          ok: false,
          error: error instanceof Error ? error.message : "Could not use that coding agent.",
        };
      }
    } else {
      const applied = applyProviderSettings(settings, codingAgent, body);
      if (body.codingAgent === null && !hasNewKey) {
        applied.codingAgent = null;
        applied.persist.codingAgent = null;
      }
      settings = applied.settings;
      codingAgent = applied.codingAgent;
      await patchConfigFile(applied.persist);
    }
    return { ok: true, published: publicSettings(settings, codingAgent) };
  }

  const app = express();
  app.disable("x-powered-by");
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as RequestWithRaw).rawBody = buf;
      },
    }),
  );

  app.use((req, res, next) => {
    if (!req.path.startsWith("/api/")) {
      next();
      return;
    }
    const header = req.headers.authorization;
    const token = typeof req.query.token === "string" ? req.query.token : undefined;
    if (header === `Bearer ${options.token}` || token === options.token) {
      next();
      return;
    }
    log(`${req.method} ${req.path}  401 unauthorized`);
    sendJson(res, 401, { error: "Unauthorized. Open the URL printed by the CLI." });
  });

  app.get("/api/session", async (_req, res) => {
    try {
      snapshot = await rebuildLocalReview(snapshot.repo, snapshot.selectedScope);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log(`GET /api/session  rebuild failed, serving last snapshot  ${message}`);
    }
    const published = publicSettings(settings, codingAgent);
    log(
      `GET /api/session  ${snapshot.diff.files.length} file(s)  ${snapshot.selectedScope}  ${published.provider}/${published.model}  key=${published.hasKey ? "yes" : "no"}${published.codingAgent ? `  agent=${published.codingAgent}` : ""}`,
    );
    sendJson(res, 200, sessionPayload(snapshot, published));
  });

  app.get("/api/diff-status", async (_req, res) => {
    try {
      const hash = await currentDiffHash(snapshot.repo, snapshot.selectedScope);
      const served = hashDiff(snapshot.raw);
      sendJson(res, 200, { hash, changed: hash !== served });
    } catch (error) {
      const message =
        error instanceof GitError ? error.message : "Could not check the current diff.";
      sendJson(res, 500, { error: message });
    }
  });

  app.get("/api/settings", (_req, res) => {
    sendJson(res, 200, publicSettings(settings, codingAgent));
  });

  app.put("/api/settings", async (req, res) => {
    const parsed = readJsonBody(req);
    if (!parsed.ok) {
      sendJson(res, 400, { error: "Request body must be JSON." });
      return;
    }
    const body = parseSettingsBody(parsed.value);
    if (!body) {
      sendJson(res, 400, { error: "Request body must be JSON." });
      return;
    }
    const applied = await applySettingsBody(body);
    if (!applied.ok) {
      sendJson(res, 400, { error: applied.error });
      return;
    }
    const published = applied.published;
    log(
      `PUT /api/settings  ${published.provider}/${published.model}  key=${published.hasKey ? "yes" : "no"}${published.codingAgent ? `  agent=${published.codingAgent}` : ""}`,
    );
    sendJson(res, 200, published);
  });

  app.post("/api/settings/test", async (req, res) => {
    const parsed = readJsonBody(req);
    if (!parsed.ok) {
      sendJson(res, 400, { error: "Request body must be JSON." });
      return;
    }
    const body = parseSettingsBody(parsed.value);
    if (!body) {
      sendJson(res, 400, { error: "Request body must be JSON." });
      return;
    }
    const applied = await applySettingsBody(body);
    if (!applied.ok) {
      sendJson(res, 400, { error: applied.error });
      return;
    }
    if (!settings.apiKey) {
      sendJson(res, 200, { ok: false, error: "No API key configured." });
      return;
    }
    try {
      await testConnection(settings);
      log(`POST /api/settings/test  ok  ${settings.provider}/${settings.model}`);
      sendJson(res, 200, { ok: true });
    } catch (error) {
      const message = describeErrorMessage(error);
      log(`POST /api/settings/test  fail  ${message}`);
      sendJson(res, 200, { ok: false, error: message });
    }
  });

  app.get("/api/agents", async (_req, res) => {
    const detected = await detectAgents();
    sendJson(res, 200, { agents: publicAgents(detected) });
  });

  app.put("/api/diff", async (req, res) => {
    const parsed = readJsonBody(req);
    if (!parsed.ok || !parsed.value || typeof parsed.value !== "object") {
      sendJson(res, 400, { error: "Request body must be JSON." });
      return;
    }
    const body = parsed.value as { scope?: string };
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
  });

  app.get("/api/plan", async (req, res) => {
    res.status(200);
    res.set({
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
  });

  app.use(express.static(staticDir, { index: false, fallthrough: true }));

  app.use((req, res) => {
    if (req.method !== "GET") {
      sendJson(res, 405, { error: "Method not allowed." });
      return;
    }
    res.sendFile(path.join(staticDir, "index.html"), (err) => {
      if (!err) return;
      log("UI not built. Run npm run build -w @guided-review/cli.");
      if (!res.headersSent) {
        sendJson(res, 404, { error: "UI not built. Run npm run build -w @guided-review/cli." });
      } else {
        res.end();
      }
    });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof SyntaxError) {
      sendJson(res, 400, { error: "Request body must be JSON." });
      return;
    }
    log(`server error  ${formatThrown(err)}`);
    const message = err instanceof Error ? err.message : "Server error.";
    if (!res.headersSent) sendJson(res, 500, { error: message });
    else res.end();
  });

  return createHttpServer(app);
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
