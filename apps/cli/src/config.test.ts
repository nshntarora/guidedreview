import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyProviderSettings,
  ConfigError,
  readConfigFile,
  resolveSettings,
  writeConfigFile,
} from "./config";
import { createMemoryIo } from "./codingAgents";

const ENV_KEYS = [
  "GUIDED_REVIEW_CONFIG_DIR",
  "GUIDED_REVIEW_PROVIDER",
  "GUIDED_REVIEW_MODEL",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "XAI_API_KEY",
  "GROK_API_KEY",
] as const;

const prevEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = prevEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

async function withTempConfig(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "guided-review-"));
  process.env.GUIDED_REVIEW_CONFIG_DIR = dir;
  delete process.env.GUIDED_REVIEW_PROVIDER;
  delete process.env.GUIDED_REVIEW_MODEL;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.XAI_API_KEY;
  delete process.env.GROK_API_KEY;
  return dir;
}

describe("resolveSettings", () => {
  it("skips agent detection when config already has a key", async () => {
    const dir = await withTempConfig();
    await writeConfigFile({
      provider: "openai",
      model: "gpt-4.1",
      apiKey: "sk-saved",
    });
    const io = createMemoryIo({
      home: "/home/test",
      binaries: ["claude"],
      env: { ANTHROPIC_API_KEY: "sk-ant-api03-should-not-win" },
    });
    const resolved = await resolveSettings({
      io,
      persist: false,
      pickAgent: async () => {
        throw new Error("should not pick");
      },
    });
    expect(resolved.settings.apiKey).toBe("sk-saved");
    expect(resolved.settings.provider).toBe("openai");
    expect(resolved.codingAgent).toBeNull();
    expect(dir).toBeTruthy();
  });

  it("uses a single usable coding agent and persists the preference, not the secret", async () => {
    const dir = await withTempConfig();
    const io = createMemoryIo({
      home: "/home/test",
      binaries: ["claude"],
      files: {
        "/home/test/.claude/.credentials.json": JSON.stringify({
          claudeAiOauth: { accessToken: "sk-ant-oat01-live", expiresAt: Date.now() + 60_000 },
        }),
      },
    });
    const logs: string[] = [];
    const resolved = await resolveSettings({
      io,
      persist: true,
      isTTY: false,
      log: (message) => logs.push(message),
    });
    expect(resolved.codingAgent).toBe("claude-code");
    expect(resolved.settings.apiKey).toBe("sk-ant-oat01-live");
    expect(resolved.settings.authScheme).toBe("bearer");
    expect(logs.join("\n")).toMatch(/Claude Code/);

    const saved = JSON.parse(await readFile(path.join(dir, "config.json"), "utf8")) as {
      codingAgent?: string;
      apiKey?: string;
    };
    expect(saved.codingAgent).toBe("claude-code");
    expect(saved.apiKey).toBeUndefined();
  });

  it("does not pick among multiple agents off a TTY", async () => {
    await withTempConfig();
    const io = createMemoryIo({
      home: "/home/test",
      binaries: ["claude", "grok"],
      env: { ANTHROPIC_API_KEY: undefined, XAI_API_KEY: undefined },
      files: {
        "/home/test/.claude/.credentials.json": JSON.stringify({
          claudeAiOauth: { accessToken: "sk-ant-oat01-live", expiresAt: Date.now() + 60_000 },
        }),
        "/home/test/.grok/auth.json": JSON.stringify({
          "https://auth.x.ai::a": {
            key: "eyJ0eXAiOiJhdCtqd3Qi.session",
            expires_at: new Date(Date.now() + 60_000).toISOString(),
          },
        }),
      },
    });
    const resolved = await resolveSettings({
      io,
      persist: false,
      isTTY: false,
      log: () => undefined,
    });
    expect(resolved.codingAgent).toBeNull();
    expect(resolved.settings.apiKey).toBe("");
  });

  it("rejects a corrupt config file instead of treating it as empty", async () => {
    const dir = await withTempConfig();
    await writeFile(path.join(dir, "config.json"), "{not json", "utf8");
    await expect(readConfigFile()).rejects.toBeInstanceOf(ConfigError);
  });
});

describe("applyProviderSettings", () => {
  const agentSettings = {
    provider: "anthropic" as const,
    model: "claude-sonnet-4-6",
    apiKey: "sk-ant-oat01-live",
    authScheme: "bearer" as const,
    extraHeaders: { "anthropic-beta": "oauth-2025-04-20" },
  };

  it("keeps agent auth when no key is pasted", () => {
    const next = applyProviderSettings(agentSettings, "claude-code", {
      provider: "anthropic",
      model: "claude-opus-4-8",
    });
    expect(next.settings.authScheme).toBe("bearer");
    expect(next.settings.extraHeaders).toEqual({ "anthropic-beta": "oauth-2025-04-20" });
    expect(next.settings.apiKey).toBe("sk-ant-oat01-live");
    expect(next.codingAgent).toBe("claude-code");
    expect(next.persist.apiKey).toBeUndefined();
    expect(next.persist.model).toBe("claude-opus-4-8");
  });

  it("drops agent auth when a console key is pasted", () => {
    const next = applyProviderSettings(agentSettings, "claude-code", {
      provider: "openai",
      model: "gpt-4.1",
      apiKey: "sk-user",
    });
    expect(next.settings.authScheme).toBeUndefined();
    expect(next.settings.extraHeaders).toBeUndefined();
    expect(next.settings.apiKey).toBe("sk-user");
    expect(next.codingAgent).toBeNull();
    expect(next.persist).toMatchObject({ apiKey: "sk-user", codingAgent: null });
  });
});
