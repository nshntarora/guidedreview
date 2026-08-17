import { describe, expect, it } from "vitest";
import { grokAdapter } from "./grok";
import { createMemoryIo } from "./io";

const home = "/home/test";
const authPath = `${home}/.grok/auth.json`;
const configPath = `${home}/.grok/config.toml`;

describe("grokAdapter", () => {
  it("detects nothing when Grok is absent", async () => {
    expect(await grokAdapter.detect(createMemoryIo({ home }))).toBeNull();
  });

  it("uses XAI_API_KEY", async () => {
    const io = createMemoryIo({
      home,
      binaries: ["grok"],
      env: { XAI_API_KEY: "xai-from-env" },
      files: { [configPath]: '[models]\ndefault = "grok-4"\n' },
    });
    const detected = await grokAdapter.detect(io);
    expect(detected?.auth).toMatchObject({
      kind: "api_key",
      usableForReview: true,
      secret: "xai-from-env",
      model: "grok-4",
    });
  });

  it("prefers an xai- key stored in auth.json", async () => {
    const io = createMemoryIo({
      home,
      files: {
        [authPath]: JSON.stringify({
          "https://auth.x.ai::a": { key: "xai-stored", auth_mode: "oidc" },
        }),
      },
    });
    const auth = await grokAdapter.resolveAuth(io);
    expect(auth.kind).toBe("api_key");
    expect(auth.secret).toBe("xai-stored");
  });

  it("reuses a live OIDC session as a bearer token", async () => {
    const io = createMemoryIo({
      home,
      files: {
        [authPath]: JSON.stringify({
          "https://auth.x.ai::a": {
            key: "eyJ0eXAiOiJhdCtqd3Qi.session",
            auth_mode: "oidc",
            expires_at: new Date(Date.now() + 60_000).toISOString(),
            create_time: new Date().toISOString(),
          },
        }),
      },
    });
    const auth = await grokAdapter.resolveAuth(io);
    expect(auth).toMatchObject({
      kind: "oauth",
      usableForReview: true,
      authScheme: "bearer",
      secret: "eyJ0eXAiOiJhdCtqd3Qi.session",
    });
  });

  it("rejects an expired OIDC session", async () => {
    const io = createMemoryIo({
      home,
      files: {
        [authPath]: JSON.stringify({
          "https://auth.x.ai::a": {
            key: "eyJ0eXAiOiJhdCtqd3Qi.old",
            auth_mode: "oidc",
            expires_at: new Date(Date.now() - 1000).toISOString(),
          },
        }),
      },
    });
    const auth = await grokAdapter.resolveAuth(io);
    expect(auth.usableForReview).toBe(false);
    expect(auth.reason).toMatch(/expired/i);
  });
});
