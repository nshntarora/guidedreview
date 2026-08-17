import path from "node:path";
import type { AgentAuth, AgentIo, CodingAgentAdapter, DetectedAgent } from "./types";
import { unusableAuth } from "./types";

const DISPLAY_NAME = "Codex";
const CHATGPT_REASON =
  "Codex is signed in with ChatGPT, not an OpenAI API key. Guided Review calls api.openai.com, which rejects ChatGPT tokens. Set OPENAI_API_KEY or run `printenv OPENAI_API_KEY | codex login --with-api-key`.";

function codexHome(io: AgentIo): string {
  return io.env("CODEX_HOME") ?? path.join(io.homedir(), ".codex");
}

function parseJson(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Tiny pull of `model = "..."` — Codex config is TOML, we do not take a parser dep. */
function modelFromToml(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(/^\s*model\s*=\s*"([^"]+)"/m);
  return match?.[1];
}

async function installed(io: AgentIo): Promise<boolean> {
  if (await io.which("codex")) return true;
  const home = codexHome(io);
  return (
    (await io.fileExists(path.join(home, "auth.json"))) ||
    (await io.fileExists(path.join(home, "config.toml")))
  );
}

/**
 * ChatGPT OAuth in `tokens.access_token` is a Codex/ChatGPT session, not a
 * Platform key. Do not send it to api.openai.com. When (if) we learn a host
 * that accepts it for this product, change only this file.
 */
export const codexAdapter: CodingAgentAdapter = {
  id: "codex",
  displayName: DISPLAY_NAME,
  provider: "openai",

  async detect(io) {
    if (!(await installed(io))) return null;
    const auth = await this.resolveAuth(io);
    const detected: DetectedAgent = {
      id: this.id,
      displayName: this.displayName,
      provider: this.provider,
      auth,
    };
    return detected;
  },

  async resolveAuth(io) {
    const home = codexHome(io);
    const model = modelFromToml(await io.readFile(path.join(home, "config.toml")));

    const envKey = io.env("OPENAI_API_KEY");
    if (envKey?.trim()) {
      return {
        provider: "openai",
        model,
        secret: envKey.trim(),
        kind: "api_key",
        usableForReview: true,
      } satisfies AgentAuth;
    }

    const authJson = parseJson(await io.readFile(path.join(home, "auth.json")));
    if (authJson && typeof authJson === "object") {
      const rec = authJson as Record<string, unknown>;
      const storedKey = stringField(rec.OPENAI_API_KEY);
      if (storedKey) {
        return {
          provider: "openai",
          model,
          secret: storedKey,
          kind: "api_key",
          usableForReview: true,
        } satisfies AgentAuth;
      }

      const mode = stringField(rec.auth_mode);
      const tokens = rec.tokens;
      const hasChatGptTokens =
        mode === "chatgpt" ||
        (tokens !== null && typeof tokens === "object" && "access_token" in (tokens as object));
      if (hasChatGptTokens) {
        return unusableAuth("openai", CHATGPT_REASON, { kind: "oauth", model });
      }
    }

    return unusableAuth("openai", "Codex is installed but no OpenAI API key was found.", {
      model,
    });
  },
};
