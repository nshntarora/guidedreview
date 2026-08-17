import { describe, expect, it } from "vitest";
import { codexAdapter } from "./codex";
import { createMemoryIo } from "./io";

const home = "/home/test";
const authPath = `${home}/.codex/auth.json`;
const configPath = `${home}/.codex/config.toml`;

describe("codexAdapter", () => {
  it("detects nothing when Codex is absent", async () => {
    expect(await codexAdapter.detect(createMemoryIo({ home }))).toBeNull();
  });

  it("uses OPENAI_API_KEY and the configured model", async () => {
    const io = createMemoryIo({
      home,
      binaries: ["codex"],
      env: { OPENAI_API_KEY: "sk-from-env" },
      files: { [configPath]: 'model = "gpt-4.1"\n' },
    });
    const detected = await codexAdapter.detect(io);
    expect(detected?.auth).toMatchObject({
      kind: "api_key",
      usableForReview: true,
      secret: "sk-from-env",
      model: "gpt-4.1",
    });
  });

  it("reads OPENAI_API_KEY from auth.json", async () => {
    const io = createMemoryIo({
      home,
      files: {
        [authPath]: JSON.stringify({ OPENAI_API_KEY: "sk-from-file", auth_mode: "apikey" }),
      },
    });
    const auth = await codexAdapter.resolveAuth(io);
    expect(auth.usableForReview).toBe(true);
    expect(auth.secret).toBe("sk-from-file");
  });

  it("does not send ChatGPT session tokens to the OpenAI API", async () => {
    const io = createMemoryIo({
      home,
      files: {
        [authPath]: JSON.stringify({
          auth_mode: "chatgpt",
          OPENAI_API_KEY: null,
          tokens: { access_token: "eyJhbGci.chatgpt" },
        }),
      },
    });
    const auth = await codexAdapter.resolveAuth(io);
    expect(auth.usableForReview).toBe(false);
    expect(auth.kind).toBe("oauth");
    expect(auth.reason).toMatch(/ChatGPT/);
    expect(auth.secret).toBe("");
  });
});
