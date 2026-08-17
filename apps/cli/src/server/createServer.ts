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
  type ParsedDiff,
  type ProviderSettings,
  type ReviewContext,
} from "@guided-review/core";
import { publicSettings, writeConfigFile } from "../config";

export interface ReviewSessionPayload {
  context: ReviewContext;
  diff: ParsedDiff;
  sessionKey: string;
  settings: ReturnType<typeof publicSettings>;
}

export interface CreateReviewServerOptions {
  context: ReviewContext;
  diff: ParsedDiff;
  sessionKey: string;
  settings: ProviderSettings;
  token: string;
  staticDir?: string;
  onSettings?: (settings: ProviderSettings) => void;
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

export function createReviewServer(options: CreateReviewServerOptions) {
  let settings = options.settings;

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
        sendJson(res, 401, { error: "Unauthorized. Open the URL printed by the CLI." });
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/session") {
        const payload: ReviewSessionPayload = {
          context: options.context,
          diff: options.diff,
          sessionKey: options.sessionKey,
          settings: publicSettings(settings),
        };
        sendJson(res, 200, payload);
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/settings") {
        sendJson(res, 200, publicSettings(settings));
        return;
      }

      if (req.method === "PUT" && url.pathname === "/api/settings") {
        const body = JSON.parse(await readBody(req)) as Partial<ProviderSettings>;
        settings = {
          provider: body.provider ?? settings.provider,
          model: body.model ?? settings.model,
          apiKey: body.apiKey !== undefined && body.apiKey !== "" ? body.apiKey : settings.apiKey,
        };
        await writeConfigFile({
          provider: settings.provider,
          model: settings.model,
          apiKey: settings.apiKey,
        });
        options.onSettings?.(settings);
        sendJson(res, 200, publicSettings(settings));
        return;
      }

      if (req.method === "GET" && url.pathname === "/api/plan") {
        res.writeHead(200, {
          "content-type": "text/event-stream; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
        });
        const abort = new AbortController();
        req.on("close", () => abort.abort());

        if (!settings.apiKey) {
          res.write(
            `data: ${JSON.stringify({
              type: "ERROR",
              error: { message: "No API key configured.", code: "no_api_key" },
            })}\n\n`,
          );
          res.end();
          return;
        }

        for await (const event of annotateReview({
          diff: options.diff,
          context: options.context,
          settings,
          signal: abort.signal,
        })) {
          if (abort.signal.aborted) return;
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
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
          sendJson(res, 404, { error: "UI not built. Run npm run build -w @guided-review/cli." });
        }
      }
    } catch (error) {
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
