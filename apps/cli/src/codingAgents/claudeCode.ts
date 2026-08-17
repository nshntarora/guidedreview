import path from "node:path";
import { detectIfInstalled, parseJson, stringField } from "./parse";
import type { AgentAuth, AgentIo, CodingAgentAdapter } from "./types";
import { unusableAuth } from "./types";

const DISPLAY_NAME = "Claude Code";
const KEYCHAIN_SERVICE = "Claude Code-credentials";

function claudeHome(io: AgentIo): string {
  return io.env("CLAUDE_CONFIG_DIR") ?? path.join(io.homedir(), ".claude");
}

function looksLikeApiKey(secret: string): boolean {
  return secret.startsWith("sk-ant-api") || secret.startsWith("sk-ant-admin");
}

function looksLikeOauthToken(secret: string): boolean {
  return secret.startsWith("sk-ant-oat01") || secret.startsWith("sk-ant-oat");
}

function apiKeyAuth(secret: string, model?: string): AgentAuth {
  return {
    provider: "anthropic",
    model,
    secret,
    kind: "api_key",
    usableForReview: true,
  };
}

/**
 * Claude Code subscription tokens (`sk-ant-oat01-…`) are not Console API keys.
 * Anthropic accepts them on the Messages API as Bearer + this beta header.
 * If that stops working, keep the change in this file.
 */
function oauthAuth(secret: string, model?: string): AgentAuth {
  return {
    provider: "anthropic",
    model,
    secret,
    kind: "oauth",
    usableForReview: true,
    authScheme: "bearer",
    extraHeaders: { "anthropic-beta": "oauth-2025-04-20" },
  };
}

function authFromSecret(secret: string, model?: string, expiresAt?: number): AgentAuth {
  if (typeof expiresAt === "number" && Number.isFinite(expiresAt) && expiresAt < Date.now()) {
    return unusableAuth(
      "anthropic",
      "Claude Code login expired. Run claude to sign in again, or set ANTHROPIC_API_KEY.",
      { kind: "oauth", model },
    );
  }
  if (looksLikeApiKey(secret)) return apiKeyAuth(secret, model);
  if (looksLikeOauthToken(secret)) return oauthAuth(secret, model);
  if (secret) {
    // Unknown prefix — still try as a Console key.
    return apiKeyAuth(secret, model);
  }
  return unusableAuth("anthropic", "Claude Code is installed but no API key or login was found.", {
    model,
  });
}

function oauthFromCredentials(value: unknown): { token: string; expiresAt?: number } | null {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;
  const oauth = root.claudeAiOauth;
  if (!oauth || typeof oauth !== "object") return null;
  const rec = oauth as Record<string, unknown>;
  const token = stringField(rec.accessToken);
  if (!token) return null;
  const expiresAt = typeof rec.expiresAt === "number" ? rec.expiresAt : undefined;
  return { token, expiresAt };
}

async function readSettings(io: AgentIo): Promise<{ model?: string; envKey?: string }> {
  const raw = await io.readFile(path.join(claudeHome(io), "settings.json"));
  const json = parseJson(raw);
  if (!json || typeof json !== "object") return {};
  const settings = json as Record<string, unknown>;
  const env = settings.env;
  return {
    model: stringField(settings.model),
    envKey:
      env && typeof env === "object"
        ? stringField((env as Record<string, unknown>).ANTHROPIC_API_KEY)
        : undefined,
  };
}

async function installed(io: AgentIo): Promise<boolean> {
  if (await io.which("claude")) return true;
  if (await io.fileExists(path.join(io.homedir(), ".claude.json"))) return true;
  const home = claudeHome(io);
  return (
    (await io.fileExists(path.join(home, "settings.json"))) ||
    (await io.fileExists(path.join(home, ".credentials.json")))
  );
}

export const claudeCodeAdapter: CodingAgentAdapter = {
  id: "claude-code",
  displayName: DISPLAY_NAME,
  provider: "anthropic",

  async detect(io) {
    return detectIfInstalled(this, io, installed);
  },

  async resolveAuth(io) {
    const { model, envKey: settingsKey } = await readSettings(io);

    const envKey = io.env("ANTHROPIC_API_KEY");
    if (envKey?.trim()) return authFromSecret(envKey.trim(), model);

    if (settingsKey) return authFromSecret(settingsKey, model);

    if (io.platform() === "darwin") {
      const raw = await io.readKeychainPassword(KEYCHAIN_SERVICE);
      const fromKeychain = oauthFromCredentials(parseJson(raw));
      if (fromKeychain) return authFromSecret(fromKeychain.token, model, fromKeychain.expiresAt);
      // Some installs store the token as a bare string.
      if (raw?.trim()) return authFromSecret(raw.trim(), model);
    }

    const credRaw = await io.readFile(path.join(claudeHome(io), ".credentials.json"));
    const fromFile = oauthFromCredentials(parseJson(credRaw));
    if (fromFile) return authFromSecret(fromFile.token, model, fromFile.expiresAt);

    return unusableAuth(
      "anthropic",
      "Claude Code is installed but no API key or login was found.",
      { model },
    );
  },
};
