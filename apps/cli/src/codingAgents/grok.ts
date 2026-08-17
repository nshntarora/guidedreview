import path from "node:path";
import { detectIfInstalled, parseJson, stringField } from "./parse";
import type { AgentAuth, AgentIo, CodingAgentAdapter } from "./types";
import { unusableAuth } from "./types";

const DISPLAY_NAME = "Grok";

function grokHome(io: AgentIo): string {
  return path.join(io.homedir(), ".grok");
}

function isXaiApiKey(secret: string): boolean {
  return secret.startsWith("xai-");
}

/** Tiny pull of `[models] default = "..."` — Grok config is TOML, we do not take a parser dep. */
function defaultModelFromToml(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const section = raw.match(/\[models\]([\s\S]*?)(?:\n\[|$)/);
  const body = section?.[1] ?? raw;
  const match = body.match(/^\s*default\s*=\s*"([^"]+)"/m);
  return match?.[1];
}

interface GrokSession {
  key: string;
  expiresAt?: number;
  createTime?: number;
}

function sessionsFromAuthJson(value: unknown): GrokSession[] {
  if (!value || typeof value !== "object") return [];
  const sessions: GrokSession[] = [];
  for (const rec of Object.values(value as Record<string, unknown>)) {
    if (!rec || typeof rec !== "object") continue;
    const row = rec as Record<string, unknown>;
    const key = stringField(row.key);
    if (!key) continue;
    const expiresAt = stringField(row.expires_at);
    const createTime = stringField(row.create_time);
    sessions.push({
      key,
      expiresAt: expiresAt ? Date.parse(expiresAt) : undefined,
      createTime: createTime ? Date.parse(createTime) : undefined,
    });
  }
  return sessions;
}

async function installed(io: AgentIo): Promise<boolean> {
  if (await io.which("grok")) return true;
  const home = grokHome(io);
  return (
    (await io.fileExists(path.join(home, "auth.json"))) ||
    (await io.fileExists(path.join(home, "config.toml")))
  );
}

/**
 * Grok Build stores an OIDC access token in auth.json, not an `xai-` console
 * key. Our Grok client already sends `Authorization: Bearer`, so a live
 * session JWT is worth trying. Refresh stays in this file when we add it.
 */
export const grokAdapter: CodingAgentAdapter = {
  id: "grok",
  displayName: DISPLAY_NAME,
  provider: "grok",

  async detect(io) {
    return detectIfInstalled(this, io, installed);
  },

  async resolveAuth(io) {
    const home = grokHome(io);
    const model = defaultModelFromToml(await io.readFile(path.join(home, "config.toml")));

    const envKey = io.env("XAI_API_KEY") ?? io.env("GROK_API_KEY");
    if (envKey?.trim()) {
      return {
        provider: "grok",
        model,
        secret: envKey.trim(),
        kind: "api_key",
        usableForReview: true,
      } satisfies AgentAuth;
    }

    const sessions = sessionsFromAuthJson(
      parseJson(await io.readFile(path.join(home, "auth.json"))),
    );
    const apiKeySession = sessions.find((s) => isXaiApiKey(s.key));
    if (apiKeySession) {
      return {
        provider: "grok",
        model,
        secret: apiKeySession.key,
        kind: "api_key",
        usableForReview: true,
      } satisfies AgentAuth;
    }

    const now = Date.now();
    const live = sessions
      .filter((s) => !s.expiresAt || s.expiresAt > now)
      .sort((a, b) => (b.createTime ?? 0) - (a.createTime ?? 0));
    const session = live[0];
    if (session) {
      return {
        provider: "grok",
        model,
        secret: session.key,
        kind: "oauth",
        usableForReview: true,
        authScheme: "bearer",
      } satisfies AgentAuth;
    }

    if (sessions.length > 0) {
      return unusableAuth(
        "grok",
        "Grok login expired. Run grok to sign in again, or set XAI_API_KEY.",
        { kind: "oauth", model },
      );
    }

    return unusableAuth("grok", "Grok is installed but no API key or login was found.", { model });
  },
};
