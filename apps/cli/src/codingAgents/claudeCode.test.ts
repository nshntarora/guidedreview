import { describe, expect, it } from "vitest";
import { claudeCodeAdapter } from "./claudeCode";
import { createMemoryIo } from "./io";

const home = "/home/test";
const credPath = `${home}/.claude/.credentials.json`;

function oauthJson(token: string, expiresAt = Date.now() + 60_000): string {
  return JSON.stringify({ claudeAiOauth: { accessToken: token, expiresAt } });
}

describe("claudeCodeAdapter", () => {
  it("detects nothing when the CLI and config are absent", async () => {
    expect(await claudeCodeAdapter.detect(createMemoryIo({ home }))).toBeNull();
  });

  it("uses ANTHROPIC_API_KEY as a console key", async () => {
    const io = createMemoryIo({
      home,
      binaries: ["claude"],
      env: { ANTHROPIC_API_KEY: "sk-ant-api03-from-env" },
    });
    const detected = await claudeCodeAdapter.detect(io);
    expect(detected?.auth).toMatchObject({
      kind: "api_key",
      usableForReview: true,
      secret: "sk-ant-api03-from-env",
    });
  });

  it("reads a console key from settings.json env", async () => {
    const io = createMemoryIo({
      home,
      files: {
        [`${home}/.claude/settings.json`]: JSON.stringify({
          env: { ANTHROPIC_API_KEY: "sk-ant-api03-from-settings" },
          model: "claude-sonnet-4-6",
        }),
      },
    });
    const auth = await claudeCodeAdapter.resolveAuth(io);
    expect(auth.secret).toBe("sk-ant-api03-from-settings");
    expect(auth.model).toBe("claude-sonnet-4-6");
    expect(auth.kind).toBe("api_key");
  });

  it("maps a subscription token to bearer + beta header", async () => {
    const io = createMemoryIo({
      home,
      files: {
        [credPath]: oauthJson("sk-ant-oat01-from-file"),
      },
    });
    const auth = await claudeCodeAdapter.resolveAuth(io);
    expect(auth).toMatchObject({
      kind: "oauth",
      usableForReview: true,
      secret: "sk-ant-oat01-from-file",
      authScheme: "bearer",
      extraHeaders: { "anthropic-beta": "oauth-2025-04-20" },
    });
  });

  it("reads the macOS keychain credential", async () => {
    const io = createMemoryIo({
      home,
      platform: "darwin",
      binaries: ["claude"],
      keychain: { "Claude Code-credentials": oauthJson("sk-ant-oat01-from-keychain") },
    });
    const auth = await claudeCodeAdapter.resolveAuth(io);
    expect(auth.secret).toBe("sk-ant-oat01-from-keychain");
    expect(auth.kind).toBe("oauth");
  });

  it("rejects an expired subscription login", async () => {
    const io = createMemoryIo({
      home,
      files: {
        [credPath]: oauthJson("sk-ant-oat01-old", Date.now() - 1000),
      },
    });
    const auth = await claudeCodeAdapter.resolveAuth(io);
    expect(auth.usableForReview).toBe(false);
    expect(auth.reason).toMatch(/expired/i);
  });
});
